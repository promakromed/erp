const asyncHandler = require("express-async-handler");
const Offer = require("../models/offerModel");
const Client = require("../models/clientModel");
const Product = require("../models/productModel");
const CustomerPriceList = require("../models/customerPriceListModel");
const axios = require("axios"); // Added for API calls

// Helper function for live exchange rates
const getExchangeRate = async (fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return 1;

    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
        console.error("ERROR: EXCHANGE_RATE_API_KEY environment variable not set.");
        // Fallback to placeholder or throw error, for now, using placeholder
        if (fromCurrency === "GBP" && toCurrency === "USD") return 1.25;
        if (fromCurrency === "EUR" && toCurrency === "USD") return 1.10;
        console.warn(`Exchange rate API key not found. Using placeholder for ${fromCurrency} to ${toCurrency}.`);
        return 1;
    }

    const apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${fromCurrency}/${toCurrency}`;

    try {
        const response = await axios.get(apiUrl);
        if (response.data && response.data.result === "success" && response.data.conversion_rate) {
            console.log(`Live rate fetched for ${fromCurrency} to ${toCurrency}: ${response.data.conversion_rate}`);
            return response.data.conversion_rate;
        } else {
            console.error(`Error fetching live rate for ${fromCurrency} to ${toCurrency}: API response unsuccessful or malformed.`, response.data);
            // Fallback to placeholder on API error
            if (fromCurrency === "GBP" && toCurrency === "USD") return 1.25;
            if (fromCurrency === "EUR" && toCurrency === "USD") return 1.10;
            return 1;
        }
    } catch (error) {
        console.error(`Error calling exchange rate API for ${fromCurrency} to ${toCurrency}:`, error.message);
        // Fallback to placeholder on network/request error
        if (fromCurrency === "GBP" && toCurrency === "USD") return 1.25;
        if (fromCurrency === "EUR" && toCurrency === "USD") return 1.10;
        return 1;
    }
};

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
        if (!itemData.productId && !(itemData.isManual === true)) {
            console.warn(`Skipping line item due to missing productId and not being manual: ${JSON.stringify(itemData)}`);
            continue;
        }

        let productDetails = null;
        if (itemData.productId) {
             productDetails = await Product.findById(itemData.productId);
        }
       
        if (!productDetails && !(itemData.isManual === true)) {
            console.error(`Product not found for ID: ${itemData.productId}. Skipping item.`);
            continue;
        }

        let sourceBasePrice = 0;
        let sourceCurrency = "USD";
        let basePriceUSDForMargin = 0;
        const pricingMethod = itemData.pricingMethod || "Margin";

        if (itemData.isManual === true) {
            sourceBasePrice = itemData.basePrice || 0;
            sourceCurrency = itemData.baseCurrency || "USD";
            const rate = await getExchangeRate(sourceCurrency, "USD");
            basePriceUSDForMargin = sourceBasePrice * rate;
            if (sourceCurrency !== "USD") {
                basePriceUSDForMargin *= 1.03; // Apply 3% currency protection
            }
        } else if (productDetails) {
            // Priority 1: Price List
            if (pricingMethod === "PriceList" && customerPriceList) {
                const priceListItem = customerPriceList.items.find(plItem => plItem.itemNo === productDetails.itemNo);
                if (priceListItem) {
                    sourceBasePrice = priceListItem.price;
                    sourceCurrency = priceListItem.currency || "USD";
                    const rate = await getExchangeRate(sourceCurrency, "USD");
                    basePriceUSDForMargin = sourceBasePrice * rate;
                    if (sourceCurrency !== "USD") {
                        basePriceUSDForMargin *= 1.03; // Apply 3% currency protection
                    }
                }
            }

            // Priority 2: Product base price
            if (basePriceUSDForMargin === 0 && productDetails.basePrice && productDetails.basePrice > 0) {
                sourceBasePrice = productDetails.basePrice;
                sourceCurrency = productDetails.baseCurrency || "USD";
                const rate = await getExchangeRate(sourceCurrency, "USD");
                basePriceUSDForMargin = sourceBasePrice * rate;
                if (sourceCurrency !== "USD") {
                    basePriceUSDForMargin *= 1.03; // Apply 3% currency protection
                }
            }

            // Priority 3: Supplier offers
            if (basePriceUSDForMargin === 0 && productDetails.supplierOffers?.length > 0) {
                let lowestSupplierPriceUSDWithProtection = Infinity;
                let tempSourceBasePrice = 0;
                let tempSourceCurrency = "USD";

                for (const supOffer of productDetails.supplierOffers) {
                    if (supOffer.originalPrice && supOffer.originalCurrency) {
                        const supplierRate = await getExchangeRate(supOffer.originalCurrency, "USD");
                        let supplierPriceInUSD = supOffer.originalPrice * supplierRate;
                        if (supOffer.originalCurrency !== "USD") {
                            supplierPriceInUSD *= 1.03; // 3% currency protection
                        }
                        if (supplierPriceInUSD < lowestSupplierPriceUSDWithProtection) {
                            lowestSupplierPriceUSDWithProtection = supplierPriceInUSD;
                            tempSourceBasePrice = supOffer.originalPrice;
                            tempSourceCurrency = supOffer.originalCurrency;
                        }
                    }
                }

                if (lowestSupplierPriceUSDWithProtection !== Infinity) {
                    sourceBasePrice = tempSourceBasePrice;
                    sourceCurrency = tempSourceCurrency;
                    basePriceUSDForMargin = lowestSupplierPriceUSDWithProtection; 
                }
            }
        }

        let finalPriceUSD = basePriceUSDForMargin;
        if (pricingMethod === "Margin" || itemData.isManual === true) {
             const marginToApply = (itemData.marginPercent !== null && itemData.marginPercent !== undefined) 
                                ? itemData.marginPercent 
                                : (globalMarginPercent !== null && globalMarginPercent !== undefined ? globalMarginPercent : 0);
            finalPriceUSD = basePriceUSDForMargin * (1 + (marginToApply / 100));
        }
       
        let lineTotalUSD = finalPriceUSD * (itemData.quantity || 1);

        processedLineItems.push({
            isManual: itemData.isManual === true,
            productId: productDetails ? productDetails._id : null,
            itemNo: itemData.isManual ? itemData.itemNo : (productDetails ? productDetails.itemNo : "N/A"),
            description: itemData.isManual ? itemData.description : (productDetails ? productDetails.description : "N/A"),
            manufacturer: itemData.isManual ? itemData.manufacturer : (productDetails ? productDetails.manufacturer : "N/A"),
            quantity: itemData.quantity || 1,
            marginPercent: (itemData.marginPercent !== null && itemData.marginPercent !== undefined) ? itemData.marginPercent : null,
            pricingMethod: itemData.pricingMethod || "Margin",
            basePrice: sourceBasePrice,
            baseCurrency: sourceCurrency,
            finalPriceUSD: parseFloat(finalPriceUSD.toFixed(2)),
            lineTotalUSD: parseFloat(lineTotalUSD.toFixed(2))
        });
    }

    const offerId = await generateNextOfferId();
    const newOffer = new Offer({
        offerId,
        client,
        validityDate,
        terms,
        status,
        globalMarginPercent: (globalMarginPercent !== null && globalMarginPercent !== undefined) ? globalMarginPercent : 0,
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
