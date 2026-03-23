// backend/config/db.js
const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'biomarker_dashboard',
  port: 3306
});


module.exports = pool.promise();
