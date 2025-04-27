const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Product = require('../models/productModel');

// @desc    Search products by item number
// @route   GET /api/search/item
// @access  Private
router.get('/item', protect, async (req, res) => {
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
// @route   GET /api/search/text
// @access  Private
router.get('/text', protect, async (req, res) => {
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

module.exports = router;
