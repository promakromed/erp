const mongoose = require("mongoose");

// Define schema for each line item in an offer
const offerLineItemSchema = new mongoose.Schema({
    // Whether this item was added manually or from database
    isManual: {
        type: Boolean,
        default: false,
        required: true
    },

    // Product reference (only if not manual)
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: function () { return !this.isManual; },
        validate: {
            validator: function(v) {
                return this.isManual || v != null;
            },
            message: props => 'Product ID is required for non-manual items'
        }
    },

    // Item number (from product or manual entry)
    itemNo: {
        type: String,
        required: true,
        trim: true
    },

    // Manufacturer name (from product or manual entry)
    manufacturer: {
        type: String,
        required: true,
        trim: true
    },

    // Description (from product or manual entry)
    description: {
        type: String,
        required: true,
        trim: true
    },

    // Quantity (always required)
    quantity: {
        type: Number,
        required: true,
        min: [1, "Quantity must be at least 1"],
        default: 1
    },

    // Pricing method used ("PriceList" or "Margin")
    pricingMethod: {
        type: String,
        enum: ["PriceList", "Margin"],
        required: true,
        default: "Margin"
    },

    // Margin % applied (if using Margin pricing)
    marginPercent: {
        type: Number,
        default: null,
        nullable: true
    },

    // Base price used for calculation
    basePrice: {
        type: Number,
        required: true,
        default: 0
    },

    // Currency of base price
    baseCurrency: {
        type: String,
        required: true,
        default: "USD"
    },

    // Final calculated unit price in USD
    finalPriceUSD: {
        type: Number,
        required: true,
        default: 0
    },

    // Line total = quantity * unit price
    lineTotalUSD: {
        type: Number,
        required: true,
        default: 0
    }
}, { _id: false });

// Main Offer Schema
const offerSchema = new mongoose.Schema({
    // Unique offer ID (formatted as OFFER-YYYYMMDD-XXX)
    offerId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true
    },

    // Client associated with this offer
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true
    },

    // Status of the offer
    status: {
        type: String,
        enum: ["Draft", "Sent", "Accepted", "Rejected", "Expired"],
        default: "Draft",
        required: true
    },

    // Validity date for the offer
    validityDate: {
        type: Date,
        default: undefined
    },

    // Terms & conditions
    terms: {
        type: String,
        default: "Standard Terms: Payment due within 30 days. Delivery FOB Origin.",
        trim: true
    },

    // Global margin percentage (applied to all items unless overridden)
    globalMarginPercent: {
        type: Number,
        default: 0
    },

    // Array of line items
    lineItems: [offerLineItemSchema],

    // User who created the offer
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});

// Virtuals for easier UI rendering
offerSchema.virtual("clientName").get(function () {
    return this.client?.companyName || "N/A";
});

offerSchema.virtual("lineItemCount").get(function () {
    return this.lineItems.length;
});

// Enable virtuals when converting to JSON
offerSchema.set("toJSON", { virtuals: true });
offerSchema.set("toObject", { virtuals: true });

// Export model
module.exports = mongoose.model("Offer", offerSchema);
