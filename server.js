const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose"); // Import mongoose
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// API Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/search", require("./routes/searchRoutes")); 
app.use("/api/clients", require("./routes/clientRoutes")); // Add the new client routes

// Serve static assets (HTML, CSS, JS) from the 'public' directory
// This middleware should handle serving index.html, clients.html, app.js, clients.js, styles.css etc.
app.use(express.static("public"));

// Catch-all route: If no static file or API route matches, serve index.html.
// This is common for Single Page Applications (SPAs) to handle client-side routing.
// Ensure this comes AFTER your API routes and static middleware.
app.get("*", (req, res) => {
  // Check if the request accepts HTML, otherwise it might be an API call error
  if (req.accepts("html")) {
    res.sendFile(path.resolve(__dirname, "public", "index.html"));
  } else {
    // Optionally handle non-HTML requests that didn't match API routes
    res.status(404).send("API endpoint not found");
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`));

