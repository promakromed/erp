const mongoose = require("mongoose");

const offerLineItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    // Snapshot of product details at the time of adding to offer
    description: {
        type: String,
        required: true,
    },
    itemNo: {
        type: String,
        required: true,
    },
    manufacturer: {
        type: String,
        required: true,
    },
    // Pricing details for the line item
    basePrice: { // e.g., Winning price or list price before margin/conversion
        type: Number,
        required: true,
    },
    baseCurrency: { // Currency of the basePrice
        type: String,
        required: true,
    },
    pricingMethod: {
        type: String,
        enum: ["PriceList", "Margin"], // Method used for final price calculation
        required: true,
    },
    marginPercent: { // Applicable if pricingMethod is "Margin"
        type: Number,
        default: 0,
    },
    finalPriceUSD: { // Calculated price per unit in USD
        type: Number,
        required: true,
    },
}, { _id: false }); // No separate _id for line items needed

const offerSchema = new mongoose.Schema(
    {
        offerId: {
            type: String,
            required: true,
            unique: true, // Ensure uniqueness, generation logic will be in controller
            index: true,
        },
        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: true,
        },
        status: {
            type: String,
            enum: ["Draft", "Sent", "Accepted", "Rejected", "Expired"],
            default: "Draft",
            required: true,
        },
        validityDate: {
            type: Date,
        },
        terms: {
            type: String,
            default: "Standard Terms: Payment due within 30 days. Delivery FOB Origin.", // Default terms
        },
        lineItems: [offerLineItemSchema],
        // Optional: Add fields for total offer value, etc.
        // totalValueUSD: {
        //     type: Number,
        //     default: 0,
        // },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

// Pre-save hook or method could be used to calculate totalValueUSD if needed

const Offer = mongoose.model("Offer", offerSchema);

module.exports = Offer;

