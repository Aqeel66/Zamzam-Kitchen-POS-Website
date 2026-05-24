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
    if (role_ids) {
      let roleArray = [];
      if (Array.isArray(role_ids)) {
        roleArray = role_ids;
      } else if (typeof role_ids === 'string' && role_ids.trim() !== '') {
        roleArray = role_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      }

      if (roleArray.length > 0) {
        const values = roleArray.map(roleId => [userId, roleId]);
        console.log(`Assigning roles to user ${userId}:`, roleArray);
        await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES ?', [values]);
      }
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
    if (req.body.password && req.body.password.trim() !== '') {
      await connection.query(
        'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, password_hash = ? WHERE id = ?',
        [first_name, last_name, email, phone, req.body.password, id]
      );
    } else {
      await connection.query(
        'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?',
        [first_name, last_name, email, phone, id]
      );
    }

    // 2. Update roles (simple replace)
    await connection.query('DELETE FROM user_roles WHERE user_id = ?', [id]);
    if (role_ids) {
      let roleArray = [];
      if (Array.isArray(role_ids)) {
        roleArray = role_ids;
      } else if (typeof role_ids === 'string' && role_ids.trim() !== '') {
        roleArray = role_ids.split(',').map(rid => parseInt(rid.trim())).filter(rid => !isNaN(rid));
      }

      if (roleArray.length > 0) {
        const values = roleArray.map(roleId => [id, roleId]);
        console.log(`Updating roles for user ${id}:`, roleArray);
        await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES ?', [values]);
      }
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

// Change password (self-service)
router.put('/:id/password', async (req, res) => {
  const { id } = req.params;
  const { old_password, new_password } = req.body;

  try {
    const [users] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    
    if (users[0].password_hash !== old_password) {
      return res.status(401).json({ error: 'Incorrect old password' });
    }

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [new_password, id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
