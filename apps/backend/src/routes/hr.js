const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/hr/shifts
// @desc    Get all staff shifts
router.get('/shifts', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, u.first_name, u.last_name, b.name as branch_name 
      FROM staff_shifts s
      JOIN users u ON s.user_id = u.id
      JOIN branches b ON s.branch_id = b.id
      ORDER BY s.clock_in DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Fetch Shifts Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/hr/clock-in
router.post('/clock-in', async (req, res) => {
  try {
    const { user_id, branch_id, hourly_rate, notes } = req.body;
    
    // Check if already clocked in
    const [existing] = await db.query(
      'SELECT id FROM staff_shifts WHERE user_id = ? AND status = "Active"',
      [user_id]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'User already clocked in' });
    }

    const [result] = await db.query(
      'INSERT INTO staff_shifts (user_id, branch_id, clock_in, hourly_rate, status, notes) VALUES (?, ?, NOW(), ?, "Active", ?)',
      [user_id, branch_id || 1, hourly_rate || 0, notes || null]
    );

    res.status(201).json({ success: true, shiftId: result.insertId });
  } catch (error) {
    console.error('Clock-in Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/hr/clock-out/:id
router.patch('/clock-out/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      'UPDATE staff_shifts SET clock_out = NOW(), status = "Ended" WHERE id = ?',
      [id]
    );
    res.json({ success: true, message: 'Shift ended' });
  } catch (error) {
    console.error('Clock-out Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/hr/stats
router.get('/stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.first_name, u.last_name, 
      COUNT(s.id) as total_shifts,
      SUM(TIMESTAMPDIFF(HOUR, s.clock_in, COALESCE(s.clock_out, NOW()))) as total_hours,
      SUM(TIMESTAMPDIFF(HOUR, s.clock_in, COALESCE(s.clock_out, NOW())) * s.hourly_rate) as estimated_pay
      FROM users u
      JOIN staff_shifts s ON u.id = s.user_id
      GROUP BY u.id
    `);

    const [summary] = await db.query(`
      SELECT 
      COALESCE(SUM(TIMESTAMPDIFF(HOUR, s.clock_in, COALESCE(s.clock_out, NOW()))), 0) as total_hours,
      COALESCE(SUM(TIMESTAMPDIFF(HOUR, s.clock_in, COALESCE(s.clock_out, NOW())) * s.hourly_rate), 0) as estimated_pay
      FROM staff_shifts s
    `);

    res.json({
      total_hours: summary[0].total_hours,
      estimated_pay: summary[0].estimated_pay,
      staff: rows
    });
  } catch (error) {
    console.error('HR Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
