const mongoose = require("mongoose");

const priceListItemSchema = new mongoose.Schema({
    product: { // Reference to the specific product
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    // Store key identifiers for easier lookup without population if needed
    itemNo: {
        type: String,
        required: true,
    },
    manufacturer: {
        type: String,
        required: true,
    },
    // The specific price for this client/product combination
    price: {
        type: Number,
        required: true,
    },
    currency: { // Currency of the specific price
        type: String,
        required: true,
        default: "USD", // Default to USD as offers are in USD, but keep field for clarity
    },
}, { _id: false });

const customerPriceListSchema = new mongoose.Schema(
    {
        name: { // e.g., "Client ABC Standard Pricing 2024"
            type: String,
            required: true,
        },
        client: { // Link to a specific client
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: true,
            unique: true, // Assuming one price list per client for simplicity
        },
        description: {
            type: String,
        },
        effectiveDate: {
            type: Date,
            default: Date.now,
        },
        items: [priceListItemSchema],
    },
    {
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

// Optional: Add index for faster lookup by client and product details within items array
customerPriceListSchema.index({ client: 1, "items.itemNo": 1, "items.manufacturer": 1 });

const CustomerPriceList = mongoose.model("CustomerPriceList", customerPriceListSchema);

module.exports = CustomerPriceList;

