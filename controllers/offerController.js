const asyncHandler = require("express-async-handler");
const Offer = require("../models/offerModel");
const Client = require("../models/clientModel");
const Product = require("../models/productModel");
const CustomerPriceList = require("../models/customerPriceListModel");
const mongoose = require("mongoose");

const { getExchangeRate } = require("../utils/exchangeUtils");

// @desc    Create or update an offer
// @route   POST /api/offers
// @access  Private/Admin
const createOffer = asyncHandler(async (req, res) => {
    const {
        clientId,
        validityDate,
        terms,
        status,
        globalMarginPercent,
        lineItems
    } = req.body;

    if (!clientId || !lineItems || !Array.isArray(lineItems)) {
        res.status(400).json({ message: "Client and line items are required." });
        return;
    }

    const clientExists = await Client.findById(clientId);
    if (!clientExists) {
        res.status(404).json({ message: "Client not found" });
        return;
    }

    let customerPriceList = null;
    if (clientExists.priceListId) {
        customerPriceList = await CustomerPriceList.findById(clientExists.priceListId);
    }

    const processedLineItems = [];
    for (const item of lineItems) {
        const processedItem = await calculateLineItemPrice(item, globalMarginPercent, customerPriceList);
        processedLineItems.push(processedItem);
    }

    const offerId = await generateNextOfferId();
    const offer = new Offer({
        offerId,
        client: clientId,
        validityDate,
        terms,
        status,
        globalMarginPercent,
        lineItems: processedLineItems,
        user: req.user._id
    });

    const createdOffer = await offer.save();
    res.status(201).json(createdOffer);
});

// @desc    Calculate line item price based on currency, method, and protection
const calculateLineItemPrice = async (item, globalMarginPercent, customerPriceList) => {
    if (item.itemType === "manual") {
        return {
            ...item,
            finalPriceUSD: 0,
            lineTotalUSD: 0,
            basePrice: 0,
            baseCurrency: "USD"
        };
    }

    const productDetails = await Product.findById(item.productId).select("itemNo description manufacturer basePrice baseCurrency supplierOffers");

    if (!productDetails) {
        throw new Error("Product details not found.");
    }

    let sourceBasePrice = 0;
    let sourceCurrency = "USD";
    let basePriceUSD_for_margin_calc = 0;

    // Priority 1: Use Price List if available
    if (customerPriceList && item.pricingMethod === "PriceList") {
        const priceListItem = customerPriceList.items.find(plItem => plItem.itemNo === productDetails.itemNo);
        if (priceListItem) {
            sourceBasePrice = priceListItem.price;
            sourceCurrency = priceListItem.currency || "USD";
        }
    }

    // Priority 2: Use Product's own basePrice
    if (basePriceUSD_for_margin_calc === 0 && productDetails.basePrice > 0) {
        const rate = await getExchangeRate(productDetails.baseCurrency || "USD", "USD");
        basePriceUSD_for_margin_calc = productDetails.basePrice * rate;
        if ((productDetails.baseCurrency || "USD") !== "USD") {
            basePriceUSD_for_margin_calc *= 1.03;
        }
    }

    // Priority 3: Use Lowest Supplier Offer
    if (basePriceUSD_for_margin_calc === 0 && productDetails.supplierOffers?.length > 0) {
        let lowestSupplierPriceUSDWithProtection = Infinity;
        let tempSourceBasePrice = 0;
        let tempSourceCurrency = "USD";

        for (const supOffer of productDetails.supplierOffers) {
            if (supOffer.originalPrice && supOffer.originalCurrency) {
                const supplierRate = await getExchangeRate(supOffer.originalCurrency, "USD");
                let currentSupplierPriceUSD = supOffer.originalPrice * supplierRate;
                if (supOffer.originalCurrency !== "USD") {
                    currentSupplierPriceUSD *= 1.03; // Apply 3% currency protection
                }
                if (currentSupplierPriceUSD < lowestSupplierPriceUSDWithProtection) {
                    lowestSupplierPriceUSDWithProtection = currentSupplierPriceUSD;
                    tempSourceBasePrice = supOffer.originalPrice;
                    tempSourceCurrency = supOffer.originalCurrency;
                }
            }
        }

        if (lowestSupplierPriceUSDWithProtection !== Infinity) {
            basePriceUSD_for_margin_calc = lowestSupplierPriceUSDWithProtection;
            sourceCurrency = tempSourceCurrency;
            sourceBasePrice = tempSourceBasePrice;
        }
    }

    // Final price calculation
    let finalPricePerUnitUSD = basePriceUSD_for_margin_calc;

    if (item.pricingMethod === "Margin") {
        const marginToApply = (item.marginPercent !== null && item.marginPercent >= 0)
            ? item.marginPercent
            : (globalMarginPercent !== null && globalMarginPercent >= 0 ? globalMarginPercent : 0);

        finalPricePerUnitUSD = basePriceUSD_for_margin_calc * (1 + marginToApply / 100);
    }

    const lineTotalUSD = finalPricePerUnitUSD * (item.quantity || 0);

    return {
        ...item,
        productId: productDetails._id,
        itemNo: productDetails.itemNo,
        description: productDetails.description,
        manufacturer: productDetails.manufacturer,
        basePrice: sourceBasePrice,
        baseCurrency: sourceCurrency,
        pricingMethod: item.pricingMethod || "Margin",
        marginPercent: (item.pricingMethod === 'Margin' && item.marginPercent !== null)
            ? item.marginPercent
            : null,
        finalPriceUSD: finalPricePerUnitUSD,
        lineTotalUSD: lineTotalUSD,
    };
};

// Helper to generate next offer ID
const generateNextOfferId = async () => {
    const date = new Date();
    const prefix = `OFFER-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-`;
    const lastOffer = await Offer.findOne({ offerId: { $regex: `^${prefix}` } }).sort({ createdAt: -1 });

    let nextNum = 1;
    if (lastOffer) {
        const lastNum = parseInt(lastOffer.offerId.split('-').pop(), 10);
        if (!isNaN(lastNum)) {
            nextNum = lastNum + 1;
        }
    }

    return `${prefix}${String(nextNum).padStart(3, '0')}`;
};

module.exports = {
    createOffer,
    getProductsByManufacturerAndPartNumbers: require("./productController").getProductsByManufacturerAndPartNumbers
};
