const express = require("express");
const router = express.Router();
const db = require("../config/db");

// SAVE PATIENT RECORD
router.post("/addPatientRecord", async (req, res) => {
    const { clinician_id, patient_name, age, gender, biomarkers, prediction, probability } = req.body;

    try {
        await db.execute(
            `INSERT INTO patient_records 
             (clinician_id, patient_name, age, gender, biomarkers, prediction, probability)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                clinician_id,
                patient_name,
                age,
                gender,
                JSON.stringify(biomarkers),
                prediction,
                probability
            ]
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET RECORDS FOR ONE CLINICIAN
router.get("/patients/:clinician_id", async (req, res) => {
    const { clinician_id } = req.params;

    try {
        const [rows] = await db.execute(
            "SELECT * FROM patient_records WHERE clinician_id = ? ORDER BY created_at DESC",
            [clinician_id]
        );

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
