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
      // Get the best price from each supplier
      const supplierPrices = {};
      let lowestPrice = Infinity;
      let lowestPriceSupplier = '';
      
      if (product.suppliers && product.suppliers.length > 0) {
        product.suppliers.forEach(supplier => {
          supplierPrices[supplier.name] = {
            price: supplier.price,
            currency: supplier.currency
          };
          
          // Track lowest price (simple comparison, assumes same currency)
          if (supplier.price < lowestPrice) {
            lowestPrice = supplier.price;
            lowestPriceSupplier = supplier.name;
          }
        });
      }

      return {
        itemNo: product.itemNo,
        description: product.description,
        size: product.size,
        manufacturer: product.manufacturer,
        brand: product.brand,
        supplierPrices,
        lowestPrice,
        lowestPriceSupplier,
        inStock: product.inStock || 0,
        hsCode: product.hsCode
      };
    });

    res.json(formattedProducts);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error during product search' });
  }
});

// @desc    Advanced search for products with multiple criteria
// @route   POST /api/products/advanced-search
// @access  Private
router.post('/advanced-search', protect, async (req, res) => {
  try {
    const { 
      query, 
      manufacturer, 
      brand, 
      category,
      supplier,
      hsCode,
      inStockOnly
    } = req.body;

    // Build search criteria
    const searchCriteria = {};
    
    // Text search across multiple fields
    if (query) {
      searchCriteria.$text = { $search: query };
    }
    
    // Exact match filters
    if (manufacturer) searchCriteria.manufacturer = manufacturer;
    if (brand) searchCriteria.brand = brand;
    if (category) searchCriteria.category = category;
    if (hsCode) searchCriteria.hsCode = hsCode;
    
    // Filter by supplier
    if (supplier) {
      searchCriteria['suppliers.name'] = supplier;
    }
    
    // Filter by stock status
    if (inStockOnly) {
      searchCriteria.inStock = { $gt: 0 };
    }

    // Execute search
    const products = await Product.find(searchCriteria)
      .limit(100)
      .sort({ itemNo: 1 });

    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found matching the search criteria' });
    }

    res.json(products);
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({ message: 'Server error during advanced product search' });
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

// @desc    Get all products (with pagination)
// @route   GET /api/products
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const pageSize = Number(req.query.pageSize) || 20;
    const page = Number(req.query.page) || 1;
    
    const count = await Product.countDocuments({});
    const products = await Product.find({})
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort({ itemNo: 1 });
    
    res.json({
      products,
      page,
      pages: Math.ceil(count / pageSize),
      total: count
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error while fetching products' });
  }
});

// @desc    Compare prices between suppliers
// @route   POST /api/products/compare-suppliers
// @access  Private
router.post('/compare-suppliers', protect, async (req, res) => {
  try {
    const { suppliers, category } = req.body;
    
    if (!suppliers || suppliers.length < 2) {
      return res.status(400).json({ message: 'Please provide at least two suppliers to compare' });
    }
    
    // Build query
    const query = {
      'suppliers.name': { $all: suppliers }
    };
    
    if (category) {
      query.category = category;
    }
    
    // Find products available from all specified suppliers
    const products = await Product.find(query);
    
    if (products.length === 0) {
      return res.status(404).json({ 
        message: 'No products found that are available from all specified suppliers' 
      });
    }
    
    // Format comparison data
    const comparisonData = products.map(product => {
      const supplierData = {};
      
      suppliers.forEach(supplierName => {
        const supplier = product.suppliers.find(s => s.name === supplierName);
        if (supplier) {
          supplierData[supplierName] = {
            price: supplier.price,
            currency: supplier.currency,
            catalogNo: supplier.catalogNo || 'N/A'
          };
        }
      });
      
      return {
        itemNo: product.itemNo,
        description: product.description,
        manufacturer: product.manufacturer || 'N/A',
        brand: product.brand || 'N/A',
        suppliers: supplierData
      };
    });
    
    res.json(comparisonData);
  } catch (error) {
    console.error('Supplier comparison error:', error);
    res.status(500).json({ message: 'Server error during supplier comparison' });
  }
});

// @desc    Get product inventory status
// @route   GET /api/products/inventory
// @access  Private
router.get('/inventory/status', protect, async (req, res) => {
  try {
    // Find products with low stock (below reorder point)
    const lowStockProducts = await Product.find({
      $expr: { $lt: ['$inStock', '$reorderPoint'] }
    }).select('itemNo description inStock reorderPoint location');
    
    // Get total inventory count
    const totalProducts = await Product.countDocuments({});
    const inStockProducts = await Product.countDocuments({ inStock: { $gt: 0 } });
    const outOfStockProducts = await Product.countDocuments({ inStock: 0 });
    
    res.json({
      summary: {
        totalProducts,
        inStockProducts,
        outOfStockProducts,
        lowStockCount: lowStockProducts.length
      },
      lowStockItems: lowStockProducts
    });
  } catch (error) {
    console.error('Inventory status error:', error);
    res.status(500).json({ message: 'Server error while fetching inventory status' });
  }
});

// @desc    Update product inventory
// @route   PUT /api/products/:id/inventory
// @access  Private
router.put('/:id/inventory', protect, async (req, res) => {
  try {
    const { inStock, reorderPoint, location } = req.body;
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update inventory fields
    if (inStock !== undefined) product.inStock = inStock;
    if (reorderPoint !== undefined) product.reorderPoint = reorderPoint;
    if (location !== undefined) product.location = location;
    
    const updatedProduct = await product.save();
    
    res.json({
      message: 'Inventory updated successfully',
      inventory: {
        inStock: updatedProduct.inStock,
        reorderPoint: updatedProduct.reorderPoint,
        location: updatedProduct.location
      }
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ message: 'Server error while updating inventory' });
  }
});

// @desc    Get available suppliers list
// @route   GET /api/products/suppliers
// @access  Private
router.get('/suppliers/list', protect, async (req, res) => {
  try {
    // Aggregate to get unique supplier names
    const suppliers = await Product.aggregate([
      { $unwind: '$suppliers' },
      { $group: { _id: '$suppliers.name' } },
      { $sort: { _id: 1 } }
    ]);
    
    const supplierList = suppliers.map(item => item._id);
    
    res.json(supplierList);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Server error while fetching suppliers' });
  }
});

// @desc    Test endpoint (no authentication required)
// @route   GET /api/products/test
// @access  Public
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

module.exports = router;
