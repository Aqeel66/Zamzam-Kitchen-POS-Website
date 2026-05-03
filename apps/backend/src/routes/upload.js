const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// ─── Menu Item Image Storage ────────────────────────────────────────────────
const menuStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../assets/images/menu_items');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadMenu = multer({ 
  storage: menuStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed'));
  }
});

// @route   POST /api/upload
// @desc    Upload a menu item image
router.post('/', uploadMenu.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const relativePath = `images/menu_items/${req.file.filename}`;
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      path: relativePath,
      url: `http://zamzamkitchen.net/assets/${relativePath}`
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// ─── Logo Upload Storage ─────────────────────────────────────────────────────
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../assets/images');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Always save as logo_custom.<ext> so it's easy to reference
    cb(null, 'logo_custom' + path.extname(file.originalname));
  }
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed for logo'));
  }
});

// @route   POST /api/upload/logo
// @desc    Upload restaurant logo and update tenant_settings
router.post('/logo', uploadLogo.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const relativePath = `images/${req.file.filename}`;
    const logoUrl = `images/${req.file.filename}`;

    // Persist to DB so POS & website pick it up instantly
    await db.query('UPDATE tenant_settings SET logo_url = ? WHERE id = 1', [logoUrl]);

    res.json({
      success: true,
      message: 'Logo uploaded and saved successfully',
      path: relativePath,
      url: `http://zamzamkitchen.net/assets/${relativePath}`
    });
  } catch (error) {
    console.error('Logo Upload Error:', error);
    res.status(500).json({ success: false, message: 'Logo upload failed' });
  }
});

// ─── Secondary Logo Upload Storage ──────────────────────────────────────────
const secondaryLogoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../assets/images');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'logo_secondary_custom' + path.extname(file.originalname));
  }
});

const uploadSecondaryLogo = multer({
  storage: secondaryLogoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed for logo'));
  }
});

// @route   POST /api/upload/secondary-logo
// @desc    Upload restaurant secondary logo and update tenant_settings
router.post('/secondary-logo', uploadSecondaryLogo.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const relativePath = `images/${req.file.filename}`;
    const logoUrl = `images/${req.file.filename}`;

    await db.query('UPDATE tenant_settings SET secondary_logo_url = ? WHERE id = 1', [logoUrl]);

    res.json({
      success: true,
      message: 'Secondary logo uploaded successfully',
      path: relativePath,
      url: `http://zamzamkitchen.net/assets/${relativePath}`
    });
  } catch (error) {
    console.error('Secondary Logo Upload Error:', error);
    res.status(500).json({ success: false, message: 'Secondary logo upload failed' });
  }
});

module.exports = router;
