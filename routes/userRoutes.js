const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { protect } = require("../middleware/authMiddleware");

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
});

// @desc    Register new user
// @route   POST /api/users
// @access  Public
router.post("/", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Please fill all fields" });
    }

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const user = await User.create(req.body);

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: "Invalid user data" });
        }
    } catch (error) {
        console.error("Registration error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get("/profile", protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error("Profile fetch error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put("/profile", protect, async (req, res) => {
    const { name, email, password } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password; // Hashing handled by userModel.pre('save')

    try {
        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            isAdmin: updatedUser.isAdmin,
            token: generateToken(updatedUser._id)
        });
    } catch (error) {
        console.error("Profile update error:", error.message);
        res.status(500).json({ message: "Failed to update user" });
    }
});

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
};

module.exports = router;
