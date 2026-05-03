const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all roles
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, GROUP_CONCAT(p.name) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      GROUP BY r.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new role
router.post('/', async (req, res) => {
  const { name, description } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO roles (name, description) VALUES (?, ?)',
      [name, description]
    );
    res.json({ id: result.insertId, message: 'Role created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update role permissions
router.put('/:id/permissions', async (req, res) => {
  const { id } = req.params;
  const { permission_ids } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Clear existing permissions
    await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);

    // 2. Insert new permissions
    if (permission_ids && permission_ids.length > 0) {
      const values = permission_ids.map(pId => [id, pId]);
      await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
    }

    await connection.commit();
    res.json({ message: 'Role permissions updated successfully' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// Update role metadata
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    await pool.query(
      'UPDATE roles SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );
    res.json({ message: 'Role updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a role
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Note: Foreign key constraints in role_permissions should handle cleanup if ON DELETE CASCADE is set.
    // If not, we should delete them manually.
    await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
    await pool.query('DELETE FROM roles WHERE id = ?', [id]);
    res.json({ message: 'Role deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
