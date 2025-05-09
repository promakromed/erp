const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");

// @desc    Get products by manufacturer and part numbers
// @route   POST /api/products/bulk-lookup
// @access  Private
const getProductsByManufacturerAndPartNumbers = asyncHandler(async (req, res) => {
    const { manufacturer, partNumbers } = req.body;

    if (!manufacturer || !Array.isArray(partNumbers) || partNumbers.length === 0) {
        return res.status(400).json({
            message: "Manufacturer and a non-empty array of partNumbers are required."
        });
    }

    try {
        const itemNoArray = partNumbers.map(pn => pn.trim());
        const products = await Product.find({
            manufacturer,
            itemNo: { $in: itemNoArray }
        }).lean();

        const results = itemNoArray.map(itemNo => {
            const match = products.find(p => p.itemNo === itemNo);
            return {
                itemNumber: itemNo,
                found: !!match,
                data: match || null
            };
        });

        res.json(results);
    } catch (error) {
        console.error("Error in bulk lookup:", error.message);
        res.status(500).json({ message: "Server Error during bulk lookup" });
    }
});

// @desc    Get distinct manufacturers list
// @route   GET /api/products/manufacturers
// @access  Private
const getManufacturers = asyncHandler(async (req, res) => {
    const manufacturers = await Product.distinct("manufacturer");
    res.json(manufacturers.filter(Boolean).sort());
});

module.exports = {
    getProductsByManufacturerAndPartNumbers,
    getManufacturers
};
