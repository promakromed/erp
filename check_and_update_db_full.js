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

const Product = mongoose.model("Product", productSchema);

const checkProductInDB = async () => {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Database connected.");

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

      // Define expected values from product_data.json
      const expectedDescription = "CYTOSCAN AIR TOKENS, 24 EACH";
      const expectedSuppliers = [
        { name: "MRS", price: 491.63, currency: "GBP", catalogNo: "00.1001" },
        // Add other expected suppliers if applicable
      ];

      // Check if update is needed
      let needsUpdate = false;
      if (product.description !== expectedDescription) {
        console.log(`Description in DB ('${product.description}') is INCORRECT. Expected: '${expectedDescription}'`.yellow);
        needsUpdate = true;
      }
      // Basic check for suppliers - more complex comparison might be needed
      if (JSON.stringify(product.suppliers) !== JSON.stringify(expectedSuppliers)) {
         console.log(`Suppliers in DB do not match expected values.`.yellow);
         needsUpdate = true;
      }
       
      if (needsUpdate) {
        console.log("Attempting to update Description and Suppliers...".yellow);
        
        const updateResult = await Product.updateOne(
          { itemNo: itemToFind },
          { $set: { 
              description: expectedDescription, 
              suppliers: expectedSuppliers 
            } 
          }
        );

        if (updateResult.modifiedCount > 0) {
          console.log("Database successfully updated with correct Description and Suppliers.".green);
          console.log("Please clear browser cache and test the application again.");
        } else {
          console.log("Update operation did not modify the document. It might already be correct or another issue occurred.".yellow);
        }
      } else {
        console.log("Description and Suppliers in DB are already CORRECT.".green);
        console.log("The issue likely lies elsewhere (caching, deployment, frontend rendering).");
      }

    } else {
      console.log(`Product with itemNo ${itemToFind} not found in the database.`.red);
    }

  } catch (err) {
    console.error("An error occurred:".red, err);
  } finally {
    console.log("Disconnecting from database...");
    await mongoose.disconnect();
    console.log("Database disconnected.");
  }
};

// Run the function
checkProductInDB();

