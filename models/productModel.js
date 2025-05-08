const mongoose = require("mongoose");

// Define Supplier Offer Subdocument Schema
const supplierOfferSchema = new mongoose.Schema({
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supplier",
        required: true
    },
    catalogNo: {
        type: String,
        trim: true
    },
    originalPrice: {
        type: Number,
        default: 0,
        required: true
    },
    originalCurrency: {
        type: String,
        default: "USD",
        required: true
    },
    usdPrice: {
        type: Number,
        default: 0
    },
    minOrderQty: {
        type: Number,
        default: 1,
        required: true
    },
    discountTiers: [{
        quantity: { type: Number, default: 1 },
        price: { type: Number, default: 0 }
    }],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

// Define Product Schema
const productSchema = new mongoose.Schema({
    itemNo: {
        type: String,
        required: true,
        trim: true,
        index: true,
        unique: true // or with manufacturer if needed
    },
    manufacturer: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    brand: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    size: {
        type: String,
        trim: true
    },
    basePrice: {
        type: Number,
        default: null
    },
    baseCurrency: {
        type: String,
        default: "USD"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    inStock: {
        type: Number,
        default: 0
    },
    defaultMargin: {
        type: Number,
        default: null
    },
    attachments: [{
        fileName: String,
        fileUrl: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    supplierOffers: [supplierOfferSchema],
    basePriceUSDForMarginApplication: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Indexes for faster queries
productSchema.index({ manufacturer: 1 });
productSchema.index({ itemNo: 1, manufacturer: 1 }, { unique: true }); // Enforce uniqueness if needed
productSchema.index({ itemNo: 1 }, { collation: { locale: "en", strength: 2 } });

// Export model
module.exports = mongoose.model("Product", productSchema);
