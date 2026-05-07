/**
 * Zamzam RMS - Root Entry Point for Hostinger Deployment
 * This file redirects to the backend application.
 */
const path = require('path');

// Point to the actual backend entry file
// We use require() to load the entire backend app
console.log('🚀 Starting Zamzam RMS Backend from Root Entry Point...');
try {
    const backendPath = path.join(__dirname, '../apps/backend/src/index.js');
    console.log(`🔍 Attempting to load backend from: ${backendPath}`);
    require(backendPath);
} catch (err) {
    console.error('🔥 CRITICAL ERROR: Failed to load backend module!');
    console.error('🔥 Error Message:', err.message);
    console.error('🔥 Stack Trace:', err.stack);
    process.exit(1);
}
