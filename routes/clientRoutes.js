const express = require("express");
const router = express.Router();

const { protect, admin } = require("../middleware/authMiddleware");
// Import getOffers, createOffer, and the new getOfferById
const { createOffer, getOffers, getOfferById } = require("../controllers/offerController"); // Assuming the controller file is named offerController.js

// @desc    Create new offer
// @route   POST /api/offers
router.route("/").post(protect, admin, createOffer);

// @desc    GET all offers
// @route   GET /api/offers
router.route("/").get(protect, getOffers);

// @desc    GET single offer by ID
// @route   GET /api/offers/:id
router.route("/:id").get(protect, getOfferById); // Added route for getting a single offer

module.exports = router;

