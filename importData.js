const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/productModel');
const User = require('./models/userModel');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Read product data
const getProductData = () => {
  try {
    const jsonData = fs.readFileSync('./product_data.json', 'utf-8');
    return JSON.parse(jsonData);
  } catch (error) {
    console.error(`Error reading product data: ${error.message}`);
    return [];
  }
};

// Create default admin user if not exists
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        isAdmin: true,
      });
      
      console.log('Default admin user created');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error(`Error creating admin user: ${error.message}`);
  }
};

// Import data function
const importData = async () => {
  try {
    // Get product data
    const products = getProductData();
    
    if (products.length === 0) {
      console.error('No product data found or invalid JSON format');
      process.exit(1);
    }
    
    console.log(`Found ${products.length} products to import`);
    
    // Import products
    const result = await Product.insertMany(products);
    console.log(`${result.length} products imported successfully`);
    
    // Create default admin user if not exists
    await createDefaultAdmin();
    
    console.log('Data import completed successfully');
    process.exit(0);
  } catch (error) {
    console.error(`Error importing data: ${error.message}`);
    process.exit(1);
  }
};

// Delete data function
const deleteData = async () => {
  try {
    await Product.deleteMany({});
    console.log('All product data deleted successfully');
    process.exit(0);
  } catch (error) {
    console.error(`Error deleting data: ${error.message}`);
    process.exit(1);
  }
};

// Run import or delete based on command line args
if (process.argv.includes('-d')) {
  console.log('Deleting all product data...');
  deleteData();
} else if (process.argv.includes('-r')) {
  console.log('Resetting and reimporting all product data...');
  (async () => {
    try {
      await Product.deleteMany({});
      console.log('All product data deleted');
      await importData();
    } catch (error) {
      console.error(`Error during reset and reimport: ${error.message}`);
      process.exit(1);
    }
  })();
} else {
  console.log('Importing product data...');
  importData();
}
