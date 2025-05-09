const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

// Load environment variables
dotenv.config({ path: "./.env" }); // Explicitly set path if needed

// Connect to Database
connectDB();

// Initialize App
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "public")));

// Import Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/clients", require("./routes/clientRoutes"));
app.use("/api/offers", require("./routes/offerRoutes"));
app.use("/api/price-lists", require("./routes/customerPriceListRoutes"));

// Route for root URL → serve index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API route fallback (optional, logs unknown API calls)
app.all("/api/*", (req, res) => {
    console.warn(`⚠️ Unknown API request: ${req.path}`);
    res.status(404).json({ message: "API endpoint not found" });
});

// Catch-all route for frontend (SPA-style)
app.get("*", (req, res) => {
    const filePath = path.join(__dirname, "public", req.path.replace(/^\/+/, ""));
    
    // If file exists at requested path, send it
    if (fs.existsSync(filePath) && !filePath.endsWith(".html")) {
        return res.sendFile(filePath);
    }

    // Otherwise fall back to index.html
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start Server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
