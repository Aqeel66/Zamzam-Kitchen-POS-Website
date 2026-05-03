const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/settings
// @desc    Get all settings (Branch & Tenant)
router.get('/', async (req, res) => {
  try {
    const [tenant] = await db.query('SELECT * FROM tenant_settings LIMIT 1');
    const [branch] = await db.query('SELECT * FROM branch_settings WHERE branch_id = 1 LIMIT 1');
    const [gateways] = await db.query('SELECT * FROM payment_gateway_settings');
    const [messaging] = await db.query('SELECT * FROM messaging_settings');
    const [email] = await db.query('SELECT * FROM email_settings');
    
    res.json({
      tenant: tenant[0] || {},
      branch: branch[0] || {},
      payment_gateways: gateways,
      messaging: messaging,
      email: email
    });
  } catch (error) {
    console.error('Fetch Settings Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/settings/tenant
router.patch('/tenant', async (req, res) => {
  try {
    const fields = req.body;
    const allowedFields = [
      'theme_mode', 
      'primary_accent_color', 
      'currency', 
      'restaurant_name', 
      'logo_url', 
      'secondary_logo_url',
      'business_name',
      'business_email',
      'business_phone',
      'business_address'
    ];
    
    const updates = [];
    const values = [];
    
    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update' });
    }
    
    values.push(1); // id = 1
    
    const query = `UPDATE tenant_settings SET ${updates.join(', ')} WHERE id = ?`;
    console.log('DEBUG: Updating Tenant Settings:', { query, values });
    
    const [result] = await db.query(query, values);
    console.log('DEBUG: Update Result:', result);
    
    res.json({ success: true, message: 'Tenant settings updated' });
  } catch (error) {
    console.error('Update Tenant Settings Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PATCH /api/settings/branch
router.patch('/branch', async (req, res) => {
  try {
    const fields = req.body;
    const allowedFields = [
      'kds_timer_minutes', 
      'gratuity_percentage', 
      'allow_qr_pay', 
      'booking_fee_amount', 
      'is_booking_fee_enabled',
      'allow_delivery',
      'allow_pickup',
      'is_tax_enabled',
      'tax_rate',
      'payment_policy'
    ];
    
    const updates = [];
    const values = [];
    
    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update' });
    }
    
    values.push(1); // branch_id = 1
    
    const query = `UPDATE branch_settings SET ${updates.join(', ')} WHERE branch_id = ?`;
    console.log('DEBUG: Updating Branch Settings:', { query, values });
    
    const [result] = await db.query(query, values);
    console.log('DEBUG: Update Result:', result);
    
    res.json({ success: true, message: 'Branch settings updated' });
  } catch (error) {
    console.error('Update Branch Settings Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/settings/gateways
router.post('/gateways', async (req, res) => {
  try {
    const { gateway_name, public_key, secret_key, webhook_secret, is_active, environment } = req.body;
    
    // Build update query dynamically
    const fields = [];
    const values = [];
    
    if (public_key !== undefined) { fields.push('public_key = ?'); values.push(public_key); }
    if (secret_key !== undefined) { fields.push('secret_key = ?'); values.push(secret_key); }
    if (webhook_secret !== undefined) { fields.push('webhook_secret = ?'); values.push(webhook_secret); }
    if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active); }
    if (environment !== undefined) { fields.push('environment = ?'); values.push(environment); }
    
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update' });
    }
    
    values.push(gateway_name);
    const query = `UPDATE payment_gateway_settings SET ${fields.join(', ')} WHERE gateway_name = ?`;
    
    await db.query(query, values);
    
    res.json({ success: true, message: `${gateway_name} settings updated` });
  } catch (error) {
    console.error('Update Gateway Settings Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/settings/reset-transactions
// @desc    Reset all transactional data (Orders, Payments, Reservations, etc.)
router.post('/reset-transactions', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Disable foreign key checks to allow truncation
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    const tablesToReset = [
      'order_item_customizations',
      'order_items',
      'payments',
      'reservations',
      'expenses',
      'purchase_order_items',
      'purchase_orders',
      'delivery_details',
      'contact_messages',
      'orders'
    ];
    
    for (const table of tablesToReset) {
      await connection.execute(`TRUNCATE TABLE ${table}`);
    }
    
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    await connection.commit();
    
    res.json({ success: true, message: 'All transactional data has been reset' });
  } catch (error) {
    await connection.rollback();
    console.error('Reset Data Error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset transactional data', error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
