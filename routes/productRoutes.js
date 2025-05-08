const express = require("express");
const router = express.Router();

// Auth middleware
const { protect, admin } = require("../middleware/authMiddleware");

// Controller functions
const {
    getProducts,
    getProductById,
    getManufacturers,
    searchProducts,
    getProductsByManufacturerAndPartNumbers
} = require("../controllers/productController");

// Specific routes before parameterized routes

// @desc    Fetch all products
// @route   GET /api/products
router.route("/").get(protect, getProducts);

// @desc    Get distinct manufacturers
// @route   GET /api/products/manufacturers
router.route("/manufacturers").get(protect, getManufacturers);

// @desc    Search products by item number or description
// @route   GET /api/products/search
router.route("/search").get(protect, searchProducts);

// @desc    Get products by manufacturer and part numbers (for Offer bulk add)
// @route   POST /api/products/bulk-lookup
router.route("/bulk-lookup").post(protect, getProductsByManufacturerAndPartNumbers);

// Parameter routes after specific ones

// @desc    Fetch single product
// @route   GET /api/products/:id
router.route("/:id").get(protect, getProductById);

// --- Admin Routes ---

// @desc    Create a product
// @route   POST /api/products
router.route("/").post(protect, admin, async (req, res) => {
    try {
        const Product = require("../models/productModel");
        const product = new Product(req.body);
        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @desc    Update a product
// @route   PUT /api/products/:id
router.route("/:id").put(protect, admin, async (req, res) => {
    try {
        const Product = require("../models/productModel");
        const product = await Product.findById(req.params.id);

        if (product) {
            Object.keys(req.body).forEach(key => {
                product[key] = req.body[key];
            });

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: "Product not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
router.route("/:id").delete(protect, admin, async (req, res) => {
    try {
        const Product = require("../models/productModel");
        const product = await Product.findById(req.params.id);

        if (product) {
            await product.deleteOne(); // Use deleteOne() instead of remove()
            res.json({ message: "Product removed" });
        } else {
            res.status(404).json({ message: "Product not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
