const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  walletAddress: { type: String, required: true },
  name: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Create and export the User model
const User = mongoose.model("User", userSchema);
module.exports = User;
