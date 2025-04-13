const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://savio:UjqK13PmTRQqww1W@smartpact.jt9gh.mongodb.net/?retryWrites=true&w=majority&appName=smartpact");
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;