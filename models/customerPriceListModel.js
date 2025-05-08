const mongoose = require("mongoose");

// Define schema for each item in the price list
const priceListItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    itemNo: {
        type: String,
        required: true,
        trim: true
    },
    manufacturer: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
        default: "USD"
    }
}, { _id: false });

// Main Customer Price List Schema
const customerPriceListSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    effectiveDate: {
        type: Date,
        default: Date.now
    },
    items: [priceListItemSchema]
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Indexes for faster querying
customerPriceListSchema.index({ client: 1, "items.itemNo": 1 });
customerPriceListSchema.index({ client: 1 });

// Export model
module.exports = mongoose.model("CustomerPriceList", customerPriceListSchema);
