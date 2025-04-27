const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const Product = require('../models/productModel');

// @desc    Fetch all products
// @route   GET /api/products
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// IMPORTANT: Search routes must come BEFORE parameter routes like /:id
// @desc    Search products by item number
// @route   GET /api/products/search/item
// @access  Private
router.get('/search/item', protect, async (req, res) => {
  try {
    const { itemNos } = req.query;
    
    if (!itemNos) {
      return res.status(400).json({ message: 'Item numbers are required' });
    }
    
    const itemNoArray = itemNos.split(',').map(item => item.trim());
    
    const products = await Product.find({ itemNo: { $in: itemNoArray } });
    
    // Process products to include supplier price comparison
    const processedProducts = products.map(product => {
      const productObj = product.toObject();
      
      // Extract supplier prices for display
      const supplierPrices = {};
      let winner = null;
      let lowestPriceInOriginalCurrency = Infinity;
      
      // Find the supplier with the lowest price in its original currency
      if (productObj.suppliers && Array.isArray(productObj.suppliers)) {
        productObj.suppliers.forEach(supplier => {
          if (!supplier) return; // Skip if supplier is undefined
          
          const supplierName = supplier.name;
          const price = supplier.price;
          const currency = supplier.currency;
          
          if (!supplierName || price === undefined || !currency) return; // Skip if missing data
          
          // Store the price with its original currency
          supplierPrices[supplierName] = {
            price,
            currency
          };
          
          // Simple comparison to find lowest price
          // Note: This is a simplified approach. For proper currency conversion,
          // you would need to implement a currency conversion service.
          if (price < lowestPriceInOriginalCurrency) {
            lowestPriceInOriginalCurrency = price;
            winner = supplierName;
          }
        });
      }
      
      return {
        ...productObj,
        mrsPrice: supplierPrices['MRS'] ? `${supplierPrices['MRS'].price} ${supplierPrices['MRS'].currency}` : 'N/A',
        mizalaPrice: supplierPrices['Mizala'] ? `${supplierPrices['Mizala'].price} ${supplierPrices['Mizala'].currency}` : 'N/A',
        winner: winner || 'N/A'
      };
    });
    
    res.json(processedProducts);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @desc    Search products by text
// @route   GET /api/products/search/text
// @access  Private
router.get('/search/text', protect, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const products = await Product.find({
      $or: [
        { description: { $regex: query, $options: 'i' } },
        { manufacturer: { $regex: query, $options: 'i' } },
        { brand: { $regex: query, $options: 'i' } }
      ]
    });
    
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get list of all suppliers
// @route   GET /api/products/suppliers/list
// @access  Private
router.get('/suppliers/list', protect, async (req, res) => {
  try {
    const suppliers = await Product.distinct('suppliers.name');
    res.json(suppliers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Parameter routes like /:id must come AFTER specific routes
// @desc    Fetch single product
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
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Compare prices for a product across suppliers
// @route   GET /api/products/:id/compare
// @access  Private
router.get('/:id/compare', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const comparison = {
      itemNo: product.itemNo,
      description: product.description,
      suppliers: product.suppliers.map(supplier => ({
        name: supplier.name,
        price: supplier.price,
        currency: supplier.currency,
        catalogNo: supplier.catalogNo || 'N/A'
      }))
    };
    
    res.json(comparison);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    const product = new Product(req.body);
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (product) {
      Object.keys(req.body).forEach(key => {
        product[key] = req.body[key];
      });
      
      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (product) {
      await product.remove();
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
