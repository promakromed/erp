const express = require("express");
const router = express.Router();

// Middleware
const { protect, admin } = require("../middleware/authMiddleware");

// Controller functions
const {
    getClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient
} = require("../controllers/clientController");

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
router.route("/").get(protect, getClients);

// @desc    Create a client
// @route   POST /api/clients
// @access  Private/Admin
router.route("/").post(protect, admin, createClient);

// @desc    Get single client
// @route   GET /api/clients/:id
// @access  Private
router.route("/:id").get(protect, getClientById);

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private/Admin
router.route("/:id").put(protect, admin, updateClient);

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private/Admin
router.route("/:id").delete(protect, admin, deleteClient);

module.exports = router;
