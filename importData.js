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

  // *** Check for delete flag BEFORE trying to read stdin ***
  if (process.argv.includes("-d")) {
    await deleteData();
    // deleteData function already handles process.exit()
    return; // Exit main function after deletion
  }

  // --- If not deleting, proceed to read stdin and upsert ---
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

  // Default action is upsert (since -d was handled above)
  await upsertData(suppliersList, productsList);

};

// Import/Update data using Upsert (now uses findOneAndUpdate)
const upsertData = async (suppliersList, productsList) => {
  let insertedCount = 0;
  let modifiedCount = 0;
  let failedCount = 0;

  try {
    // --- Step 1: Upsert Suppliers (using bulkWrite is fine here) ---
    console.log("Processing suppliers for upsert...".yellow);
    const supplierOps = suppliersList.map(name => ({
      updateOne: {
        filter: { name: name }, // Find by name
        update: { $set: { name: name } }, // Set name
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

    // --- Step 3: Upsert Products one by one using findOneAndUpdate ---
    console.log("Processing products for upsert using findOneAndUpdate...".yellow);

    for (const [index, product] of productsList.entries()) {
      try {
        // *** IMPORT DEBUG START ***
        if (index < 3) { // Log first 3 products only
          console.log(`IMPORT_DEBUG: Processing product index ${index}, itemNo: ${product.itemNo}`);
          console.log(`IMPORT_DEBUG: Raw product input: ${JSON.stringify(product, null, 2)}`);
        }
        // *** IMPORT DEBUG END ***

        // Map supplier offers
        let updatedOffers = [];
        if (product.supplierOffers && Array.isArray(product.supplierOffers)) {
            updatedOffers = product.supplierOffers.map(offer => {
              const supplierId = supplierMap[offer.supplierName];
              if (!supplierId) {
                console.warn(`WARNING: Supplier ID not found for name \'${offer.supplierName}\' in product ${product.itemNo}. Skipping this offer.`.red);
                return null;
              }
              const newOffer = {
                supplier: supplierId,
                originalPrice: offer.originalPrice, // Save original price
                originalCurrency: offer.originalCurrency, // Save original currency
                usdPrice: offer.usdPrice, // Save calculated USD price
                catalogNo: offer.catalogNo || undefined,
              };
              return newOffer;
            }).filter(offer => offer !== null);
        } else {
            if (index < 3) console.log(`IMPORT_DEBUG: Product index ${index} has no valid supplierOffers array in input.`);
        }

        if (index < 3) console.log(`IMPORT_DEBUG: Product index ${index}, Constructed updatedOffers: ${JSON.stringify(updatedOffers, null, 2)}`);

        // Prepare the update payload
        const setPayload = {
          itemNo: product.itemNo,
          description: product.description,
          manufacturer: product.manufacturer,
          brand: product.brand,
          size: product.size,
          supplierOffers: updatedOffers
        };

        if (index < 3) console.log(`IMPORT_DEBUG: Product index ${index}, Final $set payload: ${JSON.stringify(setPayload, null, 2)}`);

        const filter = { itemNo: product.itemNo };
        const update = {
          $set: setPayload,
          $unset: { suppliers: "" } // Explicitly remove the old 'suppliers' field
        };
        const options = {
          upsert: true, // Create if not exists
          new: true, // Return the modified document
          runValidators: true // Ensure schema validation runs
        };

        if (index < 3) console.log(`IMPORT_DEBUG: Calling findOneAndUpdate for itemNo: ${product.itemNo}`);
        
        const result = await Product.findOneAndUpdate(filter, update, options);

        // Check if it was an upsert (insert) or an update
        // Note: `findOneAndUpdate` with upsert returns the doc *before* update if it existed, 
        // unless `new: true` is set, which returns the *after* doc.
        // We can't easily distinguish insert vs modify without comparing timestamps or querying before/after.
        // For simplicity, we'll just count success/fail.
        if (result) {
             // Assuming success if no error is thrown. We can't easily get insert/modify counts here.
             // Let's just log progress.
             if ((index + 1) % 10 === 0 || index === productsList.length - 1) { // Log every 10 products and the last one
                console.log(`Processed ${index + 1}/${productsList.length} products...`.cyan);
             }
        } else {
            // This case might not happen if upsert:true works, but good to have.
            console.warn(`WARNING: findOneAndUpdate returned null for itemNo ${product.itemNo}.`.yellow);
            failedCount++;
        }

      } catch (productError) {
        console.error(`ERROR processing product itemNo ${product.itemNo}: ${productError.message}`.red);
        failedCount++;
      }
    }

    console.log("Product upsert process completed.".green);
    console.log(`  Successfully processed (approx): ${productsList.length - failedCount}`.cyan); // Approximate success count
    console.log(`  Failed: ${failedCount}`.red);

    console.log("Data Upsert Process Finished!".green.inverse);
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

