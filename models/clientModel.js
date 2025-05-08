const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
    {
        clientName: {
            type: String,
            required: [true, "Please add a client name"],
        },
        companyName: {
            type: String,
            required: [true, "Please add a company name"],
        },
        contactPerson: {
            type: String,
        },
        email: {
            type: String,
            required: [true, "Please add an email"],
            match: [/^\S+@\S+\.\S+$/, "Please add a valid email"],
        },
        phoneCountryCode: {
            type: String,
            required: [true, "Please select a phone country code"],
        },
        phoneNumber: {
            type: String,
            required: [true, "Please add a phone number"],
        },
        address: {
            type: String,
            required: [true, "Please add an address"],
        },
        city: {
            type: String,
            required: [true, "Please add a city"],
        },
        country: {
            type: String,
            required: [true, "Please add a country"],
        },
        // Optional link to price list
        priceListId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CustomerPriceList",
            default: null
        }
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual for full phone number
clientSchema.virtual("fullPhoneNumber").get(function () {
    return this.phoneCountryCode && this.phoneNumber
        ? `${this.phoneCountryCode} ${this.phoneNumber}`
        : "";
});

module.exports = mongoose.model("Client", clientSchema);
