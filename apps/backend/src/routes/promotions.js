const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/promotions
// @desc    Get all promo codes
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM promo_codes ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Fetch Promos Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/promotions
// @desc    Create a new promo code
router.post('/', async (req, res) => {
  try {
    const { code, discount_type, discount_value, min_spend, valid_until } = req.body;
    
    if (!code || !discount_type || !discount_value) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const [result] = await db.query(
      'INSERT INTO promo_codes (code, discount_type, discount_value, min_spend, valid_until, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [code.toUpperCase(), discount_type, discount_value, min_spend || 0, valid_until || null]
    );

    res.status(201).json({ success: true, id: result.insertId, message: 'Promo code created' });
  } catch (error) {
    console.error('Create Promo Error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Promo code already exists' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/promotions/:id
// @desc    Toggle promo status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    await db.query('UPDATE promo_codes SET is_active = ? WHERE id = ?', [is_active, id]);
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/promotions/validate/:code
// @desc    Validate a promo code
router.get('/validate/:code', async (req, res) => {
  const { code } = req.params;
  console.log(`VALIDATE PROMO: ${code}`);
  try {
    const [rows] = await db.query(
      'SELECT * FROM promo_codes WHERE code = ? AND is_active = 1',
      [code.toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid or inactive promo code' });
    }

    const promo = rows[0];
    const now = new Date();
    
    if (promo.valid_until && promo.valid_until !== '0000-00-00 00:00:00') {
      const untilDate = new Date(promo.valid_until);
      if (untilDate < now) {
        return res.status(400).json({ success: false, message: 'Promo code has expired' });
      }
    }
    res.json({ success: true, promo });
  } catch (error) {
    console.error('Validate Promo Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/promotions/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM promo_codes WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Promo deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
