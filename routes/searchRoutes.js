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
      // console.log(`Fetched GBP to USD rate: ${response.data.rates.USD}`); // Less verbose logging
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
    console.log("--- SEARCH START ---");
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
        console.log("DEBUG: No products found, returning empty response.");
        return res.json({ products: [], suppliers: [] });
    }

    // *** DETAILED LOGGING START ***
    console.log("DEBUG: Raw product data (first product):", JSON.stringify(products[0], null, 2));

    // 2. Collect unique supplier ObjectIds
    let supplierIds = new Set();
    products.forEach((product, pIndex) => {
        console.log(`DEBUG: Processing product ${pIndex} (${product.itemNo})`);
        if (product.supplierOffers && Array.isArray(product.supplierOffers)) {
            console.log(`DEBUG: Product ${pIndex} has ${product.supplierOffers.length} supplierOffers.`);
            product.supplierOffers.forEach((offer, oIndex) => {
                console.log(`DEBUG: Product ${pIndex}, Offer ${oIndex}:`, JSON.stringify(offer));
                if (offer.supplier && mongoose.Types.ObjectId.isValid(offer.supplier)) {
                    const idStr = offer.supplier.toString();
                    console.log(`DEBUG: Product ${pIndex}, Offer ${oIndex}: Valid supplier ID found: ${idStr}`);
                    supplierIds.add(idStr);
                } else {
                    console.log(`DEBUG: Product ${pIndex}, Offer ${oIndex}: Invalid or missing supplier ID.`);
                }
            });
        } else {
            console.log(`DEBUG: Product ${pIndex} has no valid supplierOffers array.`);
        }
    });
    const uniqueSupplierIds = Array.from(supplierIds).map(id => new mongoose.Types.ObjectId(id));
    console.log("DEBUG: Collected Unique Supplier ObjectIDs:", uniqueSupplierIds);

    // 3. Fetch supplier details (names) for these IDs
    let supplierMap = {}; // Map ObjectId -> Name
    let uniqueSuppliers = new Set(); // Set for final supplier list
    if (uniqueSupplierIds.length > 0) {
        console.log("DEBUG: Fetching supplier names for IDs:", uniqueSupplierIds);
        const suppliers = await Supplier.find({ _id: { $in: uniqueSupplierIds } }).select('name _id'); // Select _id too for mapping
        console.log(`DEBUG: Found ${suppliers.length} suppliers in DB.`);
        suppliers.forEach(supplier => {
            const idStr = supplier._id.toString();
            console.log(`DEBUG: Mapping supplier ID ${idStr} to name '${supplier.name}'`);
            supplierMap[idStr] = supplier.name;
            uniqueSuppliers.add(supplier.name);
        });
        console.log("DEBUG: Final Supplier Map:", supplierMap);
        console.log("DEBUG: Final Unique Supplier Names:", Array.from(uniqueSuppliers));
    } else {
        console.log("DEBUG: No unique supplier IDs found to fetch names for.");
    }

    // 4. Process products and manually add supplier names / format offers
    console.log("DEBUG: Processing products to build final response...");
    const processedProducts = products.map((product, pIndex) => {
      console.log(`DEBUG: Formatting product ${pIndex} (${product.itemNo})`);
      let offers = {}; // Object to hold offers keyed by supplier name
      let winner = null;
      let lowestPriceUsd = Infinity;

      if (product.supplierOffers && Array.isArray(product.supplierOffers)) {
        product.supplierOffers.forEach((offer, oIndex) => {
          const supplierIdStr = offer.supplier?.toString();
          const supplierName = supplierMap[supplierIdStr]; 
          console.log(`DEBUG: Product ${pIndex}, Offer ${oIndex}: Supplier ID String: ${supplierIdStr}, Mapped Name: ${supplierName}`);

          if (!offer || !supplierName || offer.price === undefined || offer.price === null || !offer.currency) {
            console.log(`DEBUG: Product ${pIndex}, Offer ${oIndex}: Skipping offer due to missing data (Offer: ${!!offer}, Name: ${!!supplierName}, Price: ${offer?.price}, Currency: ${offer?.currency})`);
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
            console.log(`DEBUG: Product ${pIndex}, Offer ${oIndex}: Supplier '${supplierName}', Price: ${price}, Currency: ${currency}, USD Equiv: ${usdEquivalent}, Display: '${displayString}'`);
            offers[supplierName] = displayString;

            if (usdEquivalent < lowestPriceUsd) {
              lowestPriceUsd = usdEquivalent;
              winner = supplierName;
              console.log(`DEBUG: Product ${pIndex}, Offer ${oIndex}: New winner found: ${winner} at USD ${lowestPriceUsd}`);
            }
          } else {
             console.log(`DEBUG: Product ${pIndex}, Offer ${oIndex}: Invalid price (${offer.price}), setting display to N/A.`);
             offers[supplierName] = "N/A (Invalid Price)";
          }
        });
      }

      if (lowestPriceUsd === Infinity) {
        winner = "N/A";
      }
      console.log(`DEBUG: Product ${pIndex} (${product.itemNo}) final offers:`, offers);
      console.log(`DEBUG: Product ${pIndex} (${product.itemNo}) final winner: ${winner}`);

      // Return product data with formatted offers
      return {
        ...product,
        offers: offers,
        winner: winner
      };
    });
    // *** DETAILED LOGGING END ***

    // 5. Send response
    const finalResponse = {
        products: processedProducts,
        suppliers: Array.from(uniqueSuppliers) // Convert Set to Array for JSON
    };
    console.log("DEBUG: Final response being sent:", JSON.stringify(finalResponse, null, 2));
    console.log("--- SEARCH END ---");
    res.json(finalResponse);

  } catch (error) {
    console.error("Search error:", error);
    console.log("--- SEARCH END (ERROR) ---");
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

