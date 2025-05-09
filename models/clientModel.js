const mongoose = require("mongoose");

// Define schema for Client model
const clientSchema = new mongoose.Schema(
    {
        // Company name is required
        companyName: {
            type: String,
            required: [true, "Please add a company name"],
            trim: true,
            index: true
        },

        // Contact person (optional)
        clientName: {
            type: String,
            required: [true, "Please add a client name"],
            trim: true
        },

        // Email address (required + format validation)
        email: {
            type: String,
            required: [true, "Please add an email"],
            match: [/^\S+@\S+\.\S+$/, "Please add a valid email"],
            trim: true,
            unique: true,
            index: true
        },

        // Phone info (required parts)
        phoneCountryCode: {
            type: String,
            required: [true, "Please select a phone country code"],
            trim: true
        },
        phoneNumber: {
            type: String,
            required: [true, "Please add a phone number"],
            trim: true
        },

        // Address fields
        address: {
            type: String,
            required: [true, "Please add an address"],
            trim: true
        },
        city: {
            type: String,
            required: [true, "Please add a city"],
            trim: true
        },
        country: {
            type: String,
            required: [true, "Please add a country"],
            trim: true
        },

        // Optional link to price list
        priceListId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CustomerPriceList",
            default: null
        },

        // Notes and tags (for future expansion)
        notes: {
            type: String,
            default: ""
        },
        tags: [{
            type: String,
            trim: true
        }]
    },
    {
        timestamps: true, // Adds createdAt, updatedAt
        toJSON: { virtuals: true }, // Include virtuals in JSON output
        toObject: { virtuals: true } // Include virtuals when converted to object
    }
);

// Virtual field: Full phone number
clientSchema.virtual("fullPhoneNumber").get(function () {
    return this.phoneCountryCode && this.phoneNumber
        ? `${this.phoneCountryCode} ${this.phoneNumber}`
        : "";
});

// Export the model
module.exports = mongoose.model("Client", clientSchema);
