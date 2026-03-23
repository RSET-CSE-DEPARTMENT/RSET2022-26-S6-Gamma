CREATE DATABASE IF NOT EXISTS biomarker_dashboard;
USE biomarker_dashboard;

-- USERS TABLE (patients + clinicians)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('patient','clinician') DEFAULT 'patient',
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PATIENT RECORDS TABLE (clinicians store patient results here)
CREATE TABLE IF NOT EXISTS patient_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinician_id INT NOT NULL,
    patient_name VARCHAR(100) NOT NULL,
    age INT,
    gender VARCHAR(10),

    troponin FLOAT,
    ckmb FLOAT,
    cholesterol FLOAT,
    triglyceride FLOAT,
    crp FLOAT,
    homocysteine FLOAT,
    bmi FLOAT,

    risk_probability FLOAT,
    risk_label VARCHAR(20),
    model_used VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (clinician_id) REFERENCES users(id)
);
