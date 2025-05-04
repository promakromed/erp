const express = require("express");
const router = express.Router();
const axios = require("axios"); // Keep for potential future use, though rate fetching moved to Python
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

// Removed getGbpToUsdRate function as conversion now happens during import

// @desc    Get distinct manufacturers
// @route   GET /api/search/manufacturers
// @access  Private
router.get("/manufacturers", protect, async (req, res) => {
  try {
    console.log("--- GET MANUFACTURERS START ---");
    const manufacturers = await Product.distinct("manufacturer");
    // Filter out any null or empty string values and sort alphabetically
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
    // Get itemNumbers and optional manufacturer from request body
    const { itemNumbers, manufacturer } = req.body;

    if (!itemNumbers || !Array.isArray(itemNumbers) || itemNumbers.length === 0) {
      return res.status(400).json({ message: "Item numbers array is required in the request body" });
    }

    const itemNoArray = itemNumbers.map(item => item.trim());
    console.log("--- SEARCH START ---");
    console.log("DEBUG: Searching for item numbers:", itemNoArray);
    if (manufacturer) {
        console.log("DEBUG: Filtering by manufacturer:", manufacturer);
    }

    // --- Build the query filter --- 
    const filter = { 
        itemNo: { $in: itemNoArray } 
    };
    // Add manufacturer to filter if provided and not empty/null
    if (manufacturer && manufacturer.trim() !== "") {
        filter.manufacturer = manufacturer;
    }
    console.log("DEBUG: Using query filter:", filter);

    // 1. Find products using the filter
    console.log("DEBUG: Finding products (manual population)...");
    // Select the necessary fields including the new price fields
    const products = await Product.find(filter)
        .select("+supplierOffers.originalPrice +supplierOffers.originalCurrency +supplierOffers.usdPrice") // Ensure these are selected if not default
        .lean(); // Use .lean() for plain JS objects
    console.log(`DEBUG: Found ${products.length} products matching filter.`);

    if (!products || products.length === 0) {
        console.log("DEBUG: No products found matching filter, returning empty response.");
        return res.json({ products: [], suppliers: [] });
    }

    // *** DETAILED LOGGING START ***
    if (products.length > 0) {
        console.log("DEBUG: Raw product data (first product):", JSON.stringify(products[0], null, 2));
    }

    // 2. Collect unique supplier ObjectIds from the found products
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

          // Check for essential fields from the updated schema
          if (!offer || !supplierName || offer.originalPrice === undefined || offer.originalCurrency === undefined || offer.usdPrice === undefined) {
            console.log(`DEBUG: Product ${pIndex}, Offer ${oIndex}: Skipping offer due to missing data (Offer: ${!!offer}, Name: ${!!supplierName}, OrigPrice: ${offer?.originalPrice}, OrigCurr: ${offer?.originalCurrency}, UsdPrice: ${offer?.usdPrice})`);
            return;
          }

          const originalPrice = parseFloat(offer.originalPrice);
          const originalCurrency = offer.originalCurrency.toUpperCase();
          const usdPrice = parseFloat(offer.usdPrice);
          let displayString = "N/A";

          if (!isNaN(originalPrice) && !isNaN(usdPrice)) {
            // Construct display string based on the requirement
            if (originalCurrency === "USD") {
              displayString = `${formatCurrencyNumber(originalPrice)} USD`;
            } else {
              displayString = `${formatCurrencyNumber(originalPrice)} ${originalCurrency} (USD ${formatCurrencyNumber(usdPrice)})`;
            }
            
            console.log(`DEBUG: Product ${pIndex}, Offer ${oIndex}: Supplier '${supplierName}', OrigPrice: ${originalPrice}, OrigCurr: ${originalCurrency}, UsdPrice: ${usdPrice}, Display: '${displayString}'`);
            offers[supplierName] = displayString;

            // Use usdPrice for winner calculation
            if (usdPrice < lowestPriceUsd) {
              lowestPriceUsd = usdPrice;
              winner = supplierName;
              console.log(`DEBUG: Product ${pIndex}, Offer ${oIndex}: New winner found: ${winner} at USD ${lowestPriceUsd}`);
            }
          } else {
             console.log(`DEBUG: Product ${pIndex}, Offer ${oIndex}: Invalid price (Orig: ${offer.originalPrice}, USD: ${offer.usdPrice}), setting display to N/A.`);
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

