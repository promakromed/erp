const express = require("express");
const router = express.Router();
const axios = require("axios");
const { protect } = require("../middleware/authMiddleware");
const Product = require("../models/productModel");
const Supplier = require("../models/supplierModel"); // Ensure Supplier model is imported

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

    const gbpToUsdRate = await getGbpToUsdRate();
    const conversionBuffer = 1.03; // 3% buffer

    if (gbpToUsdRate === null) {
      console.warn("Proceeding without currency conversion due to API error.");
    }

    // Find products and populate supplier details within supplierOffers
    const products = await Product.find({ itemNo: { $in: itemNoArray } })
                                  .populate({ path: 'supplierOffers.supplier', select: 'name' }); // Corrected populate syntax

    let uniqueSuppliers = new Set(); // To collect unique supplier names for dynamic headers

    // Process products
    const processedProducts = products.map(product => {
      const productObj = product.toObject();
      let offers = {}; // Object to hold offers keyed by supplier name
      let winner = null;
      let lowestPriceUsd = Infinity;

      if (productObj.supplierOffers && Array.isArray(productObj.supplierOffers)) {
        productObj.supplierOffers.forEach(offer => {
          // Check if offer and populated supplier exist
          if (!offer || !offer.supplier || !offer.supplier.name || offer.price === undefined || offer.price === null || !offer.currency) return;

          const supplierName = offer.supplier.name;
          uniqueSuppliers.add(supplierName); // Add supplier name to the set

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
              // If GBP rate fails, treat GBP price as non-comparable for winner determination
              usdEquivalent = Infinity; 
              displayString = `${formatCurrencyNumber(price)} GBP`;
            } else {
              // Other currencies are not directly comparable
              usdEquivalent = Infinity;
              displayString = `${formatCurrencyNumber(price)} ${currency}`;
            }

            // Store the formatted display string for this supplier
            offers[supplierName] = displayString;

            // Determine winner based on USD equivalent
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

      // Remove the original supplierOffers array from the response if desired
      // delete productObj.supplierOffers;

      return {
        ...productObj,
        offers: offers, // Return offers keyed by supplier name
        winner: winner
      };
    });

    // Send back the processed products and the list of unique suppliers found
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

