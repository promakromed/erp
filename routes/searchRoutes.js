const express = require("express");
const router = express.Router();
const axios = require("axios"); // Keep for potential future use, though rate fetching moved to Python
const mongoose = require("mongoose"); // Needed for ObjectId check
const { Parser } = require("@json2csv/node"); // Import @json2csv/node Parser
const { protect } = require("../middleware/authMiddleware");
const Product = require("../models/productModel");
const Supplier = require("../models/supplierModel");

// Helper function to format numbers with commas and 2 decimal places
function formatCurrencyNumber(num) {
  if (typeof num !== 'number' || isNaN(num)) {
    return 'N/A';
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// @desc    Get distinct manufacturers
// @route   GET /api/search/manufacturers
// @access  Private
router.get("/manufacturers", protect, async (req, res) => {
  try {
    console.log("--- GET MANUFACTURERS START ---");
    const manufacturers = await Product.distinct("manufacturer");
    const filteredManufacturers = manufacturers.filter(m => m).sort(); 
    console.log(`DEBUG: Found distinct manufacturers: ${filteredManufacturers.join(', ')}`);
    console.log("--- GET MANUFACTURERS END ---");
    res.json(filteredManufacturers);
  } catch (error) {
    console.error("Error fetching distinct manufacturers:", error);
    console.log("--- GET MANUFACTURERS END (ERROR) ---");
    res.status(500).json({ message: "Server Error fetching manufacturers" });
  }
});


// @desc    Search products by item number and optionally manufacturer
// @route   POST /api/search
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const { itemNumbers, manufacturer } = req.body;

    if (!itemNumbers || !Array.isArray(itemNumbers) || itemNumbers.length === 0) {
      return res.status(400).json({ message: "Item numbers array is required" });
    }

    const itemNoArray = itemNumbers.map(item => item.trim());
    console.log("--- SEARCH START ---");
    console.log("DEBUG: Searching for item numbers:", itemNoArray);
    if (manufacturer) {
        console.log("DEBUG: Filtering by manufacturer:", manufacturer);
    }

    let query = { itemNo: { $in: itemNoArray } };
    if (manufacturer && manufacturer !== "All" && manufacturer !== "") {
        query.manufacturer = manufacturer;
    }
    console.log("DEBUG: Using query:", query);

    const products = await Product.find(query)
        .select("+supplierOffers.originalPrice +supplierOffers.originalCurrency +supplierOffers.usdPrice")
        .lean();
    console.log(`DEBUG: Found ${products.length} products matching query.`);

    if (!products || products.length === 0) {
        console.log("DEBUG: No products found, returning empty response.");
        return res.json({ products: [], suppliers: [] });
    }

    let supplierIds = new Set();
    products.forEach(product => {
        if (product.supplierOffers && Array.isArray(product.supplierOffers)) {
            product.supplierOffers.forEach(offer => {
                if (offer.supplier && mongoose.Types.ObjectId.isValid(offer.supplier)) {
                    supplierIds.add(offer.supplier.toString());
                }
            });
        }
    });
    const uniqueSupplierIds = Array.from(supplierIds).map(id => new mongoose.Types.ObjectId(id));
    console.log("DEBUG: Collected Unique Supplier ObjectIDs:", uniqueSupplierIds);

    let supplierMap = {};
    let uniqueSuppliers = new Set();
    if (uniqueSupplierIds.length > 0) {
        const suppliers = await Supplier.find({ _id: { $in: uniqueSupplierIds } }).select('name _id');
        suppliers.forEach(supplier => {
            supplierMap[supplier._id.toString()] = supplier.name;
            uniqueSuppliers.add(supplier.name);
        });
        console.log("DEBUG: Final Supplier Map:", supplierMap);
    }

    const processedProducts = products.map(product => {
      let offers = {};
      let winner = null;
      let lowestPriceUsd = Infinity;

      if (product.supplierOffers && Array.isArray(product.supplierOffers)) {
        product.supplierOffers.forEach(offer => {
          const supplierIdStr = offer.supplier?.toString();
          const supplierName = supplierMap[supplierIdStr]; 
          if (!offer || !supplierName || offer.originalPrice === undefined || offer.originalCurrency === undefined || offer.usdPrice === undefined) return;

          const originalPrice = parseFloat(offer.originalPrice);
          const originalCurrency = offer.originalCurrency.toUpperCase();
          const usdPrice = parseFloat(offer.usdPrice);
          let displayString = "N/A";

          if (!isNaN(originalPrice) && !isNaN(usdPrice)) {
            if (originalCurrency === "USD") {
              displayString = `${formatCurrencyNumber(originalPrice)} USD`;
            } else {
              displayString = `${formatCurrencyNumber(originalPrice)} ${originalCurrency} (USD ${formatCurrencyNumber(usdPrice)})`;
            }
            offers[supplierName] = displayString;
            if (usdPrice < lowestPriceUsd) {
              lowestPriceUsd = usdPrice;
              winner = supplierName;
            }
          } else {
             offers[supplierName] = "N/A (Invalid Price)";
          }
        });
      }

      if (lowestPriceUsd === Infinity) winner = "N/A";
      
      return {
        itemNo: product.itemNo,
        description: product.description,
        size: product.size || "N/A",
        manufacturer: product.manufacturer || "N/A",
        brand: product.brand || "N/A",
        offers: offers,
        winner: winner
      };
    });

    const finalResponse = {
        products: processedProducts,
        suppliers: Array.from(uniqueSuppliers).sort() // Sort suppliers for consistent column order
    };
    console.log("--- SEARCH END ---");
    res.json(finalResponse);

  } catch (error) {
    console.error("Search error:", error);
    console.log("--- SEARCH END (ERROR) ---");
    res.status(500).json({ message: "Server Error" });
  }
});

// @desc    Export search results to CSV
// @route   POST /api/search/export
// @access  Private
router.post("/export", protect, async (req, res) => {
  try {
    const { itemNumbers, manufacturer } = req.body;

    if (!itemNumbers || !Array.isArray(itemNumbers) || itemNumbers.length === 0) {
      return res.status(400).json({ message: "Item numbers array is required" });
    }

    const itemNoArray = itemNumbers.map(item => item.trim());
    console.log("--- EXPORT START ---");
    console.log("DEBUG: Exporting for item numbers:", itemNoArray);
    if (manufacturer) {
        console.log("DEBUG: Filtering by manufacturer:", manufacturer);
    }

    let query = { itemNo: { $in: itemNoArray } };
    if (manufacturer && manufacturer !== "All" && manufacturer !== "") {
        query.manufacturer = manufacturer;
    }
    console.log("DEBUG: Using query:", query);

    // --- Fetch and process data (similar to search) ---
    const products = await Product.find(query)
        .select("+supplierOffers.originalPrice +supplierOffers.originalCurrency +supplierOffers.usdPrice")
        .lean();
    console.log(`DEBUG: Found ${products.length} products matching query for export.`);

    if (!products || products.length === 0) {
        console.log("DEBUG: No products found, returning empty CSV.");
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="search_results.csv"');
        return res.status(200).send(''); // Send empty response
    }

    let supplierIds = new Set();
    products.forEach(product => {
        if (product.supplierOffers && Array.isArray(product.supplierOffers)) {
            product.supplierOffers.forEach(offer => {
                if (offer.supplier && mongoose.Types.ObjectId.isValid(offer.supplier)) {
                    supplierIds.add(offer.supplier.toString());
                }
            });
        }
    });
    const uniqueSupplierIds = Array.from(supplierIds).map(id => new mongoose.Types.ObjectId(id));

    let supplierMap = {};
    let uniqueSuppliers = new Set();
    if (uniqueSupplierIds.length > 0) {
        const suppliers = await Supplier.find({ _id: { $in: uniqueSupplierIds } }).select('name _id');
        suppliers.forEach(supplier => {
            supplierMap[supplier._id.toString()] = supplier.name;
            uniqueSuppliers.add(supplier.name);
        });
    }
    const sortedSuppliers = Array.from(uniqueSuppliers).sort(); // Sort for consistent column order
    console.log("DEBUG: Sorted suppliers for export columns:", sortedSuppliers);

    // --- Prepare data for CSV --- 
    const csvData = products.map(product => {
      let rowData = {
        'Item Number': product.itemNo,
        'Description': product.description,
        'Size': product.size || "N/A",
        'Manufacturer': product.manufacturer || "N/A",
        'Brand': product.brand || "N/A",
      };
      let winner = null;
      let lowestPriceUsd = Infinity;

      // Add supplier prices to rowData
      sortedSuppliers.forEach(supplierName => {
          rowData[`${supplierName} Price`] = "N/A"; // Default value
      });

      if (product.supplierOffers && Array.isArray(product.supplierOffers)) {
        product.supplierOffers.forEach(offer => {
          const supplierIdStr = offer.supplier?.toString();
          const supplierName = supplierMap[supplierIdStr]; 
          if (!offer || !supplierName || offer.originalPrice === undefined || offer.originalCurrency === undefined || offer.usdPrice === undefined) return;

          const originalPrice = parseFloat(offer.originalPrice);
          const originalCurrency = offer.originalCurrency.toUpperCase();
          const usdPrice = parseFloat(offer.usdPrice);
          let displayString = "N/A";

          if (!isNaN(originalPrice) && !isNaN(usdPrice)) {
            if (originalCurrency === "USD") {
              displayString = `${formatCurrencyNumber(originalPrice)} USD`;
            } else {
              displayString = `${formatCurrencyNumber(originalPrice)} ${originalCurrency} (USD ${formatCurrencyNumber(usdPrice)})`;
            }
            rowData[`${supplierName} Price`] = displayString; // Use the same display string as the table
            
            if (usdPrice < lowestPriceUsd) {
              lowestPriceUsd = usdPrice;
              winner = supplierName;
            }
          } else {
             rowData[`${supplierName} Price`] = "N/A (Invalid Price)";
          }
        });
      }

      if (lowestPriceUsd === Infinity) winner = "N/A";
      rowData['Winner'] = winner;
      
      return rowData;
    });

    // --- Define CSV Fields --- 
    const fields = [
        'Item Number',
        'Description',
        'Size',
        'Manufacturer',
        'Brand',
        ...sortedSuppliers.map(name => `${name} Price`), // Dynamic supplier columns
        'Winner'
    ];
    console.log("DEBUG: CSV Fields:", fields);

    // --- Convert to CSV --- 
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);
    console.log("DEBUG: CSV generated successfully.");

    // --- Send CSV Response --- 
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="search_results.csv"');
    console.log("--- EXPORT END ---");
    res.status(200).send(csv);

  } catch (error) {
    console.error("Export error:", error);
    console.log("--- EXPORT END (ERROR) ---");
    res.status(500).json({ message: "Server Error during export" });
  }
});


// Keep the GET route for text search if needed (might need adaptation later)
router.get("/text", protect, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }
    const products = await Product.find({
      $or: [
        { description: { $regex: query, $options: "i" } },
        { manufacturer: { $regex: query, $options: "i" } },
        { brand: { $regex: query, $options: "i" } }
      ]
    });
    res.json(products); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;

