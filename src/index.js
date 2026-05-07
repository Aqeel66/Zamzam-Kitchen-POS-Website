/**
 * Zamzam RMS - Root Entry Point for Hostinger Deployment
 * This file redirects to the backend application.
 */
const path = require('path');

// Point to the actual backend entry file
// We use require() to load the entire backend app
console.log('🚀 Starting Zamzam RMS Backend from Root Entry Point...');
try {
    require('./apps/backend/src/index.js');
} catch (err) {
    console.error('🔥 Failed to load backend index.js:', err.message);
    process.exit(1);
}
