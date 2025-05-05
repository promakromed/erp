const mongoose = require("mongoose");

const clientSchema = mongoose.Schema(
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
      // Basic email format validation
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
    // Add user relation if needed later, e.g., to track who created the client
    // user: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   required: true,
    //   ref: 'User',
    // },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt timestamps
  }
);

module.exports = mongoose.model("Client", clientSchema);

