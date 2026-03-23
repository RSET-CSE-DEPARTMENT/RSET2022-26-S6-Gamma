// backend/server.js

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const clinicianRoutes = require("./routes/clinician");
const apiRoutes = require("./routes/apiRoutes");

const app = express();

// ======================================================
// 🌐 SERVE FRONTEND STATIC FILES
// ======================================================
// Serves index.html, dashboard.html, dashboard.js, css/, etc.
// from the sibling "frontend" folder at http://localhost:5000
app.use(express.static(path.join(__dirname, "..", "frontend")));

// ======================================================
// 🔥 APPLY MIDDLEWARE FIRST (IMPORTANT)
// ======================================================

app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

app.use(bodyParser.json());

// ======================================================
// 🔎 HEALTH CHECK
// ======================================================

app.get("/ping", (req, res) => res.json({ ok: true }));

// ======================================================
// 📚 MEDICAL SEARCH PROXY (PubMed)
// ======================================================

app.get("/search/medical", async (req, res) => {
    try {
        const q = req.query.q;

        if (!q) {
            return res.status(400).json({ error: "Missing query" });
        }

        // Node 18+ has built-in fetch
        const r = await fetch(
            `http://localhost:8000/search/medical?q=${encodeURIComponent(q)}`
        );

        if (!r.ok) {
            return res.status(500).json({ error: "Search backend failed" });
        }

        const data = await r.json();

        res.json(data);

    } catch (err) {
        console.error("Medical search proxy error:", err);
        res.status(500).json({ error: "Search error" });
    }
});

// ======================================================
// 🔐 AUTH ROUTES
// ======================================================

app.use("/auth", authRoutes);

// ======================================================
// 👨‍⚕️ CLINICIAN ROUTES
// ======================================================

app.use("/clinician", clinicianRoutes);

// ======================================================
// 🤖 ML ROUTES
// ======================================================

app.use("/api", apiRoutes);

// ======================================================
// 🚀 START SERVER
// ======================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});