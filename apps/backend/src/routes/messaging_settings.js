const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/messaging-settings
// @desc    Get messaging provider settings
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM messaging_settings');
    res.json(rows);
  } catch (error) {
    console.error('Fetch Messaging Settings Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/messaging-settings
// @desc    Update or Create messaging settings
router.post('/', async (req, res) => {
  try {
    const { 
        provider_name, 
        account_sid, 
        auth_token, 
        sender_number, 
        is_active, 
        environment 
    } = req.body;

    if (!provider_name) {
      return res.status(400).json({ success: false, message: 'Provider name is required' });
    }

    const [existing] = await db.query(
      'SELECT id FROM messaging_settings WHERE provider_name = ?',
      [provider_name]
    );

    if (existing.length > 0) {
      // Dynamic Update
      const updates = [];
      const params = [];
      if (account_sid !== undefined) { updates.push('account_sid = ?'); params.push(account_sid); }
      if (auth_token !== undefined) { updates.push('auth_token = ?'); params.push(auth_token); }
      if (sender_number !== undefined) { updates.push('sender_number = ?'); params.push(sender_number); }
      if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
      if (environment !== undefined) { updates.push('environment = ?'); params.push(environment); }
      
      if (updates.length > 0) {
        params.push(provider_name);
        await db.query(`UPDATE messaging_settings SET ${updates.join(', ')} WHERE provider_name = ?`, params);
      }
    } else {
      // Insert
      await db.query(
        'INSERT INTO messaging_settings (provider_name, account_sid, auth_token, sender_number, is_active, environment) VALUES (?, ?, ?, ?, ?, ?)',
        [provider_name, account_sid || null, auth_token || null, sender_number || null, is_active || 0, environment || 'sandbox']
      );
    }

    res.json({ success: true, message: `${provider_name} settings updated successfully` });
  } catch (error) {
    console.error('Update Messaging Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

const axios = require('axios');

// @route   POST /api/messaging-settings/test
// @desc    Test messaging provider connection
router.post('/test', async (req, res) => {
    try {
        const { provider_name, account_sid, auth_token, sender_number, test_number } = req.body;

        if (!test_number) {
            return res.status(400).json({ success: false, message: 'Test phone number is required' });
        }

        if (provider_name === 'Twilio') {
            const auth = Buffer.from(`${account_sid}:${auth_token}`).toString('base64');
            const params = new URLSearchParams();
            params.append('To', test_number.startsWith('whatsapp:') ? test_number : `whatsapp:${test_number}`);
            params.append('From', sender_number.startsWith('whatsapp:') ? sender_number : `whatsapp:${sender_number}`);
            params.append('Body', 'Hello from Zamzam Kitchen POS! Your Twilio integration is working correctly.');

            await axios.post(
                `https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`,
                params,
                { headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
        } else if (provider_name === 'WhatsApp Direct') {
            // Meta WhatsApp Cloud API
            await axios.post(
                `https://graph.facebook.com/v17.0/${account_sid}/messages`,
                {
                    messaging_product: "whatsapp",
                    to: test_number.replace('+', ''),
                    type: "text",
                    text: { body: "Hello from Zamzam Kitchen POS! Your direct WhatsApp integration is working correctly." }
                },
                { headers: { 'Authorization': `Bearer ${auth_token}`, 'Content-Type': 'application/json' } }
            );
        }

        res.json({ success: true, message: 'Test message sent successfully!' });
    } catch (error) {
        console.error('Messaging Test Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send test message', 
            details: error.response ? error.response.data : error.message 
        });
    }
});

module.exports = router;
