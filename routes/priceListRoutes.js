const express = require("express");
const router = express.Router();
const {
    uploadPriceList,    // Handles CSV upload and processing
    getPriceListForClient,
    updatePriceList,    // Potentially update description or add/remove items manually?
    deletePriceList
} = require("./../controllers/priceListController"); // Adjust path as needed
const { protect } = require("./../middleware/authMiddleware");

// Apply auth middleware
router.use(protect);

// Route for uploading a price list (likely CSV)
// Needs middleware to handle file uploads (e.g., multer)
// router.post("/upload", upload.single("priceListFile"), uploadPriceList);
// For now, let's assume the controller handles data passed in the body
router.post("/upload", uploadPriceList); // Placeholder: expects parsed data in body

// Routes specific to a client's price list
router.route("/client/:clientId")
    .get(getPriceListForClient) // Get the price list for a specific client
    .put(updatePriceList)       // Update the price list for a client
    .delete(deletePriceList);   // Delete the price list for a client

module.exports = router;

