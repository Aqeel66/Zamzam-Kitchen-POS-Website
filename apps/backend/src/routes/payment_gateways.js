const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/payment-gateways
// @desc    Get all payment gateway settings
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM payment_gateway_settings');
    res.json(rows);
  } catch (error) {
    console.error('Fetch Payment Gateways Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/payment-gateways
// @desc    Update or Create payment gateway settings
router.post('/', async (req, res) => {
  try {
    const { 
        gateway_name, 
        public_key, 
        secret_key, 
        webhook_secret, 
        is_active, 
        environment 
    } = req.body;
    
    console.log('--- GATEWAY UPDATE REQUEST ---');
    console.log('Body:', req.body);
    console.log('------------------------------');

    if (!gateway_name) {
      return res.status(400).json({ success: false, message: 'Gateway name is required' });
    }

    const [existing] = await db.query(
      'SELECT id FROM payment_gateway_settings WHERE gateway_name = ?',
      [gateway_name]
    );

    if (existing.length > 0) {
      // Dynamic Update
      const updates = [];
      const params = [];
      if (public_key !== undefined) { updates.push('public_key = ?'); params.push(public_key); }
      if (secret_key !== undefined) { updates.push('secret_key = ?'); params.push(secret_key); }
      if (webhook_secret !== undefined) { updates.push('webhook_secret = ?'); params.push(webhook_secret); }
      if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
      if (environment !== undefined) { updates.push('environment = ?'); params.push(environment); }
      
      if (updates.length > 0) {
        params.push(gateway_name);
        await db.query(`UPDATE payment_gateway_settings SET ${updates.join(', ')} WHERE gateway_name = ?`, params);
      }
    } else {
      // Insert
      await db.query(
        'INSERT INTO payment_gateway_settings (gateway_name, public_key, secret_key, webhook_secret, is_active, environment) VALUES (?, ?, ?, ?, ?, ?)',
        [gateway_name, public_key || null, secret_key || null, webhook_secret || null, is_active || 0, environment || 'sandbox']
      );
    }

    res.json({ success: true, message: `${gateway_name} settings updated successfully` });
  } catch (error) {
    console.error('Update Payment Gateway Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
