// server.js

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
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

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// API Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/clients", require("./routes/clientRoutes"));
app.use("/api/offers", require("./routes/offerRoutes"));
app.use("/api/price-lists", require("./routes/customerPriceListRoutes"));

// SPA fallback for frontend routes
app.get("*", (req, res) => {
    const filePath = path.join(__dirname, "public", req.path === "/" ? "index.html" : req.path);
    const ext = path.extname(filePath).toLowerCase();

    // Serve static file if it exists
    if (fs.existsSync(filePath) && !ext.includes('html')) {
        return res.sendFile(filePath);
    }

    // Otherwise serve index.html (for SPA routing)
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});
