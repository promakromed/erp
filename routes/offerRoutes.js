const express = require("express");
const router = express.Router();

const { protect, admin } = require("../middleware/authMiddleware");
const { createOffer } = require("../controllers/offerController");

// @desc    Create new offer
// @route   POST /api/offers
router.route("/").post(protect, admin, createOffer);

// @desc    GET all offers (for future expansion)
// Currently only POST is used; others can be added later
router.route("/").get(protect, (req, res) => {
    res.status(200).json({ message: "GET /api/offers placeholder" });
});

module.exports = router;
