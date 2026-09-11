const express = require('express');
const { allAsync, runAsync, getAsync } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get list of meters (filtered by area if query param provided)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { area, category, activeOnly } = req.query;
    let sql = 'SELECT * FROM meters WHERE 1=1';
    const params = [];

    if (area) {
      sql += ' AND area = ?';
      params.push(area);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (activeOnly === 'true') {
      sql += ' AND is_active = 1';
    }

    sql += ' ORDER BY category, display_order, code';

    const meters = await allAsync(sql, params);
    res.json(meters);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch meters' });
  }
});

// Add new meter (Admin only)
router.post('/', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const { code, name, category, area, unit, display_order } = req.body;

    if (!code || !name || !category || !area) {
      return res.status(400).json({ error: 'Code, name, category, and area are required' });
    }

    const existing = await getAsync('SELECT * FROM meters WHERE code = ?', [code]);
    if (existing) {
      return res.status(400).json({ error: `Meter code '${code}' already exists` });
    }

    await runAsync(
      'INSERT INTO meters (code, name, category, area, unit, display_order) VALUES (?, ?, ?, ?, ?, ?)',
      [code.toUpperCase(), name, category, area, unit || 'KL', display_order || 0]
    );

    // Audit log
    await runAsync(
      'INSERT INTO audit_logs (username, action, entity_type, entity_id, new_value, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.username, 'CREATE', 'METER', code.toUpperCase(), JSON.stringify(req.body), `Added new meter ${code}`]
    );

    res.status(201).json({ message: 'Meter created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create meter' });
  }
});

// Toggle meter status / update meter details (Admin only)
router.put('/:code', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const { name, category, area, unit, is_active, display_order } = req.body;
    const code = req.params.code;

    const existing = await getAsync('SELECT * FROM meters WHERE code = ?', [code]);
    if (!existing) {
      return res.status(404).json({ error: 'Meter not found' });
    }

    await runAsync(
      `UPDATE meters SET 
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        area = COALESCE(?, area),
        unit = COALESCE(?, unit),
        is_active = COALESCE(?, is_active),
        display_order = COALESCE(?, display_order)
       WHERE code = ?`,
      [name, category, area, unit, is_active, display_order, code]
    );

    await runAsync(
      'INSERT INTO audit_logs (username, action, entity_type, entity_id, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.username, 'UPDATE', 'METER', code, JSON.stringify(existing), JSON.stringify(req.body)]
    );

    res.json({ message: 'Meter updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update meter' });
  }
});

module.exports = router;
