const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");
const { getExchangeRate } = require("./offerController");

// GET /api/products
const getProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({});
    res.json(products);
});

// GET /api/products/:id
const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: "Product not found" });
    }
});

// GET /api/products/manufacturers
const getManufacturers = asyncHandler(async (req, res) => {
    try {
        const manufacturers = await Product.distinct("manufacturer", {
            manufacturer: { $exists: true, $ne: null, $ne: "" }
        });
        manufacturers.sort();
        res.json(manufacturers);
    } catch (error) {
        console.error("Error fetching manufacturers:", error);
        res.status(500).json({ message: "Server error fetching manufacturers" });
    }
});

// POST /api/products/bulk-lookup
const getProductsByManufacturerAndPartNumbers = asyncHandler(async (req, res) => {
    const { manufacturer, partNumbers } = req.body;

    console.log("DEBUG: Bulk lookup request - Manufacturer:", manufacturer, "Part Numbers:", partNumbers);

    if (!manufacturer || !Array.isArray(partNumbers) || partNumbers.length === 0) {
        return res.status(400).json({ message: "Manufacturer and at least one part number are required." });
    }

    try {
        const foundProducts = await Product.find({
            manufacturer,
            itemNo: { $in: partNumbers }
        }).lean();

        // Build results array
        const results = await Promise.all(
            partNumbers.map(async (pn) => {
                const product = foundProducts.find(p => p.itemNo === pn);

                if (product) {
                    let basePriceUSDForMarginApplication = 0;

                    // Priority 1: Use product.basePrice if available
                    if (product.basePrice && product.basePrice > 0) {
                        const rate = await getExchangeRate(product.baseCurrency || "USD", "USD");
                        basePriceUSDForMarginApplication = product.basePrice * rate;
                        if ((product.baseCurrency || "USD") !== "USD") {
                            basePriceUSDForMarginApplication *= 1.03; // Add 3% protection
                        }
                    }
                    // Priority 2: Use lowest supplier offer
                    else if (product.supplierOffers && product.supplierOffers.length > 0) {
                        let lowestSupplierPriceUSDWithProtection = Infinity;

                        for (const offer of product.supplierOffers) {
                            if (offer.originalPrice && offer.originalCurrency) {
                                const rate = await getExchangeRate(offer.originalCurrency, "USD");
                                let priceInUSD = offer.originalPrice * rate;

                                if (offer.originalCurrency !== "USD") {
                                    priceInUSD *= 1.03; // Add 3% protection
                                }

                                if (priceInUSD < lowestSupplierPriceUSDWithProtection) {
                                    lowestSupplierPriceUSDWithProtection = priceInUSD;
                                }
                            }
                        }

                        if (lowestSupplierPriceUSDWithProtection !== Infinity) {
                            basePriceUSDForMarginApplication = lowestSupplierPriceUSDWithProtection;
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

        console.log("DEBUG: Bulk lookup results:", results);
        res.json(results); // Return full result including found status
    } catch (error) {
        console.error("Error in bulk product lookup:", error);
        res.status(500).json({ message: "Server error during bulk product lookup." });
    }
});

module.exports = {
    getProducts,
    getProductById,
    getManufacturers,
    getProductsByManufacturerAndPartNumbers
};
