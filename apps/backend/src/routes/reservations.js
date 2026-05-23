const express = require('express');
const router = express.Router();
const db = require('../db');
const { upsertCustomer } = require('./customers');
const { notifyReservationConfirmed } = require('../services/notificationService');

// @route   POST /api/reservations
// @desc    Create a new reservation
router.post('/', async (req, res) => {
  const { name, phone, email, date, time, guests, notes, branchId, tableId, bookingFee, paymentMethod, origin, notification_pref, tables, table_ids } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

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
        const [rows] = await connection.execute('SELECT id FROM customers WHERE phone = ? OR email = ? LIMIT 1', [phone, email]);
        if (rows.length > 0) customerId = rows[0].id;
      }
    }

    // Ensure date is a clean YYYY-MM-DD string to avoid timezone shifts
    const cleanDate = date.includes('T') ? date.split('T')[0] : date;

    // Strict Backend Validation: Block Past Dates
    const [branchSettings] = await connection.query('SELECT timezone FROM branch_settings WHERE branch_id = 1 LIMIT 1');
    const timezone = branchSettings[0]?.timezone || 'Asia/Karachi';
    const localTodayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

    if (cleanDate < localTodayStr) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Validation Error: Cannot make a reservation for a past date (${cleanDate}). Today is ${localTodayStr}.`
      });
    }

    const tablesPayload = (tables || table_ids || []).map(t => typeof t === 'object' ? t.id : t);
    const primaryTableId = tablesPayload.length > 0 ? tablesPayload[0] : (tableId || null);
    const tablesToCheck = tablesPayload.length > 0 ? tablesPayload : (tableId ? [tableId] : []);

    // Pessimistic Locking: lock the table rows to prevent concurrent duplicate bookings
    if (tablesToCheck.length > 0) {
      for (const tId of tablesToCheck) {
        await connection.execute(
          'SELECT id FROM restaurant_tables WHERE id = ? FOR UPDATE',
          [tId]
        );
      }
    }

    // Strict Backend Validation: Block Duplicate Bookings
    // 1. Check for table conflicts (same table, date, and time)
    if (tablesToCheck.length > 0) {
      const [tableConflicts] = await connection.query(
        `SELECT r.id, rt.table_number 
         FROM reservations r
         LEFT JOIN restaurant_tables rt ON r.table_id = rt.id
         WHERE r.table_id IN (?) AND r.reservation_date = ? AND r.reservation_time = ? 
         AND r.status NOT IN ('Cancelled', 'Completed', 'No-Show', 'Vacated')`,
        [tablesToCheck, cleanDate, time]
      );
      
      const [junctionConflicts] = await connection.query(
        `SELECT rt.id, rt.table_number 
         FROM reservation_tables rtb
         JOIN reservations r ON rtb.reservation_id = r.id
         JOIN restaurant_tables rt ON rtb.table_id = rt.id
         WHERE rtb.table_id IN (?) AND r.reservation_date = ? AND r.reservation_time = ?
         AND r.status NOT IN ('Cancelled', 'Completed', 'No-Show', 'Vacated')`,
        [tablesToCheck, cleanDate, time]
      );

      const allConflicts = [...tableConflicts, ...junctionConflicts];
      if (allConflicts.length > 0) {
        const conflictingNumbers = [...new Set(allConflicts.map(c => c.table_number))];
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: `Conflict Error: Table(s) ${conflictingNumbers.join(', ')} is already booked on ${cleanDate} at ${time}.`
        });
      }
    }

    // 2. Check for user double-booking (same phone, date, and time)
    const [userConflicts] = await connection.execute(
      `SELECT id FROM reservations 
       WHERE phone = ? AND reservation_date = ? AND reservation_time = ? 
       AND status NOT IN ('Cancelled', 'Completed', 'No-Show', 'Vacated')`,
      [phone, cleanDate, time]
    );
    if (userConflicts.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: `Conflict Error: A booking under this phone number already exists for ${cleanDate} at ${time}.`
      });
    }

    const [result] = await connection.execute(
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
        primaryTableId, 
        'Pending', // Force all new to Pending so Manager can Approve
        bookingFee || 0.00,
        paymentMethod === 'card' ? 'Paid' : 'Pending',
        (paymentMethod || 'Cash').substring(0, 10),
        (origin || 'In-Store').substring(0, 10),
        customerId,
        notification_pref || 'whatsapp'
      ]
    );
    const reservationId = result.insertId;

    // Insert junction table entries
    const tablesList = tables || table_ids || [];
    for (const t of tablesList) {
      const tId = typeof t === 'object' ? t.id : t;
      const seats = typeof t === 'object' ? (t.allocated_seats || 1) : 1;
      const selected_seats = typeof t === 'object' ? t.selected_seats : null;
      await connection.execute(
        'INSERT INTO reservation_tables (reservation_id, table_id, allocated_seats, selected_seats) VALUES (?, ?, ?, ?)',
        [reservationId, tId, seats, selected_seats || null]
      );
    }

    await connection.commit();
    res.status(201).json({
      success: true,
      message: 'Reservation created successfully!',
      reservationId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Database Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error, please try again later.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// @route   GET /api/reservations/available-tables
// @desc    Get tables available for a specific date and time with capacity and seat balance
router.get('/available-tables', async (req, res) => {
  const { date, time } = req.query;

  if (!date || !time) {
    return res.status(400).json({ success: false, message: 'Date and time are required' });
  }

  try {
    const cleanDate = date.includes('T') ? date.split('T')[0] : date;
    
    const [branchSettings] = await db.query('SELECT timezone FROM branch_settings WHERE branch_id = 1 LIMIT 1');
    const timezone = branchSettings[0]?.timezone || 'Asia/Karachi';
    const localTodayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    
    const isToday = cleanDate === localTodayStr;

    console.log(`[TABLE AVAILABILITY] Fetching tables for ${cleanDate} @ ${time}. IsToday: ${isToday}`);

    // Fetch tables with both live order occupancy and reservation occupancy
    const [tables] = await db.execute(`
      SELECT t.*, 
             COALESCE(
               (
                 SELECT SUM(COALESCE(ot.allocated_seats, o.party_size))
                 FROM orders o
                 LEFT JOIN order_tables ot ON o.id = ot.order_id
                 WHERE (ot.table_id = t.id OR (o.table_id = t.id AND ot.table_id IS NULL))
                   AND o.status NOT IN ('Paid', 'Cancelled', 'Rejected')
               ), 0
             ) as live_occupancy,
             (
               SELECT GROUP_CONCAT(ot.selected_seats SEPARATOR ',')
               FROM orders o
               LEFT JOIN order_tables ot ON o.id = ot.order_id
               WHERE (ot.table_id = t.id OR (o.table_id = t.id AND ot.table_id IS NULL))
                 AND o.status NOT IN ('Paid', 'Cancelled', 'Rejected')
             ) as live_seats_str,
             COALESCE(
               (
                 SELECT SUM(COALESCE(rt.allocated_seats, r.party_size))
                 FROM reservations r
                 LEFT JOIN reservation_tables rt ON r.id = rt.reservation_id
                 WHERE (rt.table_id = t.id OR (r.table_id = t.id AND rt.table_id IS NULL))
                   AND r.reservation_date = ?
                   AND r.status NOT IN ('Cancelled', 'No-Show', 'Vacated', 'Completed')
                   AND r.reservation_time < ADDTIME(?, '02:00:00')
                   AND ADDTIME(r.reservation_time, '01:59:00') > ?
               ), 0
             ) as reservation_occupancy,
             (
               SELECT GROUP_CONCAT(rt.selected_seats SEPARATOR ',')
               FROM reservations r
               LEFT JOIN reservation_tables rt ON r.id = rt.reservation_id
               WHERE (rt.table_id = t.id OR (r.table_id = t.id AND rt.table_id IS NULL))
                 AND r.reservation_date = ?
                 AND r.status NOT IN ('Cancelled', 'No-Show', 'Vacated', 'Completed')
                 AND r.reservation_time < ADDTIME(?, '02:00:00')
                 AND ADDTIME(r.reservation_time, '01:59:00') > ?
             ) as reservation_seats_str
      FROM restaurant_tables t
    `, [cleanDate, time, time, cleanDate, time, time]);

    // Process table capacity & availability
    const processedTables = tables.map(t => {
      let current_occupancy = parseInt(t.reservation_occupancy) || 0;
      
      // If today, consider active dine-in orders as well
      if (isToday) {
        const live = parseInt(t.live_occupancy) || 0;
        current_occupancy = Math.max(current_occupancy, live);
      }
      
      const balance_seats = Math.max(0, t.capacity - current_occupancy);
      
      // Compute specific occupied seats list
      const liveSeatsSet = new Set();
      if (t.live_seats_str) {
        t.live_seats_str.split(',').forEach(s => {
          const num = parseInt(s.trim());
          if (!isNaN(num)) liveSeatsSet.add(num);
        });
      }
      
      const resSeatsSet = new Set();
      if (t.reservation_seats_str) {
        t.reservation_seats_str.split(',').forEach(s => {
          const num = parseInt(s.trim());
          if (!isNaN(num)) resSeatsSet.add(num);
        });
      }
      
      const occupiedSeatsSet = new Set();
      if (isToday) {
        liveSeatsSet.forEach(s => occupiedSeatsSet.add(s));
        resSeatsSet.forEach(s => occupiedSeatsSet.add(s));
      } else {
        resSeatsSet.forEach(s => occupiedSeatsSet.add(s));
      }
      
      // Fallback for orders without specific seat numbers
      const targetCount = current_occupancy;
      if (occupiedSeatsSet.size < targetCount) {
        for (let seatNum = 1; seatNum <= t.capacity; seatNum++) {
          if (occupiedSeatsSet.size >= targetCount) break;
          occupiedSeatsSet.add(seatNum);
        }
      }
      
      const occupied_seats = Array.from(occupiedSeatsSet).sort((a, b) => a - b);
      
      return {
        ...t,
        current_occupancy,
        balance_seats,
        remaining_seats: balance_seats,
        occupied_seats
      };
    });

    // Filter to only display tables that are free (have remaining seats) during this slot
    const freeTables = processedTables.filter(t => t.balance_seats > 0);

    console.log(`[TABLE AVAILABILITY] Found ${freeTables.length}/${tables.length} free tables.`);
    res.json({ success: true, tables: freeTables });
  } catch (error) {
    console.error('Available Tables Error:', error);
    res.status(500).json({ success: false, message: 'Could not fetch available tables', error: error.message });
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
             COALESCE(
               (
                 SELECT GROUP_CONCAT(DISTINCT rt.table_number ORDER BY rt.table_number SEPARATOR ', ')
                 FROM reservation_tables rtb
                 JOIN restaurant_tables rt ON rtb.table_id = rt.id
                 WHERE rtb.reservation_id = r.id
               ),
               t.table_number
             ) as assigned_table_number,
             COALESCE(
               (
                 SELECT GROUP_CONCAT(DISTINCT rt.id ORDER BY rt.id SEPARATOR ',')
                 FROM reservation_tables rtb
                 JOIN restaurant_tables rt ON rtb.table_id = rt.id
                 WHERE rtb.reservation_id = r.id
               ),
               t.id
             ) as assigned_table_ids,
             (
               SELECT CONCAT('[', GROUP_CONCAT(
                 JSON_OBJECT(
                   'table_id', rtb.table_id,
                   'table_number', rt.table_number,
                   'selected_seats', rtb.selected_seats
                 )
               ORDER BY rt.table_number
               SEPARATOR ','), ']')
               FROM reservation_tables rtb
               JOIN restaurant_tables rt ON rtb.table_id = rt.id
               WHERE rtb.reservation_id = r.id
             ) as assigned_tables_json
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
  const { status, table_id, name, phone, email, date, time, guests, notes, paymentMethod, tables, table_ids } = req.body;
  
  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ success: false, message: 'No updates provided' });
  }

  // Strict Backend Validation: Block Past Dates if date is being updated
  if (date) {
    const cleanDate = date.includes('T') ? date.split('T')[0] : date;
    const [branchSettings] = await db.query('SELECT timezone FROM branch_settings WHERE branch_id = 1 LIMIT 1');
    const timezone = branchSettings[0]?.timezone || 'Asia/Karachi';
    const localTodayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

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
    const checkPhone = phone || currentRes.phone;

    const tablesPayload = tables || table_ids;
    let tablesToCheck = undefined;
    if (tablesPayload) {
      tablesToCheck = tablesPayload.map(t => typeof t === 'object' ? t.id : t);
    } else if (table_id !== undefined) {
      tablesToCheck = table_id ? [table_id] : [];
    }

    // Only run conflict checks if date, time, table, or phone actually changed
    if (date || time || tablesToCheck !== undefined || phone) {
      if (tablesToCheck && tablesToCheck.length > 0) {
        const [tableConflicts] = await db.query(
          `SELECT r.id, rt.table_number 
           FROM reservations r
           LEFT JOIN restaurant_tables rt ON r.table_id = rt.id
           WHERE r.table_id IN (?) AND r.reservation_date = ? AND r.reservation_time = ? 
           AND r.id != ? AND r.status NOT IN ('Cancelled', 'Completed', 'No-Show', 'Vacated')`,
          [tablesToCheck, checkDate, checkTime, id]
        );
        
        const [junctionConflicts] = await db.query(
          `SELECT rt.id, rt.table_number 
           FROM reservation_tables rtb
           JOIN reservations r ON rtb.reservation_id = r.id
           JOIN restaurant_tables rt ON rtb.table_id = rt.id
           WHERE rtb.table_id IN (?) AND r.reservation_date = ? AND r.reservation_time = ?
           AND r.id != ? AND r.status NOT IN ('Cancelled', 'Completed', 'No-Show', 'Vacated')`,
          [tablesToCheck, checkDate, checkTime, id]
        );

        const allConflicts = [...tableConflicts, ...junctionConflicts];
        if (allConflicts.length > 0) {
          const conflictingNumbers = [...new Set(allConflicts.map(c => c.table_number))];
          return res.status(409).json({
            success: false,
            message: `Conflict Error: Table(s) ${conflictingNumbers.join(', ')} is already booked on ${checkDate} at ${checkTime}.`
          });
        }
      }
    }

     let query = 'UPDATE reservations SET ';
     let params = [];
     
     const fields = {
       status, phone, email, reservation_time: time, party_size: guests, notes, payment_method: paymentMethod
     };
     
     if (tablesToCheck !== undefined) {
       fields.table_id = tablesToCheck.length > 0 ? tablesToCheck[0] : null;
     }
     
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

      // Update reservation_tables junction records if tables were updated
      if (tablesToCheck !== undefined) {
        await db.query('DELETE FROM reservation_tables WHERE reservation_id = ?', [id]);
        const tablesList = tables || table_ids || [];
        for (const t of tablesList) {
          const tId = typeof t === 'object' ? t.id : t;
          const seats = typeof t === 'object' ? (t.allocated_seats || 1) : 1;
          const selected_seats = typeof t === 'object' ? t.selected_seats : null;
          await db.query('INSERT INTO reservation_tables (reservation_id, table_id, allocated_seats, selected_seats) VALUES (?, ?, ?, ?)', [id, tId, seats, selected_seats || null]);
        }
      }

     // --- Table Status Sync ---
     const [resData] = await db.query('SELECT table_id FROM reservations WHERE id = ?', [id]);
     const assignedTableId = resData[0]?.table_id;
     const [resTables] = await db.query('SELECT table_id FROM reservation_tables WHERE reservation_id = ?', [id]);
     const assignedTableIds = resTables.length > 0 ? resTables.map(rt => rt.table_id) : (assignedTableId ? [assignedTableId] : []);

     if (assignedTableIds.length > 0) {
       if (status === 'Seated') {
         for (const tId of assignedTableIds) {
           await db.query('UPDATE restaurant_tables SET status = "Occupied" WHERE id = ?', [tId]);
         }
       } else if (['Completed', 'Cancelled', 'No-Show', 'Vacated'].includes(status)) {
         for (const tId of assignedTableIds) {
           // Check if there are ANY active orders on this table before marking as Available
           const [activeOrders] = await db.query(
             'SELECT o.id FROM orders o LEFT JOIN order_tables ot ON o.id = ot.order_id WHERE (ot.table_id = ? OR (o.table_id = ? AND ot.table_id IS NULL)) AND o.status NOT IN ("Paid", "Cancelled", "Rejected")',
             [tId, tId]
           );
           if (activeOrders.length === 0) {
             await db.query('UPDATE restaurant_tables SET status = "Available" WHERE id = ?', [tId]);
           }
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

// @route   POST /api/reservations/:id/vacate
// @route   PUT /api/reservations/:id/vacate
// @desc    Manually vacate a reservation and release the table seats immediately
const vacateHandler = async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get reservation details
    const [rows] = await connection.execute(
      'SELECT status, table_id FROM reservations WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const { status, table_id } = rows[0];

    // 2. Update reservation status to 'Vacated'
    await connection.execute(
      "UPDATE reservations SET status = 'Vacated' WHERE id = ?",
      [id]
    );

    // 3. Update table statuses if no other active orders exist on those tables
    const [resTables] = await connection.execute('SELECT table_id FROM reservation_tables WHERE reservation_id = ?', [id]);
    const assignedTableIds = resTables.length > 0 ? resTables.map(rt => rt.table_id) : (table_id ? [table_id] : []);

    for (const tId of assignedTableIds) {
      const [activeOrders] = await connection.execute(
        'SELECT o.id FROM orders o LEFT JOIN order_tables ot ON o.id = ot.order_id WHERE (ot.table_id = ? OR (o.table_id = ? AND ot.table_id IS NULL)) AND o.status NOT IN ("Paid", "Cancelled", "Rejected")',
        [tId, tId]
      );
      if (activeOrders.length === 0) {
        await connection.execute(
          'UPDATE restaurant_tables SET status = "Available" WHERE id = ?',
          [tId]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Reservation manually vacated and seats released successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Manual Vacate Error:', error);
    res.status(500).json({ success: false, message: 'Server error during vacate action', error: error.message });
  } finally {
    connection.release();
  }
};

router.post('/:id/vacate', vacateHandler);
router.put('/:id/vacate', vacateHandler);

module.exports = router;
