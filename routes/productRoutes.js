const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { getProductsByManufacturerAndPartNumbers } = require("../controllers/productController");

// Route for bulk product lookup
router.route("/bulk-lookup").post(protect, getProductsByManufacturerAndPartNumbers);

module.exports = router;
