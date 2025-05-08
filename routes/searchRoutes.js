const express = require("express");
const router = express.Router();
const axios = require("axios"); // Keep for potential future use
const mongoose = require("mongoose");
const { AsyncParser } = require("@json2csv/node");
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
        const manufacturers = await Product.distinct("manufacturer");
        const filteredManufacturers = manufacturers.filter(m => m).sort(); 
        res.json(filteredManufacturers);
    } catch (error) {
        console.error("Error fetching distinct manufacturers:", error);
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

        let query = { itemNo: { $in: itemNoArray } };

        if (manufacturer && manufacturer !== "All" && manufacturer !== "") {
            query.manufacturer = manufacturer;
        }

        const products = await Product.find(query)
            .select("+supplierOffers.originalPrice +supplierOffers.originalCurrency +supplierOffers.usdPrice")
            .lean();

        if (!products || products.length === 0) {
            return res.json({ products: [], suppliers: [] });
        }

        // Collect supplier IDs from matching products
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
        const supplierMap = {};
        const uniqueSuppliers = new Set();

        if (uniqueSupplierIds.length > 0) {
            const suppliers = await Supplier.find({ _id: { $in: uniqueSupplierIds } }).select('name _id');
            suppliers.forEach(supplier => {
                supplierMap[supplier._id.toString()] = supplier.name;
                uniqueSuppliers.add(supplier.name);
            });
        }

        // Process each product for response
        const processedProducts = products.map(product => {
            const offers = {};
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
                offers,
                winner
            };
        });

        const finalResponse = {
            products: processedProducts,
            suppliers: Array.from(uniqueSuppliers).sort()
        };

        res.json(finalResponse);
    } catch (error) {
        console.error("Search error:", error);
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
        let query = { itemNo: { $in: itemNoArray } };

        if (manufacturer && manufacturer !== "All" && manufacturer !== "") {
            query.manufacturer = manufacturer;
        }

        const products = await Product.find(query)
            .select("+supplierOffers.originalPrice +supplierOffers.originalCurrency +supplierOffers.usdPrice")
            .lean();

        if (!products || products.length === 0) {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="search_results.csv"');
            return res.status(200).send('');
        }

        // Collect supplier IDs
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
        const supplierMap = {};

        if (uniqueSupplierIds.length > 0) {
            const suppliers = await Supplier.find({ _id: { $in: uniqueSupplierIds } }).select('name _id');
            suppliers.forEach(supplier => {
                supplierMap[supplier._id.toString()] = supplier.name;
            });
        }

        const sortedSuppliers = Array.from(new Set([...supplierMap.values()].sort()));
        const csvData = products.map(product => {
            let rowData = {
                'Item Number': product.itemNo,
                'Description': product.description,
                'Size': product.size || "N/A",
                'Manufacturer': product.manufacturer || "N/A",
                'Brand': product.brand || "N/A"
            };

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
                        rowData[`${supplierName} Price`] = displayString;

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

        const fields = [
            'Item Number',
            'Description',
            'Size',
            'Manufacturer',
            'Brand',
            ...sortedSuppliers.map(name => `${name} Price`),
            'Winner'
        ];

        const json2csvParser = new AsyncParser({ fields });
        const csv = await json2csvParser.parse(csvData).promise();

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="search_results.csv"');
        res.status(200).send(csv);
    } catch (error) {
        console.error("Export error:", error);
        res.status(500).json({ message: "Server Error during export" });
    }
});

// @desc    Text-based search for autocomplete
// @route   GET /api/search/text
// @access  Private
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
