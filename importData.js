const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');

// Load env vars
dotenv.config();

// Load models
const Product = require('./models/productModel');
const User = require('./models/userModel');

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Read JSON files
const products = JSON.parse(
  fs.readFileSync(`${__dirname}/data/product_data.json`, 'utf-8')
);

// Import into DB
const importData = async () => {
  try {
    // Check if admin user exists, if not create one
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      console.log('Creating default admin user...'.yellow);
      await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
      });
      console.log('Default admin user created'.green);
    }

    // Process products to preserve all original data
    const processedProducts = products.map(product => {
      // Ensure we preserve all original data exactly as in the JSON
      return {
        ...product,
        itemNo: product.itemNo, // Preserve exact product code
        manufacturer: product.manufacturer, // Preserve exact manufacturer name
        brand: product.brand, // Preserve exact brand name
        suppliers: product.suppliers.map(supplier => ({
          ...supplier,
          price: supplier.price, // Preserve exact price
          currency: supplier.currency, // Preserve exact currency
        })),
      };
    });

    await Product.insertMany(processedProducts);
    console.log('Data Imported!'.green.inverse);
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
    console.log('Data Destroyed!'.red.inverse);
    process.exit();
  } catch (err) {
    console.error(`${err}`.red.inverse);
    process.exit(1);
  }
};

// Reset and reimport data
const resetAndReimport = async () => {
  try {
    console.log('Deleting existing product data...'.yellow);
    await Product.deleteMany();
    console.log('Existing product data deleted'.green);
    
    console.log('Importing new product data...'.yellow);
    // Process products to preserve all original data
    const processedProducts = products.map(product => {
      // Ensure we preserve all original data exactly as in the JSON
      return {
        ...product,
        itemNo: product.itemNo, // Preserve exact product code
        manufacturer: product.manufacturer, // Preserve exact manufacturer name
        brand: product.brand, // Preserve exact brand name
        suppliers: product.suppliers.map(supplier => ({
          ...supplier,
          price: supplier.price, // Preserve exact price
          currency: supplier.currency, // Preserve exact currency
        })),
      };
    });

    await Product.insertMany(processedProducts);
    console.log('New product data imported successfully!'.green.inverse);
    process.exit();
  } catch (err) {
    console.error(`${err}`.red.inverse);
    process.exit(1);
  }
};

// Determine which operation to perform based on command line args
if (process.argv[2] === '-d') {
  deleteData();
} else if (process.argv[2] === '-r') {
  resetAndReimport();
} else {
  importData();
}
