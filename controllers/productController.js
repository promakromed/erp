const asyncHandler = require("express-async-handler");
// const Product = require("../models/productModel"); // Temporarily commented out for diagnostics

// @desc    Fetch all products (DIAGNOSTIC - DUMMY DATA)
// @route   GET /api/products
// @access  Private (or Public depending on requirements)
const getProducts = asyncHandler(async (req, res) => {
  console.log("DIAGNOSTIC: getProducts called");
  res.json([{ itemNo: "DUMMY1", description: "Diagnostic Product 1" }]);
});

// @desc    Fetch single product by ID (DIAGNOSTIC - DUMMY DATA)
// @route   GET /api/products/:id
// @access  Private (or Public)
const getProductById = asyncHandler(async (req, res) => {
  console.log(`DIAGNOSTIC: getProductById called with id: ${req.params.id}`);
  res.json({ itemNo: req.params.id, description: "Diagnostic Single Product" });
});

// @desc    Get distinct manufacturers (DIAGNOSTIC - DUMMY DATA)
// @route   GET /api/products/manufacturers
// @access  Private
const getManufacturers = asyncHandler(async (req, res) => {
    console.log("DIAGNOSTIC: getManufacturers called");
    res.json(["DiagnosticMfg1", "DiagnosticMfg2"]);
});

// @desc    Search products by item number or description (DIAGNOSTIC - DUMMY DATA)
// @route   GET /api/products/search
// @access  Private (Requires login)
const searchProducts = asyncHandler(async (req, res) => {
    console.log(`DIAGNOSTIC: searchProducts called with query: ${req.query.query}`);
    res.json([{ itemNo: "SEARCH_DUMMY", description: "Diagnostic Searched Product" }]);
});

// @desc    Get products by manufacturer and list of part numbers (DIAGNOSTIC - DUMMY DATA)
// @route   POST /api/products/bulk-lookup
// @access  Private (Requires login)
const getProductsByManufacturerAndPartNumbers = asyncHandler(async (req, res) => {
    const { manufacturer, partNumbers } = req.body;
    console.log(`DIAGNOSTIC: getProductsByManufacturerAndPartNumbers called with mfg: ${manufacturer}, parts: ${partNumbers}`);
    if (!manufacturer || !partNumbers || !Array.isArray(partNumbers) || partNumbers.length === 0) {
        res.status(400).json({ message: "Manufacturer and a non-empty array of partNumbers are required."}); // Send JSON error
        return;
    }
    const results = partNumbers.map(pn => ({
        itemNumber: pn,
        found: true, // Assume found for diagnostic purposes
        data: { itemNo: pn, description: `Diagnostic bulk product ${pn}`, manufacturer: manufacturer, basePrice: 10, baseCurrency: "USD" }
    }));
    res.json(results);
});


module.exports = {
    getProducts,
    getProductById,
    getManufacturers,
    searchProducts,
    getProductsByManufacturerAndPartNumbers
};

