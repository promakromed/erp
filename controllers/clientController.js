const asyncHandler = require("express-async-handler");
const Client = require("../models/clientModel");

// @desc    Get clients
// @route   GET /api/clients
// @access  Private
const getClients = asyncHandler(async (req, res) => {
  console.log("--- GET CLIENTS START ---");
  // Optional: Add filtering/pagination later if needed
  const clients = await Client.find().sort({ companyName: 1 }); // Sort by company name
  console.log(`DEBUG: Found ${clients.length} clients.`);
  console.log("--- GET CLIENTS END ---");
  res.status(200).json(clients);
});

// @desc    Set client
// @route   POST /api/clients
// @access  Private
const setClient = asyncHandler(async (req, res) => {
  console.log("--- CREATE CLIENT START ---");
  console.log("DEBUG: Request body:", req.body);
  const {
    clientName,
    companyName,
    contactPerson,
    email,
    phoneCountryCode,
    phoneNumber,
    address,
    city,
    country,
  } = req.body;

  // Basic validation for required fields (Model also enforces this)
  if (
    !clientName ||
    !companyName ||
    !email ||
    !phoneCountryCode ||
    !phoneNumber ||
    !address ||
    !city ||
    !country
  ) {
    res.status(400);
    throw new Error("Please add all required client fields");
  }

  // Check if client email already exists (optional, but good practice)
  const clientExists = await Client.findOne({ email });
  if (clientExists) {
    res.status(400);
    throw new Error("Client with this email already exists");
  }

  const client = await Client.create({
    clientName,
    companyName,
    contactPerson,
    email,
    phoneCountryCode,
    phoneNumber,
    address,
    city,
    country,
    // user: req.user.id // Optional: Associate client with the logged-in user
  });

  console.log("DEBUG: Client created successfully:", client._id);
  console.log("--- CREATE CLIENT END ---");
  res.status(201).json(client);
});

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private
const updateClient = asyncHandler(async (req, res) => {
  console.log("--- UPDATE CLIENT START ---");
  console.log("DEBUG: Client ID:", req.params.id);
  console.log("DEBUG: Update data:", req.body);
  const client = await Client.findById(req.params.id);

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  // Optional: Check if user is authorized to update this client
  // if (client.user.toString() !== req.user.id) {
  //   res.status(401);
  //   throw new Error('User not authorized');
  // }

  // Prevent updating email to one that already exists (excluding the current client)
  if (req.body.email && req.body.email !== client.email) {
      const clientExists = await Client.findOne({ email: req.body.email });
      if (clientExists) {
          res.status(400);
          throw new Error("Another client with this email already exists");
      }
  }

  const updatedClient = await Client.findByIdAndUpdate(req.params.id, req.body, {
    new: true, // Return the updated document
    runValidators: true, // Ensure updates adhere to schema validation
  });

  console.log("DEBUG: Client updated successfully:", updatedClient._id);
  console.log("--- UPDATE CLIENT END ---");
  res.status(200).json(updatedClient);
});

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private
const deleteClient = asyncHandler(async (req, res) => {
  console.log("--- DELETE CLIENT START ---");
  console.log("DEBUG: Client ID:", req.params.id);
  const client = await Client.findById(req.params.id);

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  // Optional: Check if user is authorized to delete this client
  // if (client.user.toString() !== req.user.id) {
  //   res.status(401);
  //   throw new Error('User not authorized');
  // }

  await client.deleteOne(); // Use deleteOne() on the document

  console.log("DEBUG: Client deleted successfully:", req.params.id);
  console.log("--- DELETE CLIENT END ---");
  res.status(200).json({ id: req.params.id, message: "Client deleted" });
});

// @desc    Get single client by ID
// @route   GET /api/clients/:id
// @access  Private
const getClientById = asyncHandler(async (req, res) => {
  console.log("--- GET CLIENT BY ID START ---");
  console.log("DEBUG: Client ID:", req.params.id);
  const client = await Client.findById(req.params.id);

  if (!client) {
    res.status(404);
    throw new Error("Client not found");
  }

  // Optional: Check if user is authorized to view this client
  // if (client.user.toString() !== req.user.id) {
  //   res.status(401);
  //   throw new Error('User not authorized');
  // }

  console.log("DEBUG: Client found:", client._id);
  console.log("--- GET CLIENT BY ID END ---");
  res.status(200).json(client);
});

module.exports = {
  getClients,
  setClient,
  updateClient,
  deleteClient,
  getClientById,
};

