// server_SPA_fallback_fixed.js

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const fs = require("fs"); // fs is used in the original, so keep it
const mongoose = require("mongoose");

// Load environment variables
dotenv.config({ path: "./.env" });

// Connect to Database
const connectDB = require("./config/db");
connectDB();

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from /public (e.g. CSS, frontend JS bundles, images)
// This should handle requests for existing files in /public directly.
app.use(express.static(path.join(__dirname, "public")));

// API Routes (These should be defined BEFORE the SPA fallback)
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/clients", require("./routes/clientRoutes"));
app.use("/api/offers", require("./routes/offerRoutes"));
app.use("/api/price-lists", require("./routes/customerPriceListRoutes"));

// SPA fallback for frontend routes - MODIFIED
app.get("*", (req, res, next) => {
    // If the request path starts with /api/, it's an API call.
    // Let it be handled by the API routes or fall through to a 404 if not matched by an API route.
    // Do not serve index.html for API calls.
    if (req.path.startsWith("/api/")) {
        return next(); // Pass control to the next middleware/handler in the stack (which could be a 404)
    }

    // For any other GET request that is not an API call, serve index.html.
    // This allows your single-page application's frontend routing to take over.
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Error Handling Middleware (Example - you might have your own)
// It's good practice to have error handlers defined after all routes.
app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
});

app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});

