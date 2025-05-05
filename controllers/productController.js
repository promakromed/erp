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
        // Filter out null or empty string manufacturers before getting distinct values
        const manufacturers = await Product.distinct("manufacturer", { manufacturer: { $ne: null, $ne: "" } });
        res.json(manufacturers.sort()); // Sort alphabetically
    } catch (error) {
        res.status(500);
        throw new Error("Could not fetch manufacturers");
    }
});

// @desc    Search products by item number or description (Kept for potential future use)
// @route   GET /api/products/search
// @access  Private (Requires login)
const searchProducts = asyncHandler(async (req, res) => {
    const query = req.query.query || "";
    const limit = parseInt(req.query.limit, 10) || 50; // Limit results

    if (!query) {
        return res.json([]);
    }

    try {
        let findConditions = {};
        const searchRegex = new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
        findConditions.$or = [
            { itemNo: searchRegex },
            { description: searchRegex }
        ];

        const products = await Product.find(findConditions)
            .limit(limit)
            .select("itemNo description manufacturer basePrice baseCurrency");

        res.json(products);
    } catch (error) {
        console.error("Product search error:", error);
        res.status(500);
        throw new Error("Error searching products");
    }
});

// @desc    Get products by manufacturer and list of part numbers
// @route   POST /api/products/bulk-lookup
// @access  Private (Requires login)
const getProductsByManufacturerAndPartNumbers = asyncHandler(async (req, res) => {
    const { manufacturer, partNumbers } = req.body;

    if (!manufacturer || !partNumbers || !Array.isArray(partNumbers) || partNumbers.length === 0) {
        res.status(400);
        throw new Error("Manufacturer and a non-empty array of partNumbers are required.");
    }

    // Sanitize part numbers (trim whitespace)
    const sanitizedPartNumbers = partNumbers.map(pn => String(pn).trim()).filter(pn => pn);

    if (sanitizedPartNumbers.length === 0) {
         res.status(400);
        throw new Error("Part numbers array cannot be empty after sanitization.");
    }

    try {
        const products = await Product.find({
            manufacturer: manufacturer,
            itemNo: { $in: sanitizedPartNumbers }
        })
        .select("itemNo description manufacturer basePrice baseCurrency"); // Select necessary fields

        // Optional: Return in the same order as input partNumbers? Requires more complex logic.
        // For now, return as found by MongoDB.
        res.json(products);

    } catch (error) {
        console.error("Bulk product lookup error:", error);
        res.status(500);
        throw new Error("Error looking up products");
    }
});


module.exports = {
    getProducts,
    getProductById,
    getManufacturers,
    searchProducts,
    getProductsByManufacturerAndPartNumbers // Export the new function
};

