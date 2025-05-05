const express = require("express");
const router = express.Router();
const {
  getClients,
  setClient,
  updateClient,
  deleteClient,
  getClientById, // Optional: If needed for viewing/editing single client details
} = require("../controllers/clientController");

const { protect } = require("../middleware/authMiddleware");

// Route for getting all clients and creating a new client
router.route("/").get(protect, getClients).post(protect, setClient);

// Route for getting, updating, and deleting a specific client by ID
router
  .route("/:id")
  .get(protect, getClientById) // Optional: Add if a dedicated view/edit page per client is planned
  .put(protect, updateClient)
  .delete(protect, deleteClient);

module.exports = router;

