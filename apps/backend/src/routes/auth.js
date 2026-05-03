const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   POST api/auth/login
// @desc    Authenticate user and return user data
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // In a real app, we would hash the password. 
        // For this prototype, we are using plain text as per the users.js implementation.
        const [users] = await db.query(
            'SELECT u.*, GROUP_CONCAT(DISTINCT r.name) as roles, GROUP_CONCAT(DISTINCT p.name) as permissions ' +
            'FROM users u ' +
            'LEFT JOIN user_roles ur ON u.id = ur.user_id ' +
            'LEFT JOIN roles r ON ur.role_id = r.id ' +
            'LEFT JOIN role_permissions rp ON r.id = rp.role_id ' +
            'LEFT JOIN permissions p ON rp.permission_id = p.id ' +
            'WHERE u.username = ? AND u.password_hash = ? ' +
            'GROUP BY u.id',
            [username, password]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = users[0];
        // Don't send password hash back
        delete user.password_hash;

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                roles: user.roles ? user.roles.split(',') : [],
                permissions: user.permissions ? user.permissions.split(',') : []
            }
        });
    } catch (err) {
        console.error('Auth Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
