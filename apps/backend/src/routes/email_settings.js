const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');

// @route   GET /api/email-settings
// @desc    Get email provider settings
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM email_settings');
    res.json(rows);
  } catch (error) {
    console.error('Fetch Email Settings Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/email-settings
// @desc    Update or Create email settings
router.post('/', async (req, res) => {
  try {
    const { 
        provider_name, 
        smtp_host, 
        smtp_port: raw_smtp_port, 
        smtp_user, 
        smtp_pass, 
        from_email,
        from_name,
        is_active, 
        environment 
    } = req.body;

    const smtp_port = raw_smtp_port ? parseInt(raw_smtp_port) : null;

    if (!provider_name) {
      return res.status(400).json({ success: false, message: 'Provider name is required' });
    }

    const [existing] = await db.query(
      'SELECT id FROM email_settings WHERE provider_name = ?',
      [provider_name]
    );

    if (existing.length > 0) {
      // Dynamic Update
      const updates = [];
      const params = [];
      if (smtp_host !== undefined) { updates.push('smtp_host = ?'); params.push(smtp_host); }
      if (smtp_port !== undefined) { updates.push('smtp_port = ?'); params.push(smtp_port); }
      if (smtp_user !== undefined) { updates.push('smtp_user = ?'); params.push(smtp_user); }
      if (smtp_pass !== undefined) { updates.push('smtp_pass = ?'); params.push(smtp_pass); }
      if (from_email !== undefined) { updates.push('from_email = ?'); params.push(from_email); }
      if (from_name !== undefined) { updates.push('from_name = ?'); params.push(from_name); }
      if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
      if (environment !== undefined) { updates.push('environment = ?'); params.push(environment); }
      
      if (updates.length > 0) {
        params.push(provider_name);
        await db.query(`UPDATE email_settings SET ${updates.join(', ')} WHERE provider_name = ?`, params);
      }
    } else {
      // Insert
      await db.query(
        'INSERT INTO email_settings (provider_name, smtp_host, smtp_port, smtp_user, smtp_pass, from_email, from_name, is_active, environment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [provider_name, smtp_host || null, smtp_port || null, smtp_user || null, smtp_pass || null, from_email || null, from_name || null, is_active || 0, environment || 'sandbox']
      );
    }

    res.json({ success: true, message: `${provider_name} settings updated successfully` });
  } catch (error) {
    console.error('Update Email Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

const nodemailer = require('nodemailer');

// ... (existing GET and POST routes)

// @route   POST /api/email-settings/test
// @desc    Test email connection
router.post('/test', async (req, res) => {
  try {
    const { 
        provider_name, 
        smtp_host, 
        smtp_port, 
        smtp_user, 
        smtp_pass, 
        from_email,
        from_name,
        test_email 
    } = req.body;

    if (!test_email) {
      return res.status(400).json({ success: false, message: 'Test email address is required' });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: smtp_port == 465, // true for 465, false for other ports
      auth: {
        user: smtp_user,
        pass: smtp_pass,
      },
      tls: {
        rejectUnauthorized: false // Helps with self-signed certs
      }
    });

    // Send mail
    const info = await transporter.sendMail({
      from: `"${from_name}" <${from_email}>`,
      to: test_email,
      subject: "Test Email - Zamzam Kitchen",
      text: "Hello! This is a test email from your Zamzam Kitchen Restaurant Management System. Your SMTP configuration is working correctly.",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #F15A24;">Zamzam Kitchen</h2>
          <p>Hello!</p>
          <p>This is a test email from your <b>Zamzam Kitchen Restaurant Management System</b>.</p>
          <p>If you are seeing this, your SMTP configuration is working correctly!</p>
          <br>
          <p style="font-size: 12px; color: #888;">This is an automated test message. Please do not reply.</p>
        </div>
      `,
    });

    res.json({ success: true, message: 'Test email sent successfully!', messageId: info.messageId });
  } catch (error) {
    console.error('Email Test Error:', error);
    res.status(500).json({ 
        success: false, 
        message: 'Failed to send test email', 
        error: error.message 
    });
  }
});

module.exports = router;
