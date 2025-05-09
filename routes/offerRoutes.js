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

// @desc    Fetch all offers
// @route   GET /api/offers
router.route("/").get(protect, getOffers);

// @desc    Fetch single offer by ID
// @route   GET /api/offers/:id
router.route("/:id").get(protect, getOfferById);

// @desc    Create new offer
// @route   POST /api/offers
router.route("/").post(protect, admin, createOffer);

// @desc    Update existing offer
// @route   PUT /api/offers/:id
router.route("/:id").put(protect, admin, updateOffer);

// @desc    Delete offer (only if Draft)
// @route   DELETE /api/offers/:id
router.route("/:id").delete(protect, admin, deleteOffer);

// @desc    Generate PDF of an offer
// @route   GET /api/offers/:id/pdf
router.route("/:id/pdf").get(protect, generateOfferPdf);

// @desc    Generate CSV of an offer
// @route   GET /api/offers/:id/csv
router.route("/:id/csv").get(protect, generateOfferCsv);

module.exports = router;
