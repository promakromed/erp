const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
    getProductsByManufacturerAndPartNumbers,
    getManufacturers
} = require("../controllers/productController");

// @desc    Get manufacturers list
// @route   GET /api/products/manufacturers
router.route("/manufacturers").get(protect, getManufacturers);

// @desc    Bulk product lookup by manufacturer (and part numbers)
// @route   POST /api/products/bulk-by-manufacturer 
// Changed path from /bulk-lookup to /bulk-by-manufacturer
router.route("/bulk-by-manufacturer").post(protect, getProductsByManufacturerAndPartNumbers);

module.exports = router;

