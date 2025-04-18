const express = require('express');
const router = express.Router();
const { protect } = require('./userRoutes');
const Product = require('../models/productModel');

// @desc    Search for products by item numbers
// @route   POST /api/products/search
// @access  Private
router.post('/search', protect, async (req, res) => {
  try {
    const { itemNumbers } = req.body;

    if (!itemNumbers || itemNumbers.length === 0) {
      return res.status(400).json({ message: 'Please provide at least one item number' });
    }

    // Find products that match the item numbers
    const products = await Product.find({
      itemNo: { $in: itemNumbers }
    });

    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found with the provided item numbers' });
    }

    // Format the response data
    const formattedProducts = products.map(product => {
      // Determine which supplier has the lower price
      let winner = 'Equal';
      if (product.mrsPrice < product.mizalaPrice) {
        winner = 'MRS';
      } else if (product.mizalaPrice < product.mrsPrice) {
        winner = 'Mizala';
      }

      return {
        itemNo: product.itemNo,
        description: product.description,
        size: product.size,
        manufacturer: product.manufacturer,
        brand: product.brand,
        mrsPrice: product.mrsPrice,
        mizalaPrice: product.mizalaPrice,
        winner
      };
    });

    res.json(formattedProducts);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error during product search' });
  }
});

// @desc    Get all products
// @route   GET /api/products
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error while fetching products' });
  }
});

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error while fetching product' });
  }
});

// @desc    Test endpoint (no authentication required)
// @route   GET /api/products/test
// @access  Public
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

module.exports = router;
