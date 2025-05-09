const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");

// @desc    Fetch all products
// @route   GET /api/products
// @access  Private
const getProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({}).sort({ createdAt: -1 });
    res.json(products);
});

// @desc    Get product by ID
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

// @desc    Get manufacturers list
// @route   GET /api/products/manufacturers
// @access  Private
const getManufacturers = asyncHandler(async (req, res) => {
    const manufacturers = await Product.distinct("manufacturer");
    const filtered = manufacturers.filter(Boolean).sort();
    res.json(filtered);
});

// @desc    Search products by text
// @route   GET /api/products/search
// @access  Private
const searchProducts = asyncHandler(async (req, res) => {
    const { query } = req.query;
    if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Search query is required." });
    }

    const results = await Product.find({
        $or: [
            { description: { $regex: query, $options: "i" } },
            { manufacturer: { $regex: query, $options: "i" } },
            { brand: { $regex: query, $options: "i" } }
        ]
    });

    res.json(results);
});

// @desc    Bulk lookup for product pricing
// @route   POST /api/products/bulk-lookup
const getProductsByManufacturerAndPartNumbers = asyncHandler(async (req, res) => {
    const { manufacturer, itemNumbers } = req.body;

    if (!manufacturer || !Array.isArray(itemNumbers) || itemNumbers.length === 0) {
        return res.status(400).json({
            message: "Manufacturer and a non-empty array of item numbers are required."
        });
    }

    try {
        const itemNoArray = itemNumbers.map(i => i.trim());
        const products = await Product.find({
            manufacturer,
            itemNo: { $in: itemNoArray }
        }).lean();

        const processed = itemNoArray.map(itemNo => {
            const match = products.find(p => p.itemNo === itemNo);
            return {
                itemNumber: itemNo,
                found: !!match,
                data: match || null
            };
        });

        console.log("DEBUG: Bulk lookup response:", JSON.stringify(processed, null, 2));
        res.json(processed);
    } catch (error) {
        console.error("Error in bulk lookup:", error.message);
        res.status(500).json({ message: "Server Error during bulk lookup" });
    }
});

module.exports = {
    getProducts,
    getProductById,
    getManufacturers,
    searchProducts,
    getProductsByManufacturerAndPartNumbers
};
