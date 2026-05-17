const express = require('express');
const router = express.Router();
const db = require('../db');
const { upsertCustomer } = require('./customers');

// Sibling completion syncer: check if paying a child order and update parent order status
async function handleChildOrderStatusSync(connection, orderId) {
  try {
    // 1. Get current order metadata
    const [orderRows] = await connection.execute(
      'SELECT parent_order_id, status FROM orders WHERE id = ?',
      [orderId]
    );
    if (orderRows.length === 0) return;
    const currentOrder = orderRows[0];

    // If it has a parent order
    if (currentOrder.parent_order_id) {
      const parentId = currentOrder.parent_order_id;

      // Check if all sibling child orders (under the same parent) are paid
      const [unpaidSiblings] = await connection.execute(
        'SELECT COUNT(*) as count FROM orders WHERE parent_order_id = ? AND status != "Paid"',
        [parentId]
      );

      if (parseInt(unpaidSiblings[0].count) === 0) {
        // All child orders are paid! Mark the parent order as Paid and release the table
        await connection.execute(
          'UPDATE orders SET status = "Paid" WHERE id = ?',
          [parentId]
        );
        const [parentData] = await connection.execute(
          'SELECT table_id FROM orders WHERE id = ?',
          [parentId]
        );
        if (parentData.length > 0 && parentData[0].table_id) {
          await connection.execute(
            'UPDATE restaurant_tables SET status = "Available" WHERE id = ?',
            [parentData[0].table_id]
          );
        }
      } else {
        // Sibling orders are not fully paid yet. Set parent to Partially Paid.
        await connection.execute(
          'UPDATE orders SET status = "Partially Paid" WHERE id = ?',
          [parentId]
        );
      }
    }
  } catch (err) {
    console.error('Error in handleChildOrderStatusSync:', err);
  }
}


// @route   POST api/orders
// @desc    Create a new order with items and optional payment info
router.post('/', async (req, res) => {
    const { 
      items, 
      total, 
      total_amount,
      table_id, 
      status, 
      order_type, 
      payment_method, 
      tip_amount, 
      discount_amount,
      customer_id,
      customer_name,
      customer_phone,
      customer_details, // New field for auto-registration
      branch_id,
      user_id,
      origin
    } = req.body;
  
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      let finalCustomerId = customer_id;

      // Auto-register customer if details provided
      if (customer_details && (customer_details.phone || customer_details.email)) {
        finalCustomerId = await upsertCustomer({
          ...customer_details,
          origin: origin || 'Counter'
        });
      }
  
  
      // 0. Generate Centralized Order Number (Format: 0000DDMMYY)
      // Resets every month. Format: [4-digit sequence][DD][MM][YY]
      const now = new Date();
      const localNow = new Date(now.getTime() + (5 * 60 * 60 * 1000)); // UTC+5
      
      const day = String(localNow.getUTCDate()).padStart(2, '0');
      const month = String(localNow.getUTCMonth() + 1).padStart(2, '0');
      const year = String(localNow.getUTCFullYear()).slice(-2);
      const datePart = `${day}${month}${year}`;
      const monthPrefix = `${month}${year}`; // To track the monthly reset

      // Find the highest sequence number for the current month
      // We look for orders ending in the current month/year and extract the leading 5 digits
      const [lastOrder] = await connection.execute(
        'SELECT order_number FROM orders WHERE order_number LIKE ? AND LENGTH(order_number) = 10 ORDER BY id DESC LIMIT 1',
        [`${datePart}%`]
      );

      let nextSequence = 1;
      if (lastOrder.length > 0 && lastOrder[0].order_number) {
        const lastOrderNum = lastOrder[0].order_number;
        // The last 4 digits are the sequence
        const sequencePart = lastOrderNum.slice(-4);
        if (!isNaN(parseInt(sequencePart))) {
          nextSequence = parseInt(sequencePart) + 1;
        }
      }
      
      const orderNumber = `${datePart}${String(nextSequence).padStart(4, '0')}`;

      // Normalize order_type for database ENUM compatibility
      const normalizedOrderType = (order_type === 'Pickup' || order_type === 'pickup') ? 'Takeaway' : (order_type || 'Dine-In');

      // Normalize estimated_release_time for MySQL DATETIME compatibility (YYYY-MM-DD HH:MM:SS)
      let mysqlReleaseTime = req.body.estimated_release_time || null;
      if (mysqlReleaseTime && typeof mysqlReleaseTime === 'string' && mysqlReleaseTime.includes('T')) {
        const d = new Date(mysqlReleaseTime);
        if (!isNaN(d.getTime())) {
          mysqlReleaseTime = d.getFullYear() + '-' + 
            String(d.getMonth() + 1).padStart(2, '0') + '-' + 
            String(d.getDate()).padStart(2, '0') + ' ' + 
            String(d.getHours()).padStart(2, '0') + ':' + 
            String(d.getMinutes()).padStart(2, '0') + ':' + 
            String(d.getSeconds()).padStart(2, '0');
        }
      }

      const orderStatus = status || (payment_method ? 'Paid' : 'Pending');
      const [orderResult] = await connection.execute(
        'INSERT INTO orders (order_number, branch_id, table_id, waiter_id, waiter_name, customer_id, customer_name, customer_phone, user_id, order_type, status, total_amount, discount_amount, promo_id, origin, party_size, estimated_release_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          orderNumber, 
          branch_id || 1, 
          table_id || null, 
          req.body.waiter_id || null, 
          req.body.waiter_name || null, 
          finalCustomerId || null, 
          customer_name || null,
          customer_phone || null,
          user_id || 1, 
          normalizedOrderType, 
          orderStatus, 
          total !== undefined ? total : (total_amount || 0), 
          discount_amount || 0,
          req.body.promo_id || null,
          origin || 'In-Store', 
          req.body.guest_count || req.body.party_size || 1,
          mysqlReleaseTime
        ]
      );
      const orderId = orderResult.insertId;

      // 1.5 Update Table Status if Dine-In
      if (table_id && normalizedOrderType === 'Dine-In' && orderStatus !== 'Paid') {
        await connection.execute(
          'UPDATE restaurant_tables SET status = "Occupied" WHERE id = ?',
          [table_id]
        );
      }

    // 2. Insert items
    if (items && items.length > 0) {
      for (const item of items) {
        // Sanitize menu_item_id: if it's not a number (e.g. starts with 's'), treat as NULL
        const menuItemId = (typeof item.id === 'string' && item.id.startsWith('s')) 
          ? null 
          : (parseInt(item.id) || null);

        const subtotal = item.subtotal || (parseFloat(item.price || 0) * (item.quantity || 1));

        const [orderItemResult] = await connection.execute(
          'INSERT INTO order_items (order_id, menu_item_id, name, description, quantity, unit_price, subtotal, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [orderId, menuItemId, item.name, item.description || '', item.quantity || 1, item.price || 0, subtotal, item.notes || '']
        );
        const orderItemId = orderItemResult.insertId;

        // Save Customizations & Deduct Inventory (Phase 3)
        if (item.variant) {
          await connection.execute(
            'INSERT INTO order_item_customizations (order_item_id, type, customization_name, price_adjustment) VALUES (?, "Variant", ?, ?)',
            [orderItemId, item.variant.name, item.variant.price_adjustment || 0]
          );

          // Deduct variant inventory if applicable
          if (menuItemId) {
            const [vIng] = await connection.query(
              'SELECT inventory_item_id, quantity_required FROM menu_item_variants WHERE menu_item_id = ? AND name = ?',
              [menuItemId, item.variant.name]
            );
            if (vIng.length > 0 && vIng[0].inventory_item_id) {
              await connection.execute(
                'UPDATE inventory_items SET quantity = quantity - ? WHERE id = ?',
                [parseFloat(vIng[0].quantity_required) * (item.quantity || 1), vIng[0].inventory_item_id]
              );
            }
          }
        }
        if (item.extras && item.extras.length > 0) {
          for (const extra of item.extras) {
            await connection.execute(
              'INSERT INTO order_item_customizations (order_item_id, type, customization_name, price_adjustment) VALUES (?, "Extra", ?, ?)',
              [orderItemId, extra.name, extra.price_adjustment || 0]
            );

            // Deduct extra inventory if applicable
            if (menuItemId) {
              const [eIng] = await connection.query(
                'SELECT inventory_item_id, quantity_required FROM menu_item_extras WHERE menu_item_id = ? AND name = ?',
                [menuItemId, extra.name]
              );
              if (eIng.length > 0 && eIng[0].inventory_item_id) {
                await connection.execute(
                  'UPDATE inventory_items SET quantity = quantity - ? WHERE id = ?',
                  [parseFloat(eIng[0].quantity_required) * (item.quantity || 1), eIng[0].inventory_item_id]
                );
              }
            }
          }
        }

        // Deduct Inventory based on Recipe (Phase 3)
        if (menuItemId) {
          const [ingredients] = await connection.query(
            'SELECT inventory_item_id, quantity_required FROM menu_item_ingredients WHERE menu_item_id = ?',
            [menuItemId]
          );
          for (const ing of ingredients) {
            const totalRequired = parseFloat(ing.quantity_required) * (item.quantity || 1);
            await connection.execute(
              'UPDATE inventory_items SET quantity = quantity - ? WHERE id = ?',
              [totalRequired, ing.inventory_item_id]
            );
          }
        }
      }
    }

    // 3. Create Payment record if method is provided
    if (payment_method) {
      const finalTotalAmount = total !== undefined ? total : (total_amount || 0);
      await connection.execute(
        'INSERT INTO payments (order_id, payment_method, amount, tip_amount) VALUES (?, ?, ?, ?)',
        [orderId, payment_method, finalTotalAmount, tip_amount || 0]
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, orderId, orderNumber });
  } catch (err) {
    await connection.rollback();
    console.error('Order Creation Error:', err);
    res.setHeader('X-Diagnostic-Backend', 'Active-v3');
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create order',
      message: err.message,
      details: err.sqlMessage || err.message,
      sqlMessage: err.sqlMessage,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    connection.release();
  }
});

// @route   GET api/orders/staff-stats
// @desc    Get performance metrics for all staff members
router.get('/staff-stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id as user_id, 
        u.first_name, 
        u.last_name,
        u.email,
        GROUP_CONCAT(DISTINCT r.name) as roles,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(DISTINCT o.total_amount), 0) as total_sales,
        COALESCE(SUM(DISTINCT p.tip_amount), 0) as total_tips
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN orders o ON (u.id = o.waiter_id OR (o.waiter_id IS NULL AND u.id = o.user_id))
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE (o.id IS NULL OR (o.status NOT IN ('Cancelled', 'Rejected') AND o.parent_order_id IS NULL))
      GROUP BY u.id
      ORDER BY total_sales DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Staff Stats Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// @route   GET api/orders/summary
// @desc    Get aggregated stats for the Dashboard
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = 'DATE(order_time) = CURDATE()';
    let oDateFilter = 'DATE(o.order_time) = CURDATE()';

    if (startDate && endDate) {
      dateFilter = `DATE(order_time) BETWEEN '${startDate}' AND '${endDate}'`;
      oDateFilter = `DATE(o.order_time) BETWEEN '${startDate}' AND '${endDate}'`;
    } else if (startDate) {
      dateFilter = `DATE(order_time) = '${startDate}'`;
      oDateFilter = `DATE(o.order_time) = '${startDate}'`;
    }

    // Today's Sales & Orders
    const [todayStats] = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM orders WHERE ${dateFilter} AND status != "Cancelled" AND status != "Rejected" AND parent_order_id IS NULL`
    );

    // Lifetime Sales & Orders
    const [lifetimeStats] = await db.query(
      'SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != "Cancelled" AND status != "Rejected" AND parent_order_id IS NULL'
    );

    // Today's Tips (from payments table)
    const [todayTips] = await db.query(`
      SELECT COALESCE(SUM(p.tip_amount), 0) as tips
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE ${oDateFilter} AND o.parent_order_id IS NULL
    `);

    // Today's Discounts (from orders table)
    const [todayDiscounts] = await db.query(`
      SELECT COALESCE(SUM(discount_amount), 0) as discounts
      FROM orders
      WHERE ${dateFilter} AND status != "Cancelled" AND status != "Rejected" AND parent_order_id IS NULL
    `);

    // Today's Expenses
    const [todayExpenses] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE DATE(date) ${startDate && endDate ? `BETWEEN '${startDate}' AND '${endDate}'` : (startDate ? `= '${startDate}'` : '= CURDATE()')}
    `);

    // Estimated COGS (Sum of ingredients cost for items sold in the range)
    const [cogsStats] = await db.query(`
      SELECT COALESCE(SUM(mi_ing.quantity_required * inv.cost_per_unit * oi.quantity), 0) as total_cogs
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN menu_item_ingredients mi_ing ON oi.menu_item_id = mi_ing.menu_item_id
      JOIN inventory_items inv ON mi_ing.inventory_item_id = inv.id
      WHERE ${oDateFilter} AND o.status NOT IN ("Cancelled", "Rejected") AND o.parent_order_id IS NULL
    `);

    // Live Operational Status (All time active orders)
    const [livePending] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status = "Pending" AND parent_order_id IS NULL');
    const [liveActive] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status IN ("Ordered", "Pending", "Preparing", "Paid", "Partially Paid") AND parent_order_id IS NULL');
    const [liveUnpaid] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status IN ("Ordered", "Pending", "Preparing", "Partially Paid") AND parent_order_id IS NULL');

    // Breakdown by Order Type (Filtering invalid orders)
    const [typeStats] = await db.query(
      `SELECT order_type, COUNT(*) as count FROM orders WHERE ${dateFilter} AND status NOT IN ("Cancelled", "Rejected") AND parent_order_id IS NULL GROUP BY order_type`
    );

    // Breakdown by Payment Method (Joined with valid orders)
    const [payStats] = await db.query(`
      SELECT p.payment_method, COUNT(*) as count, COALESCE(SUM(p.amount), 0) as total 
      FROM payments p JOIN orders o ON p.order_id = o.id 
      WHERE ${oDateFilter} AND o.status NOT IN ("Cancelled", "Rejected") AND o.parent_order_id IS NULL
      GROUP BY p.payment_method
    `);

    // Top Selling Items (Filtering invalid orders)
    const [topItems] = await db.query(`
      SELECT mi.name, SUM(oi.quantity) as sold 
      FROM order_items oi 
      JOIN menu_items mi ON oi.menu_item_id = mi.id 
      JOIN orders o ON oi.order_id = o.id
      WHERE o.order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      AND o.status NOT IN ("Cancelled", "Rejected") AND o.parent_order_id IS NULL
      GROUP BY mi.id ORDER BY sold DESC LIMIT 7
    `);

    // Monthly Trends (Filtering invalid orders)
    const [monthlyTrends] = await db.query(`
      SELECT DATE_FORMAT(order_time, '%b') as month, COALESCE(SUM(total_amount), 0) as total, COUNT(*) as orders
      FROM orders 
      WHERE order_time >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      AND status NOT IN ("Cancelled", "Rejected") AND parent_order_id IS NULL
      GROUP BY month ORDER BY MIN(order_time)
    `);

    // Average Preparation Time (from Ordered to Ready/Served)
    const [prepStats] = await db.query(`
      SELECT AVG(TIMESTAMPDIFF(MINUTE, order_time, updated_at)) as avg_prep 
      FROM orders 
      WHERE status IN ("Ready", "Served", "Completed", "Paid") AND parent_order_id IS NULL
      AND ${dateFilter}
    `);

    // Customization Popularity
    const [customStats] = await db.query(`
      SELECT customization_name as name, type, COUNT(*) as count 
      FROM order_item_customizations 
      GROUP BY name, type ORDER BY count DESC LIMIT 10
    `);

    // Orders per Hour (Velocity) - Last 24 hours or Today
    const [velocityStats] = await db.query(`
      SELECT HOUR(order_time) as hour, COUNT(*) as count
      FROM orders
      WHERE ${dateFilter} AND status NOT IN ("Cancelled", "Rejected") AND parent_order_id IS NULL
      GROUP BY hour ORDER BY hour
    `);

    const todayObj = todayStats[0] || { count: 0, total: 0 };
    todayObj.tips = parseFloat(todayTips[0]?.tips ?? 0);
    todayObj.discounts = parseFloat(todayDiscounts[0]?.discounts ?? 0);
    todayObj.avgPrepTime = parseFloat(prepStats[0]?.avg_prep ?? 0).toFixed(1);

    res.json({
      today: todayObj,
      lifetime: lifetimeStats[0] || { count: 0, total: 0 },
      financials: {
        gross_sales: todayObj.total,
        expenses: parseFloat(todayExpenses[0]?.total ?? 0),
        cogs: parseFloat(cogsStats[0]?.total_cogs ?? 0),
        net_profit: todayObj.total - parseFloat(cogsStats[0]?.total_cogs ?? 0) - parseFloat(todayExpenses[0]?.total ?? 0)
      },
      live: {
        pending: livePending[0]?.count ?? 0,
        active: liveActive[0]?.count ?? 0,
        unpaid: liveUnpaid[0]?.count ?? 0,
        velocity: velocityStats
      },
      types: typeStats,
      payments: payStats,
      topItems: topItems,
      trends: monthlyTrends,
      customizations: customStats
    });
  } catch (err) {
    console.error('Summary Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// @route   GET api/orders
// @desc    Get orders with optional filtering by date, type, and status
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, type, status, customer_id } = req.query;
    let query = `
      SELECT o.*, rt.table_number, 
             c.first_name as customer_first_name, 
             c.last_name as customer_last_name, 
             c.phone as customer_db_phone
      FROM orders o 
      LEFT JOIN restaurant_tables rt ON o.table_id = rt.id 
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    const { parentId, includeSplits } = req.query;
    if (parentId) {
      query += ` AND o.parent_order_id = ?`;
      params.push(parentId);
    } else if (includeSplits !== 'true') {
      query += ` AND o.parent_order_id IS NULL`;
    }

    if (customer_id) {
      query += ` AND o.customer_id = ?`;
      params.push(customer_id);
    }

    if (startDate && req.query.kds !== 'true') {
      query += ` AND DATE(DATE_ADD(o.order_time, INTERVAL 5 HOUR)) >= ?`;
      params.push(startDate);
    }

    if (req.query.kds === 'true') {
      // In KDS mode, we want ALL active orders regardless of date, 
      // OR any orders from the specific date (if selected) or today.
      const targetDate = startDate || 'CURDATE()';
      if (startDate) {
        query += ` AND (o.status IN ('Pending', 'Ordered', 'Preparing', 'Ready', 'Paid', 'Partially Paid', 'Rejected', 'Cancelled') OR DATE(DATE_ADD(o.order_time, INTERVAL 5 HOUR)) = ?)`;
        params.push(startDate);
      } else {
        query += ` AND (o.status IN ('Pending', 'Ordered', 'Preparing', 'Ready', 'Paid', 'Partially Paid', 'Rejected', 'Cancelled') OR DATE(DATE_ADD(o.order_time, INTERVAL 5 HOUR)) = CURDATE())`;
      }
    } else {
      if (endDate) {
        query += ` AND DATE(DATE_ADD(o.order_time, INTERVAL 5 HOUR)) <= ?`;
        params.push(endDate);
      }
    }
    if (type && type !== 'ALL') {
      const typeLower = type.toLowerCase();
      if (typeLower === 'qr menu') {
        query += ` AND LOWER(o.origin) = 'qr-menu'`;
      } else if (typeLower === 'website') {
        query += ` AND LOWER(o.origin) = 'website'`;
      } else if (typeLower === 'dine-in') {
        query += ` AND LOWER(o.order_type) = 'dine-in' AND LOWER(o.origin) = 'in-store'`;
      } else if (typeLower === 'takeaway') {
        query += ` AND LOWER(o.order_type) = 'takeaway' AND LOWER(o.origin) = 'in-store'`;
      } else {
        query += ` AND LOWER(o.order_type) = LOWER(?)`;
        params.push(type);
      }
    }
    if (status && status !== 'ALL') {
      query += ` AND LOWER(o.status) = LOWER(?)`;
      params.push(status);
    }

    query += ` ORDER BY o.id DESC LIMIT 200`;
    
    const [orders] = await db.query(query, params);
    const detailedOrders = await Promise.all(orders.map(async (order) => {
      const [items] = await db.query(
        `SELECT oi.id, oi.quantity, oi.subtotal, oi.notes, 
                COALESCE(oi.name, mi.name, 'Unknown Item') as name, 
                COALESCE(oi.description, mi.description, '') as description,
                oi.menu_item_id,
                COALESCE(oi.unit_price, mi.price, 0) as unit_price, mi.image
         FROM order_items oi 
         LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id 
         WHERE oi.order_id = ?`,
        [order.id]
      );
      
      const itemIds = items.map(i => i.id);
      let customizations = [];
      if (itemIds.length > 0) {
        const [cust] = await db.query(
          `SELECT * FROM order_item_customizations WHERE order_item_id IN (?)`,
          [itemIds]
        );
        customizations = cust;
      }

      const itemsWithCust = items.map(i => {
        const itemCusts = customizations.filter(c => c.order_item_id === i.id);
        const variant = itemCusts.find(c => c.type === 'Variant');
        const extras = itemCusts.filter(c => c.type === 'Extra');
        return {
          ...i,
          variant: variant ? { name: variant.customization_name, price_adjustment: parseFloat(variant.price_adjustment) } : null,
          extras: extras.map(e => ({ name: e.customization_name, price_adjustment: parseFloat(e.price_adjustment) }))
        };
      });

      const [payment] = await db.query('SELECT * FROM payments WHERE order_id = ?', [order.id]);
      
      // Resolve Customer Name and Phone
      const resolvedName = order.customer_name || (order.customer_first_name ? `${order.customer_first_name} ${order.customer_last_name || ''}`.trim() : 'Guest');
      const resolvedPhone = order.customer_phone || order.customer_db_phone || null;

      return { 
        ...order, 
        customer_name: resolvedName,
        customer_phone: resolvedPhone,
        items: itemsWithCust, 
        payment: payment[0] || null 
      };
    }));
    res.json(detailedOrders);
  } catch (err) {
    console.error('Fetch Orders error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
});

// @route   PATCH api/orders/:id
// @desc    Update order status or totals (tip, discount)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, tip_amount, discount_amount, total_amount, rejection_reason, customer_name, customer_phone } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let updateFields = [];
    let queryParams = [];

    if (status) {
      const validStatuses = ['Pending', 'Preparing', 'Ready', 'Served', 'Cancelled', 'Ordered', 'Paid', 'Rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      updateFields.push('status = ?');
      queryParams.push(status);
    }

    if (rejection_reason !== undefined) {
      updateFields.push('rejection_reason = ?');
      queryParams.push(rejection_reason);
    }

    if (discount_amount !== undefined) {
      updateFields.push('discount_amount = ?');
      queryParams.push(discount_amount);
    }

    if (total_amount !== undefined) {
      updateFields.push('total_amount = ?');
      queryParams.push(total_amount);
    }
    
    if (customer_name !== undefined) {
      updateFields.push('customer_name = ?');
      queryParams.push(customer_name);
    }

    if (customer_phone !== undefined) {
      updateFields.push('customer_phone = ?');
      queryParams.push(customer_phone);
    }

    if (updateFields.length > 0) {
      queryParams.push(id);
      const [result] = await connection.execute(
        `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
        queryParams
      );
      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Order not found' });
      }

      // If status changed to Paid, Cancelled, or Rejected, release the table
      if (status === 'Paid') {
        await handleChildOrderStatusSync(connection, id);
        
        const [currOrder] = await connection.execute('SELECT parent_order_id, table_id FROM orders WHERE id = ?', [id]);
        if (currOrder.length > 0) {
          const parentId = currOrder[0].parent_order_id;
          const tableId = currOrder[0].table_id;
          
          let shouldReleaseTable = true;
          if (parentId) {
            // It's a child order. Let's see if there are still unpaid siblings
            const [unpaid] = await connection.execute(
              'SELECT COUNT(*) as count FROM orders WHERE parent_order_id = ? AND status != "Paid"',
              [parentId]
            );
            if (parseInt(unpaid[0].count) > 0) {
              shouldReleaseTable = false;
            }
          }
          
          if (shouldReleaseTable && tableId) {
            await connection.execute(
              'UPDATE restaurant_tables SET status = "Available" WHERE id = ?',
              [tableId]
            );
          }
        }
      } else if (status && ['Cancelled', 'Rejected'].includes(status)) {
        const [orderData] = await connection.execute('SELECT table_id FROM orders WHERE id = ?', [id]);
        if (orderData.length > 0 && orderData[0].table_id) {
          await connection.execute(
            'UPDATE restaurant_tables SET status = "Available" WHERE id = ?',
            [orderData[0].table_id]
          );
        }
      }
    }

    if (tip_amount !== undefined) {
      // Check if payment record exists
      const [payments] = await connection.query('SELECT id FROM payments WHERE order_id = ?', [id]);
      if (payments.length > 0) {
        await connection.execute('UPDATE payments SET tip_amount = ? WHERE order_id = ?', [tip_amount, id]);
      } else {
        // Create a skeleton payment record if it doesn't exist but we're adding a tip
        await connection.execute(
          'INSERT INTO payments (order_id, payment_method, amount, tip_amount) VALUES (?, ?, ?, ?)',
          [id, 'Cash', total_amount || 0, tip_amount]
        );
      }
    }

    await connection.commit();
    res.json({ message: 'Order updated successfully', orderId: id });
  } catch (err) {
    await connection.rollback();
    console.error('Update Order Error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  } finally {
    connection.release();
  }
});

// @route   POST api/orders/:id/checkout
// @desc    Process payment and mark order as Paid
router.post('/:id/checkout', async (req, res) => {
  const { id } = req.params;
  const { payment_method, amount, tip_amount } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert payment record
    await connection.execute(
      'INSERT INTO payments (order_id, payment_method, amount, tip_amount) VALUES (?, ?, ?, ?)',
      [id, payment_method || 'Cash', amount, tip_amount || 0]
    );

    // 2. Update order status to Paid
    await connection.execute(
      'UPDATE orders SET status = "Paid" WHERE id = ?',
      [id]
    );

    // 2.5 Sibling sync: check if paying a child order and update parent order status
    await handleChildOrderStatusSync(connection, id);

    // 3. Release the table ONLY if this is NOT a child order (or if it is a child order and all siblings are paid)
    const [currOrder] = await connection.execute('SELECT parent_order_id, table_id FROM orders WHERE id = ?', [id]);
    if (currOrder.length > 0) {
      const parentId = currOrder[0].parent_order_id;
      const tableId = currOrder[0].table_id;
      
      let shouldReleaseTable = true;
      if (parentId) {
        // It's a child order. Let's see if there are still unpaid siblings
        const [unpaid] = await connection.execute(
          'SELECT COUNT(*) as count FROM orders WHERE parent_order_id = ? AND status != "Paid"',
          [parentId]
        );
        if (parseInt(unpaid[0].count) > 0) {
          shouldReleaseTable = false;
        }
      }
      
      if (shouldReleaseTable && tableId) {
        await connection.execute(
          'UPDATE restaurant_tables SET status = "Available" WHERE id = ?',
          [tableId]
        );
      }
    }

    await connection.commit();
    res.json({ message: 'Payment processed and order marked as Paid' });
  } catch (err) {
    await connection.rollback();
    console.error('Checkout Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// @route   PUT api/orders/:id
// @desc    Full update of an existing order (replaces items)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    items, 
    total, 
    table_id, 
    status, 
    order_type, 
    payment_method, 
    tip_amount, 
    discount_amount,
    user_id,
    customer_id,
    customer_name,
    customer_phone,
    customer_details
  } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 0. Handle customer auto-registration or loyalty update
    let finalCustomerId = customer_id;
    if (customer_details && (customer_details.phone || customer_details.email)) {
      finalCustomerId = await upsertCustomer({
        ...customer_details,
        origin: req.body.origin || 'Counter'
      });
    }

    // 1. Update order-level details
    await connection.execute(
      'UPDATE orders SET table_id = ?, user_id = ?, customer_id = ?, customer_name = ?, customer_phone = ?, order_type = ?, status = ?, total_amount = ?, discount_amount = ?, rejection_reason = ?, origin = ?, party_size = ? WHERE id = ?',
      [table_id || null, user_id || 1, finalCustomerId || null, customer_name || null, customer_phone || null, order_type || 'Dine-In', status || 'Pending', total, discount_amount || 0, req.body.rejection_reason || null, req.body.origin || 'Counter', req.body.party_size || 1, id]
    );

    // 1.5 Restore inventory for existing items before deleting them
    const [existingItems] = await connection.query('SELECT id, menu_item_id, quantity FROM order_items WHERE order_id = ?', [id]);
    for (const exItem of existingItems) {
      if (exItem.menu_item_id) {
        // Restore main item ingredients
        const [ingredients] = await connection.query(
          'SELECT inventory_item_id, quantity_required FROM menu_item_ingredients WHERE menu_item_id = ?',
          [exItem.menu_item_id]
        );
        for (const ing of ingredients) {
          const totalRequired = parseFloat(ing.quantity_required) * exItem.quantity;
          await connection.execute(
            'UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?',
            [totalRequired, ing.inventory_item_id]
          );
        }

        // Restore customization ingredients
        const [exCusts] = await connection.query('SELECT type, customization_name FROM order_item_customizations WHERE order_item_id = ?', [exItem.id]);
        for (const cust of exCusts) {
          if (cust.type === 'Variant') {
            const [vIng] = await connection.query(
              'SELECT inventory_item_id, quantity_required FROM menu_item_variants WHERE menu_item_id = ? AND name = ?',
              [exItem.menu_item_id, cust.customization_name]
            );
            if (vIng.length > 0 && vIng[0].inventory_item_id) {
              await connection.execute(
                'UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?',
                [parseFloat(vIng[0].quantity_required) * exItem.quantity, vIng[0].inventory_item_id]
              );
            }
          } else if (cust.type === 'Extra') {
            const [eIng] = await connection.query(
              'SELECT inventory_item_id, quantity_required FROM menu_item_extras WHERE menu_item_id = ? AND name = ?',
              [exItem.menu_item_id, cust.customization_name]
            );
            if (eIng.length > 0 && eIng[0].inventory_item_id) {
              await connection.execute(
                'UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?',
                [parseFloat(eIng[0].quantity_required) * exItem.quantity, eIng[0].inventory_item_id]
              );
            }
          }
        }
      }
    }

    // 2. Clear existing items (order_item_customizations will cascade delete)
    await connection.execute('DELETE FROM order_items WHERE order_id = ?', [id]);

    // 3. Re-insert items
    if (items && items.length > 0) {
      for (const item of items) {
        const menuItemId = (typeof item.id === 'string' && item.id.startsWith('s')) 
          ? null 
          : (parseInt(item.id) || null);

        const subtotal = item.subtotal || (parseFloat(item.price || 0) * (item.quantity || 1));

        const [orderItemResult] = await connection.execute(
          'INSERT INTO order_items (order_id, menu_item_id, name, description, quantity, unit_price, subtotal, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, menuItemId, item.name, item.description || '', item.quantity || 1, item.price || 0, subtotal, item.notes || '']
        );
        const orderItemId = orderItemResult.insertId;

        // Save Customizations & Deduct Inventory (Phase 3)
        if (item.variant) {
          await connection.execute(
            'INSERT INTO order_item_customizations (order_item_id, type, customization_name, price_adjustment) VALUES (?, "Variant", ?, ?)',
            [orderItemId, item.variant.name, item.variant.price_adjustment || 0]
          );

          // Deduct variant inventory if applicable
          if (menuItemId) {
            const [vIng] = await connection.query(
              'SELECT inventory_item_id, quantity_required FROM menu_item_variants WHERE menu_item_id = ? AND name = ?',
              [menuItemId, item.variant.name]
            );
            if (vIng.length > 0 && vIng[0].inventory_item_id) {
              await connection.execute(
                'UPDATE inventory_items SET quantity = quantity - ? WHERE id = ?',
                [parseFloat(vIng[0].quantity_required) * (item.quantity || 1), vIng[0].inventory_item_id]
              );
            }
          }
        }
        if (item.extras && item.extras.length > 0) {
          for (const extra of item.extras) {
            await connection.execute(
              'INSERT INTO order_item_customizations (order_item_id, type, customization_name, price_adjustment) VALUES (?, "Extra", ?, ?)',
              [orderItemId, extra.name, extra.price_adjustment || 0]
            );

            // Deduct extra inventory if applicable
            if (menuItemId) {
              const [eIng] = await connection.query(
                'SELECT inventory_item_id, quantity_required FROM menu_item_extras WHERE menu_item_id = ? AND name = ?',
                [menuItemId, extra.name]
              );
              if (eIng.length > 0 && eIng[0].inventory_item_id) {
                await connection.execute(
                  'UPDATE inventory_items SET quantity = quantity - ? WHERE id = ?',
                  [parseFloat(eIng[0].quantity_required) * (item.quantity || 1), eIng[0].inventory_item_id]
                );
              }
            }
          }
        }

        // Deduct Inventory based on Recipe (Phase 3)
        if (menuItemId) {
          const [ingredients] = await connection.query(
            'SELECT inventory_item_id, quantity_required FROM menu_item_ingredients WHERE menu_item_id = ?',
            [menuItemId]
          );
          for (const ing of ingredients) {
            const totalRequired = parseFloat(ing.quantity_required) * (item.quantity || 1);
            await connection.execute(
              'UPDATE inventory_items SET quantity = quantity - ? WHERE id = ?',
              [totalRequired, ing.inventory_item_id]
            );
          }
        }
      }
    }

    // 4. Update payment record if exists
    if (payment_method) {
      const [payments] = await connection.query('SELECT id FROM payments WHERE order_id = ?', [id]);
      if (payments.length > 0) {
        await connection.execute(
          'UPDATE payments SET payment_method = ?, amount = ?, tip_amount = ? WHERE order_id = ?',
          [payment_method, total, tip_amount || 0, id]
        );
      } else {
        await connection.execute(
          'INSERT INTO payments (order_id, payment_method, amount, tip_amount) VALUES (?, ?, ?, ?)',
          [id, payment_method, total, tip_amount || 0]
        );
      }
    }

    // 3.5 Sibling sync: check if paying a child order and update parent order status
    if (status === 'Paid') {
      await handleChildOrderStatusSync(connection, id);
      
      const [currOrder] = await connection.execute('SELECT parent_order_id, table_id FROM orders WHERE id = ?', [id]);
      if (currOrder.length > 0) {
        const parentId = currOrder[0].parent_order_id;
        const tableId = currOrder[0].table_id;
        
        let shouldReleaseTable = true;
        if (parentId) {
          // It's a child order. Let's see if there are still unpaid siblings
          const [unpaid] = await connection.execute(
            'SELECT COUNT(*) as count FROM orders WHERE parent_order_id = ? AND status != "Paid"',
            [parentId]
          );
          if (parseInt(unpaid[0].count) > 0) {
            shouldReleaseTable = false;
          }
        }
        
        if (shouldReleaseTable && tableId) {
          await connection.execute(
            'UPDATE restaurant_tables SET status = "Available" WHERE id = ?',
            [tableId]
          );
        }
      }
    }

    await connection.commit();
    res.json({ message: 'Order updated successfully', orderId: id });
  } catch (err) {
    await connection.rollback();
    console.error('Update Order Error:', err.message);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  } finally {
    connection.release();
  }
});

// @route   GET api/orders/:id
// @desc    Get order details by ID (including items)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [orders] = await db.query(
      `SELECT o.*, rt.table_number, 
              c.first_name as customer_first_name, 
              c.last_name as customer_last_name, 
              c.phone as customer_db_phone
       FROM orders o 
       LEFT JOIN restaurant_tables rt ON o.table_id = rt.id 
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.id = ?`,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Fetch items
    const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [id]);
    
    // Fetch customizations
    let customizations = [];
    const itemIds = items.map(it => it.id);
    if (itemIds.length > 0) {
      const [custRows] = await db.query('SELECT * FROM order_item_customizations WHERE order_item_id IN (?)', [itemIds]);
      customizations = custRows;
    }

    // Attach customizations to items
    const itemsWithCustomizations = items.map(item => {
      return {
        ...item,
        customizations: customizations.filter(c => c.order_item_id === item.id)
      };
    });

    res.json({
      ...order,
      items: itemsWithCustomizations
    });
  } catch (err) {
    console.error('Error fetching order details:', err);
    res.status(500).json({ error: err.message });
  }
});

// @route   GET api/orders/:id/pdf
// @desc    Generate and download PDF invoice
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const { filename } = req.query;
    const PDFDocument = require('pdfkit');
    const path = require('path');

    // Fetch order details
    const [orders] = await db.query(`
      SELECT o.*, rt.table_number 
      FROM orders o 
      LEFT JOIN restaurant_tables rt ON o.table_id = rt.id 
      WHERE o.id = ?
    `, [id]);

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orders[0];
    const [items] = await db.query(`
      SELECT oi.*, mi.name as item_name, mi.price as menu_price
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
    `, [id]);

    // Create PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    
    // Set response headers
    const { mode = 'attachment' } = req.query;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${mode}; filename=${filename || 'Invoice'}.pdf`);
    
    doc.pipe(res);

    // LOGOS
    const assetsDir = path.resolve(__dirname, '../../assets');
    const logo1 = path.join(assetsDir, 'images/menu_items/1778095107934-742298469.png');
    const logo2 = path.join(assetsDir, 'images/menu_items/1777653390798-9582574.png');

    try {
      doc.image(logo1, 40, 20, { width: 90 });
      doc.image(logo2, 460, 20, { width: 90 });
    } catch (err) {
      console.warn('Logo image failed to load:', err.message);
    }

    // HEADER INFO
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(14).text('ZAMZAM KITCHEN', 40, 165);
    doc.font('Helvetica').fontSize(9).fillColor('#666666');
    doc.text('329 Racecourse Rd, Kensington VIC 3031, Melbourne, Australia');
    doc.text('Tel: 0399392479 | Email: info@zamzamkitchen.com');

    // INVOICE TITLE & BADGES
    const headerRight = 350;
    doc.fillColor('#333333').font('Helvetica-Bold').fontSize(32).text('INVOICE', headerRight, 140, { align: 'right', width: 200 });
    
    // Status Badges
    const badgeY = 185;
    doc.roundedRect(420, badgeY, 70, 15, 3).fill('#eeeeee');
    doc.fillColor('#333333').fontSize(7).font('Helvetica-Bold').text('POS TERMINAL', 420, badgeY + 4, { width: 70, align: 'center' });
    
    doc.roundedRect(495, badgeY, 55, 15, 3).fill('#ff9800');
    doc.fillColor('#ffffff').text(order.status.toUpperCase(), 495, badgeY + 4, { width: 55, align: 'center' });

    doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold').text(`Order No: ${order.order_number}`, headerRight, 210, { align: 'right', width: 200 });
    doc.font('Helvetica').fontSize(9).text(`Date: ${new Date(order.order_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${new Date(order.order_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, headerRight, 225, { align: 'right', width: 200 });

    doc.moveDown(6);

    // BILL TO
    doc.font('Helvetica').fontSize(10).fillColor('#666666').text('BILL TO:');
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000').text(order.customer_name || 'Counter');
    doc.font('Helvetica').fontSize(10).text(`Order Type: ${order.order_type || 'Takeaway'}`);
    if (order.table_number) doc.text(`Table: ${order.table_number}`);

    doc.moveDown(2);

    // TABLE HEADER
    const tableTop = doc.y;
    const tableHeaderHeight = 25;
    doc.rect(40, tableTop, 515, tableHeaderHeight).fill('#1a237e'); // Dark Blue
    
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10);
    doc.text('DESCRIPTION', 40 + 10, tableTop + 8);
    doc.text('QTY', 360, tableTop + 8, { width: 40, align: 'center' });
    doc.text('UNIT PRICE', 400, tableTop + 8, { width: 70, align: 'center' });
    doc.text('SUBTOTAL', 475, tableTop + 8, { width: 80, align: 'center' });

    // ITEMS
    let currentY = tableTop + tableHeaderHeight;
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    
    items.forEach((item) => {
      const rowHeight = 25;
      
      // Zebra striping (optional but clean)
      // doc.rect(40, currentY, 515, rowHeight).fill('#f9f9f9');
      
      // Borders
      doc.rect(40, currentY, 515, rowHeight).strokeColor('#e0e0e0').stroke();
      doc.moveTo(360, currentY).lineTo(360, currentY + rowHeight).stroke();
      doc.moveTo(400, currentY).lineTo(400, currentY + rowHeight).stroke();
      doc.moveTo(475, currentY).lineTo(475, currentY + rowHeight).stroke();

      doc.fillColor('#000000');
      doc.text(item.item_name || item.name || 'Unknown Item', 40 + 10, currentY + 8);
      doc.text(item.quantity.toString(), 360, currentY + 8, { width: 40, align: 'center' });
      
      // Fix: Calculate unit price if missing from subtotal/quantity
      const price = item.unit_price || item.menu_price || (item.subtotal / item.quantity) || 0;
      doc.text(`AUD ${parseFloat(price).toFixed(2)}`, 400, currentY + 8, { width: 70, align: 'center' });
      doc.text(`AUD ${parseFloat(item.subtotal).toFixed(2)}`, 475, currentY + 8, { width: 80, align: 'center' });
      
      currentY += rowHeight;
    });

    // TOTALS
    const totalsY = currentY + 20;
    doc.font('Helvetica').fontSize(12).text('Subtotal:', 300, totalsY, { width: 150, align: 'right' });
    doc.font('Helvetica-Bold').text(`AUD ${parseFloat(order.total_amount).toFixed(2)}`, 450, totalsY, { width: 105, align: 'right' });

    doc.moveTo(300, totalsY + 20).lineTo(555, totalsY + 20).strokeColor('#e0e0e0').stroke();

    doc.moveDown(1.5);
    const grandTotalY = doc.y;
    // Shifted "GRAND TOTAL:" left by setting x to 280
    doc.fontSize(18).fillColor('#1a237e').font('Helvetica-Bold').text('GRAND TOTAL:', 280, grandTotalY, { width: 170, align: 'right' });
    doc.text(`AUD ${parseFloat(order.total_amount).toFixed(2)}`, 450, grandTotalY, { width: 105, align: 'right' });

    // Footer
    doc.fontSize(8).fillColor('#999999').text('ZAMZAM KITCHEN - PROUDLY SERVING FRESH MANDI', 40, 780, { align: 'center', width: 515 });
    
    doc.end();

  } catch (err) {
    console.error('PDF Generation Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
});

// Reusable PDF generator helper
const drawOrderPDF = (doc, order, items) => {
  const path = require('path');
  const assetsDir = path.resolve(__dirname, '../../assets');
  const logo1 = path.join(assetsDir, 'images/menu_items/1778095107934-742298469.png');
  const logo2 = path.join(assetsDir, 'images/menu_items/1777653390798-9582574.png');

  try {
    doc.image(logo1, 40, 20, { width: 90 });
    doc.image(logo2, 460, 20, { width: 90 });
  } catch (err) {
    console.warn('Logo image failed to load:', err.message);
  }

  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(14).text('ZAMZAM KITCHEN', 40, 165);
  doc.font('Helvetica').fontSize(9).fillColor('#666666');
  doc.text('329 Racecourse Rd, Kensington VIC 3031, Melbourne, Australia');
  doc.text('Tel: 0399392479 | Email: info@zamzamkitchen.com');

  const headerRight = 350;
  doc.fillColor('#333333').font('Helvetica-Bold').fontSize(32).text('INVOICE', headerRight, 140, { align: 'right', width: 200 });
  
  const badgeY = 185;
  doc.roundedRect(420, badgeY, 70, 15, 3).fill('#eeeeee');
  doc.fillColor('#333333').fontSize(7).font('Helvetica-Bold').text('POS TERMINAL', 420, badgeY + 4, { width: 70, align: 'center' });
  
  doc.roundedRect(495, badgeY, 55, 15, 3).fill('#ff9800');
  doc.fillColor('#ffffff').text(order.status.toUpperCase(), 495, badgeY + 4, { width: 55, align: 'center' });

  doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold').text(`Order No: ${order.order_number}`, headerRight, 210, { align: 'right', width: 200 });
  doc.font('Helvetica').fontSize(9).text(`Date: ${new Date(order.order_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${new Date(order.order_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, headerRight, 225, { align: 'right', width: 200 });

  doc.moveDown(6);

  doc.font('Helvetica').fontSize(10).fillColor('#666666').text('BILL TO:');
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000').text(order.customer_name || 'Counter');
  doc.font('Helvetica').fontSize(10).text(`Order Type: ${order.order_type || 'Takeaway'}`);
  if (order.table_number) doc.text(`Table: ${order.table_number}`);

  doc.moveDown(2);

  const tableTop = doc.y;
  const tableHeaderHeight = 25;
  doc.rect(40, tableTop, 515, tableHeaderHeight).fill('#1a237e');
  
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10);
  doc.text('DESCRIPTION', 40 + 10, tableTop + 8);
  doc.text('QTY', 360, tableTop + 8, { width: 40, align: 'center' });
  doc.text('UNIT PRICE', 400, tableTop + 8, { width: 70, align: 'center' });
  doc.text('SUBTOTAL', 475, tableTop + 8, { width: 80, align: 'center' });

  let currentY = tableTop + tableHeaderHeight;
  doc.font('Helvetica').fontSize(10).fillColor('#000000');
  
  items.forEach((item) => {
    const rowHeight = 25;
    doc.rect(40, currentY, 515, rowHeight).strokeColor('#e0e0e0').stroke();
    doc.moveTo(360, currentY).lineTo(360, currentY + rowHeight).stroke();
    doc.moveTo(400, currentY).lineTo(400, currentY + rowHeight).stroke();
    doc.moveTo(475, currentY).lineTo(475, currentY + rowHeight).stroke();

    doc.fillColor('#000000');
    doc.text(item.item_name || item.name || 'Unknown Item', 40 + 10, currentY + 8);
    doc.text(item.quantity.toString(), 360, currentY + 8, { width: 40, align: 'center' });
    
    const price = item.unit_price || item.menu_price || (item.subtotal / item.quantity) || 0;
    doc.text(`AUD ${parseFloat(price).toFixed(2)}`, 400, currentY + 8, { width: 70, align: 'center' });
    doc.text(`AUD ${parseFloat(item.subtotal).toFixed(2)}`, 475, currentY + 8, { width: 80, align: 'center' });
    
    currentY += rowHeight;
  });

  const totalsY = currentY + 20;
  doc.font('Helvetica').fontSize(12).text('Subtotal:', 300, totalsY, { width: 150, align: 'right' });
  doc.font('Helvetica-Bold').text(`AUD ${parseFloat(order.total_amount).toFixed(2)}`, 450, totalsY, { width: 105, align: 'right' });

  doc.moveTo(300, totalsY + 20).lineTo(555, totalsY + 20).strokeColor('#e0e0e0').stroke();

  doc.moveDown(1.5);
  const grandTotalY = doc.y;
  doc.fontSize(18).fillColor('#1a237e').font('Helvetica-Bold').text('GRAND TOTAL:', 280, grandTotalY, { width: 170, align: 'right' });
  doc.text(`AUD ${parseFloat(order.total_amount).toFixed(2)}`, 450, grandTotalY, { width: 105, align: 'right' });

  doc.fontSize(8).fillColor('#999999').text('ZAMZAM KITCHEN - PROUDLY SERVING FRESH MANDI', 40, 780, { align: 'center', width: 515 });
};

// Generate in-memory PDF Buffer helper
const generateOrderPDFBuffer = (order, items) => {
  const PDFDocument = require('pdfkit');
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));
      drawOrderPDF(doc, order, items);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// @route   POST api/orders/:id/share
// @desc    Share receipt or invoice via Email, SMS, or WhatsApp
router.post('/:id/share', async (req, res) => {
  const { id } = req.params;
  const { type, recipient } = req.body; // type: 'email' | 'sms' | 'whatsapp'
  try {
    const [orders] = await db.query(`
      SELECT o.*, rt.table_number 
      FROM orders o 
      LEFT JOIN restaurant_tables rt ON o.table_id = rt.id 
      WHERE o.id = ?
    `, [id]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];
    
    const [items] = await db.query(`
      SELECT oi.*, mi.name as item_name
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
    `, [id]);
    
    const itemsSummary = items.map(i => `- ${i.item_name || i.name || 'Unknown Item'} x${i.quantity} (AUD ${parseFloat(i.subtotal).toFixed(2)})`).join('\n');
    const emailBody = `Dear Valued Customer,

Thank you for dining with us at Zamzam Kitchen! 

Here is the digital invoice summary for Order #${order.order_number || order.id}:

Order Type: ${order.order_type || 'Takeaway'}
Date: ${new Date(order.order_time).toLocaleString()}
${order.table_number ? `Table Number: ${order.table_number}\n` : ''}
Items:
${itemsSummary}

----------------------------------------
Total Amount: AUD ${parseFloat(order.total_amount).toFixed(2)}
----------------------------------------

Your high-resolution PDF tax invoice has been generated and attached to this email.

Warm regards,
Zamzam Kitchen Management Team
329 Racecourse Rd, Kensington VIC 3031`;

    const smsBody = `Zamzam Kitchen Order #${order.order_number || order.id} Summary:
Total: AUD ${parseFloat(order.total_amount).toFixed(2)}
Type: ${order.order_type || 'Takeaway'}
Thank you for dining with us!`;

    const notificationService = require('../services/notificationService');

    if (type === 'email') {
      const subject = `Zamzam Kitchen - Order #${order.order_number || order.id} Invoice`;
      const pdfBuffer = await generateOrderPDFBuffer(order, items);
      
      const attachments = [
        {
          filename: `Zamzam_Kitchen_Invoice_${order.order_number || order.id}.pdf`,
          content: pdfBuffer
        }
      ];

      const success = await notificationService.sendEmail(recipient, subject, emailBody, attachments);
      if (success) {
        return res.json({ success: true, message: 'Invoice shared via email successfully!' });
      } else {
        return res.status(500).json({ error: 'Failed to send email. Verify SMTP email settings in database/admin panel.' });
      }
    } else if (type === 'sms' || type === 'whatsapp') {
      const success = await notificationService.sendSMS(recipient, smsBody);
      if (success) {
        return res.json({ success: true, message: `Receipt shared via ${type.toUpperCase()} successfully!` });
      } else {
        return res.status(500).json({ error: `Failed to send ${type.toUpperCase()}. Verify Twilio configurations in settings.` });
      }
    } else {
      return res.status(400).json({ error: 'Invalid share channel type' });
    }
  } catch (err) {
    console.error('Share Endpoint Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// @route   GET api/orders/:id/print
// @desc    Simulate or trigger receipt printing
router.get('/:id/print', async (req, res) => {
  const { id } = req.params;
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    console.log(`🖨️ [PRINTER] Printing receipt for Order ID: ${id}, Number: ${orders[0].order_number}`);
    res.json({ success: true, message: 'Receipt sent to printer' });
  } catch (err) {
    console.error('Print Endpoint Error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:orderId/items/:itemId', async (req, res) => {
  const { orderId, itemId } = req.params;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Verify the order exists and is Pending
    const [orders] = await connection.query('SELECT status, total_amount FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }
    const validModificationStatuses = ['Ordered', 'Pending', 'Paid', 'Partially Paid'];
    if (!validModificationStatuses.includes(orders[0].status)) {
      await connection.rollback();
      return res.status(400).json({ error: 'Only pending or newly ordered items can be modified' });
    }

    // 2. Find the item
    const [items] = await connection.query('SELECT subtotal FROM order_items WHERE id = ? AND order_id = ?', [itemId, orderId]);
    if (items.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Item not found in this order' });
    }

    const itemSubtotal = parseFloat(items[0].subtotal);

    // 3. Delete the item
    await connection.execute('DELETE FROM order_items WHERE id = ?', [itemId]);

    // 4. Recalculate or mark as cancelled if empty
    const [remainingItems] = await connection.query('SELECT COUNT(*) as count FROM order_items WHERE order_id = ?', [orderId]);
    
    if (remainingItems[0].count === 0) {
      // Cancel the order
      await connection.execute('UPDATE orders SET status = "Cancelled", total_amount = 0 WHERE id = ?', [orderId]);
    } else {
      // Reduce the total amount
      await connection.execute('UPDATE orders SET total_amount = total_amount - ? WHERE id = ?', [itemSubtotal, orderId]);
    }

    // 5. Update payment record if exists
    await connection.execute('UPDATE payments SET amount = amount - ? WHERE order_id = ? AND amount >= ?', [itemSubtotal, orderId, itemSubtotal]);

    await connection.commit();
    res.json({ message: 'Item removed successfully' });
  } catch (err) {
    await connection.rollback();
    console.error('Delete Item Error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  } finally {
    connection.release();
  }
});

router.get('/data-range', async (req, res) => {
  try {
    const [[{ minDate, maxDate }]] = await db.query('SELECT MIN(order_time) as minDate, MAX(order_time) as maxDate FROM orders WHERE status NOT IN ("Cancelled", "Rejected")');
    const [rows] = await db.query('SELECT DISTINCT DATE(order_time) as date FROM orders WHERE status NOT IN ("Cancelled", "Rejected")');
    res.json({ 
      minDate: minDate || new Date(), 
      maxDate: maxDate || new Date(),
      availableDates: rows.map(r => r.date)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch data range' });
  }
});

// @route   DELETE api/orders/:id
// @desc    Delete an entire order record
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Delete related items and payments are handled by ON DELETE CASCADE in DB
    const [result] = await db.execute('DELETE FROM orders WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (err) {
    console.error('Delete Order Error:', err);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
});


// @route   POST api/orders/merge
// @desc    Merge source order into target order
router.post('/merge', async (req, res) => {
  const { sourceOrderId, targetOrderId } = req.body;
  if (!sourceOrderId || !targetOrderId) {
    return res.status(400).json({ error: 'Both sourceOrderId and targetOrderId are required' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Move all items from source to target
    await connection.execute(
      'UPDATE order_items SET order_id = ? WHERE order_id = ?',
      [targetOrderId, sourceOrderId]
    );

    // 2. Recalculate target order total
    const [itemTotals] = await connection.execute(
      'SELECT SUM(subtotal) as new_total FROM order_items WHERE order_id = ?',
      [targetOrderId]
    );
    const newTotal = itemTotals[0].new_total || 0;

    // 3. Update target order total
    await connection.execute(
      'UPDATE orders SET total_amount = ? WHERE id = ?',
      [newTotal, targetOrderId]
    );

    // 4. Mark source order as Merged and release table
    const [sourceData] = await connection.execute('SELECT table_id FROM orders WHERE id = ?', [sourceOrderId]);
    
    await connection.execute(
      'UPDATE orders SET status = "Merged", total_amount = 0 WHERE id = ?',
      [sourceOrderId]
    );

    if (sourceData.length > 0 && sourceData[0].table_id) {
      // Only release if no other active orders are on this table (simple logic for now)
      await connection.execute(
        'UPDATE restaurant_tables SET status = "Available" WHERE id = ?',
        [sourceData[0].table_id]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Orders merged successfully', newTotal });
  } catch (err) {
    await connection.rollback();
    console.error('Merge Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// @route   POST api/orders/split
// @desc    Split selected items from source order into a new order (non-destructively)
router.post('/split', async (req, res) => {
  const { sourceOrderId, itemsToMove } = req.body; // itemsToMove: [{id: order_item_id, quantity: n}]
  if (!sourceOrderId || !itemsToMove || itemsToMove.length === 0) {
    return res.status(400).json({ error: 'Source order and items to move are required' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get source order metadata
    const [sourceOrders] = await connection.execute('SELECT * FROM orders WHERE id = ?', [sourceOrderId]);
    if (sourceOrders.length === 0) throw new Error('Source order not found');
    const sourceOrder = sourceOrders[0];

    // 2. Fetch all items in the source order
    const [items] = await connection.execute('SELECT * FROM order_items WHERE order_id = ?', [sourceOrderId]);
    
    // 3. Fetch customizations for those items
    let customizations = [];
    const itemIds = items.map(it => it.id);
    if (itemIds.length > 0) {
      const [custRows] = await connection.query('SELECT * FROM order_item_customizations WHERE order_item_id IN (?)', [itemIds]);
      customizations = custRows;
    }

    // 4. Distribute items into Child 1 (Remaining) and Child 2 (Moved)
    const child1Items = [];
    const child2Items = [];

    for (const item of items) {
      const move = itemsToMove.find(m => parseInt(m.id) === parseInt(item.id));
      if (move) {
        const movedQty = Math.min(item.quantity, move.quantity);
        const remainQty = item.quantity - movedQty;

        if (movedQty > 0) {
          child2Items.push({
            ...item,
            quantity: movedQty,
            subtotal: parseFloat(item.unit_price) * movedQty,
            originalItemId: item.id
          });
        }
        if (remainQty > 0) {
          child1Items.push({
            ...item,
            quantity: remainQty,
            subtotal: parseFloat(item.unit_price) * remainQty,
            originalItemId: item.id
          });
        }
      } else {
        child1Items.push({
          ...item,
          originalItemId: item.id
        });
      }
    }

    const child1Total = child1Items.reduce((sum, it) => sum + parseFloat(it.subtotal), 0);
    const child2Total = child2Items.reduce((sum, it) => sum + parseFloat(it.subtotal), 0);

    // 5. Create Child Order 1 (Remaining Items)
    const child1OrderNumber = `${sourceOrder.order_number}-S1`;
    const [child1Result] = await connection.execute(
      'INSERT INTO orders (order_number, branch_id, table_id, waiter_id, waiter_name, customer_id, customer_name, customer_phone, user_id, order_type, status, total_amount, origin, parent_order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        child1OrderNumber,
        sourceOrder.branch_id || null,
        sourceOrder.table_id || null,
        sourceOrder.waiter_id || null,
        sourceOrder.waiter_name || null,
        sourceOrder.customer_id || null,
        sourceOrder.customer_name || 'Walk-in Guest',
        sourceOrder.customer_phone || null,
        sourceOrder.user_id || null,
        sourceOrder.order_type || 'Dine-In',
        'Ordered',
        child1Total,
        sourceOrder.origin || 'In-Store',
        sourceOrderId
      ]
    );
    const child1Id = child1Result.insertId;

    // 6. Create Child Order 2 (Moved Items)
    const child2OrderNumber = `${sourceOrder.order_number}-S2`;
    const [child2Result] = await connection.execute(
      'INSERT INTO orders (order_number, branch_id, table_id, waiter_id, waiter_name, customer_id, customer_name, customer_phone, user_id, order_type, status, total_amount, origin, parent_order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        child2OrderNumber,
        sourceOrder.branch_id || null,
        sourceOrder.table_id || null,
        sourceOrder.waiter_id || null,
        sourceOrder.waiter_name || null,
        sourceOrder.customer_id || null,
        sourceOrder.customer_name || 'Walk-in Guest',
        sourceOrder.customer_phone || null,
        sourceOrder.user_id || null,
        sourceOrder.order_type || 'Dine-In',
        'Ordered',
        child2Total,
        sourceOrder.origin || 'In-Store',
        sourceOrderId
      ]
    );
    const child2Id = child2Result.insertId;

    // Helper to insert child order items and clone customizations
    const insertChildItems = async (childId, childItems) => {
      for (const item of childItems) {
        const [newItemResult] = await connection.execute(
          'INSERT INTO order_items (order_id, menu_item_id, name, description, quantity, unit_price, subtotal, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            childId,
            item.menu_item_id || null,
            item.name,
            item.description || '',
            item.quantity,
            item.unit_price,
            item.subtotal,
            item.notes || ''
          ]
        );
        const newItemId = newItemResult.insertId;

        const itemCusts = customizations.filter(c => c.order_item_id === item.originalItemId);
        for (const cust of itemCusts) {
          await connection.execute(
            'INSERT INTO order_item_customizations (order_item_id, type, customization_name, price_adjustment) VALUES (?, ?, ?, ?)',
            [newItemId, cust.type, cust.customization_name, cust.price_adjustment]
          );
        }
      }
    };

    await insertChildItems(child1Id, child1Items);
    await insertChildItems(child2Id, child2Items);

    // 7. Set Parent Order to Partially Paid (leaving items and total_amount intact)
    await connection.execute(
      'UPDATE orders SET status = "Partially Paid" WHERE id = ?',
      [sourceOrderId]
    );

    await connection.commit();
    res.json({
      success: true,
      message: 'Order split successfully non-destructively',
      newOrderId: child2Id,
      newOrderNumber: child2OrderNumber,
      remainingOrderId: child1Id,
      remainingOrderNumber: child1OrderNumber
    });
  } catch (err) {
    await connection.rollback();
    console.error('Split Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// @route   POST api/orders/split-equal
// @desc    Split order into N equal financial parts (non-destructively)
router.post('/split-equal', async (req, res) => {
  const { sourceOrderId, splitCount } = req.body;
  if (!sourceOrderId || !splitCount || splitCount < 2) {
    return res.status(400).json({ error: 'Valid source order and split count (min 2) required' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [sourceOrders] = await connection.execute('SELECT * FROM orders WHERE id = ?', [sourceOrderId]);
    if (sourceOrders.length === 0) throw new Error('Source order not found');
    const sourceOrder = sourceOrders[0];

    const totalAmount = parseFloat(sourceOrder.total_amount);
    const splitAmount = parseFloat((totalAmount / splitCount).toFixed(2));
    const lastSplitAmount = parseFloat((totalAmount - (splitAmount * (splitCount - 1))).toFixed(2));

    const newOrderIds = [];

    // Set parent order to Partially Paid (leaving items and total_amount intact)
    await connection.execute(
      'UPDATE orders SET status = "Partially Paid" WHERE id = ?',
      [sourceOrderId]
    );

    // Create N brand new child orders
    for (let i = 1; i <= splitCount; i++) {
      const currentAmount = (i === splitCount) ? lastSplitAmount : splitAmount;
      const childOrderNumber = `${sourceOrder.order_number}-S${i}`;

      const [newOrderResult] = await connection.execute(
        'INSERT INTO orders (order_number, branch_id, table_id, waiter_id, waiter_name, customer_id, customer_name, customer_phone, user_id, order_type, status, total_amount, origin, parent_order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          childOrderNumber,
          sourceOrder.branch_id || null,
          sourceOrder.table_id || null,
          sourceOrder.waiter_id || null,
          sourceOrder.waiter_name || null,
          sourceOrder.customer_id || null,
          sourceOrder.customer_name || 'Walk-in Guest',
          sourceOrder.customer_phone || null,
          sourceOrder.user_id || null,
          sourceOrder.order_type || 'Dine-In',
          'Ordered',
          currentAmount,
          sourceOrder.origin || 'In-Store',
          sourceOrderId
        ]
      );
      const newOrderId = newOrderResult.insertId;
      newOrderIds.push(newOrderId);

      // Virtual split share item
      await connection.execute(
        'INSERT INTO order_items (order_id, name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [newOrderId, `Split Share ${i} of ${splitCount} (Order #${sourceOrder.order_number})`, 1, currentAmount, currentAmount]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Order split equally non-destructively', newOrderIds });
  } catch (err) {
    console.error('ERROR IN SPLIT-EQUAL:', err);
    if (connection) await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
