const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to Upsert Customer (Used by orders/reservations)
const upsertCustomer = async (data) => {
  const { first_name, last_name, email, phone, dietary_profile, origin } = data;
  
  // Try to find existing by phone or email
  let existing = [];
  if (phone) {
    [existing] = await db.query('SELECT id FROM customers WHERE phone = ?', [phone]);
  }
  if (existing.length === 0 && email) {
    [existing] = await db.query('SELECT id FROM customers WHERE email = ?', [email]);
  }

  if (existing.length > 0) {
    const id = existing[0].id;
    // Update existing (don't overwrite origin if already set, or maybe update it if newer?)
    await db.query(
      'UPDATE customers SET first_name = ?, last_name = ?, email = ?, dietary_profile = ? WHERE id = ?',
      [first_name, last_name, email, dietary_profile || '', id]
    );
    return id;
  } else {
    // Insert new
    const [result] = await db.query(
      'INSERT INTO customers (first_name, last_name, email, phone, dietary_profile, origin) VALUES (?, ?, ?, ?, ?, ?)',
      [first_name, last_name || '', email || '', phone || '', dietary_profile || '', origin || 'In-Store']
    );
    return result.insertId;
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
  const { first_name, last_name, email, phone, dietary_profile, origin } = req.body;
  const { id } = req.params;
  try {
    await db.query(
      'UPDATE customers SET first_name = ?, last_name = ?, email = ?, phone = ?, dietary_profile = ?, origin = ? WHERE id = ?',
      [first_name, last_name, email, phone, dietary_profile, origin || 'In-Store', id]
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
