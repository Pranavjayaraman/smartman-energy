const express = require('express');
const { dbProcedures } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Live Dashboard & Historical metrics computed 100% in database SQL
router.get('/', authenticateToken, authorizeRoles('Admin', 'Viewer', 'Operator'), async (req, res) => {
  try {
    const { timeframe = 'daily', startDate, endDate, month, year } = req.query;

    const data = await dbProcedures.getDashboardData({
      timeframe,
      startDate,
      endDate,
      month,
      year
    });

    res.json(data);
  } catch (err) {
    console.error('Dashboard SQL computation error:', err);
    res.status(500).json({ error: 'Failed to compute dashboard metrics' });
  }
});

module.exports = router;
