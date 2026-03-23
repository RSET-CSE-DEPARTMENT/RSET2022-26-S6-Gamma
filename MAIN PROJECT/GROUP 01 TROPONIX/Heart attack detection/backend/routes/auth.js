const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");

// LOGIN
// LOGIN
router.post("/login", async (req, res) => {
    try {
        console.log("Incoming login body:", req.body); // debug

        const { username, password, role } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ error: "Missing credentials" });
        }

        const [rows] = await db.execute(
            "SELECT * FROM users WHERE username = ?",
            [username]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = rows[0];

        // Safety check for corrupted DB row
        if (!user.password_hash) {
            return res.status(500).json({ error: "Password not set for user" });
        }

        const passwordMatch = bcrypt.compareSync(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid password" });
        }

        if (user.role !== role) {
            return res.status(403).json({ error: "Incorrect login portal" });
        }

        return res.json({
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            }
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err); // VERY IMPORTANT
        return res.status(500).json({ error: "Internal server error" });
    }
});
// SIGNUP
router.post("/signup", async (req, res) => {
    const { username, password, role, name } = req.body;

    try {
        const hash = bcrypt.hashSync(password, 10);

        await db.execute(
            "INSERT INTO users (username, password_hash, role, name) VALUES (?, ?, ?, ?)",
            [username, hash, role, name]
        );

        res.json({ message: "Account created successfully" });
    } catch (err) {
        res.status(500).json({ error: "Signup failed" });
    }
});

module.exports = router;
