const axios = require("axios");

let exchangeRatesCache = {};
let lastFetchTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Fetch live rates from API for a base currency
const fetchLiveExchangeRates = async (baseCurrency = "USD") => {
    try {
        const response = await axios.get(`https://api.exchangerate.host/latest?base= ${baseCurrency}`);
        if (response.data?.success && response.data?.rates) {
            exchangeRatesCache[baseCurrency] = response.data.rates;
            lastFetchTime = Date.now();
            console.log(`Fetched live exchange rates for ${baseCurrency}`);
        } else {
            throw new Error("Invalid exchange rate response");
        }
    } catch (error) {
        console.warn(`Using fallback exchange rates for ${baseCurrency}`, error.message);
        exchangeRatesCache[baseCurrency] = {
            USD: baseCurrency === "USD" ? 1 : await getFallbackRate(baseCurrency, "USD"),
            EUR: baseCurrency === "EUR" ? 1 : await getFallbackRate(baseCurrency, "EUR"),
            GBP: baseCurrency === "GBP" ? 1 : await getFallbackRate(baseCurrency, "GBP"),
            TRY: baseCurrency === "TRY" ? 1 : await getFallbackRate(baseCurrency, "TRY"),
            CNY: baseCurrency === "CNY" ? 1 : await getFallbackRate(baseCurrency, "CNY")
        };
    }
};

// Fallback rates (only used if API fails)
const getFallbackRate = async (fromCurrency, toCurrency) => {
    const defaultRates = {
        USD: { EUR: 0.92, GBP: 0.78, TRY: 32.5, CNY: 7.2 },
        EUR: { USD: 1.09, GBP: 0.85, TRY: 35.3, CNY: 7.8 },
        GBP: { USD: 1.28, EUR: 1.18, TRY: 41.5, CNY: 9.1 },
        TRY: { USD: 0.031, EUR: 0.028, GBP: 0.024, CNY: 0.22 },
        CNY: { USD: 0.14, EUR: 0.13, GBP: 0.11, TRY: 4.5 }
    };

    return defaultRates[fromCurrency]?.[toCurrency] || 1;
};

// Main function used across controllers
const getExchangeRate = async (fromCurrency = "USD", toCurrency = "USD") => {
    if (fromCurrency === toCurrency) return 1;

    if (!exchangeRatesCache[fromCurrency] || Date.now() - lastFetchTime > CACHE_TTL) {
        await fetchLiveExchangeRates(fromCurrency);
    }

    const rateFromBase = exchangeRatesCache[fromCurrency][toCurrency];
    let exchangeRate = typeof rateFromBase === "number" ? rateFromBase : await getFallbackRate(fromCurrency, toCurrency);

    // Only apply 3% protection if final target is USD
    if (toCurrency === "USD" && fromCurrency !== "USD") {
        exchangeRate *= 1.03;
        console.log(`Applied 3% protection for ${fromCurrency} -> USD`);
    }

    return exchangeRate;
};

module.exports = { getExchangeRate };
