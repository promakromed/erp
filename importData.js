const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const Product = require('./models/productModel');
const User = require('./models/userModel');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Read product data
const importProducts = async () => {
  try {
    const productData = JSON.parse(fs.readFileSync('./product_data.json', 'utf-8'));
    
    // Convert the object to an array of products
    const products = Object.keys(productData).map(itemNo => {
      const item = productData[itemNo];
      return {
        itemNo: itemNo,
        description: item.description,
        size: item.size,
        manufacturer: item.manufacturer,
        brand: item.brand,
        mrsPrice: item.mrs_price,
        mizalaPrice: item.mizala_price,
        winner: item.winner
      };
    });
    
    // Clear existing products
    await Product.deleteMany();
    
    // Import new products
    await Product.insertMany(products);
    
    console.log('Products imported successfully');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Create admin user
const createAdminUser = async () => {
  try {
    // Clear existing users
    await User.deleteMany();
    
    // Create admin user
    await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      isAdmin: true,
    });
    
    console.log('Admin user created successfully');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Check command line arguments
if (process.argv[2] === '-d') {
  importProducts();
} else if (process.argv[2] === '-u') {
  createAdminUser();
} else {
  console.log('Please use -d to import products or -u to create admin user');
  process.exit();
}
