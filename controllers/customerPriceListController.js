const asyncHandler = require("express-async-handler");
const CustomerPriceList = require("../models/customerPriceListModel");
const Client = require("../models/clientModel");

// @desc    Fetch all customer price lists
// @route   GET /api/price-lists
// @access  Private/Admin
const getCustomerPriceLists = asyncHandler(async (req, res) => {
    const priceLists = await CustomerPriceList.find({})
        .populate("customer", "companyName clientName")
        .sort({ createdAt: -1 });
    res.json(priceLists);
});

// @desc    Get single customer price list by ID
// @route   GET /api/price-lists/:id
// @access  Private
const getCustomerPriceListById = asyncHandler(async (req, res) => {
    const priceList = await CustomerPriceList.findById(req.params.id)
        .populate("customer", "companyName clientName")
        .populate({
            path: "items.productId",
            select: "itemNo description manufacturer"
        });

    if (priceList) {
        res.json(priceList);
    } else {
        res.status(404).json({ message: "Price list not found" });
    }
});

// @desc    Create new customer price list
// @route   POST /api/price-lists
// @access  Private/Admin
const createCustomerPriceList = asyncHandler(async (req, res) => {
    const { customer, items } = req.body;

    if (!customer || !Array.isArray(items)) {
        res.status(400).json({ message: "Customer and items are required." });
        return;
    }

    // Check if client exists
    const clientExists = await Client.findById(customer);
    if (!clientExists) {
        res.status(404).json({ message: "Client not found" });
        return;
    }

    // Ensure item numbers are strings and prices are valid
    const processedItems = items.map(item => ({
        itemNo: item.itemNo ? item.itemNo.toString() : "",
        productId: item.productId || null,
        price: typeof item.price === "number" ? item.price : 0,
        currency: item.currency || "USD"
    }));

    const newPriceList = new CustomerPriceList({
        customer,
        items: processedItems
    });

    const createdPriceList = await newPriceList.save();
    res.status(201).json(createdPriceList);
});

// @desc    Update customer price list
// @route   PUT /api/price-lists/:id
// @access  Private/Admin
const updateCustomerPriceList = asyncHandler(async (req, res) => {
    const { customer, items } = req.body;

    const priceList = await CustomerPriceList.findById(req.params.id);

    if (!priceList) {
        res.status(404).json({ message: "Price list not found" });
        return;
    }

    // Optionally update customer
    if (customer) {
        const clientExists = await Client.findById(customer);
        if (!clientExists) {
            res.status(404).json({ message: "Client not found" });
            return;
        }
        priceList.customer = customer;
    }

    // Optionally update items
    if (items && Array.isArray(items)) {
        priceList.items = items.map(item => ({
            itemNo: item.itemNo?.toString() || "",
            productId: item.productId || null,
            price: typeof item.price === "number" ? item.price : 0,
            currency: item.currency || "USD"
        }));
    }

    const updatedPriceList = await priceList.save();
    res.json(updatedPriceList);
});

// @desc    Delete customer price list
// @route   DELETE /api/price-lists/:id
// @access  Private/Admin
const deleteCustomerPriceList = asyncHandler(async (req, res) => {
    const priceList = await CustomerPriceList.findById(req.params.id);

    if (!priceList) {
        res.status(404).json({ message: "Price list not found" });
        return;
    }

    await priceList.deleteOne();
    res.json({ message: "Price list deleted successfully" });
});

module.exports = {
    getCustomerPriceLists,
    getCustomerPriceListById,
    createCustomerPriceList,
    updateCustomerPriceList,
    deleteCustomerPriceList
};
