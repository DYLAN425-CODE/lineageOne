const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const User = require('../models/User');

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post(
    '/register',
    [
        // --- Input Validation ---
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
    ],
    async (req, res) => {
        // --- Handle Validation Errors ---
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Return the first error message for simplicity
            return res.status(400).json({ msg: errors.array()[0].msg });
        }

        const { email, password } = req.body;

        try {
            // --- Check if user already exists ---
            let user = await User.findOne({ email: email.toLowerCase() });

            if (user) {
                return res.status(400).json({ msg: 'This email address is already registered.' });
            }

            // --- Create new user instance ---
            user = new User({
                username: email.split('@')[0], // Default username from email
                email: email.toLowerCase(),
                password, // Temporarily set plain password
            });

            // --- Hash the password ---
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);

            // --- Save user to database ---
            await user.save();

            console.log(`[Server] New user registered: ${user.email}`);

            // For a real app, you would generate and return a JWT (JSON Web Token) here.
            // For now, we just send a success message.
            res.status(201).json({ msg: 'Registration successful!' });

        } catch (err) {
            console.error('Server registration error:', err.message);
            res.status(500).send('Server error');
        }
    }
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token (session data)
// @access  Public
router.post(
    '/login',
    [
        // --- Input Validation ---
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Password is required').exists(),
    ],
    async (req, res) => {
        // --- Handle Validation Errors ---
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: errors.array()[0].msg });
        }

        const { email, password } = req.body;

        try {
            // --- Check if user exists ---
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                // Use a generic message to prevent email enumeration
                return res.status(400).json({ msg: 'Invalid Credentials' });
            }

            // --- Compare passwords ---
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Invalid Credentials' });
            }

            // --- Login Successful ---
            console.log(`[Server] User logged in: ${user.email}`);

            // Send back user data to be stored in the client's session.
            // In a production app, you would generate and return a JSON Web Token (JWT) here for stateless authentication.
            res.json({
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin || false, // Ensure isAdmin has a value
            });
        } catch (err) {
            console.error('Server login error:', err.message);
            res.status(500).send('Server error');
        }
    }
);

module.exports = router;