const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");

// @desc    Fetch all products (or filter/paginate if needed)
// @route   GET /api/products
// @access  Private (or Public depending on requirements)
const getProducts = asyncHandler(async (req, res) => {
  // Add filtering/pagination logic here if needed
  const products = await Product.find({});
  res.json(products);
});

// @desc    Fetch single product by ID
// @route   GET /api/products/:id
// @access  Private (or Public)
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc    Get distinct manufacturers
// @route   GET /api/products/manufacturers
// @access  Private
const getManufacturers = asyncHandler(async (req, res) => {
    try {
        const manufacturers = await Product.distinct("manufacturer");
        res.json(manufacturers.sort()); // Sort alphabetically
    } catch (error) {
        res.status(500);
        throw new Error("Could not fetch manufacturers");
    }
});


// Add other product-related controller functions if needed (e.g., create, update, delete - likely admin only)

module.exports = { getProducts, getProductById, getManufacturers };

