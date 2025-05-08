const express = require("express");
const router = express.Router();

// Middleware
const { protect, admin } = require("../middleware/authMiddleware");

// Controller functions
const {
    getCustomerPriceLists,
    getCustomerPriceListById,
    createCustomerPriceList,
    updateCustomerPriceList,
    deleteCustomerPriceList
} = require("../controllers/priceListController");

// @desc    GET all price lists or CREATE new one
// @route   GET /api/price-lists
// @route   POST /api/price-lists
router.route("/")
    .get(protect, getCustomerPriceLists)
    .post(protect, admin, createCustomerPriceList);

// @desc    GET, UPDATE, DELETE single price list
// @route   GET /api/price-lists/:id
// @route   PUT /api/price-lists/:id
// @route   DELETE /api/price-lists/:id
router.route("/:id")
    .get(protect, getCustomerPriceListById)
    .put(protect, admin, updateCustomerPriceList)
    .delete(protect, admin, deleteCustomerPriceList);

module.exports = router;
