const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");
const { getExchangeRate } = require("../utils/exchangeUtils");

// @desc    Get products by manufacturer and part numbers
// @route   POST /api/products/bulk-lookup
// @access  Private
const getProductsByManufacturerAndPartNumbers = asyncHandler(async (req, res) => {
    const { manufacturer, partNumbers } = req.body;

    console.log("DEBUG: getProductsByManufacturerAndPartNumbers called with:", {
        manufacturer,
        partNumbers
    });

    if (!manufacturer || !Array.isArray(partNumbers) || partNumbers.length === 0) {
        return res.status(400).json({
            message: "Manufacturer and a non-empty array of partNumbers are required."
        });
    }

    try {
        const foundProducts = await Product.find({
            manufacturer: manufacturer,
            itemNo: { $in: partNumbers }
        }).lean();

        const results = await Promise.all(
            partNumbers.map(async (pn) => {
                const product = foundProducts.find(p => p.itemNo === pn);

                if (product) {
                    let basePriceUSDForMarginApplication = 0;

                    // Priority 1: Use product's own base price
                    if (product.basePrice && product.basePrice > 0) {
                        const rate = await getExchangeRate(product.baseCurrency || "USD", "USD");
                        basePriceUSDForMarginApplication = product.basePrice * rate;
                        console.log(
                            `DEBUG (bulkLookup ${pn}): Applied 3% protection to Product's own basePrice. USD for margin: ${basePriceUSDForMarginApplication.toFixed(2)}`
                        );
                    }

                    // Priority 2: Use lowest supplier offer
                    else if (product.supplierOffers && product.supplierOffers.length > 0) {
                        let lowestSupplierPriceUSDWithProtection = Infinity;
                        let tempSourceBasePrice = 0;
                        let tempSourceCurrency = "USD";

                        for (const supOffer of product.supplierOffers) {
                            if (supOffer.originalPrice && supOffer.originalCurrency) {
                                const supplierRate = await getExchangeRate(supOffer.originalCurrency, "USD");
                                let supplierPriceInUSD = supOffer.originalPrice * supplierRate;
                                if (supOffer.originalCurrency !== "USD") {
                                    supplierPriceInUSD *= 1.03; // Apply 3% protection
                                }
                                if (supplierPriceInUSD < lowestSupplierPriceUSDWithProtection) {
                                    lowestSupplierPriceUSDWithProtection = supplierPriceInUSD;
                                    tempSourceBasePrice = supOffer.originalPrice;
                                    tempSourceCurrency = supOffer.originalCurrency;
                                }
                            }
                        }

                        if (lowestSupplierPriceUSDWithProtection !== Infinity) {
                            basePriceUSDForMarginApplication = lowestSupplierPriceUSDWithProtection;
                            console.log(
                                `DEBUG (bulkLookup ${pn}): Using lowest supplier offer. USD for margin (with protection): ${basePriceUSDForMarginApplication.toFixed(2)}`
                            );
                        }
                    }

                    product.basePriceUSDForMarginApplication = parseFloat(basePriceUSDForMarginApplication.toFixed(2));

                    return {
                        itemNumber: pn,
                        found: true,
                        data: product
                    };
                } else {
                    return {
                        itemNumber: pn,
                        found: false,
                        data: null
                    };
                }
            })
        );

        console.log("DEBUG: Bulk lookup results:", JSON.stringify(results, null, 2));
        res.json(results);
    } catch (error) {
        console.error("Error in bulk product lookup:", error);
        res.status(500).json({ message: "Server error during bulk product lookup." });
    }
});

module.exports = {
    getProductsByManufacturerAndPartNumbers
};
