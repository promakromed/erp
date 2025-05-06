const mongoose = require("mongoose");

const offerLineItemSchema = new mongoose.Schema({
    isManual: {
        type: Boolean,
        default: false,
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: function() { return !this.isManual; } // Conditionally required
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
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
    basePrice: {
        type: Number,
        required: true,
        default: 0 // Default for cases where it might not be set initially by calc
    },
    baseCurrency: {
        type: String,
        required: true,
        default: "USD" // Default for cases
    },
    pricingMethod: {
        type: String,
        enum: ["PriceList", "Margin"],
        required: true,
    },
    marginPercent: {
        type: Number,
        default: null, // Allow null, especially if PriceList method
    },
    finalPriceUSD: {
        type: Number,
        required: true,
        default: 0 // Default for cases
    },
    lineTotalUSD: { // Added this field as it's calculated and useful
        type: Number,
        required: true,
        default: 0
    }
}, { _id: false });

const offerSchema = new mongoose.Schema(
    {
        offerId: {
            type: String,
            required: true,
            unique: true,
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
            default: "Standard Terms: Payment due within 30 days. Delivery FOB Origin.",
        },
        // Add globalMarginPercent to the schema as it's used in calculations
        globalMarginPercent: {
            type: Number,
            default: 0
        },
        lineItems: [offerLineItemSchema],
    },
    {
        timestamps: true,
    }
);

const Offer = mongoose.model("Offer", offerSchema);

module.exports = Offer;

