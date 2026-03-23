// backend/models/userModel.js
const db = require('../config/db');

module.exports = {
  findByUsername: async (username) => {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows;
  },

  createUser: async (username, hash, role, name) => {
    const [result] = await db.query(
      'INSERT INTO users (username, password_hash, role, name) VALUES (?,?,?,?)',
      [username, hash, role, name]
    );
    return result;
  }
};
