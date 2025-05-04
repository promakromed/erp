const express = require("express");
const router = express.Router();
const axios = require("axios");
const mongoose = require("mongoose"); // Needed for ObjectId check
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

// Helper function to get exchange rate
async function getGbpToUsdRate() {
  try {
    const response = await axios.get("https://open.er-api.com/v6/latest/GBP");
    if (response.data && response.data.result === "success" && response.data.rates && response.data.rates.USD) {
      console.log(`Fetched GBP to USD rate: ${response.data.rates.USD}`);
      return response.data.rates.USD;
    } else {
      console.error("Error fetching or parsing exchange rate data:", response.data);
      return null;
    }
  } catch (error) {
    console.error("Error fetching exchange rate from API:", error.message);
    return null;
  }
}

// @desc    Search products by item number (Handles POST request from frontend)
// @route   POST /api/search
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const { itemNumbers } = req.body;

    if (!itemNumbers || !Array.isArray(itemNumbers) || itemNumbers.length === 0) {
      return res.status(400).json({ message: "Item numbers array is required in the request body" });
    }

    const itemNoArray = itemNumbers.map(item => item.trim());
    console.log("DEBUG: Searching for item numbers:", itemNoArray);

    const gbpToUsdRate = await getGbpToUsdRate();
    const conversionBuffer = 1.03; // 3% buffer

    if (gbpToUsdRate === null) {
      console.warn("Proceeding without currency conversion due to API error.");
    }

    // --- Manual Population Strategy --- 

    // 1. Find products without population
    console.log("DEBUG: Finding products (manual population)...");
    const products = await Product.find({ itemNo: { $in: itemNoArray } }).lean(); // Use .lean() for plain JS objects
    console.log(`DEBUG: Found ${products.length} products.`);

    if (!products || products.length === 0) {
        return res.json({ products: [], suppliers: [] }); // Return empty if no products found
    }

    // 2. Collect unique supplier ObjectIds
    let supplierIds = new Set();
    products.forEach(product => {
        if (product.supplierOffers && Array.isArray(product.supplierOffers)) {
            product.supplierOffers.forEach(offer => {
                // Check if offer.supplier is a valid ObjectId before adding
                if (offer.supplier && mongoose.Types.ObjectId.isValid(offer.supplier)) {
                    supplierIds.add(offer.supplier.toString());
                }
            });
        }
    });
    const uniqueSupplierIds = Array.from(supplierIds).map(id => new mongoose.Types.ObjectId(id));
    console.log("DEBUG: Unique Supplier IDs found:", uniqueSupplierIds);

    // 3. Fetch supplier details (names) for these IDs
    let supplierMap = {}; // Map ObjectId -> Name
    let uniqueSuppliers = new Set(); // Set for final supplier list
    if (uniqueSupplierIds.length > 0) {
        console.log("DEBUG: Fetching supplier names...");
        const suppliers = await Supplier.find({ _id: { $in: uniqueSupplierIds } }).select('name');
        suppliers.forEach(supplier => {
            supplierMap[supplier._id.toString()] = supplier.name;
            uniqueSuppliers.add(supplier.name);
        });
        console.log("DEBUG: Supplier Map created:", supplierMap);
    }

    // 4. Process products and manually add supplier names / format offers
    const processedProducts = products.map(product => {
      let offers = {}; // Object to hold offers keyed by supplier name
      let winner = null;
      let lowestPriceUsd = Infinity;

      if (product.supplierOffers && Array.isArray(product.supplierOffers)) {
        product.supplierOffers.forEach(offer => {
          // Get supplier name from the map
          const supplierName = supplierMap[offer.supplier?.toString()]; // Use optional chaining

          // Check if offer, supplier name, price, and currency exist
          if (!offer || !supplierName || offer.price === undefined || offer.price === null || !offer.currency) {
            console.log("DEBUG: Skipping offer due to missing data or supplier name:", offer);
            return;
          }

          const price = parseFloat(offer.price);
          const currency = offer.currency.toUpperCase();
          let usdEquivalent = null;
          let displayString = "N/A";

          if (!isNaN(price)) {
            if (currency === "GBP" && gbpToUsdRate !== null) {
              usdEquivalent = price * gbpToUsdRate * conversionBuffer;
              displayString = `${formatCurrencyNumber(price)} GBP (USD ${formatCurrencyNumber(usdEquivalent)})`;
            } else if (currency === "USD") {
              usdEquivalent = price;
              displayString = `${formatCurrencyNumber(price)} USD`;
            } else if (currency === "GBP" && gbpToUsdRate === null) {
              usdEquivalent = Infinity;
              displayString = `${formatCurrencyNumber(price)} GBP`;
            } else {
              usdEquivalent = Infinity;
              displayString = `${formatCurrencyNumber(price)} ${currency}`;
            }

            offers[supplierName] = displayString;

            if (usdEquivalent < lowestPriceUsd) {
              lowestPriceUsd = usdEquivalent;
              winner = supplierName;
            }
          } else {
             offers[supplierName] = "N/A (Invalid Price)";
          }
        });
      }

      if (lowestPriceUsd === Infinity) {
        winner = "N/A";
      }

      // Return product data with formatted offers
      // Note: product is already a plain JS object due to .lean()
      return {
        ...product,
        offers: offers,
        winner: winner
      };
    });

    // 5. Send response
    res.json({
        products: processedProducts,
        suppliers: Array.from(uniqueSuppliers) // Convert Set to Array for JSON
    });

  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Keep the GET route for text search if needed (might need adaptation later)
router.get("/text", protect, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }
    // This text search might need adjustment if we want to show supplier info too
    const products = await Product.find({
      $or: [
        { description: { $regex: query, $options: "i" } },
        { manufacturer: { $regex: query, $options: "i" } },
        { brand: { $regex: query, $options: "i" } }
      ]
    });
    res.json(products); // Currently returns raw product data without populated offers
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;

