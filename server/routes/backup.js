const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { checkDatabaseIntegrity, getDatabaseStats } = require('../db');
const { BACKUP_DIR, createBackup, listBackups, restoreBackup } = require('../backupService');

const router = express.Router();

// GET database health status & statistics (Admin only)
router.get('/status', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const integrity = await checkDatabaseIntegrity();
    const stats = await getDatabaseStats();
    const backups = listBackups();

    res.json({
      status: 'OK',
      integrity,
      stats,
      backupSummary: {
        totalBackups: backups.length,
        latestBackup: backups[0] || null
      }
    });
  } catch (err) {
    console.error('Backup status error:', err);
    res.status(500).json({ error: 'Failed to retrieve database health status' });
  }
});

// GET list of all backups (Admin only)
router.get('/list', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const backups = listBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// POST create immediate on-demand backup (Admin only)
router.post('/create', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const reason = req.body.reason || 'MANUAL_ADMIN';
    const result = await createBackup(reason, req.user.username);
    res.json({
      message: 'Database backup created successfully',
      backup: result
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create database backup: ' + err.message });
  }
});

// GET download backup file (Admin only)
router.get('/download/:filename', authenticateToken, authorizeRoles('Admin'), (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    res.download(filePath, filename);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

// POST restore database from backup (Admin only)
router.post('/restore/:filename', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const result = await restoreBackup(filename, req.user.username);
    res.json({
      message: 'Database successfully restored from backup snapshot',
      result
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore database: ' + err.message });
  }
});

module.exports = router;
