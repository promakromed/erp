const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const colors = require("colors");

// --- Delimiter used by Python script ---
const JSON_DELIMITER = "---JSON_SEPARATOR---";

// Load env vars
dotenv.config();

// Load models
const Product = require("./models/productModel");
const Supplier = require("./models/supplierModel");
const User = require("./models/userModel");

// --- Function to read all data from stdin ---
const readStdin = () => {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("readable", () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });
    process.stdin.on("end", () => {
      resolve(data);
    });
    process.stdin.on("error", reject);
  });
};

// --- Main async function to handle stdin reading and import ---
const main = async () => {
  // Connect to DB
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected...".cyan);
  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`.red.inverse);
    process.exit(1);
  }

  // Read and parse data from stdin
  let suppliersList = [];
  let productsList = [];

  try {
    console.log("Reading data from standard input...".yellow);
    const stdinData = await readStdin();
    console.log("Finished reading standard input.".cyan);

    const parts = stdinData.split(`\n${JSON_DELIMITER}\n`);

    if (parts.length !== 2) {
      throw new Error(
        `Expected 2 parts separated by delimiter, but found ${parts.length}. Stdin data: ${stdinData.substring(0, 500)}...`
      );
    }

    suppliersList = JSON.parse(parts[0]);
    productsList = JSON.parse(parts[1]);

    console.log(`Successfully parsed ${suppliersList.length} suppliers from stdin.`.cyan);
    console.log(`Successfully parsed ${productsList.length} products from stdin.`.cyan);

  } catch (err) {
    console.error(`ERROR: Failed to read or parse data from stdin: ${err.message}`.red.inverse);
    process.exit(1);
  }

  // Determine which operation to perform based on command line args
  if (process.argv.includes("-d")) {
    await deleteData();
  } else {
    // Default action is now upsert
    await upsertData(suppliersList, productsList);
  }
};

// Import/Update data using Upsert (now accepts lists as arguments)
const upsertData = async (suppliersList, productsList) => {
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
      console.log("No suppliers found in input data to process.".yellow);
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
      // Map supplier offers to include supplier ObjectId, strictly adhering to schema
      const updatedOffers = product.supplierOffers.map(offer => {
        const supplierId = supplierMap[offer.supplierName];
        if (!supplierId) {
          console.warn(`WARNING: Supplier ID not found for name \'${offer.supplierName}\' in product ${product.itemNo}. Skipping this offer.`.red);
          return null; // Skip this offer if supplier ID wasn't found
        }
        // Create the new offer structure strictly matching the schema fields
        // Only include fields provided by the Python script that are in the schema
        const newOffer = {
          supplier: supplierId, // required: true
          price: offer.price, // required: true
          currency: offer.currency || 'USD', // default: 'USD'
          catalogNo: offer.catalogNo || undefined, // required: false
          // supplierItemNo, leadTime, minOrderQty, discountTiers, lastUpdated will use schema defaults or be undefined
        };
        return newOffer;
      }).filter(offer => offer !== null); // Remove any null offers

      // Prepare the update payload for the product
      // Explicitly list fields to $set from the parsed JSON data
      const setPayload = {
        itemNo: product.itemNo,
        description: product.description,
        manufacturer: product.manufacturer,
        brand: product.brand,
        size: product.size,
        // Add any other top-level fields from the JSON that should be preserved/updated
        supplierOffers: updatedOffers // The newly constructed, schema-compliant offers array
      };

      return {
        updateOne: {
          filter: { itemNo: product.itemNo },
          update: {
            $set: setPayload, // Set the fields we want based on input JSON
            $unset: { suppliers: "" } // Explicitly remove the old 'suppliers' field
          },
          upsert: true // Create if not exists, otherwise update using $set and $unset
        }
      };
    });

    if (productOps.length === 0) {
        console.log("No products found in input data to process.".yellow);
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
    await Supplier.deleteMany();
    console.log("Data Destroyed!".red.inverse);
    process.exit();
  } catch (err) {
    console.error(`${err}`.red.inverse);
    process.exit(1);
  }
};

// Start the main execution
main();

