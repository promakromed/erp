const express = require("express");
const router = express.Router();

const { protect, admin } = require("../middleware/authMiddleware");
// Import getOffers along with createOffer
const { createOffer, getOffers } = require("../controllers/offerController"); // Assuming the controller file is named offerController.js

// @desc    Create new offer
// @route   POST /api/offers
router.route("/").post(protect, admin, createOffer);

// @desc    GET all offers
// @route   GET /api/offers
// Updated to use the getOffers controller function
router.route("/").get(protect, getOffers); 

module.exports = router;
