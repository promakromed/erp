// productController_multi_supplier_axios.js
const asyncHandler = require("express-async-handler");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser"); // Requires: npm install csv-parser
const axios = require("axios"); // Requires: npm install axios

const EXCHANGE_RATE_API_KEY = "f26d7d429ec784d0b76cc118";

async function getExchangeRate(fromCurrency, toCurrency) {
    console.log(`Attempting to get exchange rate from ${fromCurrency} to ${toCurrency} using ExchangeRate-API`);
    if (fromCurrency === toCurrency) {
        return 1.0;
    }
    if (!fromCurrency || !toCurrency) {
        console.warn("Invalid currency codes provided for exchange rate.");
        return 1.0; // Fallback
    }

    const apiUrl = `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/${fromCurrency.toUpperCase()}`;

    try {
        const response = await axios.get(apiUrl);
        if (response.data && response.data.result === "success" && response.data.conversion_rates) {
            const rate = response.data.conversion_rates[toCurrency.toUpperCase()];
            if (rate) {
                console.log(`Successfully fetched rate for ${fromCurrency} to ${toCurrency}: ${rate}`);
                return parseFloat(rate);
            }
            console.warn(`Exchange rate not found for ${toCurrency.toUpperCase()} in response from ${fromCurrency.toUpperCase()}.`);
        } else {
            console.warn(`Failed to fetch valid exchange rates from API. Response: ${JSON.stringify(response.data)}`);
        }
        return 1.0; // Fallback if rate not found in a successful response
    } catch (error) {
        console.error(`Error fetching exchange rate for ${fromCurrency} to ${toCurrency}:`, error.message);
        if (error.response) {
            console.error("API Error Response Data:", error.response.data);
            console.error("API Error Response Status:", error.response.status);
        }
        console.warn(`Using 1.0 as fallback due to API error.`);
        return 1.0; // Fallback in case of API error
    }
}

const getProductsByManufacturerAndPartNumbers = asyncHandler(async (req, res) => {
    const { manufacturer, partNumbers } = req.body;

    if (!manufacturer || !Array.isArray(partNumbers) || partNumbers.length === 0) {
        return res.status(400).json({
            message: "Manufacturer and a non-empty array of partNumbers are required."
        });
    }

    const dataDir = path.join(__dirname, "..", "data");
    let relevantSupplierFiles = [];

    try {
        const allFiles = await fs.promises.readdir(dataDir);
        relevantSupplierFiles = allFiles.filter(file =>
            file.endsWith(`_${manufacturer}.csv`) && file.includes("_") && file.toLowerCase().endsWith(".csv")
        );

        if (relevantSupplierFiles.length === 0) {
            return res.status(404).json({ message: `No supplier CSV files found for manufacturer: ${manufacturer}` });
        }
    } catch (err) {
        console.error("Error reading data directory:", err);
        return res.status(500).json({ message: "Server error reading supplier data directory." });
    }

    const resultsForAllPartNumbers = [];

    for (const partNo of partNumbers) {
        const partNoTrimmed = partNo.trim().toUpperCase();
        const pricesFromSuppliers = [];

        for (const fileName of relevantSupplierFiles) {
            const supplierName = fileName.split("_")[0];
            const filePath = path.join(dataDir, fileName);
            
            try {
                await new Promise((resolve, reject) => {
                    const fileStream = fs.createReadStream(filePath);
                    fileStream
                        .on("error", (error) => { // Handle stream creation errors
                            console.error(`Error creating read stream for file ${fileName}:`, error);
                            reject(error);
                        })
                        .pipe(csv())
                        .on("data", (row) => {
                            const csvPartNumber = row["PART #"] || row["Part #"] || row["part #"];
                            const csvPrice = row["PRICE"] || row["Price"] || row["price"];
                            const csvCurrency = row["CURRENCY"] || row["Currency"] || row["currency"];

                            if (csvPartNumber && csvPartNumber.trim().toUpperCase() === partNoTrimmed) {
                                const price = parseFloat(String(csvPrice).replace(/[^\d.-]/g, ""));
                                const currency = String(csvCurrency).trim().toUpperCase();

                                if (!isNaN(price) && currency) {
                                    pricesFromSuppliers.push({
                                        supplier: supplierName,
                                        originalPrice: price,
                                        originalCurrency: currency,
                                    });
                                }
                            }
                        })
                        .on("end", () => {
                            resolve();
                        })
                        .on("error", (error) => {
                            console.error(`Error reading CSV file ${fileName} during piping:`, error);
                            reject(error); 
                        });
                });
            } catch (streamError) {
                console.error(`Critical error processing ${fileName} for part ${partNoTrimmed}, skipping this file for this part number. Error: ${streamError.message}`);
            }
        }

        if (pricesFromSuppliers.length > 0) {
            const processedSupplierPrices = [];
            for (const p of pricesFromSuppliers) {
                const exchangeRate = await getExchangeRate(p.originalCurrency, "USD");
                const priceUSD = p.originalPrice * exchangeRate;
                const priceUSDWithProtection = parseFloat((priceUSD * 1.03).toFixed(2));
                processedSupplierPrices.push({
                    ...p,
                    usdPriceWithProtection: priceUSDWithProtection
                });
            }

            processedSupplierPrices.sort((a, b) => a.usdPriceWithProtection - b.usdPriceWithProtection);
            const winnerSupplier = processedSupplierPrices.length > 0 ? processedSupplierPrices[0].supplier : null;

            resultsForAllPartNumbers.push({
                partNumber: partNoTrimmed,
                found: true,
                suppliers: processedSupplierPrices.map(sp => ({ ...sp, isWinner: sp.supplier === winnerSupplier }))
            });
        } else {
            resultsForAllPartNumbers.push({
                partNumber: partNoTrimmed,
                found: false,
                suppliers: []
            });
        }
    }

    res.json(resultsForAllPartNumbers);
});

const Product = require("../models/productModel");
const getManufacturers = asyncHandler(async (req, res) => {
    try {
        const dataDir = path.join(__dirname, "..", "data");
        const allFiles = await fs.promises.readdir(dataDir);
        const manufacturerSet = new Set();
        allFiles.forEach(file => {
            if (file.includes("_") && file.toLowerCase().endsWith(".csv")) {
                const parts = file.split("_");
                if (parts.length > 1) {
                    const manufacturerName = parts[1].replace(/\.csv$/i, "");
                    manufacturerSet.add(manufacturerName);
                }
            }
        });
        res.json(Array.from(manufacturerSet).filter(Boolean).sort());

    } catch (error) {
        console.error("Error fetching manufacturers:", error);
        res.status(500).json({ message: "Server error fetching manufacturers list" });
    }
});

module.exports = {
    getProductsByManufacturerAndPartNumbers,
    getManufacturers
};
