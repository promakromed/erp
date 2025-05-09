const asyncHandler = require("express-async-handler");
const Client = require("../models/clientModel");

// @desc    Fetch all clients
// @route   GET /api/clients
// @access  Private/Admin
const getClients = asyncHandler(async (req, res) => {
    const clients = await Client.find({});
    res.json(clients);
});

// @desc    Get client by ID
// @route   GET /api/clients/:id
// @access  Private
const getClientById = asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id);
    if (client) {
        res.json(client);
    } else {
        res.status(404).json({ message: "Client not found" });
    }
});

// @desc    Create new client
// @route   POST /api/clients
// @access  Private/Admin
const createClient = asyncHandler(async (req, res) => {
    const {
        companyName,
        clientName,
        contactPerson,
        phoneCountryCode,
        phoneNumber,
        fullPhoneNumber,
        email,
        address,
        city,
        country,
        priceListId
    } = req.body;

    const newClient = new Client({
        companyName,
        clientName,
        contactPerson,
        phoneCountryCode,
        phoneNumber,
        fullPhoneNumber,
        email,
        address,
        city,
        country,
        priceListId
    });

    const createdClient = await newClient.save();
    res.status(201).json(createdClient);
});

// @desc    Update existing client
// @route   PUT /api/clients/:id
// @access  Private/Admin
const updateClient = asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id);
    if (!client) {
        return res.status(404).json({ message: "Client not found" });
    }

    Object.keys(req.body).forEach(key => {
        client[key] = req.body[key];
    });

    const updatedClient = await client.save();
    res.json(updatedClient);
});

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private/Admin
const deleteClient = asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id);
    if (!client) {
        return res.status(404).json({ message: "Client not found" });
    }

    await client.remove();
    res.json({ message: "Client deleted successfully" });
});

module.exports = {
    getClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient
};
