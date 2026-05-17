const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * @route   GET /api/reports/financial
 * @desc    Get financial report data for a specific period
 * @params  period (daily, weekly, monthly), startDate, endDate
 */
router.get('/financial', async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    let dateFilter = 'DATE(o.order_time) = CURDATE()';
    
    if (startDate && endDate) {
      dateFilter = `o.order_time BETWEEN '${startDate}' AND '${endDate}'`;
    } else if (period === 'weekly') {
      dateFilter = 'o.order_time >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
    } else if (period === 'monthly') {
      dateFilter = 'o.order_time >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
    }

    // 1. Sales Summary
    const [sales] = await db.query(`
      SELECT 
        COUNT(*) as order_count,
        SUM(total_amount) as gross_sales,
        SUM(discount_amount) as total_discounts,
        (SUM(total_amount) - SUM(discount_amount)) as net_sales
      FROM orders o
      WHERE ${dateFilter} AND status != 'Cancelled' AND o.parent_order_id IS NULL
    `);

    // 2. Payments Breakdown
    const [payments] = await db.query(`
      SELECT 
        payment_method,
        SUM(amount) as total,
        SUM(tip_amount) as tips
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE ${dateFilter} AND o.status != 'Cancelled' AND o.parent_order_id IS NULL
      GROUP BY payment_method
    `);

    // 3. Expenses Summary
    const [expenses] = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE date BETWEEN IFNULL('${startDate}', DATE_SUB(NOW(), INTERVAL 1 MONTH)) AND IFNULL('${endDate}', NOW())
    `).catch(() => [[{ total_expenses: 0 }]]); // Handle missing table gracefully for now

    // 4. Cost of Goods Sold (COGS) Estimation
    // Using current recipe prices * quantities sold
    const [cogs] = await db.query(`
      SELECT 
        SUM(oi.quantity * mii.quantity_required * COALESCE(
          (SELECT unit_price FROM purchase_order_items 
           WHERE inventory_item_id = mii.inventory_item_id 
           ORDER BY id DESC LIMIT 1),
          ii.cost_per_unit,
          0
        )) as estimated_cogs
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN menu_item_ingredients mii ON oi.menu_item_id = mii.menu_item_id
      JOIN inventory_items ii ON mii.inventory_item_id = ii.id
      WHERE ${dateFilter} AND o.status != 'Cancelled' AND o.parent_order_id IS NULL
    `).catch((err) => {
      console.error('COGS Query Error:', err);
      return [[{ estimated_cogs: 0 }]];
    });

    const financialData = {
      summary: sales[0] || { order_count: 0, gross_sales: 0, total_discounts: 0, net_sales: 0 },
      payments: payments,
      expenses: expenses[0]?.total_expenses || 0,
      cogs: cogs[0]?.estimated_cogs || 0,
      period: period || 'daily'
    };

    // Calculate Profit
    financialData.gross_profit = financialData.summary.net_sales - financialData.cogs;
    financialData.net_profit = financialData.gross_profit - financialData.expenses;

    res.json(financialData);
  } catch (error) {
    console.error('Financial Report Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/reports/operational
 * @desc    Get operational breakdown (Table performance, Stations, etc.)
 */
router.get('/operational', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = 'DATE(o.order_time) = CURDATE()';
    let ordersDateFilter = 'DATE(order_time) = CURDATE()';

    if (startDate && endDate) {
      dateFilter = `DATE(o.order_time) BETWEEN '${startDate}' AND '${endDate}'`;
      ordersDateFilter = `DATE(order_time) BETWEEN '${startDate}' AND '${endDate}'`;
    } else if (startDate) {
      dateFilter = `DATE(o.order_time) = '${startDate}'`;
      ordersDateFilter = `DATE(order_time) = '${startDate}'`;
    }

    // 1. Station Performance
    const [stations] = await db.query(`
      SELECT 
        mi.prep_station,
        COUNT(*) as item_count,
        COALESCE(SUM(oi.quantity), 0) as total_quantity
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      JOIN orders o ON oi.order_id = o.id
      WHERE ${dateFilter} AND o.status != 'Cancelled' AND o.parent_order_id IS NULL
      GROUP BY mi.prep_station
    `);

    // 2. Table Turnover
    const [tables] = await db.query(`
      SELECT 
        rt.table_number,
        COUNT(o.id) as sessions,
        COALESCE(SUM(o.total_amount), 0) as revenue
      FROM restaurant_tables rt
      LEFT JOIN orders o ON o.table_id = rt.id AND ${dateFilter} AND o.status != 'Cancelled' AND o.parent_order_id IS NULL
      GROUP BY rt.id
      ORDER BY revenue DESC
    `);

    // 3. Online vs Offline
    const [origins] = await db.query(`
      SELECT 
        origin,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total
      FROM orders
      WHERE ${ordersDateFilter} AND status != 'Cancelled' AND parent_order_id IS NULL
      GROUP BY origin
    `);

    res.json({
      stations,
      tables,
      origins,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Operational Report Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/reports/inventory-trends
 * @desc    Get procurement trends and cost fluctuations
 */
router.get('/inventory-trends', async (req, res) => {
  try {
    // 1. Vendor Spend Distribution
    const [vendorSpend] = await db.query(`
      SELECT 
        s.name as vendor_name,
        COUNT(po.id) as order_count,
        SUM(po.total_amount) as total_spend
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.status = 'Received'
      GROUP BY s.id
      ORDER BY total_spend DESC
    `);

    // 2. Recent Item Cost Fluctuations (Top 10 most purchased items)
    const [costFluctuations] = await db.query(`
      SELECT 
        ii.name as item_name,
        poi.unit_price,
        po.order_date,
        s.name as supplier_name
      FROM purchase_order_items poi
      JOIN purchase_orders po ON poi.purchase_order_id = po.id
      JOIN inventory_items ii ON poi.inventory_item_id = ii.id
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.status = 'Received'
      ORDER BY ii.name, po.order_date DESC
      LIMIT 100
    `);

    res.json({
      vendorSpend,
      costFluctuations,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Inventory Trends Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/reports/inventory-log
 * @desc    Get inventory movement history (Purchases)
 */
router.get('/inventory-log', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = '';
    
    if (startDate && endDate) {
      dateFilter = `WHERE po.order_date BETWEEN '${startDate}' AND '${endDate}'`;
    }

    const [purchases] = await db.query(`
      SELECT 
        po.id,
        po.order_date as time,
        s.name as supplier,
        po.total_amount as total,
        po.status,
        (SELECT GROUP_CONCAT(CONCAT(poi.quantity, 'x ', ii.name) SEPARATOR ', ')
         FROM purchase_order_items poi
         JOIN inventory_items ii ON poi.inventory_item_id = ii.id
         WHERE poi.purchase_order_id = po.id) as items
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      ${dateFilter}
      ORDER BY po.order_date DESC
    `);

    res.json(purchases);
  } catch (error) {
    console.error('Inventory Log Report Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/reports/waiter-dashboard
 * @desc    Get data for the waiter app dashboard (popular dishes, out of stock, etc.)
 */
router.get('/waiter-dashboard', async (req, res) => {
  try {
    // 1. Popular Dishes (Top 5 today)
    const [popular] = await db.query(`
      SELECT 
        mi.name,
        COUNT(oi.id) as orders
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      JOIN orders o ON oi.order_id = o.id
      WHERE DATE(o.order_time) = CURDATE() AND o.status != 'Cancelled' AND o.parent_order_id IS NULL
      GROUP BY mi.id
      ORDER BY orders DESC
      LIMIT 3
    `);

    // 2. Out of Stock / Low Stock
    // For now, we use is_available flag. In future, check inventory levels.
    const [outOfStock] = await db.query(`
      SELECT name 
      FROM menu_items 
      WHERE is_available = FALSE
      LIMIT 5
    `);

    res.json({
      popularDishes: popular,
      outOfStock: outOfStock,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Waiter Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
