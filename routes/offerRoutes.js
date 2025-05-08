const express = require("express");
const router = express.Router();

// Middleware
const { protect, admin } = require("../middleware/authMiddleware");

// Controller functions
const {
    getOffers,
    getOfferById,
    createOffer,
    updateOffer,
    deleteOffer,
    generateOfferPdf,
    generateOfferCsv
} = require("../controllers/offerController");

// @desc    Get all offers
// @route   GET /api/offers
// @access  Private
router.route("/").get(protect, getOffers);

// @desc    Create a new offer
// @route   POST /api/offers
// @access  Private
router.route("/").post(protect, createOffer);

// @desc    Get single offer by ID
// @route   GET /api/offers/:id
// @access  Private
router.route("/:id").get(protect, getOfferById);

// @desc    Update an offer
// @route   PUT /api/offers/:id
// @access  Private
router.route("/:id").put(protect, updateOffer);

// @desc    Delete an offer (only if Draft)
// @route   DELETE /api/offers/:id
// @access  Private
router.route("/:id").delete(protect, deleteOffer);

// @desc    Generate PDF of offer
// @route   GET /api/offers/:id/pdf
// @access  Private
router.route("/:id/pdf").get(protect, generateOfferPdf);

// @desc    Generate CSV of offer
// @route   GET /api/offers/:id/csv
// @access  Private
router.route("/:id/csv").get(protect, generateOfferCsv);

module.exports = router;
