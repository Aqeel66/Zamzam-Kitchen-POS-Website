const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Inventory API is reachable', timestamp: new Date().toISOString() });
});

// @route   GET /api/inventory/categories
// @desc    Get all inventory categories
router.get('/categories', async (req, res) => {
  try {
    const [cats] = await db.query('SELECT * FROM categories WHERE is_deleted = 0');
    res.json(cats);
  } catch (error) {
    console.error('Fetch Inventory Categories Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/inventory
// @desc    Get all inventory items
router.get('/', async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT i.*, s.name as supplier_name, c.name as category_name
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      LEFT JOIN categories c ON i.category_id = c.id
    `);
    res.json(items);
  } catch (error) {
    console.error('Fetch Inventory Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/inventory
// @desc    Create a new inventory item
router.post('/', async (req, res) => {
  try {
    console.log('POST /api/inventory body:', req.body);
    const { name, unit, pack_unit, pack_size, cost_per_unit, min_stock_level, category_id, supplier_id } = req.body;
    const qty = req.body.current_stock !== undefined ? req.body.current_stock : (req.body.quantity || 0);
    const threshold = req.body.minimum_stock_level !== undefined ? req.body.minimum_stock_level : (req.body.low_stock_threshold || 0);
    
    const [result] = await db.query(
      'INSERT INTO inventory_items (name, unit, quantity, low_stock_threshold, pack_unit, pack_size, cost_per_unit, min_stock_level, category_id, supplier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, unit, qty, threshold, pack_unit || null, pack_size || 1.00, cost_per_unit || 0.00, min_stock_level || 0.00, category_id || null, supplier_id || null]
    );
    res.status(201).json({ success: true, itemId: result.insertId });
  } catch (error) {
    console.error('Create Inventory Error:', error.stack || error);
    res.status(500).json({ success: false, message: 'Database Error: ' + error.message });
  }
});

// @route   PUT /api/inventory/:id
// @desc    Update an inventory item
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    console.log(`PUT /api/inventory/${id} body:`, req.body);
    
    // First, get current item data to ensure we don't overwrite with null
    const [rows] = await db.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    const currentItem = rows[0];

    const { name, unit, pack_unit, pack_size, cost_per_unit, min_stock_level, category_id, supplier_id } = req.body;
    const qty = req.body.current_stock !== undefined ? req.body.current_stock : 
                (req.body.quantity !== undefined ? req.body.quantity : currentItem.quantity);
    const threshold = req.body.minimum_stock_level !== undefined ? req.body.minimum_stock_level : 
                      (req.body.low_stock_threshold !== undefined ? req.body.low_stock_threshold : currentItem.low_stock_threshold);
    
    const finalName = name || currentItem.name;
    const finalUnit = unit || currentItem.unit;
    const finalPackUnit = pack_unit !== undefined ? pack_unit : currentItem.pack_unit;
    const finalPackSize = pack_size !== undefined ? pack_size : currentItem.pack_size;
    const finalCost = cost_per_unit !== undefined ? cost_per_unit : currentItem.cost_per_unit;
    const finalMinStock = min_stock_level !== undefined ? min_stock_level : currentItem.min_stock_level;
    const finalCategoryId = category_id !== undefined ? category_id : currentItem.category_id;
    const finalSupplierId = supplier_id !== undefined ? supplier_id : currentItem.supplier_id;

    const quantityChange = qty - currentItem.quantity;

    await db.query(
      'UPDATE inventory_items SET name = ?, unit = ?, quantity = ?, low_stock_threshold = ?, pack_unit = ?, pack_size = ?, cost_per_unit = ?, min_stock_level = ?, category_id = ?, supplier_id = ? WHERE id = ?',
      [finalName, finalUnit, qty, threshold, finalPackUnit, finalPackSize, finalCost, finalMinStock, finalCategoryId, finalSupplierId, id]
    );

    // Log transaction if quantity changed
    if (quantityChange !== 0) {
      const type = req.body.reason === 'Wastage' ? 'Wastage' : (quantityChange > 0 ? 'Purchase' : 'Adjustment');
      await db.query(
        'INSERT INTO inventory_transactions (inventory_item_id, type, quantity_change, previous_quantity, new_quantity, reason) VALUES (?, ?, ?, ?, ?, ?)',
        [id, type, quantityChange, currentItem.quantity, qty, req.body.reason || 'Manual Update']
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update Inventory Error:', error.stack || error);
    res.status(500).json({ success: false, message: 'Database Error: ' + error.message });
  }
});

// @route   GET /api/inventory/transactions
// @desc    Get all inventory transactions
router.get('/transactions', async (req, res) => {
  try {
    const [transactions] = await db.query(`
      SELECT t.*, i.name as item_name, i.unit 
      FROM inventory_transactions t
      JOIN inventory_items i ON t.inventory_item_id = i.id
      ORDER BY t.created_at DESC
      LIMIT 100
    `);
    res.json(transactions);
  } catch (error) {
    console.error('Fetch Transactions Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/inventory/:id
// @desc    Delete an inventory item
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM inventory_items WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete Inventory Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
