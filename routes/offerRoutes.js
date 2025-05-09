// routes/offerRoutes.js

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

// @desc    GET all offers
// @route   GET /api/offers
router.route("/")
    .get(protect, getOffers)
    .post(protect, admin, createOffer);

// @desc    GET / UPDATE / DELETE single offer
router.route("/:id")
    .get(protect, getOfferById)
    .put(protect, admin, updateOffer)
    .delete(protect, admin, deleteOffer);

// @desc    Generate PDF of offer
// @route   GET /api/offers/:id/pdf
router.route("/:id/pdf").get(protect, generateOfferPdf);

// @desc    Generate CSV of offer
// @route   GET /api/offers/:id/csv
router.route("/:id/csv").get(protect, generateOfferCsv);

module.exports = router;
