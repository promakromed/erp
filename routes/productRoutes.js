const express = require("express");
const router = express.Router();

// Middleware
const { protect, admin } = require("../middleware/authMiddleware");

// Controller functions
const {
    getProducts,
    getProductById,
    getManufacturers,
    searchProducts,
    getProductsByManufacturerAndPartNumbers
} = require("../controllers/productController");

// Specific routes first (no parameterized routes before them)

// @desc    Fetch all products
// @route   GET /api/products
router.route("/").get(protect, getProducts);

// @desc    Get distinct manufacturers for dropdown
// @route   GET /api/products/manufacturers
router.route("/manufacturers").get(protect, getManufacturers);

// @desc    Search products by item number or description
// @route   GET /api/products/search
router.route("/search").get(protect, searchProducts);

// @desc    Get products by manufacturer + part numbers (used in bulk add)
// @route   POST /api/products/bulk-lookup
router.route("/bulk-lookup").post(protect, getProductsByManufacturerAndPartNumbers);

// Parameterized routes come after specific ones

// @desc    Fetch single product by ID
// @route   GET /api/products/:id
router.route("/:id").get(protect, getProductById);

// Admin-only routes

// @desc    Create a new product
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

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Update fields from request body
        Object.keys(req.body).forEach(key => {
            if (key !== "_id") {
                product[key] = req.body[key];
            }
        });

        const updatedProduct = await product.save();
        res.json(updatedProduct);
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

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        await product.deleteOne(); // deleteOne() is preferred over remove()
        res.json({ message: "Product removed" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
