const fs = require("fs");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const colors = require("colors");

// Load env vars
dotenv.config();

// Load models
const Product = require("./models/productModel");
const User = require("./models/userModel");

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Read JSON files
const products = JSON.parse(
  fs.readFileSync(`${__dirname}/data/product_data.json`, "utf-8")
);

// Import/Update data using Upsert
const upsertData = async () => {
  try {
    // Check if admin user exists, if not create one
    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      console.log("Creating default admin user...".yellow);
      await User.create({
        name: "Admin User",
        email: "admin@example.com",
        password: "password123", // Remember to change this in production!
        role: "admin",
      });
      console.log("Default admin user created".green);
    }

    console.log("Processing products for upsert...".yellow);

    // Prepare bulk operations for upsert
    const operations = products.map(product => ({
      updateOne: {
        filter: { itemNo: product.itemNo }, // Find document by unique itemNo
        update: { $set: product }, // Update with the new data from JSON
        upsert: true // Insert if document doesn't exist
      }
    }));

    if (operations.length === 0) {
        console.log("No products found in JSON file to process.".yellow);
        process.exit();
    }

    console.log(`Attempting to upsert ${operations.length} products...`.yellow);
    const result = await Product.bulkWrite(operations);
    console.log("Upsert operation completed.".green);
    console.log(`  Inserted: ${result.upsertedCount}`.cyan);
    console.log(`  Matched: ${result.matchedCount}`.cyan);
    console.log(`  Modified: ${result.modifiedCount}`.cyan);

    console.log("Data Upserted Successfully!".green.inverse);
    process.exit();
  } catch (err) {
    console.error(`${err}`.red.inverse);
    process.exit(1);
  }
};

// Delete all data
const deleteData = async () => {
  try {
    await Product.deleteMany();
    console.log("Data Destroyed!".red.inverse);
    process.exit();
  } catch (err) {
    console.error(`${err}`.red.inverse);
    process.exit(1);
  }
};

// Determine which operation to perform based on command line args
if (process.argv[2] === "-d") {
  deleteData();
} else {
  // Default action is now upsert
  upsertData();
}

