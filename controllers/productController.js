const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");

// @desc    Fetch all products
// @route   GET /api/products
// @access  Private
const getProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json(products);
});

// @desc    Fetch product by ID
// @route   GET /api/products/:id
// @access  Private
const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: "Product not found" });
    }
});

// @desc    Get distinct manufacturers list
// @route   GET /api/products/manufacturers
// @access  Private
const getManufacturers = asyncHandler(async (req, res) => {
    const manufacturers = await Product.distinct("manufacturer");
    res.json(manufacturers.filter(Boolean).sort());
});

// @desc    Search products by description/manufacturer
// @route   GET /api/products/search
// @access  Private
const searchProducts = asyncHandler(async (req, res) => {
    const { query } = req.query;
    if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Search query is required." });
    }

    const products = await Product.find({
        $or: [
            { description: { $regex: query, $options: "i" } },
            { manufacturer: { $regex: query, $options: "i" } },
            { brand: { $regex: query, $options: "i" } }
        ]
    });

    res.json(products);
});

module.exports = {
    getProducts,
    getProductById,
    getManufacturers,
    searchProducts
};
