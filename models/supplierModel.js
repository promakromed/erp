const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Supplier name is required"],
            unique: true,
            trim: true,
            index: true
        },
        contactPerson: {
            type: String,
            trim: true,
            default: ""
        },
        phoneCountryCode: {
            type: String,
            trim: true,
            default: ""
        },
        phoneNumber: {
            type: String,
            trim: true,
            default: ""
        },
        fullPhoneNumber: {
            type: String,
            trim: true,
            default: ""
        },
        email: {
            type: String,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
            default: ""
        },
        address: {
            type: String,
            trim: true,
            default: ""
        },
        city: {
            type: String,
            trim: true,
            default: ""
        },
        country: {
            type: String,
            trim: true,
            default: ""
        },
        notes: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

// Optional: Virtual for full phone number
supplierSchema.virtual("phoneNumberDisplay").get(function () {
    return this.fullPhoneNumber || (this.phoneCountryCode && this.phoneNumber ? `${this.phoneCountryCode} ${this.phoneNumber}` : "");
});

// Enable virtuals in JSON output
supplierSchema.set("toJSON", { virtuals: true });
supplierSchema.set("toObject", { virtuals: true });

// Export the model
module.exports = mongoose.model("Supplier", supplierSchema);
