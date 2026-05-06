const express = require('express');
const router = express.Router();
const db = require('../db');
const { upsertCustomer } = require('./customers');

// @route   POST api/orders
// @desc    Create a new order with items and optional payment info
router.post('/', async (req, res) => {
    const { 
      items, 
      total, 
      table_id, 
      status, 
      order_type, 
      payment_method, 
      tip_amount, 
      discount_amount,
      customer_id,
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
          origin: origin || 'In-Store'
        });
      }
  
  
      // 0. Generate Order Number (Daily Format: DDMMYYXXXXX)
      // Using local time +05:00 for the prefix
      const now = new Date();
      const localNow = new Date(now.getTime() + (5 * 60 * 60 * 1000));
      
      const day = String(localNow.getUTCDate()).padStart(2, '0');
      const month = String(localNow.getUTCMonth() + 1).padStart(2, '0');
      const year = String(localNow.getUTCFullYear()).slice(-2);
      const prefix = `${day}${month}${year}`;
      
      const [lastOrder] = await connection.execute(
        'SELECT order_number FROM orders WHERE order_number LIKE ? AND LENGTH(order_number) = 11 ORDER BY id DESC LIMIT 1',
        [`${prefix}%`]
      );

      let nextSequence = 1;
      if (lastOrder.length > 0 && lastOrder[0].order_number) {
        const lastOrderNum = lastOrder[0].order_number;
        // The last 5 digits are the sequence
        const sequencePart = lastOrderNum.slice(-5);
        if (!isNaN(parseInt(sequencePart))) {
          nextSequence = parseInt(sequencePart) + 1;
        }
      }
      const orderNumber = `${prefix}${String(nextSequence).padStart(5, '0')}`;

      // Normalize order_type for database ENUM compatibility
      const normalizedOrderType = (order_type === 'Pickup' || order_type === 'pickup') ? 'Takeaway' : (order_type || 'Dine-In');

      const orderStatus = status || (payment_method ? 'Paid' : 'Pending');
      const [orderResult] = await connection.execute(
        'INSERT INTO orders (order_number, branch_id, table_id, customer_id, user_id, order_type, status, total_amount, discount_amount, origin, party_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [orderNumber, branch_id || 1, table_id || null, finalCustomerId || null, user_id || 1, normalizedOrderType, orderStatus, total, discount_amount || 0, origin || 'In-Store', req.body.party_size || 1]
      );
    const orderId = orderResult.insertId;

    // 2. Insert items
    if (items && items.length > 0) {
      for (const item of items) {
        // Sanitize menu_item_id: if it's not a number (e.g. starts with 's'), treat as NULL
        const menuItemId = (typeof item.id === 'string' && item.id.startsWith('s')) 
          ? null 
          : (parseInt(item.id) || null);

        const subtotal = item.subtotal || (parseFloat(item.price || 0) * (item.quantity || 1));

        const [orderItemResult] = await connection.execute(
          'INSERT INTO order_items (order_id, menu_item_id, quantity, subtotal, notes) VALUES (?, ?, ?, ?, ?)',
          [orderId, menuItemId, item.quantity || 1, subtotal, item.notes || '']
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
      await connection.execute(
        'INSERT INTO payments (order_id, payment_method, amount, tip_amount) VALUES (?, ?, ?, ?)',
        [orderId, payment_method, total, tip_amount || 0]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'Order processed', orderId, orderNumber });
  } catch (err) {
    await connection.rollback();
    console.error('API Error:', err.message);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  } finally {
    connection.release();
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
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM orders WHERE ${dateFilter} AND status != "Cancelled" AND status != "Rejected"`
    );

    // Lifetime Sales & Orders
    const [lifetimeStats] = await db.query(
      'SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != "Cancelled" AND status != "Rejected"'
    );

    // Today's Tips (from payments table)
    const [todayTips] = await db.query(`
      SELECT COALESCE(SUM(p.tip_amount), 0) as tips
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE ${oDateFilter}
    `);

    // Today's Discounts (from orders table)
    const [todayDiscounts] = await db.query(`
      SELECT COALESCE(SUM(discount_amount), 0) as discounts
      FROM orders
      WHERE ${dateFilter} AND status != "Cancelled" AND status != "Rejected"
    `);

    // Live Operational Status (All time active orders)
    const [livePending] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status = "Pending"');
    const [liveActive] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status IN ("Ordered", "Preparing", "Ready")');
    const [liveUnpaid] = await db.query('SELECT COUNT(*) as count FROM orders WHERE status IN ("Ready", "Served")');

    // Breakdown by Order Type (Filtering invalid orders)
    const [typeStats] = await db.query(
      `SELECT order_type, COUNT(*) as count FROM orders WHERE ${dateFilter} AND status NOT IN ("Cancelled", "Rejected") GROUP BY order_type`
    );

    // Breakdown by Payment Method (Joined with valid orders)
    const [payStats] = await db.query(`
      SELECT p.payment_method, COUNT(*) as count, COALESCE(SUM(p.amount), 0) as total 
      FROM payments p JOIN orders o ON p.order_id = o.id 
      WHERE ${oDateFilter} AND o.status NOT IN ("Cancelled", "Rejected")
      GROUP BY p.payment_method
    `);

    // Top Selling Items (Filtering invalid orders)
    const [topItems] = await db.query(`
      SELECT mi.name, SUM(oi.quantity) as sold 
      FROM order_items oi 
      JOIN menu_items mi ON oi.menu_item_id = mi.id 
      JOIN orders o ON oi.order_id = o.id
      WHERE o.order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      AND o.status NOT IN ("Cancelled", "Rejected")
      GROUP BY mi.id ORDER BY sold DESC LIMIT 7
    `);

    // Monthly Trends (Filtering invalid orders)
    const [monthlyTrends] = await db.query(`
      SELECT DATE_FORMAT(order_time, '%b') as month, COALESCE(SUM(total_amount), 0) as total, COUNT(*) as orders
      FROM orders 
      WHERE order_time >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      AND status NOT IN ("Cancelled", "Rejected")
      GROUP BY month ORDER BY MIN(order_time)
    `);

    // Average Preparation Time (from Ordered to Ready/Served)
    const [prepStats] = await db.query(`
      SELECT AVG(TIMESTAMPDIFF(MINUTE, order_time, updated_at)) as avg_prep 
      FROM orders 
      WHERE status IN ("Ready", "Served", "Completed", "Paid")
      AND ${dateFilter}
    `);

    // Customization Popularity
    const [customStats] = await db.query(`
      SELECT customization_name as name, type, COUNT(*) as count 
      FROM order_item_customizations 
      GROUP BY name, type ORDER BY count DESC LIMIT 10
    `);

    const todayObj = todayStats[0] || { count: 0, total: 0 };
    todayObj.tips = parseFloat(todayTips[0]?.tips ?? 0);
    todayObj.discounts = parseFloat(todayDiscounts[0]?.discounts ?? 0);
    todayObj.avgPrepTime = parseFloat(prepStats[0]?.avg_prep ?? 0).toFixed(1);

    res.json({
      today: todayObj,
      lifetime: lifetimeStats[0] || { count: 0, total: 0 },
      live: {
        pending: livePending[0]?.count ?? 0,
        active: liveActive[0]?.count ?? 0,
        unpaid: liveUnpaid[0]?.count ?? 0
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
    const { startDate, endDate, type, status } = req.query;
    let query = `
      SELECT o.*, rt.table_number 
      FROM orders o 
      LEFT JOIN restaurant_tables rt ON o.table_id = rt.id 
      WHERE 1=1
    `;
    const params = [];

    if (startDate && req.query.kds !== 'true') {
      query += ` AND DATE(CONVERT_TZ(o.order_time, '+00:00', '+05:00')) >= ?`;
      params.push(startDate);
    } else if (!startDate && req.query.kds !== 'true') {
      // Default to current month only if NOT in KDS mode
      const now = new Date();
      const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      query += ` AND DATE(CONVERT_TZ(o.order_time, '+00:00', '+05:00')) >= ?`;
      params.push(firstDayOfMonth);
    }

    if (req.query.kds === 'true') {
      // In KDS mode, we want ALL active orders regardless of date, 
      // OR any orders from the specific date (if selected) or today.
      const targetDate = startDate || 'CURDATE()';
      if (startDate) {
        query += ` AND (o.status IN ('Pending', 'Ordered', 'Preparing', 'Ready', 'Paid', 'Partially Paid') OR DATE(CONVERT_TZ(o.order_time, '+00:00', '+05:00')) = ?)`;
        params.push(startDate);
      } else {
        query += ` AND (o.status IN ('Pending', 'Ordered', 'Preparing', 'Ready', 'Paid', 'Partially Paid') OR DATE(CONVERT_TZ(o.order_time, '+00:00', '+05:00')) = CURDATE())`;
      }
    } else {
      if (endDate) {
        query += ` AND DATE(CONVERT_TZ(o.order_time, '+00:00', '+05:00')) <= ?`;
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
                COALESCE(mi.name, 'Unknown Item') as name, oi.menu_item_id,
                COALESCE(mi.price, 0) as unit_price, mi.image
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
      return { ...order, items: itemsWithCust, payment: payment[0] || null };
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
  const { status, tip_amount, discount_amount, total_amount, rejection_reason } = req.body;

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
        origin: req.body.origin || 'In-Store'
      });
    }

    // 1. Update order-level details
    await connection.execute(
      'UPDATE orders SET table_id = ?, user_id = ?, customer_id = ?, order_type = ?, status = ?, total_amount = ?, discount_amount = ?, rejection_reason = ?, origin = ?, party_size = ? WHERE id = ?',
      [table_id || null, user_id || 1, finalCustomerId || null, order_type || 'Dine-In', status || 'Pending', total, discount_amount || 0, req.body.rejection_reason || null, req.body.origin || 'In-Store', req.body.party_size || 1, id]
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
          'INSERT INTO order_items (order_id, menu_item_id, quantity, subtotal, notes) VALUES (?, ?, ?, ?, ?)',
          [id, menuItemId, item.quantity || 1, subtotal, item.notes || '']
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
    if (orders[0].status !== 'Pending') {
      await connection.rollback();
      return res.status(400).json({ error: 'Only pending orders can be modified' });
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

module.exports = router;
