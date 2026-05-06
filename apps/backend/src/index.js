const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const app = express();
const PORT = process.env.PORT || 5000;
const pool = require('./db');

// Diagnostics
const fs = require('fs');
const envPath = path.resolve(__dirname, '../.env');
console.log('🔍 Checking .env file at:', envPath);
if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');
} else {
  console.warn('⚠️ .env file NOT found! Using default environment variables.');
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const assetsPath = path.join(__dirname, '../assets');
const webPath = path.join(__dirname, '../public');

console.log('📂 Serving static assets from:', assetsPath);
console.log('🌐 Serving web files from:', webPath);
if (!fs.existsSync(webPath)) {
  console.error('❌ CRITICAL: Public folder not found!');
}

app.use('/assets', express.static(assetsPath));
app.use(express.static(webPath));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Zamzam Kitchen API is running', timestamp: new Date() });
});

// Route Imports
const reservationRoutes = require('./routes/reservations');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const tableRoutes = require('./routes/tables');
const uploadRoutes = require('./routes/upload');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const permissionRoutes = require('./routes/permissions');
const hrRoutes = require('./routes/hr');
const messageRoutes = require('./routes/messages');
const settingRoutes = require('./routes/settings');
const paymentGatewayRoutes = require('./routes/payment_gateways');
const messagingSettingsRoutes = require('./routes/messaging_settings');
const emailSettingsRoutes = require('./routes/email_settings');
const inventoryRoutes = require('./routes/inventory');
const purchasesRoutes = require('./routes/purchases');
const reportsRoutes = require('./routes/reports'); 
const expensesRoutes = require('./routes/expenses');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const promotionRoutes = require('./routes/promotions');

app.use('/api/reservations', reservationRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/payment-gateways', paymentGatewayRoutes);
app.use('/api/messaging-settings', messagingSettingsRoutes);
app.use('/api/email-settings', emailSettingsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/promotions', promotionRoutes);

// Handle POS Terminal routing (Sub-folder /pos)
app.get(/^\/pos/, (req, res, next) => {
  // If it's an API or Assets route, let it pass through to the 404 handler if not found
  if (req.path.startsWith('/api') || req.path.startsWith('/assets')) {
    return next();
  }
  
  // Serve the POS index.html for any path starting with /pos
  const indexPath = path.join(webPath, 'pos/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error sending POS index.html:', err);
      next();
    }
  });
});

// Handle Main Website routing (Root /)
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/assets')) {
    return next();
  }
  
  // Serve the main website index.html
  const indexPath = path.join(webPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error sending Website index.html:', err);
      next();
    }
  });
});

// 404 Logger for debugging missing assets
app.use((req, res, next) => {
  if (req.url.startsWith('/assets')) {
    console.warn(`❌ 404 Not Found (Asset): ${req.url}`);
  } else {
    console.log(`❓ 404 Not Found (API/Route): ${req.method} ${req.url}`);
  }
  res.status(404).json({ success: false, message: `Route ${req.url} not found` });
});

// Final error handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// Automatic Schema Correction
async function ensureSchema() {
  try {
    const db = require('./db');
    console.log('🛠️ Checking database schema for missing columns...');
    
    // Check if tables exist
    const [tablesList] = await db.query('SHOW TABLES');
    const existingTables = tablesList.map(t => Object.values(t)[0]);

    if (!existingTables.includes('order_item_customizations')) {
      console.log('➕ Creating missing table: order_item_customizations...');
      await db.query(`
        CREATE TABLE order_item_customizations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_item_id INT,
          type ENUM('Variant', 'Extra') NOT NULL,
          customization_name VARCHAR(100) NOT NULL,
          price_adjustment DECIMAL(10,2) DEFAULT 0.00,
          FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
        )
      `);
    }

    // Check tenant_settings
    const [tenantCols] = await db.query('DESCRIBE tenant_settings');
    const tenantFields = tenantCols.map(c => c.Field);
    if (!tenantFields.includes('tagline')) {
      console.log('➕ Adding missing tagline column to tenant_settings...');
      await db.query('ALTER TABLE tenant_settings ADD COLUMN tagline VARCHAR(255) DEFAULT NULL');
    }
    
    // Check menu_items
    const [itemCols] = await db.query('DESCRIBE menu_items');
    const itemFields = itemCols.map(c => c.Field);
    if (!itemFields.includes('is_featured')) {
      console.log('➕ Adding missing is_featured column to menu_items...');
      await db.query('ALTER TABLE menu_items ADD COLUMN is_featured TINYINT(1) DEFAULT 0');
    }
    if (!itemFields.includes('badge')) {
      console.log('➕ Adding missing badge column to menu_items...');
      await db.query('ALTER TABLE menu_items ADD COLUMN badge VARCHAR(50) DEFAULT NULL');
    }

    // Check branch_settings
    const [branchCols] = await db.query('DESCRIBE branch_settings');
    const branchFields = branchCols.map(c => c.Field);
    if (!branchFields.includes('order_sort_direction')) {
      console.log('➕ Adding missing order_sort_direction column to branch_settings...');
      await db.query("ALTER TABLE branch_settings ADD COLUMN order_sort_direction VARCHAR(20) DEFAULT 'Descending'");
    }

    // Ensure at least one branch exists
    const [branches] = await db.query('SELECT id FROM branches LIMIT 1');
    let branchId = 1;
    if (branches.length === 0) {
      console.log('➕ Creating default branch...');
      const [result] = await db.query("INSERT INTO branches (name, location, contact_number, status) VALUES ('Main Branch', 'Default Location', '000-000-0000', 'Active')");
      branchId = result.insertId;
    } else {
      branchId = branches[0].id;
    }

    // Ensure some tables exist
    const [tables] = await db.query('SELECT id FROM restaurant_tables LIMIT 1');
    if (tables.length === 0) {
      console.log('➕ Creating default tables...');
      const defaultTables = [
        { num: '1', cap: 2, x: 100, y: 100 },
        { num: '2', cap: 2, x: 250, y: 100 },
        { num: '3', cap: 4, x: 100, y: 250 },
        { num: '4', cap: 4, x: 250, y: 250 },
        { num: '5', cap: 6, x: 100, y: 400 },
      ];
      for (const t of defaultTables) {
        await db.query(
          "INSERT INTO restaurant_tables (branch_id, table_number, capacity, status, pos_x, pos_y) VALUES (?, ?, ?, 'Available', ?, ?)",
          [branchId, t.num, t.cap, t.x, t.y]
        );
      }
    }

    // Check customers
    const [customerCols] = await db.query('DESCRIBE customers');
    const customerFields = customerCols.map(c => c.Field);
    if (!customerFields.includes('origin')) {
      console.log('➕ Adding missing origin column to customers...');
      await db.query("ALTER TABLE customers ADD COLUMN origin VARCHAR(50) DEFAULT 'In-Store'");
    }

    // Check reservations
    const [resCols] = await db.query('DESCRIBE reservations');
    const resFields = resCols.map(c => c.Field);
    if (!resFields.includes('origin')) {
      console.log('➕ Adding missing origin column to reservations...');
      await db.query("ALTER TABLE reservations ADD COLUMN origin VARCHAR(50) DEFAULT 'In-Store'");
    }
    if (!resFields.includes('booking_fee')) {
      console.log('➕ Adding missing booking_fee column to reservations...');
      await db.query("ALTER TABLE reservations ADD COLUMN booking_fee DECIMAL(10,2) DEFAULT 0.00");
    }
    if (!resFields.includes('payment_status')) {
      console.log('➕ Adding missing payment_status column to reservations...');
      await db.query("ALTER TABLE reservations ADD COLUMN payment_status VARCHAR(20) DEFAULT 'Pending'");
    }
    if (!resFields.includes('payment_method')) {
      console.log('➕ Adding missing payment_method column to reservations...');
      await db.query("ALTER TABLE reservations ADD COLUMN payment_method VARCHAR(50) DEFAULT 'Counter'");
    }
    if (!resFields.includes('customer_id')) {
      console.log('➕ Adding missing customer_id column to reservations...');
      await db.query("ALTER TABLE reservations ADD COLUMN customer_id INT DEFAULT NULL");
    }

    // Check orders
    const [orderCols] = await db.query('DESCRIBE orders');
    const orderFields = orderCols.map(c => c.Field);
    if (!orderFields.includes('order_number')) {
      console.log('➕ Adding missing order_number column to orders...');
      await db.query("ALTER TABLE orders ADD COLUMN order_number VARCHAR(20) DEFAULT NULL");
    }
    if (!orderFields.includes('party_size')) {
      console.log('➕ Adding missing party_size column to orders...');
      await db.query("ALTER TABLE orders ADD COLUMN party_size INT DEFAULT 1");
    }
    
    console.log('✅ Schema check complete');
  } catch (err) {
    console.error('❌ Schema correction failed:', err.message);
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await ensureSchema();
});

// Refresh: 2026-05-06 23:56
// Keep the process alive
setInterval(() => {}, 1000 * 60 * 60);
