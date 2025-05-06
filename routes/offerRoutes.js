const express = require("express");
const router = express.Router();
const {
    createOffer,
    getOffers,
    getOfferById,
    updateOffer,
    deleteOffer,
    // addManualOfferLineItem, // Not implemented/exported in controller
    // updateOfferLineItem,    // Not implemented/exported in controller
    // removeOfferLineItem,    // Not implemented/exported in controller
    generateOfferPdf,
    generateOfferCsv
} = require("./../controllers/offerController"); // Adjust path as needed
const { protect } = require("./../middleware/authMiddleware"); // Assuming auth middleware exists

// Apply auth middleware to all offer routes
router.use(protect);

// Offer CRUD operations
router.route("/")
    .post(createOffer) // Create a new offer (initially empty or with client)
    .get(getOffers);    // Get a list of offers (with filtering/pagination?)

router.route("/:id")
    .get(getOfferById)  // Get a specific offer by ID
    .put(updateOffer)   // Update offer details (e.g., client, validity, terms, status)
    .delete(deleteOffer); // Delete an offer (likely only if in Draft status)

// Offer Line Item operations (Commented out as handled within updateOffer)
/*
router.route("/:id/items")
    .post(addManualOfferLineItem); // Add a manual line item

router.route("/:id/items/:itemId") // Assuming line items get a unique ID within the offer context
    .put(updateOfferLineItem)    // Update a line item (e.g., quantity, pricing method)
    .delete(removeOfferLineItem); // Remove a line item from an offer
*/

// Offer Output Generation
router.route("/:id/pdf").get(generateOfferPdf);
router.route("/:id/csv").get(generateOfferCsv);

module.exports = router;

