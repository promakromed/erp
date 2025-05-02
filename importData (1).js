const fs = require("fs");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const colors = require("colors");

// Load env vars
dotenv.config();

// Load models
const Product = require("./models/productModel");
const Supplier = require("./models/supplierModel"); // Load the new Supplier model
const User = require("./models/userModel");

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Read JSON files
const suppliersList = JSON.parse(
  fs.readFileSync(`${__dirname}/data/suppliers.json`, "utf-8")
);
const productsList = JSON.parse(
  fs.readFileSync(`${__dirname}/data/products_new_format.json`, "utf-8")
);

// Import/Update data using Upsert
const upsertData = async () => {
  try {
    // --- Step 1: Upsert Suppliers ---
    console.log("Processing suppliers for upsert...".yellow);
    const supplierOps = suppliersList.map(name => ({
      updateOne: {
        filter: { name: name }, // Find by name
        update: { $set: { name: name } }, // Set name (or other fields if added later)
        upsert: true // Insert if not found
      }
    }));

    let supplierMap = {}; // To store name -> _id mapping

    if (supplierOps.length > 0) {
      console.log(`Attempting to upsert ${supplierOps.length} suppliers...`.yellow);
      await Supplier.bulkWrite(supplierOps);
      console.log("Supplier upsert completed.".green);
      // Fetch all suppliers to create a name -> _id map
      const allSuppliers = await Supplier.find({});
      allSuppliers.forEach(s => { supplierMap[s.name] = s._id; });
      console.log("Supplier ID map created.".cyan);
    } else {
      console.log("No suppliers found in suppliers.json to process.".yellow);
    }

    // --- Step 2: Create Default Admin User (if needed) ---
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

    // --- Step 3: Upsert Products with Supplier References ---
    console.log("Processing products for upsert...".yellow);

    // Prepare bulk operations for products
    const productOps = productsList.map(product => {
      // Map supplier offers to include supplier ObjectId
      const updatedOffers = product.supplierOffers.map(offer => {
        const supplierId = supplierMap[offer.supplierName];
        if (!supplierId) {
          console.warn(`WARNING: Supplier ID not found for name '${offer.supplierName}' in product ${product.itemNo}. Skipping this offer.`.red);
          return null; // Skip this offer if supplier ID wasn't found
        }
        // Create the new offer structure with ObjectId reference
        return {
          supplier: supplierId,
          price: offer.price,
          currency: offer.currency,
          catalogNo: offer.catalogNo,
          // Add other fields from offer if they exist and are needed
          // supplierItemNo: offer.supplierItemNo,
          // leadTime: offer.leadTime,
          // minOrderQty: offer.minOrderQty
        };
      }).filter(offer => offer !== null); // Remove any null offers

      // Prepare the update payload for the product
      const updatePayload = {
        ...product, // Spread existing product fields (itemNo, description, etc.)
        supplierOffers: updatedOffers // Replace with the updated offers array
      };

      return {
        updateOne: {
          filter: { itemNo: product.itemNo }, // Find document by unique itemNo
          update: { $set: updatePayload }, // Update with the new data
          upsert: true // Insert if document doesn't exist
        }
      };
    });

    if (productOps.length === 0) {
        console.log("No products found in products_new_format.json file to process.".yellow);
        // Don't exit yet, suppliers might have been updated
    } else {
        console.log(`Attempting to upsert ${productOps.length} products...`.yellow);
        const result = await Product.bulkWrite(productOps);
        console.log("Product upsert operation completed.".green);
        console.log(`  Inserted: ${result.upsertedCount}`.cyan);
        console.log(`  Matched: ${result.matchedCount}`.cyan);
        console.log(`  Modified: ${result.modifiedCount}`.cyan);
    }

    console.log("Data Upsert Process Finished!".green.inverse);
    process.exit();
  } catch (err) {
    console.error(`${err}`.red.inverse);
    process.exit(1);
  }
};

// Delete all data (Keep this function for cleanup if needed)
const deleteData = async () => {
  try {
    await Product.deleteMany();
    await Supplier.deleteMany(); // Also delete suppliers
    // Optionally delete users too, or keep admin user
    // await User.deleteMany({ role: { $ne: 'admin' } });
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

