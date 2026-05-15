const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/purchases/suppliers
// @desc    Get all suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const [suppliers] = await db.query('SELECT * FROM suppliers');
    res.json(suppliers);
  } catch (error) {
    console.error('Fetch Suppliers Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching suppliers' });
  }
});

// @route   GET /api/purchases
// @desc    Get all purchase orders
router.get('/', async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT po.*, s.name as supplier_name 
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      ORDER BY po.order_date DESC
    `);

    // Fetch items for each order
    for (let order of orders) {
      const [items] = await db.query(`
        SELECT poi.*, i.name as item_name, i.unit 
        FROM purchase_order_items poi
        JOIN inventory_items i ON poi.inventory_item_id = i.id
        WHERE poi.purchase_order_id = ?
      `, [order.id]);
      order.items = items;
    }

    res.json(orders);
  } catch (error) {
    console.error('Fetch Purchase Orders Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching purchase orders' });
  }
});

// @route   POST /api/purchases
// @desc    Create a new purchase order
router.post('/', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { supplier_id, invoice_number, branch_id, items, total_amount, status } = req.body;
    const initialStatus = status || 'Pending';

    const [orderResult] = await connection.query(
      'INSERT INTO purchase_orders (supplier_id, invoice_number, branch_id, total_amount, status) VALUES (?, ?, ?, ?, ?)',
      [supplier_id, invoice_number || null, branch_id || 1, total_amount, initialStatus]
    );

    const purchaseOrderId = orderResult.insertId;

    if (items && items.length > 0) {
      for (const item of items) {
        await connection.query(
          'INSERT INTO purchase_order_items (purchase_order_id, inventory_item_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
          [purchaseOrderId, item.inventory_item_id, item.quantity, item.unit_price, item.subtotal]
        );

        // If status is "Received", update inventory immediately
        if (initialStatus === 'Received') {
          await connection.query(
            'UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?',
            [item.quantity, item.inventory_item_id]
          );
        }
      }
    }

    await connection.commit();
    res.status(201).json({ success: true, orderId: purchaseOrderId, message: 'Purchase order created successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Create Purchase Order Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating purchase order' });
  } finally {
    connection.release();
  }
});

// @route   PUT /api/purchases/:id/status
// @desc    Update status of a purchase order
router.put('/:id/status', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const orderId = req.params.id;
    const { status } = req.body; // 'Approved', 'Received', 'Cancelled'

    // Update the status
    await connection.query('UPDATE purchase_orders SET status = ? WHERE id = ?', [status, orderId]);

    // If marked as 'Received', update inventory
    if (status === 'Received') {
      const [items] = await connection.query('SELECT inventory_item_id, quantity FROM purchase_order_items WHERE purchase_order_id = ?', [orderId]);
      
      for (const item of items) {
        // Get current quantity first for logging
        const [invRows] = await connection.query('SELECT quantity FROM inventory_items WHERE id = ?', [item.inventory_item_id]);
        const prevQty = invRows[0]?.quantity || 0;
        const newQty = prevQty + item.quantity;

        // Increment inventory quantity
        await connection.query(
          'UPDATE inventory_items SET quantity = ? WHERE id = ?',
          [newQty, item.inventory_item_id]
        );

        // Log transaction
        await connection.query(
          'INSERT INTO inventory_transactions (inventory_item_id, type, quantity_change, previous_quantity, new_quantity, reason) VALUES (?, "Purchase", ?, ?, ?, ?)',
          [item.inventory_item_id, item.quantity, prevQty, newQty, `Received PO #${orderId}`]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: `Purchase order status updated to ${status}` });
  } catch (error) {
    await connection.rollback();
    console.error('Update Purchase Order Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating purchase order status' });
  } finally {
    connection.release();
  }
});

// @route   POST /api/purchases/suppliers
// @desc    Create a new supplier
router.post('/suppliers', async (req, res) => {
  try {
    const { name, contact_email, contact_phone, reliability_score } = req.body;
    const [result] = await db.query(
      'INSERT INTO suppliers (name, contact_email, contact_phone, reliability_score) VALUES (?, ?, ?, ?)',
      [name, contact_email, contact_phone, reliability_score || 100]
    );
    res.status(201).json({ success: true, supplierId: result.insertId });
  } catch (error) {
    console.error('Create Supplier Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/purchases/suppliers/:id
// @desc    Update a supplier
router.put('/suppliers/:id', async (req, res) => {
  try {
    const { name, contact_email, contact_phone, reliability_score } = req.body;
    await db.query(
      'UPDATE suppliers SET name = ?, contact_email = ?, contact_phone = ?, reliability_score = ? WHERE id = ?',
      [name, contact_email, contact_phone, reliability_score, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Update Supplier Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/purchases/suppliers/:id
// @desc    Delete a supplier
router.delete('/suppliers/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete Supplier Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/purchases/:id
// @desc    Delete a purchase order
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }
    res.json({ success: true, message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Delete Purchase Order Error:', error);
    res.status(500).json({ success: false, message: 'Database Error: ' + error.message });
  }
});

// @route   PUT /api/purchases/inventory/:id/supplier
// @desc    Link an inventory item to a supplier
router.put('/inventory/:id/supplier', async (req, res) => {
  try {
    const { supplier_id } = req.body;
    await db.query('UPDATE inventory_items SET supplier_id = ? WHERE id = ?', [supplier_id, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Link Supplier Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
