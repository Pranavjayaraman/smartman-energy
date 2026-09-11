const express = require('express');
const { allAsync } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// GET audit logs (Admin only)
router.get('/', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logs = await allAsync(
      'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?',
      [parseInt(limit)]
    );
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
