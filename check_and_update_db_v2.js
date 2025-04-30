const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load env vars
dotenv.config();

// Define a minimal Product schema for querying
const productSchema = new mongoose.Schema({
  itemNo: { type: String, required: true, unique: true },
  description: String,
  manufacturer: String,
  brand: String,
  suppliers: [
    {
      name: String,
      price: Number,
      currency: String,
      catalogNo: String,
    },
  ],
}, { strict: false }); // Use strict: false to avoid issues if DB has extra fields

// Ensure the model name matches what's used elsewhere (likely 'Product')
const Product = mongoose.model("Product", productSchema);

const checkProductInDB = async () => {
  try {
    console.log("Connecting to database...");
    // Ensure MONGO_URI is correctly set in Heroku config vars
    if (!process.env.MONGO_URI) {
        console.error("ERROR: MONGO_URI environment variable not set!");
        return;
    }
    await mongoose.connect(process.env.MONGO_URI); // Removed deprecated options
    console.log("Database connected.");

    // Explicitly set strictQuery to suppress the warning
    mongoose.set("strictQuery", true);

    const itemToFind = "00.1001";
    console.log(`Searching for product with itemNo: ${itemToFind}...`);

    const product = await Product.findOne({ itemNo: itemToFind });

    if (product) {
      console.log("\n--- Product Found in Database ---");
      console.log(`Item Number: ${product.itemNo}`);
      console.log(`Description: ${product.description}`);
      console.log(`Manufacturer: ${product.manufacturer}`);
      console.log(`Brand: ${product.brand}`);
      console.log("Suppliers:");
      if (product.suppliers && product.suppliers.length > 0) {
        product.suppliers.forEach((supplier, index) => {
          console.log(`  Supplier ${index + 1}:`);
          console.log(`    Name: ${supplier.name}`);
          console.log(`    Price: ${supplier.price}`);
          console.log(`    Currency: ${supplier.currency}`);
          console.log(`    Catalog No: ${supplier.catalogNo}`);
        });
      } else {
        console.log("  No supplier information found.");
      }
      console.log("---------------------------------\n");

      // Define expected values based on product_data.json for 00.1001
      const expectedDescription = "CYTOSCAN AIR TOKENS, 24 EACH";
      const expectedSuppliers = [
        { name: "MRS", price: 491.63, currency: "GBP", catalogNo: "00.1001" }
        // Item 00.1001 only has MRS supplier in product_data.json
      ];

      // Check if update is needed
      let needsUpdate = false;
      let updatePayload = {};

      if (product.description !== expectedDescription) {
        console.log(`INFO: Description in DB ('${product.description}') is INCORRECT. Expected: '${expectedDescription}'`);
        updatePayload.description = expectedDescription;
        needsUpdate = true;
      } else {
         console.log("INFO: Description in DB is CORRECT.");
      }

      // Compare suppliers carefully - stringify might be too strict if order differs
      // Let's check if the number of suppliers is wrong or if the content differs
      let suppliersMatch = false;
      if (product.suppliers.length === expectedSuppliers.length) {
          // Simple check assuming order is the same and structure is simple
          if (JSON.stringify(product.suppliers) === JSON.stringify(expectedSuppliers)) {
              suppliersMatch = true;
          }
      }

      if (!suppliersMatch) {
         console.log(`INFO: Suppliers in DB do not match expected values. DB has ${product.suppliers.length}, Expected ${expectedSuppliers.length}.`);
         // Log current vs expected for clarity
         console.log("Current Suppliers in DB:", JSON.stringify(product.suppliers));
         console.log("Expected Suppliers:", JSON.stringify(expectedSuppliers));
         updatePayload.suppliers = expectedSuppliers; // Set suppliers to be updated
         needsUpdate = true;
      } else {
          console.log("INFO: Suppliers in DB are CORRECT.");
      }

      if (needsUpdate) {
        console.log("INFO: Attempting to update the database record...");
        console.log("Update Payload:", JSON.stringify(updatePayload));

        const updateResult = await Product.updateOne(
          { itemNo: itemToFind },
          { $set: updatePayload }
        );

        console.log("INFO: Update operation completed.");
        console.log("Update Result:", JSON.stringify(updateResult)); // Log the full result

        if (updateResult.acknowledged && updateResult.modifiedCount > 0) {
          console.log("SUCCESS: Database successfully updated.");
          console.log("Please clear browser cache thoroughly and test the application again.");
        } else if (updateResult.acknowledged && updateResult.matchedCount > 0 && updateResult.modifiedCount === 0) {
           console.log("WARNING: Document matched but was not modified. It might already have the correct values, or the update payload was empty/incorrect.");
        } else if (updateResult.acknowledged && updateResult.matchedCount === 0) {
           console.log("ERROR: No document matched the query criteria. Update failed.");
        } else {
          console.log("ERROR: Update operation failed or was not acknowledged.");
        }
      } else {
        console.log("INFO: No update needed. Database record appears correct.");
        console.log("If the application still shows wrong data, the issue is likely caching, deployment, or frontend rendering.");
      }

    } else {
      console.log(`ERROR: Product with itemNo ${itemToFind} not found in the database.`);
    }

  } catch (err) {
    console.error("ERROR: An error occurred during the script execution:", err);
  } finally {
    console.log("Disconnecting from database...");
    // Check if mongoose connection exists before disconnecting
    if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
        console.log("Database disconnected.");
    } else {
        console.log("Database connection was not established or already closed.");
    }
  }
};

// Run the function
checkProductInDB();

