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

// @desc    Bulk product lookup
// @route   POST /api/products/bulk-lookup
router.route("/bulk-lookup").post(protect, getProductsByManufacturerAndPartNumbers);

module.exports = router;
