const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // To use environment variables from .env file

const app = express();

// --- Middleware ---

// Enable Cross-Origin Resource Sharing (CORS)
// This allows your frontend (on a different port) to communicate with this backend.
app.use(cors());

// Body Parser Middleware to accept JSON data
app.use(express.json({ extended: false }));

// --- Database Connection ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        // Exit process with failure
        process.exit(1);
    }
};

connectDB();

// --- Define Routes ---
app.get('/', (req, res) => res.send('API Running'));
app.use('/api/auth', require('./routes/auth'));

// --- Start Server ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));