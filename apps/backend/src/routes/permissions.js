const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all permissions
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM permissions ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
