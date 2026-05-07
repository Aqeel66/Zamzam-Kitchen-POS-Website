const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Base persistent storage path (Absolute to root)
const persistentAssetsPath = path.join(__dirname, '../../../../persistent_assets');

// ─── Menu Item Image Storage ────────────────────────────────────────────────
const menuStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(persistentAssetsPath, 'images/menu_items');
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
      url: `/assets/${relativePath}`
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// ─── Logo Upload Storage ─────────────────────────────────────────────────────
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(persistentAssetsPath, 'images');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
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

router.post('/logo', uploadLogo.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const relativePath = `images/${req.file.filename}`;
    const logoUrl = `images/${req.file.filename}`;

    await db.query('UPDATE tenant_settings SET logo_url = ? WHERE id = 1', [logoUrl]);

    res.json({
      success: true,
      message: 'Logo uploaded and saved successfully',
      path: relativePath,
      url: `/assets/${relativePath}`
    });
  } catch (error) {
    console.error('Logo Upload Error:', error);
    res.status(500).json({ success: false, message: 'Logo upload failed' });
  }
});

// ─── Secondary Logo Upload Storage ──────────────────────────────────────────
const secondaryLogoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(persistentAssetsPath, 'images');
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
      url: `/assets/${relativePath}`
    });
  } catch (error) {
    console.error('Secondary Logo Upload Error:', error);
    res.status(500).json({ success: false, message: 'Secondary logo upload failed' });
  }
});

// ─── Login Background Upload Storage ──────────────────────────────────────────
const loginBgStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(persistentAssetsPath, 'images');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'login_bg_custom' + path.extname(file.originalname));
  }
});

const uploadLoginBg = multer({
  storage: loginBgStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

router.post('/login-bg', uploadLoginBg.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const relativePath = `images/${req.file.filename}`;
    await db.query('UPDATE tenant_settings SET login_background_url = ? WHERE id = 1', [relativePath]);
    res.json({
      success: true,
      message: 'Login background uploaded successfully',
      path: relativePath,
      url: `/assets/${relativePath}`
    });
  } catch (error) {
    console.error('Login BG Upload Error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// Explicitly handle GET to provide feedback for redirects (405 issues)
router.get(['/login-bg', '/logo', '/secondary-logo', '/hero-bg'], (req, res) => {
  res.status(405).json({ 
    success: false, 
    message: `Method ${req.method} not allowed. Please ensure you are using POST and that there are no HTTP -> HTTPS redirects stripping the method.`,
    debug: {
      url: req.originalUrl,
      method: req.method,
      protocol: req.protocol
    }
  });
});

// ─── Hero Background Upload Storage ──────────────────────────────────────────
const heroBgStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(persistentAssetsPath, 'images');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'hero_bg_custom' + path.extname(file.originalname));
  }
});

const uploadHeroBg = multer({
  storage: heroBgStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

router.post('/hero-bg', uploadHeroBg.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const relativePath = `images/${req.file.filename}`;
    await db.query('UPDATE tenant_settings SET hero_background_url = ? WHERE id = 1', [relativePath]);
    res.json({
      success: true,
      message: 'Hero background uploaded successfully',
      path: relativePath,
      url: `/assets/${relativePath}`
    });
  } catch (error) {
    console.error('Hero BG Upload Error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

module.exports = router;
