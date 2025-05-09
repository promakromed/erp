const express = require("express");
const router = express.Router();

const { protect, admin } = require("../middleware/authMiddleware");
const {
    getProducts,
    getProductById,
    getManufacturers,
    searchProducts,
    getProductsByManufacturerAndPartNumbers
} = require("../controllers/productController");

// Public access to bulk lookup (if needed), otherwise protected

router.route("/").get(protect, getProducts);
router.route("/:id").get(protect, getProductById);

router.route("/manufacturers").get(protect, getManufacturers);
router.route("/search").get(protect, searchProducts);
router.route("/bulk-lookup").post(protect, getProductsByManufacturerAndPartNumbers);

module.exports = router;
