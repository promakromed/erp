const express = require("express");
const router = express.Router();

const { protect, admin } = require("../middleware/authMiddleware");
const {
    getClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient
} = require("../controllers/clientController");

// @desc    GET all clients or CREATE new one
router.route("/")
    .get(protect, getClients)
    .post(protect, admin, createClient);

// @desc    GET / UPDATE / DELETE single client
router.route("/:id")
    .get(protect, getClientById)
    .put(protect, admin, updateClient)
    .delete(protect, admin, deleteClient);

module.exports = router;
