const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to release tables whose estimated release time has passed
const syncTableStatuses = async () => {
  try {
    // 1. Find tables that are 'Occupied' but whose latest active order has an expired release time
    // We join with the orders table to find the latest active order for each table
    const [expiredTables] = await db.execute(`
      SELECT t.id 
      FROM restaurant_tables t
      INNER JOIN orders o ON t.id = o.table_id
      WHERE t.status = 'Occupied'
      AND o.status NOT IN ('Completed', 'Cancelled', 'Rejected')
      AND o.estimated_release_time IS NOT NULL
      AND o.estimated_release_time <= NOW()
    `);

    if (expiredTables.length > 0) {
      const ids = expiredTables.map(t => t.id);
      await db.execute(
        `UPDATE restaurant_tables SET status = 'Available' WHERE id IN (${ids.join(',')})`
      );
    }
  } catch (error) {
    console.error('Table Status Sync Error:', error);
  }
};

// @route   GET /api/tables
// @desc    Get all tables with coordinates and status
router.get('/', async (req, res) => {
  try {
    await syncTableStatuses();
    const [rows] = await db.execute('SELECT * FROM restaurant_tables');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch tables' });
  }
});

// @route   GET /api/tables/qr-all
// @desc    Get QR URL data for all tables (for POS print view)
router.get('/qr-all', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, table_number, capacity, status FROM restaurant_tables');
    const baseUrl = process.env.WEBSITE_URL || 'http://localhost:5173';
    const qrData = rows.map(t => ({
      id: t.id,
      table_number: t.table_number,
      capacity: t.capacity,
      status: t.status,
      qr_url: `${baseUrl}/menu?table=${t.table_number}&tid=${t.id}`
    }));
    res.json({ success: true, tables: qrData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch QR data' });
  }
});

// @route   GET /api/tables/:id/qr
// @desc    Get QR URL for a specific table
router.get('/:id/qr', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute('SELECT id, table_number, capacity FROM restaurant_tables WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Table not found' });
    const t = rows[0];
    const baseUrl = process.env.WEBSITE_URL || 'http://localhost:5173';
    res.json({
      success: true,
      table_id: t.id,
      table_number: t.table_number,
      qr_url: `${baseUrl}/menu?table=${t.table_number}&tid=${t.id}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// @route   PATCH /api/tables/:id
// @desc    Update a table's metadata, status or coordinates
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, pos_x, pos_y, table_number, capacity } = req.body;
  
  if (status === undefined && pos_x === undefined && pos_y === undefined && table_number === undefined && capacity === undefined) {
    return res.status(400).json({ success: false, message: 'No updates provided' });
  }

  try {
     let query = 'UPDATE restaurant_tables SET ';
     let params = [];
     
     if (status !== undefined) {
         query += 'status = ?, ';
         params.push(status);
         
         if (status === 'Available') {
             try {
               await db.query(
                 `UPDATE orders o
                  LEFT JOIN order_tables ot ON o.id = ot.order_id
                  SET o.status = 'Completed'
                  WHERE (ot.table_id = ? OR (o.table_id = ? AND ot.table_id IS NULL))
                  AND o.status NOT IN ('Completed', 'Cancelled', 'Rejected')`,
                 [id, id]
               );
             } catch (err) {
               console.error('Error completing table orders:', err);
             }
         }
     }
     if (pos_x !== undefined) {
         query += 'pos_x = ?, ';
         params.push(pos_x);
     }
     if (pos_y !== undefined) {
         query += 'pos_y = ?, ';
         params.push(pos_y);
     }
     if (table_number !== undefined) {
         query += 'table_number = ?, ';
         params.push(table_number);
     }
     if (capacity !== undefined) {
         query += 'capacity = ?, ';
         params.push(capacity);
     }
     
     query = query.slice(0, -2); // Remove trailing comma and space
     query += ' WHERE id = ?';
     params.push(id);

     const [result] = await db.query(query, params);
     if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Table not found' });
     }
     res.json({ success: true, message: 'Table updated' });
  } catch (error) {
     console.error('Table Update Error:', error);
     res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   DELETE /api/tables/:id
// @desc    Delete a table
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.execute('DELETE FROM restaurant_tables WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }
    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Delete Table Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/tables
// @desc    Create a new table
router.post('/', async (req, res) => {
  const { branch_id, table_number, capacity, status, pos_x, pos_y } = req.body;
  try {
    const [result] = await db.execute(
      `INSERT INTO restaurant_tables (branch_id, table_number, capacity, status, pos_x, pos_y) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [branch_id || 1, table_number, capacity, status || 'Available', pos_x || 0, pos_y || 0]
    );
    res.status(201).json({ success: true, tableId: result.insertId });
  } catch (error) {
    console.error('Create Table Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/tables/seed
router.post('/seed', async (req, res) => {
  try {
      const [rows] = await db.execute('SELECT COUNT(*) as count FROM restaurant_tables');
      if (rows[0].count > 0) return res.json({ message: 'Already seeded' });

      await db.execute(
        `INSERT INTO restaurant_tables (branch_id, table_number, capacity, status, pos_x, pos_y) VALUES 
        (1, 'T1', 4, 'Available', 100, 100),
        (1, 'T2', 2, 'Available', 200, 100),
        (1, 'T3', 6, 'Available', 100, 250),
        (1, 'T4', 2, 'Available', 250, 250)`
      );
      res.json({ success: true, message: 'Tables seeded' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to seed' });
  }
});

module.exports = router;
