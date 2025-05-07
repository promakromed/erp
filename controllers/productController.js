const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");

// Helper function for exchange rates (copied from offerController.js for consistency)
const getExchangeRate = async (fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return 1;
    // These are placeholder rates, replace with a dynamic source if needed
    if (fromCurrency === "GBP" && toCurrency === "USD") return 1.25;
    if (fromCurrency === "EUR" && toCurrency === "USD") return 1.10;
    console.warn(`Exchange rate not found for ${fromCurrency} to ${toCurrency}, using 1 as default.`);
    return 1;
};

// @desc    Fetch all products (Restored Original Logic)
// @route   GET /api/products
// @access  Private (or Public depending on requirements)
const getProducts = asyncHandler(async (req, res) => {
  console.log("DEBUG: getProducts called - Original Logic Restored");
  const products = await Product.find({});
  res.json(products);
});

// @desc    Fetch single product by ID (DIAGNOSTIC - DUMMY DATA)
// @route   GET /api/products/:id
// @access  Private (or Public)
const getProductById = asyncHandler(async (req, res) => {
  console.log(`DIAGNOSTIC: getProductById called with id: ${req.params.id}`);
  res.json({ itemNo: req.params.id, description: "Diagnostic Single Product" });
});

// @desc    Get distinct manufacturers (Restored Original Logic)
// @route   GET /api/products/manufacturers
// @access  Private
const getManufacturers = asyncHandler(async (req, res) => {
  console.log("DEBUG: getManufacturers called - Original Logic Restored");
  try {
    const manufacturers = await Product.distinct("manufacturer", {
      manufacturer: { $ne: null, $ne: "" },
    });
    manufacturers.sort();
    res.json(manufacturers);
  } catch (error) {
    console.error("Error fetching manufacturers:", error);
    res.status(500).json({ message: "Server error fetching manufacturers" });
  }
});

// @desc    Search products by item number or description (DIAGNOSTIC - DUMMY DATA)
// @route   GET /api/products/search
// @access  Private (Requires login)
const searchProducts = asyncHandler(async (req, res) => {
    console.log(`DIAGNOSTIC: searchProducts called with query: ${req.query.query}`);
    res.json([{ itemNo: "SEARCH_DUMMY", description: "Diagnostic Searched Product" }]);
});

// @desc    Get products by manufacturer and list of part numbers (Restored Original Logic, now includes basePriceUSDForMarginApplication)
// @route   POST /api/products/bulk-lookup
// @access  Private (Requires login)
const getProductsByManufacturerAndPartNumbers = asyncHandler(async (req, res) => {
    const { manufacturer, partNumbers } = req.body;
    console.log(`DEBUG: getProductsByManufacturerAndPartNumbers called with mfg: ${manufacturer}, parts: ${partNumbers}`);

    if (!manufacturer || !partNumbers || !Array.isArray(partNumbers) || partNumbers.length === 0) {
        return res.status(400).json({ message: "Manufacturer and a non-empty array of partNumbers are required." });
    }

    try {
        // Fetch products. Ensure supplierOffers are included if they are part of the schema.
        // .lean() is good for performance.
        const foundProducts = await Product.find({
            manufacturer: manufacturer,
            itemNo: { $in: partNumbers }
        }).lean(); 

        const results = await Promise.all(partNumbers.map(async (pn) => {
            const product = foundProducts.find(p => p.itemNo === pn);
            if (product) {
                let basePriceUSDForMarginApplication = 0;

                // Priority 1: Product's own basePrice (if set and > 0)
                if (product.basePrice && product.basePrice > 0) {
                    const rate = await getExchangeRate(product.baseCurrency || 'USD', "USD");
                    basePriceUSDForMarginApplication = product.basePrice * rate;
                    if ((product.baseCurrency || 'USD') !== "USD") {
                        basePriceUSDForMarginApplication *= 1.03; // 3% currency protection
                        console.log(`DEBUG (bulkLookup ${pn}): Applied 3% protection to Product's own basePrice. USD for margin: ${basePriceUSDForMarginApplication.toFixed(2)}`);
                    }
                } 
                // Priority 2: Lowest Supplier Offer (if product's own basePrice is not usable)
                else if (product.supplierOffers && product.supplierOffers.length > 0) {
                    let lowestSupplierPriceUSDWithProtection = Infinity;
                    for (const supOffer of product.supplierOffers) {
                        if (supOffer.originalPrice && supOffer.originalCurrency) {
                            const supplierRate = await getExchangeRate(supOffer.originalCurrency, "USD");
                            let supplierPriceInUSD = supOffer.originalPrice * supplierRate;
                            if (supOffer.originalCurrency !== "USD") {
                                supplierPriceInUSD *= 1.03; // 3% currency protection
                            }
                            if (supplierPriceInUSD < lowestSupplierPriceUSDWithProtection) {
                                lowestSupplierPriceUSDWithProtection = supplierPriceInUSD;
                            }
                        }
                    }
                    if (lowestSupplierPriceUSDWithProtection !== Infinity) {
                        basePriceUSDForMarginApplication = lowestSupplierPriceUSDWithProtection;
                        console.log(`DEBUG (bulkLookup ${pn}): Using lowest supplier offer. USD for margin (with protection): ${basePriceUSDForMarginApplication.toFixed(2)}`);
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
        }));
        console.log("DEBUG: Bulk lookup results with basePriceUSDForMarginApplication:", JSON.stringify(results, null, 2));
        res.json(results);
    } catch (error) {
        console.error("Error in bulk product lookup:", error);
        res.status(500).json({ message: "Server error during bulk product lookup." });
    }
});

module.exports = {
    getProducts,
    getProductById,
    getManufacturers,
    searchProducts,
    getProductsByManufacturerAndPartNumbers
};

