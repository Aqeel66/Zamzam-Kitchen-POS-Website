const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all users with their roles
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.phone, u.created_at,
             GROUP_CONCAT(r.name) as roles,
             GROUP_CONCAT(r.id) as role_ids
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY u.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new user
router.post('/', async (req, res) => {
  const { username, password, first_name, last_name, email, phone, role_ids } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 1. Insert user (using plain password for dev/prototype, should be hashed in production)
    const [userResult] = await connection.query(
      'INSERT INTO users (username, password_hash, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [username, password, first_name, last_name, email, phone]
    );
    const userId = userResult.insertId;

    // 2. Insert roles
    if (role_ids && role_ids.length > 0) {
      const values = role_ids.map(roleId => [userId, roleId]);
      await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES ?', [values]);
    }

    await connection.commit();
    res.status(201).json({ id: userId, message: 'User created successfully' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Update user
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, email, phone, role_ids } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Update user details
    await connection.query(
      'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?',
      [first_name, last_name, email, phone, id]
    );

    // 2. Update roles (simple replace)
    await connection.query('DELETE FROM user_roles WHERE user_id = ?', [id]);
    if (role_ids && role_ids.length > 0) {
      const values = role_ids.map(roleId => [id, roleId]);
      await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES ?', [values]);
    }

    await connection.commit();
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
