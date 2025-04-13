const express = require("express");
const router = express.Router();
const { getUserById } = require("../controllers/userController");

// Route to get user by ID
router.get("/:id", getUserById);

module.exports = router;
