const asyncHandler = require("express-async-handler");
const CustomerPriceList = require("../models/customerPriceListModel");
const Client = require("../models/clientModel");
const Product = require("../models/productModel");
const mongoose = require("mongoose");
const { parse } = require("csv-parse/sync"); // Using sync version for simplicity here, async might be better for large files

// @desc    Upload and process a customer price list (e.g., from CSV data)
// @route   POST /api/pricelists/upload
// @access  Private
const uploadPriceList = asyncHandler(async (req, res) => {
    // This controller assumes the CSV data is parsed and provided in req.body.
    // In a real implementation, use middleware like multer to handle file uploads
    // and then parse the file buffer here.
    const { clientId, name, description, csvData } = req.body; // csvData is the string content of the CSV

    if (!clientId || !name || !csvData) {
        res.status(400);
        throw new Error("clientId, name, and csvData are required.");
    }

    const clientExists = await Client.findById(clientId);
    if (!clientExists) {
        res.status(404);
        throw new Error("Client not found.");
    }

    // Parse the CSV data
    let records;
    try {
        records = parse(csvData, {
            columns: true, // Assumes first row is header
            skip_empty_lines: true,
            trim: true,
        });
    } catch (error) {
        console.error("CSV Parsing Error:", error);
        res.status(400);
        throw new Error(`Failed to parse CSV data: ${error.message}`);
    }

    if (!records || records.length === 0) {
        res.status(400);
        throw new Error("CSV data is empty or invalid.");
    }

    // Validate expected columns (adjust based on actual CSV format)
    const expectedColumns = ["itemNo", "manufacturer", "price", "currency"];
    const actualColumns = Object.keys(records[0]);
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
    if (missingColumns.length > 0) {
        res.status(400);
        throw new Error(`Missing required columns in CSV: ${missingColumns.join(", ")}`);
    }

    // Process records and find corresponding products
    const priceListItems = [];
    const errors = [];
    for (const record of records) {
        const itemNo = record.itemNo;
        const manufacturer = record.manufacturer;
        const price = parseFloat(record.price);
        const currency = record.currency || "USD"; // Default currency if not specified

        if (!itemNo || !manufacturer || isNaN(price)) {
            errors.push(`Skipping invalid row: ${JSON.stringify(record)} (Missing itemNo, manufacturer, or invalid price)`);
            continue;
        }

        // Find the product in the database
        const product = await Product.findOne({ itemNo, manufacturer });
        if (!product) {
            errors.push(`Skipping row: Product not found for itemNo=${itemNo}, manufacturer=${manufacturer}`);
            continue;
        }

        priceListItems.push({
            product: product._id,
            itemNo: itemNo, // Store snapshot
            manufacturer: manufacturer, // Store snapshot
            price: price,
            currency: currency,
        });
    }

    // Create or update the price list for the client
    let priceList = await CustomerPriceList.findOne({ client: clientId });

    if (priceList) {
        // Update existing price list
        priceList.name = name;
        priceList.description = description || priceList.description;
        priceList.items = priceListItems; // Replace all items
        priceList.effectiveDate = Date.now();
    } else {
        // Create new price list
        priceList = new CustomerPriceList({
            name,
            client: clientId,
            description,
            items: priceListItems,
            effectiveDate: Date.now(),
        });
    }

    const savedPriceList = await priceList.save();

    res.status(priceList ? 200 : 201).json({
        message: `Price list ${priceList ? "updated" : "created"} successfully.`, 
        priceList: savedPriceList,
        processingErrors: errors // Include any errors encountered during processing
    });
});

// @desc    Get the price list for a specific client
// @route   GET /api/pricelists/client/:clientId
// @access  Private
const getPriceListForClient = asyncHandler(async (req, res) => {
    const clientId = req.params.clientId;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
         res.status(400);
         throw new Error("Invalid Client ID format.");
    }

    const priceList = await CustomerPriceList.findOne({ client: clientId })
                                          .populate("client", "clientName companyName")
                                          .populate("items.product", "description size brand"); // Populate details if needed

    if (priceList) {
        res.json(priceList);
    } else {
        res.status(404);
        throw new Error("Price list not found for this client.");
    }
});

// @desc    Update a price list (e.g., name, description - item updates might be complex)
// @route   PUT /api/pricelists/client/:clientId
// @access  Private
const updatePriceList = asyncHandler(async (req, res) => {
    // This is simplified - updating individual items might require specific endpoints
    const { name, description } = req.body;
    const clientId = req.params.clientId;

    const priceList = await CustomerPriceList.findOne({ client: clientId });

    if (!priceList) {
        res.status(404);
        throw new Error("Price list not found for this client.");
    }

    priceList.name = name || priceList.name;
    priceList.description = description || priceList.description;
    // Updating items array directly via PUT might be complex; usually done via upload or specific item endpoints

    const updatedPriceList = await priceList.save();
    res.json(updatedPriceList);
});

// @desc    Delete a price list for a client
// @route   DELETE /api/pricelists/client/:clientId
// @access  Private
const deletePriceList = asyncHandler(async (req, res) => {
    const clientId = req.params.clientId;

    const priceList = await CustomerPriceList.findOne({ client: clientId });

    if (!priceList) {
        res.status(404);
        throw new Error("Price list not found for this client.");
    }

    await priceList.deleteOne();
    res.json({ message: "Price list deleted successfully." });
});

module.exports = {
    uploadPriceList,
    getPriceListForClient,
    updatePriceList,
    deletePriceList,
};

