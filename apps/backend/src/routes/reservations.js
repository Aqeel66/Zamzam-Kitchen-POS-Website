const express = require('express');
const router = express.Router();
const db = require('../db');
const { upsertCustomer } = require('./customers');

// @route   POST /api/reservations
// @desc    Create a new reservation
router.post('/', async (req, res) => {
  const { name, phone, email, date, time, guests, notes, branchId, tableId, bookingFee, paymentMethod, origin } = req.body;

  try {
    // Auto-register customer
    const customerId = await upsertCustomer({
      first_name: name,
      last_name: '',
      email: email,
      phone: phone,
      origin: origin || 'In-Store'
    });

    const [result] = await db.execute(
      `INSERT INTO reservations (branch_id, first_name, last_name, phone, email, reservation_date, reservation_time, party_size, notes, table_id, status, booking_fee, payment_status, payment_method, origin, customer_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        branchId || 1, 
        name, 
        '', 
        phone, 
        email, 
        date, 
        time, 
        guests, 
        notes, 
        tableId || null, 
        tableId ? 'Confirmed' : 'Pending',
        bookingFee || 0.00,
        paymentMethod === 'card' ? 'Paid' : 'Pending',
        paymentMethod || 'Counter',
        origin || 'In-Store',
        customerId
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully!',
      reservationId: result.insertId
    });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error, please try again later.'
    });
  }
});

// @route   GET /api/reservations/available-tables
// @desc    Get tables available for a specific date and time
router.get('/available-tables', async (req, res) => {
  const { date, time } = req.query;

  if (!date || !time) {
    return res.status(400).json({ success: false, message: 'Date and time are required' });
  }

  try {
    // Find tables that DO NOT have a reservation at this time (simple overlap check)
    // We assume a reservation lasts for ~2 hours for simplicity
    console.log('Fetching available tables for:', { date, time });

    const [tables] = await db.execute(`SELECT t.*, 
        (SELECT COALESCE(SUM(o.party_size), 0) 
         FROM orders o 
         WHERE o.table_id = t.id 
         AND o.status NOT IN ('Paid', 'Cancelled', 'Rejected')) as current_occupancy
      FROM restaurant_tables t
      WHERE t.id NOT IN (
        SELECT table_id FROM reservations 
        WHERE reservation_date = ? 
        AND table_id IS NOT NULL
        AND status NOT IN ('Cancelled', 'No-Show')
        AND (
          (reservation_time <= ? AND ADDTIME(reservation_time, '01:59:00') > ?)
          OR (reservation_time < ADDTIME(?, '01:59:00') AND reservation_time >= ?)
        )
      )
      AND (
        -- If the reservation is for TODAY and the time is CLOSE to now (within 2 hours), 
        -- check if the table is already full from live orders
        NOT (
          ? = CURDATE() 
          AND ? >= SUBTIME(CURTIME(), '02:00:00') 
          AND ? <= ADDTIME(CURTIME(), '02:00:00')
          AND (SELECT COALESCE(SUM(o.party_size), 0) FROM orders o WHERE o.table_id = t.id AND o.status NOT IN ('Paid', 'Cancelled', 'Rejected')) >= t.capacity
        )
      )`, [date, time, time, time, time, date, time, time]);

    console.log('Found tables:', tables.length);
    res.json({ success: true, tables });
  } catch (error) {
    console.error('Available Tables Error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch available tables' });
  }
});

// @route   GET /api/reservations/availability/:date
// @desc    Get booked slots for a specific date
router.get('/availability/:date', async (req, res) => {
  const { date } = req.params;

  try {
    const [rows] = await db.execute(
      'SELECT reservation_time FROM reservations WHERE reservation_date = ? AND status NOT IN ("Cancelled", "No-Show")',
      [date]
    );
    
    const bookedSlots = rows.map(row => row.reservation_time.substring(0, 5));
    res.json({ date, bookedSlots });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch availability' });
  }
});

// @route   GET /api/reservations
// @desc    Get all reservations with optional date range filtering
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = 'SELECT * FROM reservations WHERE 1=1';
    let params = [];

    if (startDate) {
      query += ' AND reservation_date >= ?';
      params.push(startDate);
    } else {
      // Default to current month
      const now = new Date();
      const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      query += ' AND reservation_date >= ?';
      params.push(firstDayOfMonth);
    }
    if (endDate) {
      query += ' AND reservation_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY id DESC';
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch reservations' });
  }
});

// @route   PATCH /api/reservations/:id
// @desc    Update reservation status or assigned table
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, table_id } = req.body;
  
  if (!status && table_id === undefined) {
    return res.status(400).json({ success: false, message: 'No updates provided' });
  }

  try {
     let query = 'UPDATE reservations SET ';
     let params = [];
     
     if (status !== undefined) {
         query += 'status = ?, ';
         params.push(status);
     }
     if (table_id !== undefined) {
         query += 'table_id = ?, ';
         params.push(table_id);
     }
     
     query = query.slice(0, -2); // Remove trailing comma and space
     query += ' WHERE id = ?';
     params.push(id);

     const [result] = await db.query(query, params);
     if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Reservation not found' });
     }
     res.json({ success: true, message: 'Reservation updated' });
  } catch (error) {
     console.error('Update Error:', error);
     res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
