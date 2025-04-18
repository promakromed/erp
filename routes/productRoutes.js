const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');

// Middleware to protect routes
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// @desc    Search products by item numbers
// @route   POST /api/products/search
// @access  Private
router.post('/search', protect, async (req, res) => {
  const { itemNumbers } = req.body;
  
  if (!itemNumbers || !Array.isArray(itemNumbers) || itemNumbers.length === 0) {
    return res.status(400).json({ message: 'Please provide valid item numbers' });
  }

  try {
    // Convert all item numbers to uppercase for case-insensitive search
    const normalizedItems = itemNumbers.map(item => item.trim().toUpperCase());
    
    // Find products matching the item numbers
    const products = await Product.find({ itemNo: { $in: normalizedItems } });
    
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all products with pagination
// @route   GET /api/products
// @access  Private
router.get('/', protect, async (req, res) => {
  const pageSize = 20;
  const page = Number(req.query.pageNumber) || 1;

  try {
    const count = await Product.countDocuments();
    const products = await Product.find()
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({
      products,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
