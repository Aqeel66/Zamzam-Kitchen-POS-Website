const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/expenses
// @desc    Get all expenses
router.get('/', async (req, res) => {
  try {
    const [expenses] = await db.query('SELECT * FROM expenses ORDER BY date DESC');
    res.json(expenses);
  } catch (error) {
    console.error('Fetch Expenses Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/expenses
// @desc    Add a new expense
router.post('/', async (req, res) => {
  try {
    const { category, amount, date, notes, branch_id } = req.body;
    const [result] = await db.query(
      'INSERT INTO expenses (category, amount, date, notes, branch_id) VALUES (?, ?, ?, ?, ?)',
      [category, amount, date || new Date(), notes, branch_id || 1]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Add Expense Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete Expense Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
