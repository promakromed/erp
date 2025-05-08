const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

// Load environment variables
dotenv.config();

// Connect to database
const connectDB = require("./config/db");

// Middleware
const app = express();
app.use(express.json());
app.use(cors());

// Import Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/clients", require("./routes/clientRoutes"));
app.use("/api/offers", require("./routes/offerRoutes"));
app.use("/api/price-lists", require("./routes/customerPriceListRoutes")); // ✅ Corrected route name

// Serve static assets (HTML, CSS, JS)
app.use(express.static("public"));

// Catch-all route for SPA (Single Page App) behavior
app.get("*", (req, res) => {
    if (req.accepts("html")) {
        res.sendFile(path.resolve(__dirname, "public", "index.html"));
    } else {
        res.status(404).send("API endpoint not found");
    }
});

// Set Port
const PORT = process.env.PORT || 5000;

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
