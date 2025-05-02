const express = require("express");
const router = express.Router();
const axios = require("axios"); // Import axios
const { protect } = require("../middleware/authMiddleware");
const Product = require("../models/productModel");

// Helper function to get exchange rate
async function getGbpToUsdRate() {
  try {
    const response = await axios.get("https://open.er-api.com/v6/latest/GBP");
    if (response.data && response.data.result === "success" && response.data.rates && response.data.rates.USD) {
      console.log(`Fetched GBP to USD rate: ${response.data.rates.USD}`);
      return response.data.rates.USD;
    } else {
      console.error("Error fetching or parsing exchange rate data:", response.data);
      return null; // Indicate failure
    }
  } catch (error) {
    console.error("Error fetching exchange rate from API:", error.message);
    return null; // Indicate failure
  }
}

// @desc    Search products by item number (Handles POST request from frontend)
// @route   POST /api/search
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    // Get itemNumbers from request body
    const { itemNumbers } = req.body;

    if (!itemNumbers || !Array.isArray(itemNumbers) || itemNumbers.length === 0) {
      return res.status(400).json({ message: "Item numbers array is required in the request body" });
    }

    // Trim item numbers
    const itemNoArray = itemNumbers.map(item => item.trim());

    // Fetch exchange rate first
    const gbpToUsdRate = await getGbpToUsdRate();
    const conversionBuffer = 1.03; // 3% buffer

    if (gbpToUsdRate === null) {
      console.warn("Proceeding without currency conversion due to API error.");
      // Optionally, return an error or proceed with simplified logic
      // return res.status(503).json({ message: "Could not fetch currency exchange rates. Please try again later." });
    }

    const products = await Product.find({ itemNo: { $in: itemNoArray } });

    // Process products to include supplier price comparison in USD
    const processedProducts = products.map(product => {
      const productObj = product.toObject();
      const supplierDetails = {};
      let winner = null;
      let lowestPriceUsd = Infinity;

      if (productObj.suppliers && Array.isArray(productObj.suppliers)) {
        productObj.suppliers.forEach(supplier => {
          if (!supplier || !supplier.name || supplier.price === undefined || supplier.price === null || !supplier.currency) return;

          const name = supplier.name;
          const price = parseFloat(supplier.price); // Ensure price is a number
          const currency = supplier.currency.toUpperCase();
          let usdEquivalent = null;
          let displayString = "N/A";

          if (!isNaN(price)) {
            if (currency === "GBP" && gbpToUsdRate !== null) {
              usdEquivalent = price * gbpToUsdRate * conversionBuffer;
              // Format: £PRICE GBP (USD EQUIVALENT)
              displayString = `£${price.toFixed(2)} GBP (USD ${usdEquivalent.toFixed(2)})`;
            } else if (currency === "USD") {
              usdEquivalent = price;
              // Format: $PRICE USD
              displayString = `$${price.toFixed(2)} USD`;
            } else if (currency === "GBP" && gbpToUsdRate === null) {
              // Handle case where conversion failed - show original GBP only
              usdEquivalent = Infinity; // Cannot compare fairly
              displayString = `£${price.toFixed(2)} GBP`;
            } else {
              // Handle other currencies if necessary, or treat as incomparable
              usdEquivalent = Infinity;
              displayString = `${price.toFixed(2)} ${currency}`; // Show original if unknown
            }

            // Store details for winner calculation and display
            supplierDetails[name] = {
              usdEquivalent,
              displayString
            };

            // Determine winner based on USD equivalent
            if (usdEquivalent < lowestPriceUsd) {
              lowestPriceUsd = usdEquivalent;
              winner = name;
            }
          } else {
             supplierDetails[name] = {
              usdEquivalent: Infinity,
              displayString: "N/A (Invalid Price)"
            };
          }
        });
      }

      // If lowestPriceUsd is still Infinity, no valid prices were found
      if (lowestPriceUsd === Infinity) {
        winner = "N/A";
      }

      return {
        ...productObj,
        // Use the generated display strings
        mrsPrice: supplierDetails["MRS"] ? supplierDetails["MRS"].displayString : "N/A",
        mizalaPrice: supplierDetails["Mizala"] ? supplierDetails["Mizala"].displayString : "N/A",
        winner: winner
      };
    });

    res.json(processedProducts);
  } catch (error) {
    console.error("Search error:", error);
    // Avoid sending detailed internal errors to the client in production
    res.status(500).json({ message: "Server Error" });
  }
});

// Keep the GET route for text search if needed
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

