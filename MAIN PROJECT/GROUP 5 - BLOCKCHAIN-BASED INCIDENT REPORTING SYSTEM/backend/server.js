require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// ✅ SAVE INCIDENT (already exists)
app.post("/saveIncident", async (req, res) => {
  try {
    const { wallet, description, location, txHash } = req.body;

    const sql = `
      INSERT INTO incidents (wallet_address, description, location, tx_hash)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await pool.execute(sql, [
      wallet,
      description,
      location,
      txHash
    ]);

    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error("Error saving:", error);
    res.status(500).json({ success: false, error: "DB error" });
  }
});

// 🆕 GET DESCRIPTION BY TRANSACTION HASH
app.get("/incident/by-tx/:txHash", async (req, res) => {
  try {
    const { txHash } = req.params;

    const sql = `
      SELECT description, location
      FROM incidents
      WHERE tx_hash = ?
    `;

    const [rows] = await pool.execute(sql, [txHash]);

    if (rows.length === 0) {
      return res.json({ description: null, location: null });
    }

    res.json({
      description: rows[0].description,
      location: rows[0].location
    });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ description: null, location: null });
  }
});

app.listen(process.env.PORT, () => {
  console.log("Server running on port", process.env.PORT);
});
