const express = require("express");
const router = express.Router();

const { protect, admin } = require("../middleware/authMiddleware");
const {
    getCustomerPriceLists,
    getCustomerPriceListById,
    createCustomerPriceList,
    updateCustomerPriceList,
    deleteCustomerPriceList
} = require("../controllers/customerPriceListController");

// @desc    GET all price lists or CREATE new
router.route("/")
    .get(protect, getCustomerPriceLists)
    .post(protect, admin, createCustomerPriceList);

// @desc    GET / UPDATE / DELETE single price list
router.route("/:id")
    .get(protect, getCustomerPriceListById)
    .put(protect, admin, updateCustomerPriceList)
    .delete(protect, admin, deleteCustomerPriceList);

module.exports = router;
