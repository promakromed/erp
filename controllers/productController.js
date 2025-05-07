const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");

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

// @desc    Get products by manufacturer and list of part numbers (Restored Original Logic)
// @route   POST /api/products/bulk-lookup
// @access  Private (Requires login)
const getProductsByManufacturerAndPartNumbers = asyncHandler(async (req, res) => {
    const { manufacturer, partNumbers } = req.body;
    console.log(`DEBUG: getProductsByManufacturerAndPartNumbers called with mfg: ${manufacturer}, parts: ${partNumbers}`);

    if (!manufacturer || !partNumbers || !Array.isArray(partNumbers) || partNumbers.length === 0) {
        return res.status(400).json({ message: "Manufacturer and a non-empty array of partNumbers are required." });
    }

    try {
        const foundProducts = await Product.find({
            manufacturer: manufacturer,
            itemNo: { $in: partNumbers }
        }).lean(); // .lean() for plain JS objects, faster

        const results = partNumbers.map(pn => {
            const product = foundProducts.find(p => p.itemNo === pn);
            if (product) {
                return {
                    itemNumber: pn,
                    found: true,
                    data: product // Send the whole product object
                };
            } else {
                return {
                    itemNumber: pn,
                    found: false,
                    data: null
                };
            }
        });
        console.log("DEBUG: Bulk lookup results:", JSON.stringify(results, null, 2));
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

