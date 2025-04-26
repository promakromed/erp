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

    // Format the response data to match the expected format for the frontend
    const formattedProducts = products.map(product => {
      // Extract MRS and Mizala prices from suppliers array
      let mrsPrice = 'N/A';
      let mizalaPrice = 'N/A';
      let mrsSupplier = null;
      let mizalaSupplier = null;
      
      if (product.suppliers && product.suppliers.length > 0) {
        // Find MRS supplier
        mrsSupplier = product.suppliers.find(s => s.name === 'MRS');
        if (mrsSupplier) {
          mrsPrice = mrsSupplier.price;
        }
        
        // Find Mizala supplier
        mizalaSupplier = product.suppliers.find(s => s.name === 'Mizala');
        if (mizalaSupplier) {
          mizalaPrice = mizalaSupplier.price;
        }
      }
      
      // Determine which supplier has the lower price
      let winner = 'Equal';
      if (mrsPrice !== 'N/A' && mizalaPrice !== 'N/A') {
        if (mrsPrice < mizalaPrice) {
          winner = 'MRS';
        } else if (mizalaPrice < mrsPrice) {
          winner = 'Mizala';
        }
      } else if (mrsPrice !== 'N/A') {
        winner = 'MRS';
      } else if (mizalaPrice !== 'N/A') {
        winner = 'Mizala';
      } else {
        winner = 'N/A';
      }

      return {
        itemNo: product.itemNo,
        description: product.description,
        size: product.size || product.unit || '',
        manufacturer: product.manufacturer || '',
        brand: product.brand || '',
        mrsPrice: mrsPrice,
        mizalaPrice: mizalaPrice,
        winner
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

    // Format the response to include all suppliers for each product
    const formattedProducts = products.map(product => {
      const supplierInfo = {};
      
      if (product.suppliers && product.suppliers.length > 0) {
        product.suppliers.forEach(supplier => {
          supplierInfo[supplier.name] = {
            price: supplier.price,
            currency: supplier.currency,
            catalogNo: supplier.catalogNo
          };
        });
      }
      
      return {
        itemNo: product.itemNo,
        description: product.description,
        uom: product.size || product.unit || '',
        manufacturer: product.manufacturer || '',
        brand: product.brand || '',
        hsCode: product.hsCode || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        suppliers: supplierInfo,
        inStock: product.inStock || 0
      };
    });

    res.json(formattedProducts);
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({ message: 'Server error during advanced product search' });
  }
});

// @desc    Get all suppliers for a product
// @route   GET /api/products/:id/suppliers
// @access  Private
router.get('/:id/suppliers', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (!product.suppliers || product.suppliers.length === 0) {
      return res.json([]);
    }
    
    // Format supplier information
    const supplierInfo = product.suppliers.map(supplier => ({
      name: supplier.name,
      price: supplier.price,
      currency: supplier.currency,
      catalogNo: supplier.catalogNo || '',
      leadTime: supplier.leadTime || '',
      minOrderQty: supplier.minOrderQty || 1
    }));
    
    res.json(supplierInfo);
  } catch (error) {
    console.error('Get product suppliers error:', error);
    res.status(500).json({ message: 'Server error while fetching product suppliers' });
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
    
    // Format the response to match the expected format for the frontend
    const formattedProduct = {
      _id: product._id,
      itemNo: product.itemNo,
      description: product.description,
      size: product.size || product.unit || '',
      manufacturer: product.manufacturer || '',
      brand: product.brand || '',
      hsCode: product.hsCode || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      inStock: product.inStock || 0,
      suppliers: []
    };
    
    // Add supplier information
    if (product.suppliers && product.suppliers.length > 0) {
      formattedProduct.suppliers = product.suppliers.map(supplier => ({
        name: supplier.name,
        price: supplier.price,
        currency: supplier.currency,
        catalogNo: supplier.catalogNo || '',
        leadTime: supplier.leadTime || '',
        minOrderQty: supplier.minOrderQty || 1
      }));
      
      // For backward compatibility, also add MRS and Mizala prices directly
      const mrsSupplier = product.suppliers.find(s => s.name === 'MRS');
      const mizalaSupplier = product.suppliers.find(s => s.name === 'Mizala');
      
      formattedProduct.mrsPrice = mrsSupplier ? mrsSupplier.price : null;
      formattedProduct.mizalaPrice = mizalaSupplier ? mizalaSupplier.price : null;
    }
    
    res.json(formattedProduct);
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
    
    // Format the response to match the expected format for the frontend
    const formattedProducts = products.map(product => {
      // Extract MRS and Mizala prices from suppliers array for backward compatibility
      let mrsPrice = null;
      let mizalaPrice = null;
      
      if (product.suppliers && product.suppliers.length > 0) {
        const mrsSupplier = product.suppliers.find(s => s.name === 'MRS');
        if (mrsSupplier) {
          mrsPrice = mrsSupplier.price;
        }
        
        const mizalaSupplier = product.suppliers.find(s => s.name === 'Mizala');
        if (mizalaSupplier) {
          mizalaPrice = mizalaSupplier.price;
        }
      }
      
      return {
        _id: product._id,
        itemNo: product.itemNo,
        description: product.description,
        size: product.size || product.unit || '',
        manufacturer: product.manufacturer || '',
        brand: product.brand || '',
        mrsPrice: mrsPrice,
        mizalaPrice: mizalaPrice,
        inStock: product.inStock || 0
      };
    });
    
    res.json({
      products: formattedProducts,
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
        uom: product.size || product.unit || '',
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

// @desc    Get available suppliers list
// @route   GET /api/products/suppliers/list
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
