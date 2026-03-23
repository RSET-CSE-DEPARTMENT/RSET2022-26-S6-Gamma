// backend/controllers/authController.js
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

exports.signup = async (req, res) => {
  try {
    const { username, password, role = 'patient', name = '' } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password required' });
    }

    const existing = await User.findByUsername(username);
    if (existing && existing.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    await User.createUser(username, hash, role, name);
    return res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    console.error('signup error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password required' });
    }

    const rows = await User.findByUsername(username);
    if (!rows || rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Return minimal user object (do NOT return password)
    const safeUser = {
      username: user.username,
      name: user.name || user.username,
      role: user.role
    };

    return res.json({ message: 'Login successful', user: safeUser });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
