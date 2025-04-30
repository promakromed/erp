const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load env vars
dotenv.config();

// Define a minimal Product schema for querying
const productSchema = new mongoose.Schema({
  itemNo: { type: String, required: true, unique: true },
  manufacturer: String,
  brand: String,
  // Add other fields if needed for context, but keep it minimal
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
      console.log(`Manufacturer: ${product.manufacturer}`);
      console.log(`Brand: ${product.brand}`);
      console.log("---------------------------------\n");

      if (product.manufacturer !== "THERMOFISHER" || product.brand !== "THERMOFISHER") {
        console.log("Manufacturer/Brand in DB is INCORRECT. Attempting to update...".yellow);
        
        const updateResult = await Product.updateOne(
          { itemNo: itemToFind },
          { $set: { manufacturer: "THERMOFISHER", brand: "THERMOFISHER" } }
        );

        if (updateResult.modifiedCount > 0) {
          console.log("Database successfully updated.".green);
          console.log("Please clear browser cache and test the application again.");
        } else {
          console.log("Update operation did not modify the document. It might already be correct or another issue occurred.".yellow);
        }
      } else {
        console.log("Manufacturer/Brand in DB is already CORRECT.".green);
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

