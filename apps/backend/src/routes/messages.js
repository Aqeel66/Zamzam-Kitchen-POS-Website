const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/messages
// @desc    Get all contact messages
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Fetch Messages Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/messages
// @desc    Submit a message from website
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    await db.query(
      'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
      [name, email, subject || 'General Inquiry', message]
    );

    res.status(201).json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Submit Message Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/messages/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await db.query(
      'UPDATE contact_messages SET status = ? WHERE id = ?',
      [status, id]
    );
    
    res.json({ success: true, message: 'Message updated' });
  } catch (error) {
    console.error('Update Message Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
