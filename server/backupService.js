const fs = require('fs');
const path = require('path');
const { dbPath, runAsync, checkDatabaseIntegrity } = require('./db');

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BACKUP_DIR = isVercel ? path.join('/tmp', 'backups') : path.resolve(__dirname, 'backups');
const MAX_BACKUPS_TO_KEEP = 30;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create backup dir:', e.message);
  }
}

/**
 * Format timestamp for backup filename: YYYY-MM-DD_HH-mm-ss
 */
function getTimestampStr() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
}

/**
 * Prune old backups, keeping only the most recent MAX_BACKUPS_TO_KEEP
 */
function pruneOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db') || f.endsWith('.bak'))
      .map(f => {
        const fullPath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(fullPath);
        return { filename: f, fullPath, mtime: stats.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > MAX_BACKUPS_TO_KEEP) {
      const toDelete = files.slice(MAX_BACKUPS_TO_KEEP);
      for (const item of toDelete) {
        fs.unlinkSync(item.fullPath);
        console.log(`[BackupService] Pruned old backup: ${item.filename}`);
      }
    }
  } catch (err) {
    console.error('[BackupService] Error pruning old backups:', err.message);
  }
}

/**
 * Create a point-in-time backup of the SQLite database
 */
async function createBackup(reason = 'MANUAL', username = 'system') {
  try {
    if (!fs.existsSync(dbPath)) {
      throw new Error('Database file does not exist to backup.');
    }

    const timestamp = getTimestampStr();
    const backupFileName = `water_monitoring_backup_${timestamp}.db`;
    const targetPath = path.join(BACKUP_DIR, backupFileName);

    // Use SQLite VACUUM INTO for a clean, transactionally consistent snapshot
    try {
      const sanitizedTargetPath = targetPath.replace(/\\/g, '/');
      await runAsync(`VACUUM INTO '${sanitizedTargetPath}'`);
    } catch (vacuumErr) {
      // Fallback to copyFileSync if VACUUM INTO is unsupported or locked
      fs.copyFileSync(dbPath, targetPath);
    }

    const stats = fs.statSync(targetPath);

    // Audit log this backup event
    try {
      await runAsync(
        'INSERT INTO audit_logs (username, action, entity_type, entity_id, new_value, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [username, 'CREATE_BACKUP', 'DATABASE', backupFileName, JSON.stringify({ sizeBytes: stats.size, reason }), `Automated/Manual database backup created`]
      );
    } catch (auditErr) {
      // Non-fatal if audit logging fails
    }

    // Prune older backups
    pruneOldBackups();

    return {
      success: true,
      filename: backupFileName,
      path: targetPath,
      sizeBytes: stats.size,
      sizeFormatted: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
      createdAt: new Date().toISOString(),
      reason
    };
  } catch (err) {
    console.error('[BackupService] Backup creation failed:', err);
    throw err;
  }
}

/**
 * List all available backups
 */
function listBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db') || f.endsWith('.bak'))
      .map(f => {
        const fullPath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(fullPath);
        return {
          filename: f,
          sizeBytes: stats.size,
          sizeFormatted: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          createdAt: stats.birthtime || stats.mtime,
          modifiedAt: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return files;
  } catch (err) {
    console.error('[BackupService] Failed to list backups:', err);
    return [];
  }
}

/**
 * Restore database from a backup file with a safety backup first
 */
async function restoreBackup(filename, username = 'admin') {
  // Prevent directory traversal attacks
  const safeFilename = path.basename(filename);
  const backupFilePath = path.join(BACKUP_DIR, safeFilename);

  if (!fs.existsSync(backupFilePath)) {
    throw new Error('Specified backup file does not exist.');
  }

  // 1. Create a pre-restore safety backup
  const safetyBackup = await createBackup('PRE_RESTORE_SAFETY', username);

  // 2. Perform file overwrite
  fs.copyFileSync(backupFilePath, dbPath);

  // 3. Verify integrity of restored database
  const integrity = await checkDatabaseIntegrity();

  // 4. Log restore event
  await runAsync(
    'INSERT INTO audit_logs (username, action, entity_type, entity_id, new_value, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [username, 'RESTORE_BACKUP', 'DATABASE', safeFilename, JSON.stringify({ safetyBackup: safetyBackup.filename, integrity }), `Database restored from backup`]
  );

  return {
    success: true,
    restoredFrom: safeFilename,
    safetyBackup: safetyBackup.filename,
    integrityStatus: integrity.status
  };
}

/**
 * Start periodic automated backup scheduler (e.g. daily)
 */
function initBackupScheduler() {
  console.log('[BackupService] Initializing automated backup scheduler...');
  
  // Take an initial startup snapshot if none exists or every startup
  createBackup('SERVER_STARTUP', 'system')
    .then(b => console.log(`[BackupService] Startup backup verified: ${b.filename}`))
    .catch(err => console.warn(`[BackupService] Startup backup warning: ${err.message}`));

  // Run periodic automated backup every 12 hours
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
  setInterval(() => {
    createBackup('SCHEDULED_AUTO', 'system')
      .then(b => console.log(`[BackupService] Scheduled backup completed: ${b.filename}`))
      .catch(err => console.error(`[BackupService] Scheduled backup failed: ${err.message}`));
  }, TWELVE_HOURS_MS);
}

module.exports = {
  BACKUP_DIR,
  createBackup,
  listBackups,
  restoreBackup,
  initBackupScheduler
};
