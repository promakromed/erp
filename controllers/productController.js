const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel"); // Re-enabled model loading

// @desc    Fetch all products (DIAGNOSTIC - DUMMY DATA, MODEL LOAD TEST)
// @route   GET /api/products
// @access  Private (or Public depending on requirements)
const getProducts = asyncHandler(async (req, res) => {
  console.log("DIAGNOSTIC (Model Load Test): getProducts called");
  // No actual Product.find({}) yet
  res.json([{ itemNo: "DUMMY1", description: "Diagnostic Product 1 (Model Load Test)" }]);
});

// @desc    Fetch single product by ID (DIAGNOSTIC - DUMMY DATA, MODEL LOAD TEST)
// @route   GET /api/products/:id
// @access  Private (or Public)
const getProductById = asyncHandler(async (req, res) => {
  console.log(`DIAGNOSTIC (Model Load Test): getProductById called with id: ${req.params.id}`);
  // No actual Product.findById() yet
  res.json({ itemNo: req.params.id, description: "Diagnostic Single Product (Model Load Test)" });
});

// @desc    Get distinct manufacturers (DIAGNOSTIC - DUMMY DATA, MODEL LOAD TEST)
// @route   GET /api/products/manufacturers
// @access  Private
const getManufacturers = asyncHandler(async (req, res) => {
    console.log("DIAGNOSTIC (Model Load Test): getManufacturers called");
    // No actual Product.distinct() yet
    res.json(["DiagnosticMfg1 (Model Load Test)", "DiagnosticMfg2 (Model Load Test)"]);
});

// @desc    Search products by item number or description (DIAGNOSTIC - DUMMY DATA, MODEL LOAD TEST)
// @route   GET /api/products/search
// @access  Private (Requires login)
const searchProducts = asyncHandler(async (req, res) => {
    console.log(`DIAGNOSTIC (Model Load Test): searchProducts called with query: ${req.query.query}`);
    // No actual Product.find() yet
    res.json([{ itemNo: "SEARCH_DUMMY", description: "Diagnostic Searched Product (Model Load Test)" }]);
});

// @desc    Get products by manufacturer and list of part numbers (DIAGNOSTIC - DUMMY DATA, MODEL LOAD TEST)
// @route   POST /api/products/bulk-lookup
// @access  Private (Requires login)
const getProductsByManufacturerAndPartNumbers = asyncHandler(async (req, res) => {
    const { manufacturer, partNumbers } = req.body;
    console.log(`DIAGNOSTIC (Model Load Test): getProductsByManufacturerAndPartNumbers called with mfg: ${manufacturer}, parts: ${partNumbers}`);
    if (!manufacturer || !partNumbers || !Array.isArray(partNumbers) || partNumbers.length === 0) {
        res.status(400).json({ message: "Manufacturer and a non-empty array of partNumbers are required."});
        return;
    }
    // No actual Product.find() yet
    const results = partNumbers.map(pn => ({
        itemNumber: pn,
        found: true, // Assume found for diagnostic purposes
        data: { itemNo: pn, description: `Diagnostic bulk product ${pn} (Model Load Test)`, manufacturer: manufacturer, basePrice: 10, baseCurrency: "USD" }
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

