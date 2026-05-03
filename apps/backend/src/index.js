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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const assetsPath = path.join(__dirname, '../../pos_terminal/assets');
console.log('📂 Serving static assets from:', assetsPath);
app.use('/assets', express.static(assetsPath));

// Basic Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Zamzam Kitchen API is running', timestamp: new Date() });
});

// Route Imports
const reservationRoutes = require('./routes/reservations');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders'); // Added
const tableRoutes = require('./routes/tables'); // Added
const uploadRoutes = require('./routes/upload'); // Added
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const permissionRoutes = require('./routes/permissions');
const hrRoutes = require('./routes/hr');
const messageRoutes = require('./routes/messages');
const settingRoutes = require('./routes/settings');
const paymentGatewayRoutes = require('./routes/payment_gateways');
const messagingSettingsRoutes = require('./routes/messaging_settings');
const emailSettingsRoutes = require('./routes/email_settings');
const inventoryRoutes = require('./routes/inventory'); // PHASE 3
const purchasesRoutes = require('./routes/purchases'); // PHASE 3
const reportsRoutes = require('./routes/reports'); 
const expensesRoutes = require('./routes/expenses');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');

app.use('/api/reservations', reservationRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes); // Added
app.use('/api/tables', tableRoutes); // Added
app.use('/api/upload', uploadRoutes); // Added
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/payment-gateways', paymentGatewayRoutes);
app.use('/api/messaging-settings', messagingSettingsRoutes);
app.use('/api/email-settings', emailSettingsRoutes);
// PHASE 3 (continued)
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);

// 404 Logger for debugging missing assets (must be last middleware)
app.use((req, res, next) => {
  if (req.url.startsWith('/assets')) {
    console.warn(`❌ 404 Not Found (Asset): ${req.url}`);
  } else {
    console.log(`❓ 404 Not Found (API): ${req.method} ${req.url}`);
  }
  res.status(404).json({ success: false, message: `Route ${req.url} not found` });
});

// Final error handler
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Keep the process alive
setInterval(() => {}, 1000 * 60 * 60);
