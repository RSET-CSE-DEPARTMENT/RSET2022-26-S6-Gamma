// backend/routes/apiRoutes.js
const express = require("express");
const router = express.Router();
const axios = require("axios");

// FastAPI ML server URL
const ML_SERVER = process.env.ML_SERVER || "http://127.0.0.1:8000";

/* -------------------------------------------------------
   UNIFIED PREDICTION
   Frontend calls:  POST /api/predict
   Express forwards to: POST 8000/predict
------------------------------------------------------- */
router.post("/predict", async (req, res) => {
    try {
        const response = await axios.post(
            `${ML_SERVER}/predict`,
            req.body
        );

        res.json(response.data);

    } catch (err) {
        console.error("Unified Prediction Error:", err.message);

        res.status(500).json({
            error: "Prediction failed",
            details: err.response?.data || err.message
        });
    }
});


/* -------------------------------------------------------
   CCEAM TEMPORAL PREDICTION
   Frontend calls:  POST /api/predict/cceam
   Express forwards to: POST 8000/predict/cceam
------------------------------------------------------- */
router.post("/predict/cceam", async (req, res) => {
    try {
        const response = await axios.post(
            `${ML_SERVER}/predict/cceam`,
            req.body
        );

        res.json(response.data);

    } catch (err) {
        console.error("CCEAM Prediction Error:", err.message);

        res.status(500).json({
            error: "CCEAM prediction failed",
            details: err.response?.data || err.message
        });
    }
});

module.exports = router;
