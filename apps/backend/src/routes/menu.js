const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/menu
// @desc    Get all categories and items from the database
router.get('/', async (req, res) => {
  try {
    // Check if is_deleted column exists to avoid 500 error on older schemas
    const [catColumns] = await db.query('DESCRIBE categories');
    const hasCatDeleted = catColumns.map(c => c.Field).includes('is_deleted');

    const [itemColumns] = await db.query('DESCRIBE menu_items');
    const hasItemDeleted = itemColumns.map(c => c.Field).includes('is_deleted');

    const [categories] = await db.query(`SELECT * FROM categories ${hasCatDeleted ? 'WHERE is_deleted = FALSE' : ''}`);
    const [items] = await db.query(`SELECT * FROM menu_items ${hasItemDeleted ? 'WHERE is_deleted = FALSE' : ''}`);

    console.log(`🔍 [Menu API] Found ${categories.length} categories and ${items.length} items`);

    // Fetch phase 3 customizations & recipes
    // Check if tables exist before querying to avoid 500 errors
    let variants = [];
    let extras = [];
    let ingredients = [];

    try {
      const [vRows] = await db.query('SELECT * FROM menu_item_variants');
      variants = vRows;
    } catch (e) { console.warn('menu_item_variants table missing'); }

    try {
      const [eRows] = await db.query('SELECT * FROM menu_item_extras');
      extras = eRows;
    } catch (e) { console.warn('menu_item_extras table missing'); }

    try {
      const [iRows] = await db.query(`
        SELECT mii.*, ii.name as ingredient_name, ii.unit as ingredient_unit 
        FROM menu_item_ingredients mii
        JOIN inventory_items ii ON mii.inventory_item_id = ii.id
      `);
      ingredients = iRows;
    } catch (e) { console.warn('menu_item_ingredients or inventory_items table missing'); }

    // Group items by category to match the expected format
    const menuData = categories.map(category => {
      const categoryItems = items.filter(item => item.category_id === category.id);
      return {
        id: category.id.toString(),
        name: category.name,
        description: category.description,
        image: category.image,
        items: categoryItems.map(i => ({
          ...i,
          id: i.id.toString(),
          price: parseFloat(i.price),
          is_available: i.is_available, // Direct from DB (1 or 0)
          is_featured: Boolean(i.is_featured),
          badge: i.badge,
          variants: variants.filter(v => v.menu_item_id === i.id).map(v => ({ ...v, price_offset: parseFloat(v.price_adjustment) })),
          extras: extras.filter(e => e.menu_item_id === i.id).map(e => ({ ...e, price: parseFloat(e.price_adjustment) })),
          recipe: ingredients.filter(ing => ing.menu_item_id === i.id).map(ing => ({
            inventory_id: ing.inventory_item_id,
            ingredient_name: ing.ingredient_name,
            quantity: parseFloat(ing.quantity_required),
            unit: ing.ingredient_unit
          }))
        }))
      };
    });

    res.json(menuData);
  } catch (error) {
    console.error('Fetch Menu Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/menu/categories
// @desc    Create a new food category
router.post('/categories', async (req, res) => {
  try {
    console.log('📝 POST /categories - Request Body:', JSON.stringify(req.body, null, 2));

    if (!req.body) {
      return res.status(400).json({ success: false, message: 'Request body is missing' });
    }

    const { name, description, image } = req.body;

    if (!name) {
      console.warn('⚠️ Category creation failed: Name is missing');
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const [result] = await db.query(
      'INSERT INTO categories (name, description, image) VALUES (?, ?, ?)',
      [name, description || null, image || null]
    );

    console.log('✅ Category created successfully. ID:', result.insertId);
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      categoryId: result.insertId
    });
  } catch (error) {
    console.error('❌ POST /categories - Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during category creation',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      sqlMessage: error.sqlMessage,
      code: error.code
    });
  }
});

// @route   PATCH /api/menu/categories/:id
// @desc    Update an existing category
router.patch('/categories/:id', async (req, res) => {
  try {
    const { name, description, image } = req.body;
    const { id } = req.params;

    await db.query(
      'UPDATE categories SET name = ?, description = ?, image = ? WHERE id = ?',
      [name, description, image, id]
    );

    res.json({ success: true, message: 'Category updated successfully' });
  } catch (error) {
    console.error('Update Category Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/menu/categories/:id
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE categories SET is_deleted = TRUE WHERE id = ?', [id]);
    res.json({ success: true, message: 'Category deleted successfully (soft delete)' });
  } catch (error) {
    console.error('Delete Category Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/menu/items
// @desc    Create a new menu item
router.post('/items', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const {
      category_id, name, description, price, is_available,
      dietary_info, prep_station, image, is_featured, badge,
      recipe, variants, extras
    } = req.body;

    if (!category_id || !name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Category ID, name, and price are required' });
    }

    const [result] = await connection.query(
      `INSERT INTO menu_items 
      (category_id, name, description, price, is_available, dietary_info, prep_station, image, is_featured, badge) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id, name, description || null, price,
        is_available !== undefined ? is_available : true,
        dietary_info || null, prep_station || 'General',
        image || null, is_featured ? 1 : 0, badge || null
      ]
    );

    const itemId = result.insertId;

    // 2. Sync Recipe (Ingredients)
    if (recipe && Array.isArray(recipe)) {
      for (const ing of recipe) {
        if (ing.inventory_id) {
          await connection.query(
            'INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_required) VALUES (?, ?, ?)',
            [itemId, ing.inventory_id, ing.quantity]
          );
        }
      }
    }

    // 3. Sync Variants
    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        await connection.query(
          'INSERT INTO menu_item_variants (menu_item_id, name, price_adjustment) VALUES (?, ?, ?)',
          [itemId, v.name, v.price_offset || 0]
        );
      }
    }

    // 4. Sync Extras
    if (extras && Array.isArray(extras)) {
      for (const e of extras) {
        await connection.query(
          'INSERT INTO menu_item_extras (menu_item_id, name, price_adjustment) VALUES (?, ?, ?)',
          [itemId, e.name, e.price || 0]
        );
      }
    }

    await connection.commit();
    res.status(201).json({
      success: true,
      message: 'Menu item created successfully with all metadata',
      itemId: itemId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create Menu Item Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  } finally {
    connection.release();
  }
});

// @route   PUT /api/menu/items/:id
router.put('/items/:id', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const {
      category_id, name, description, price, is_available,
      dietary_info, prep_station, image, is_featured, badge,
      recipe, variants, extras
    } = req.body;

    // 1. Update Core Item
    await connection.query(
      `UPDATE menu_items 
       SET category_id = ?, name = ?, description = ?, price = ?, is_available = ?, dietary_info = ?, prep_station = ?, image = ?, is_featured = ?, badge = ? 
       WHERE id = ?`,
      [
        category_id, name, description, price,
        is_available !== undefined ? is_available : true,
        dietary_info, prep_station, image, is_featured ? 1 : 0, badge || null, id
      ]
    );

    // 2. Sync Recipe (Ingredients)
    await connection.query('DELETE FROM menu_item_ingredients WHERE menu_item_id = ?', [id]);
    if (recipe && Array.isArray(recipe)) {
      for (const ing of recipe) {
        if (ing.inventory_id) {
          await connection.query(
            'INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_required) VALUES (?, ?, ?)',
            [id, ing.inventory_id, ing.quantity]
          );
        }
      }
    }

    // 3. Sync Variants
    await connection.query('DELETE FROM menu_item_variants WHERE menu_item_id = ?', [id]);
    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        await connection.query(
          'INSERT INTO menu_item_variants (menu_item_id, name, price_adjustment) VALUES (?, ?, ?)',
          [id, v.name, v.price_offset || 0]
        );
      }
    }

    // 4. Sync Extras
    await connection.query('DELETE FROM menu_item_extras WHERE menu_item_id = ?', [id]);
    if (extras && Array.isArray(extras)) {
      for (const e of extras) {
        await connection.query(
          'INSERT INTO menu_item_extras (menu_item_id, name, price_adjustment) VALUES (?, ?, ?)',
          [id, e.name, e.price || 0]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Product fully synchronized' });
  } catch (error) {
    await connection.rollback();
    console.error('Update Menu Item Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  } finally {
    connection.release();
  }
});

// @route   DELETE /api/menu/items/:id
router.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE menu_items SET is_deleted = TRUE WHERE id = ?', [id]);
    res.json({ success: true, message: 'Menu item deleted successfully (soft delete)' });
  } catch (error) {
    console.error('Delete Menu Item Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── PHASE 3: VARIANTS, EXTRAS & INGREDIENTS ──────────────

// @route   POST /api/menu/variants
router.post('/variants', async (req, res) => {
  try {
    const { menu_item_id, name, price_adjustment, inventory_item_id, quantity_required } = req.body;
    const [result] = await db.query(
      'INSERT INTO menu_item_variants (menu_item_id, name, price_adjustment, inventory_item_id, quantity_required) VALUES (?, ?, ?, ?, ?)',
      [menu_item_id, name, price_adjustment || 0.00, inventory_item_id || null, quantity_required || 0]
    );
    res.status(201).json({ success: true, variantId: result.insertId });
  } catch (error) {
    console.error('Create Variant Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/menu/variants/:id
router.delete('/variants/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM menu_item_variants WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Variant deleted' });
  } catch (error) {
    console.error('Delete Variant Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/menu/extras
router.post('/extras', async (req, res) => {
  try {
    const { menu_item_id, name, price_adjustment, inventory_item_id, quantity_required } = req.body;
    const [result] = await db.query(
      'INSERT INTO menu_item_extras (menu_item_id, name, price_adjustment, inventory_item_id, quantity_required) VALUES (?, ?, ?, ?, ?)',
      [menu_item_id, name, price_adjustment || 0.00, inventory_item_id || null, quantity_required || 0]
    );
    res.status(201).json({ success: true, extraId: result.insertId });
  } catch (error) {
    console.error('Create Extra Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/menu/extras/:id
router.delete('/extras/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM menu_item_extras WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Extra deleted' });
  } catch (error) {
    console.error('Delete Extra Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/menu/ingredients
router.post('/ingredients', async (req, res) => {
  try {
    const { menu_item_id, inventory_item_id, quantity_required } = req.body;
    const [result] = await db.query(
      'INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_required) VALUES (?, ?, ?)',
      [menu_item_id, inventory_item_id, quantity_required]
    );
    res.status(201).json({ success: true, ingredientId: result.insertId });
  } catch (error) {
    console.error('Create Ingredient Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/menu/ingredients/:id
router.delete('/ingredients/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM menu_item_ingredients WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Ingredient deleted' });
  } catch (error) {
    console.error('Delete Ingredient Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
