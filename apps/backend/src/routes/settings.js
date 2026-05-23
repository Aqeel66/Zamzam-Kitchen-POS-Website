const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/settings
// @desc    Get all settings (Branch & Tenant)
router.get('/', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Fetching Settings: Starting database queries...');
    
    const [tenant] = await db.query('SELECT * FROM tenant_settings LIMIT 1');
    console.log('✅ [DEBUG] Tenant settings fetched');
    
    const [branch] = await db.query('SELECT * FROM branch_settings WHERE branch_id = 1 LIMIT 1');
    console.log('✅ [DEBUG] Branch settings fetched');
    
    const [gateways] = await db.query('SELECT * FROM payment_gateway_settings');
    console.log('✅ [DEBUG] Gateway settings fetched');
    
    const [messaging] = await db.query('SELECT * FROM messaging_settings');
    console.log('✅ [DEBUG] Messaging settings fetched');
    
    const [email] = await db.query('SELECT * FROM email_settings');
    console.log('✅ [DEBUG] Email settings fetched');
    
    res.json({
      tenant: tenant[0] || {},
      branch: branch[0] || {},
      payment_gateways: gateways,
      messaging: messaging,
      email: email
    });
  } catch (error) {
    console.error('🔥 [ERROR] Fetch Settings Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
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
      'business_address',
      'tagline',
      'login_background_url',
      'hero_background_url'
    ];
    
    const [columns] = await db.query('DESCRIBE tenant_settings');
    const existingColumns = columns.map(c => c.Field);
    
    const updates = [];
    const values = [];
    
    for (const key of allowedFields) {
      if (fields[key] !== undefined && existingColumns.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided for update' });
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
      'allow_dinein',
      'is_tax_enabled',
      'tax_rate',
      'payment_policy',
      'order_sort_direction',
      'receipt_header',
      'receipt_footer',
      'show_qr_on_receipt',
      'opening_time',
      'closing_time',
      'first_order_time',
      'last_order_time',
      'enable_inventory',
      'allow_cash_website',
      'allow_card_website',
      'allow_cash_pos',
      'allow_card_pos',
      'timezone'
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
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/settings/messaging
router.post('/messaging', async (req, res) => {
  try {
    const { provider_name, account_sid, auth_token, sender_number, is_active, environment } = req.body;
    
    const fields = [];
    const values = [];
    
    if (account_sid !== undefined) { fields.push('account_sid = ?'); values.push(account_sid); }
    if (auth_token !== undefined) { fields.push('auth_token = ?'); values.push(auth_token); }
    if (sender_number !== undefined) { fields.push('sender_number = ?'); values.push(sender_number); }
    if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    if (environment !== undefined) { fields.push('environment = ?'); values.push(environment); }
    
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update' });
    }
    
    values.push(provider_name);
    const query = `UPDATE messaging_settings SET ${fields.join(', ')} WHERE provider_name = ?`;
    
    await db.query(query, values);
    res.json({ success: true, message: `${provider_name} settings updated` });
  } catch (error) {
    console.error('Update Messaging Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/settings/email
router.post('/email', async (req, res) => {
  try {
    const { provider_name, smtp_host, smtp_port, smtp_user, smtp_pass, from_email, from_name, is_active, environment } = req.body;
    
    const fields = [];
    const values = [];
    
    if (smtp_host !== undefined) { fields.push('smtp_host = ?'); values.push(smtp_host); }
    if (smtp_port !== undefined) { fields.push('smtp_port = ?'); values.push(smtp_port); }
    if (smtp_user !== undefined) { fields.push('smtp_user = ?'); values.push(smtp_user); }
    if (smtp_pass !== undefined) { fields.push('smtp_pass = ?'); values.push(smtp_pass); }
    if (from_email !== undefined) { fields.push('from_email = ?'); values.push(from_email); }
    if (from_name !== undefined) { fields.push('from_name = ?'); values.push(from_name); }
    if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    if (environment !== undefined) { fields.push('environment = ?'); values.push(environment); }
    
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update' });
    }
    
    values.push(provider_name);
    const query = `UPDATE email_settings SET ${fields.join(', ')} WHERE provider_name = ?`;
    
    await db.query(query, values);
    res.json({ success: true, message: `${provider_name} settings updated` });
  } catch (error) {
    console.error('Update Email Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
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
      'order_tables',
      'payments',
      'reservation_tables',
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
    
    // Reset all tables to Available
    await connection.execute('UPDATE restaurant_tables SET status = "Available"');
    
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
