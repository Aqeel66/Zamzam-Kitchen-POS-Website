const express = require('express');
const router = express.Router();
const db = require('../db');
const { upsertCustomer } = require('./customers');
const { notifyReservationConfirmed } = require('../services/notificationService');

// @route   POST /api/reservations
// @desc    Create a new reservation
router.post('/', async (req, res) => {
  const { name, phone, email, date, time, guests, notes, branchId, tableId, bookingFee, paymentMethod, origin, notification_pref } = req.body;

  try {
    let customerId = null;
    try {
      // Auto-register customer (Wrapped in safety to prevent blocking reservation)
      customerId = await upsertCustomer({
        first_name: name,
        last_name: '',
        email: email,
        phone: phone,
        origin: origin || 'Counter'
      });
    } catch (custErr) {
      console.warn('⚠️ Auto-registration skipped or failed:', custErr.message);
      // If it fails with duplicate entry, try one last time to find the ID
      if (custErr.code === 'ER_DUP_ENTRY' || custErr.message.includes('Duplicate entry')) {
        const [rows] = await db.query('SELECT id FROM customers WHERE phone = ? OR email = ? LIMIT 1', [phone, email]);
        if (rows.length > 0) customerId = rows[0].id;
      }
    }

    // Ensure date is a clean YYYY-MM-DD string to avoid timezone shifts
    const cleanDate = date.includes('T') ? date.split('T')[0] : date;

    // Strict Backend Validation: Block Past Dates
    const today = new Date();
    // Adjust for local timezone offset to get accurate 'today'
    const offset = today.getTimezoneOffset() * 60000;
    const localTodayStr = new Date(today.getTime() - offset).toISOString().split('T')[0];

    if (cleanDate < localTodayStr) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: Cannot make a reservation for a past date (${cleanDate}). Today is ${localTodayStr}.`
      });
    }

    // Strict Backend Validation: Block Duplicate Bookings
    // 1. Check for table conflicts (same table, date, and time)
    if (tableId) {
      const [tableConflicts] = await db.query(
        `SELECT id FROM reservations 
         WHERE table_id = ? AND reservation_date = ? AND reservation_time = ? 
         AND status NOT IN ('Cancelled', 'Completed', 'No-Show')`,
        [tableId, cleanDate, time]
      );
      if (tableConflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Conflict Error: Table ${tableId} is already booked on ${cleanDate} at ${time}.`
        });
      }
    }

    // 2. Check for user double-booking (same phone, date, and time)
    const [userConflicts] = await db.query(
      `SELECT id FROM reservations 
       WHERE phone = ? AND reservation_date = ? AND reservation_time = ? 
       AND status NOT IN ('Cancelled', 'Completed', 'No-Show')`,
      [phone, cleanDate, time]
    );
    if (userConflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Conflict Error: A booking under this phone number already exists for ${cleanDate} at ${time}.`
      });
    }

    const [result] = await db.execute(
      `INSERT INTO reservations (branch_id, first_name, last_name, phone, email, reservation_date, reservation_time, party_size, notes, table_id, status, booking_fee, payment_status, payment_method, origin, customer_id, notification_pref) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        branchId || 1, 
        name, 
        '', 
        phone, 
        email, 
        cleanDate, 
        time, 
        guests, 
        notes, 
        tableId || null, 
        'Pending', // Force all new to Pending so Manager can Approve
        bookingFee || 0.00,
        paymentMethod === 'card' ? 'Paid' : 'Pending',
        (paymentMethod || 'Cash').substring(0, 10),
        (origin || 'In-Store').substring(0, 10),
        customerId,
        notification_pref || 'whatsapp'
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
      message: 'Server error, please try again later.',
      error: error.message
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
    let query = `
      SELECT r.*, 
             DATE_FORMAT(r.reservation_date, '%Y-%m-%d') as reservation_date,
             t.table_number as assigned_table_number 
      FROM reservations r 
      LEFT JOIN restaurant_tables t ON r.table_id = t.id 
      WHERE 1=1
    `;
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
// @desc    Update reservation
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, table_id, name, phone, email, date, time, guests, notes, paymentMethod } = req.body;
  
  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ success: false, message: 'No updates provided' });
  }

  // Strict Backend Validation: Block Past Dates if date is being updated
  if (date) {
    const cleanDate = date.includes('T') ? date.split('T')[0] : date;
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    const localTodayStr = new Date(today.getTime() - offset).toISOString().split('T')[0];

    if (cleanDate < localTodayStr) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: Cannot reschedule a reservation to a past date (${cleanDate}).`
      });
    }
  }

  // Strict Backend Validation: Block Duplicate Bookings during Edit
  try {
    // We need the existing reservation details to do conflict checks properly
    const [existingRes] = await db.query('SELECT table_id, reservation_date, reservation_time, phone FROM reservations WHERE id = ?', [id]);
    if (existingRes.length === 0) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    
    const currentRes = existingRes[0];
    const checkDate = date ? (date.includes('T') ? date.split('T')[0] : date) : currentRes.reservation_date;
    const checkTime = time || currentRes.reservation_time;
    const checkTableId = table_id !== undefined ? table_id : currentRes.table_id;
    const checkPhone = phone || currentRes.phone;

    // Only run conflict checks if date, time, table, or phone actually changed
    if (date || time || table_id !== undefined || phone) {
      // 1. Table conflict check
      if (checkTableId) {
        const [tableConflicts] = await db.query(
          `SELECT id FROM reservations 
           WHERE table_id = ? AND reservation_date = ? AND reservation_time = ? 
           AND id != ? AND status NOT IN ('Cancelled', 'Completed', 'No-Show')`,
          [checkTableId, checkDate, checkTime, id]
        );
        if (tableConflicts.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Conflict Error: Table ${checkTableId} is already booked on ${checkDate} at ${checkTime}.`
          });
        }
      }

      // 2. User double-booking check
      const [userConflicts] = await db.query(
        `SELECT id FROM reservations 
         WHERE phone = ? AND reservation_date = ? AND reservation_time = ? 
         AND id != ? AND status NOT IN ('Cancelled', 'Completed', 'No-Show')`,
        [checkPhone, checkDate, checkTime, id]
      );
      if (userConflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Conflict Error: A booking under this phone number already exists for ${checkDate} at ${checkTime}.`
        });
      }
    }

     let query = 'UPDATE reservations SET ';
     let params = [];
     
     const fields = {
       status, table_id, phone, email, reservation_time: time, party_size: guests, notes, payment_method: paymentMethod
     };
     
     if (name) {
       // Split name into first and last
       const parts = name.split(' ');
       fields.first_name = parts[0];
       fields.last_name = parts.slice(1).join(' ');
     }
     if (date) {
       fields.reservation_date = date.includes('T') ? date.split('T')[0] : date;
     }

     for (const [key, value] of Object.entries(fields)) {
       if (value !== undefined) {
         query += `${key} = ?, `;
         params.push(value);
       }
     }
     
     query = query.slice(0, -2); // Remove trailing comma and space
     query += ' WHERE id = ?';
     params.push(id);

     const [result] = await db.query(query, params);
     if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Reservation not found' });
     }

     // --- Table Status Sync ---
     const [resData] = await db.query('SELECT table_id FROM reservations WHERE id = ?', [id]);
     const assignedTableId = resData[0]?.table_id;

     if (assignedTableId) {
       if (status === 'Seated') {
         await db.query('UPDATE restaurant_tables SET status = "Occupied" WHERE id = ?', [assignedTableId]);
       } else if (['Completed', 'Cancelled', 'No-Show'].includes(status)) {
         // Check if there are ANY active orders on this table before marking as Available
         const [activeOrders] = await db.query(
           'SELECT id FROM orders WHERE table_id = ? AND status NOT IN ("Paid", "Cancelled", "Rejected")',
           [assignedTableId]
         );
         if (activeOrders.length === 0) {
           await db.query('UPDATE restaurant_tables SET status = "Available" WHERE id = ?', [assignedTableId]);
         }
       }
     }

     // AUTO-NOTIFY IF CONFIRMED
     if (status === 'Confirmed') {
        const [resRows] = await db.query('SELECT * FROM reservations WHERE id = ?', [id]);
        if (resRows.length > 0) {
            notifyReservationConfirmed(resRows[0]);
        }
     }

     res.json({ success: true, message: 'Reservation updated' });
  } catch (error) {
     console.error('Update Error:', error);
     res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
