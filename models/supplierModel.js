const mongoose = require("mongoose");

const supplierSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // Ensure supplier names are unique
      trim: true,
    },
    // Add other supplier-specific fields here if needed in the future
    // e.g., contactInfo, address, etc.
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

const Supplier = mongoose.model("Supplier", supplierSchema);

module.exports = Supplier;

