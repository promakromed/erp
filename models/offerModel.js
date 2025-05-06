const mongoose = require("mongoose");

const offerLineItemSchema = new mongoose.Schema({
    isManual: { type: Boolean, default: false, required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, // Temporarily removed: required: function() { return !this.isManual; }
    quantity: { type: Number, required: true, min: 1 },
    description: { type: String, required: true },
    itemNo: { type: String, required: true },
    manufacturer: { type: String, required: true },
    basePrice: { type: Number, required: true, default: 0 },
    baseCurrency: { type: String, required: true, default: "USD" },
    pricingMethod: { type: String, enum: ["PriceList", "Margin"], required: true },
    marginPercent: { type: Number, default: null },
    finalPriceUSD: { type: Number, required: true, default: 0 },
    lineTotalUSD: { type: Number, required: true, default: 0 }
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
