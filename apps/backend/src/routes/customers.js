const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to Upsert Customer (Used by orders/reservations)
const upsertCustomer = async (data) => {
  const first_name = (data.first_name || '').trim();
  const last_name = (data.last_name || '').trim();
  const email = (data.email || '').trim().toLowerCase();
  const phone = (data.phone || '').trim();
  const dietary_profile = (data.dietary_profile || '').trim();
  const address = (data.address || '').trim();
  const origin = (data.origin || 'Counter').trim();
  
  // Try to find existing by phone or email
  let existing = [];
  if (phone) {
    [existing] = await db.query('SELECT id FROM customers WHERE phone = ? OR phone = ?', [phone, phone.replace(/\s+/g, '')]);
  }
  if (existing.length === 0 && email) {
    [existing] = await db.query('SELECT id FROM customers WHERE LOWER(email) = LOWER(?)', [email]);
  }

  if (existing.length > 0) {
    const id = existing[0].id;
    await db.query(
      'UPDATE customers SET first_name = ?, last_name = ?, email = ?, phone = COALESCE(?, phone), dietary_profile = ?, address = COALESCE(?, address) WHERE id = ?',
      [first_name, last_name, email || null, phone || null, dietary_profile || '', address || null, id]
    );
    return id;
  } else {
    // Attempt Insert Ignore to prevent crash
    await db.query(
      'INSERT IGNORE INTO customers (first_name, last_name, email, phone, dietary_profile, address, origin) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [first_name, last_name || '', email || null, phone || '', dietary_profile || '', address || null, origin]
    );
    
    // Final retrieval - one of these MUST work now
    const [finalCheck] = await db.query(
      'SELECT id FROM customers WHERE (phone = ? AND phone != "") OR (email = ? AND email != "") LIMIT 1', 
      [phone, email]
    );
    
    if (finalCheck.length > 0) return finalCheck[0].id;
    throw new Error('Failed to create or find customer record');
  }
};

// Get all customers
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Fetch customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Create new customer
router.post('/', async (req, res) => {
  try {
    const customerId = await upsertCustomer(req.body);
    res.status(201).json({ id: customerId, message: 'Customer registered successfully' });
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  const { first_name, last_name, email, phone, dietary_profile, address, origin } = req.body;
  const { id } = req.params;
  try {
    await db.query(
      'UPDATE customers SET first_name = ?, last_name = ?, email = ?, phone = ?, dietary_profile = ?, address = ?, origin = ? WHERE id = ?',
      [first_name, last_name, email, phone, dietary_profile, address, origin || 'Counter', id]
    );
    res.json({ message: 'Customer updated successfully' });
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router;
module.exports.upsertCustomer = upsertCustomer;
