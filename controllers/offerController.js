const asyncHandler = require("express-async-handler");
const Offer = require("../models/offerModel");
const Client = require("../models/clientModel");
const Product = require("../models/productModel");
const CustomerPriceList = require("../models/customerPriceListModel");

// @desc    Create new offer
// @route   POST /api/offers
// @access  Private/Admin
const createOffer = asyncHandler(async (req, res) => {
    const {
        client,
        validityDate,
        terms,
        status,
        globalMarginPercent,
        lineItems
    } = req.body;

    if (!client || !Array.isArray(lineItems)) {
        return res.status(400).json({ message: "Client and line items are required." });
    }

    const clientExists = await Client.findById(client);
    if (!clientExists) {
        return res.status(404).json({ message: "Client not found" });
    }

    let customerPriceList = null;
    if (clientExists.priceListId) {
        customerPriceList = await CustomerPriceList.findById(clientExists.priceListId);
    }

    const processedLineItems = [];

    for (let itemData of lineItems) {
        const productDetails = await Product.findById(itemData.productId);

        if (!productDetails) {
            console.error(`Product not found for ID: ${itemData.productId}`);
            continue;
        }

        let sourceBasePrice = 0;
        let sourceCurrency = "USD";
        let basePriceUSDForMargin = 0;
        const pricingMethod = itemData.pricingMethod || "Margin";

        // Priority 1: Price List
        if (pricingMethod === "PriceList" && customerPriceList) {
            const priceListItem = customerPriceList.items.find(plItem => plItem.itemNo === productDetails.itemNo);
            if (priceListItem) {
                sourceBasePrice = priceListItem.price;
                sourceCurrency = priceListItem.currency || "USD";
                basePriceUSDForMargin = sourceBasePrice * (sourceCurrency !== "USD" ? 1.03 : 1);
            }
        }

        // Priority 2: Product base price
        if (!sourceBasePrice && productDetails.basePrice > 0) {
            sourceBasePrice = productDetails.basePrice;
            sourceCurrency = productDetails.baseCurrency || "USD";
            basePriceUSDForMargin = sourceBasePrice * (sourceCurrency !== "USD" ? 1.03 : 1);
        }

        // Priority 3: Supplier offers
        if (!sourceBasePrice && productDetails.supplierOffers?.length > 0) {
            let lowestSupplierPrice = Infinity;
            let tempSourceBasePrice = 0;
            let tempSourceCurrency = "USD";

            for (const supOffer of productDetails.supplierOffers) {
                if (supOffer.originalPrice < lowestSupplierPrice) {
                    lowestSupplierPrice = supOffer.originalPrice;
                    tempSourceBasePrice = supOffer.originalPrice;
                    tempSourceCurrency = supOffer.originalCurrency || "USD";
                }
            }

            if (lowestSupplierPrice !== Infinity) {
                sourceBasePrice = tempSourceBasePrice;
                sourceCurrency = tempSourceCurrency;
                basePriceUSDForMargin = sourceBasePrice * (sourceCurrency !== "USD" ? 1.03 : 1);
            }
        }

        let finalPriceUSD = basePriceUSDForMargin * (1 + ((itemData.marginPercent ?? globalMarginPercent ?? 0) / 100));
        let lineTotalUSD = finalPriceUSD * (itemData.quantity || 1);

        processedLineItems.push({
            productId: productDetails._id,
            itemNo: productDetails.itemNo,
            description: productDetails.description,
            manufacturer: productDetails.manufacturer,
            quantity: itemData.quantity || 1,
            marginPercent: itemData.marginPercent ?? null,
            pricingMethod: itemData.pricingMethod || "Margin",
            basePrice: sourceBasePrice,
            baseCurrency: sourceCurrency,
            finalPriceUSD,
            lineTotalUSD
        });
    }

    const offerId = await generateNextOfferId();
    const newOffer = new Offer({
        offerId,
        client,
        validityDate,
        terms,
        status,
        globalMarginPercent,
        lineItems: processedLineItems,
        user: req.user._id
    });

    const createdOffer = await newOffer.save();
    res.status(201).json(createdOffer);
});

// Helper: Generate next offer ID
const generateNextOfferId = async () => {
    const date = new Date();
    const prefix = `OFFER-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-`;
    const lastOffer = await Offer.findOne({ offerId: { $regex: `^${prefix}` } }).sort({ createdAt: -1 });

    let nextNum = 1;
    if (lastOffer) {
        const lastNumStr = lastOffer.offerId.split("-").pop();
        const lastNum = parseInt(lastNumStr, 10);
        if (!isNaN(lastNum)) {
            nextNum = lastNum + 1;
        }
    }

    return `${prefix}${String(nextNum).padStart(3, '0')}`;
};

module.exports = {
    createOffer
};
