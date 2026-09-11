const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
let dbPath = path.resolve(__dirname, 'water_monitoring.db');

if (isVercel) {
  const tmpDbPath = path.join('/tmp', 'water_monitoring.db');
  if (!fs.existsSync(tmpDbPath)) {
    if (fs.existsSync(dbPath)) {
      try {
        fs.copyFileSync(dbPath, tmpDbPath);
      } catch (e) {
        console.warn('Could not copy seed db to /tmp:', e.message);
      }
    }
  }
  dbPath = tmpDbPath;
}

const db = new sqlite3.Database(dbPath);

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Execute multiple database operations inside an ACID SQLite Transaction
 */
async function withTransaction(callback) {
  await runAsync('BEGIN TRANSACTION');
  try {
    const result = await callback({ runAsync, allAsync, getAsync });
    await runAsync('COMMIT');
    return result;
  } catch (error) {
    await runAsync('ROLLBACK');
    throw error;
  }
}

/**
 * Perform database integrity check
 */
async function checkDatabaseIntegrity() {
  try {
    const result = await allAsync('PRAGMA integrity_check');
    const isOk = result.length > 0 && result[0].integrity_check === 'ok';
    return {
      status: isOk ? 'OK' : 'CORRUPTED',
      details: result.map(r => r.integrity_check).join('; '),
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      status: 'ERROR',
      details: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Fetch database storage and table statistics
 */
async function getDatabaseStats() {
  const fs = require('fs');
  let fileSize = 0;
  try {
    const stats = fs.statSync(dbPath);
    fileSize = stats.size;
  } catch (e) {
    fileSize = 0;
  }

  const [usersCount] = await allAsync('SELECT COUNT(*) as count FROM users');
  const [metersCount] = await allAsync('SELECT COUNT(*) as count FROM meters');
  const [readingsCount] = await allAsync('SELECT COUNT(*) as count FROM meter_readings');
  const [stpEtpCount] = await allAsync('SELECT COUNT(*) as count FROM stp_etp_readings');
  const [targetsCount] = await allAsync('SELECT COUNT(*) as count FROM daily_production_targets');
  const [auditCount] = await allAsync('SELECT COUNT(*) as count FROM audit_logs');
  const [journalMode] = await allAsync('PRAGMA journal_mode');

  return {
    dbPath,
    fileSizeBytes: fileSize,
    fileSizeFormatted: (fileSize / (1024 * 1024)).toFixed(2) + ' MB',
    journalMode: journalMode ? journalMode.journal_mode : 'unknown',
    tables: {
      users: usersCount?.count || 0,
      meters: metersCount?.count || 0,
      meter_readings: readingsCount?.count || 0,
      stp_etp_readings: stpEtpCount?.count || 0,
      daily_production_targets: targetsCount?.count || 0,
      audit_logs: auditCount?.count || 0
    },
    totalRecords: (usersCount?.count || 0) + (metersCount?.count || 0) + (readingsCount?.count || 0) + (stpEtpCount?.count || 0) + (targetsCount?.count || 0) + (auditCount?.count || 0)
  };
}

async function initDB() {
  console.log('Initializing SQLite Database with WAL mode & security enhancements...');
  await runAsync('PRAGMA journal_mode = WAL');
  await runAsync('PRAGMA synchronous = NORMAL');
  await runAsync('PRAGMA busy_timeout = 5000');
  await runAsync('PRAGMA foreign_keys = ON');

  await runAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      assigned_areas TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS meters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      area TEXT NOT NULL,
      unit TEXT DEFAULT 'KL',
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS daily_production_targets (
      date TEXT PRIMARY KEY,
      production_mt REAL DEFAULT 0,
      manpower INTEGER DEFAULT 0,
      garden_area_m2 REAL DEFAULT 2500,
      intake_target_kl REAL DEFAULT 500,
      domestic_target_kl REAL DEFAULT 60,
      specific_total_target REAL DEFAULT 3.2,
      specific_process_target REAL DEFAULT 2.5,
      domestic_lpd_target REAL DEFAULT 135,
      garden_lpd_target REAL DEFAULT 5.0,
      updated_by TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS meter_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meter_code TEXT NOT NULL,
      category TEXT NOT NULL,
      value REAL NOT NULL,
      entered_by TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, meter_code),
      FOREIGN KEY(meter_code) REFERENCES meters(code) ON DELETE CASCADE
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS stp_etp_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      plant_type TEXT NOT NULL,
      field_code TEXT NOT NULL,
      value REAL NOT NULL,
      entered_by TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, plant_type, field_code)
    )
  `);

  await runAsync(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      old_value TEXT,
      new_value TEXT,
      notes TEXT
    )
  `);

  await seedDefaults();
}

async function seedDefaults() {
  // Update or insert separate unique passwords per user
  const usersToSeed = [
    { username: 'admin', pass: 'admin123', name: 'System Administrator', role: 'Admin', areas: ['Water Intake', 'Process Water', 'Domestic & Garden Water', 'Outside Water', 'STP', 'ETP'] },
    { username: 'op_intake', pass: 'intake123', name: 'Water Intake Operator', role: 'Operator', areas: ['Water Intake'] },
    { username: 'op_process', pass: 'process123', name: 'Process Water Operator', role: 'Operator', areas: ['Process Water'] },
    { username: 'op_dom_gard', pass: 'domestic123', name: 'Domestic & Garden Operator', role: 'Operator', areas: ['Domestic & Garden Water', 'Outside Water'] },
    { username: 'op_treatment', pass: 'treatment123', name: 'STP/ETP Plant Operator', role: 'Operator', areas: ['STP', 'ETP'] },
    { username: 'manager', pass: 'viewer123', name: 'Plant Operations Manager', role: 'Viewer', areas: ['Water Intake', 'Process Water', 'Domestic & Garden Water', 'Outside Water', 'STP', 'ETP'] }
  ];

  for (const u of usersToSeed) {
    const hash = await bcrypt.hash(u.pass, 10);
    const existing = await getAsync('SELECT * FROM users WHERE username = ?', [u.username]);
    if (!existing) {
      await runAsync(
        'INSERT INTO users (username, password_hash, name, role, assigned_areas) VALUES (?, ?, ?, ?, ?)',
        [u.username, hash, u.name, u.role, JSON.stringify(u.areas)]
      );
    } else {
      // Update password hash to ensure distinct credentials
      await runAsync(
        'UPDATE users SET password_hash = ?, name = ?, role = ?, assigned_areas = ? WHERE username = ?',
        [hash, u.name, u.role, JSON.stringify(u.areas), u.username]
      );
    }
  }

  // Check meters
  const existingMeters = await allAsync('SELECT COUNT(*) as count FROM meters');
  if (existingMeters[0].count === 0) {
    console.log('Seeding initial meters...');
    const defaultMeters = [
      ['BW1', 'Borewell 1', 'intake', 'Water Intake', 'KL', 1],
      ['BW2', 'Borewell 2', 'intake', 'Water Intake', 'KL', 2],
      ['TANKER', 'Tanker Water Supply', 'intake', 'Water Intake', 'KL', 3],
      ['PUB_SUPPLY', 'Public Municipal Water', 'intake', 'Water Intake', 'KL', 4],
      ['IND_SUPPLY', 'Industrial Park Supply', 'intake', 'Water Intake', 'KL', 5],
      ['RAINWATER', 'Rainwater Harvest Sump', 'intake', 'Water Intake', 'KL', 6],
      ['STP_REUSE', 'STP Treated Water Reuse', 'intake', 'Water Intake', 'KL', 7],
      ['ETP_REUSE', 'ETP Treated Water Reuse', 'intake', 'Water Intake', 'KL', 8],

      ['PW1', 'Process Line 1 Meter', 'process', 'Process Water', 'KL', 10],
      ['PW2', 'Process Line 2 Meter', 'process', 'Process Water', 'KL', 11],
      ['PW3', 'Boiler Feed Water', 'process', 'Process Water', 'KL', 12],
      ['PW4', 'Cooling Tower Makeup', 'process', 'Process Water', 'KL', 13],
      ['PW5', 'Equipment Cleaning Line', 'process', 'Process Water', 'KL', 14],

      ['DW1', 'Main Admin Office', 'domestic', 'Domestic & Garden Water', 'KL', 20],
      ['DW2', 'Staff Canteen', 'domestic', 'Domestic & Garden Water', 'KL', 21],
      ['DW3', 'Workers Restroom Block A', 'domestic', 'Domestic & Garden Water', 'KL', 22],
      ['DW4', 'Workers Restroom Block B', 'domestic', 'Domestic & Garden Water', 'KL', 23],
      ['DW5', 'R&D Laboratory Tap', 'domestic', 'Domestic & Garden Water', 'KL', 24],
      ['DW6', 'Security Gate House', 'domestic', 'Domestic & Garden Water', 'KL', 25],
      ['DW7', 'Maintenance Workshop', 'domestic', 'Domestic & Garden Water', 'KL', 26],
      ['DW8', 'Visitor Lounge', 'domestic', 'Domestic & Garden Water', 'KL', 27],
      ['DW9', 'Quality Control Lab', 'domestic', 'Domestic & Garden Water', 'KL', 28],
      ['DW10', 'First Aid Center', 'domestic', 'Domestic & Garden Water', 'KL', 29],

      ['GW1', 'Front Lawn Sprinklers', 'garden', 'Domestic & Garden Water', 'KL', 40],
      ['GW2', 'East Boundary Garden', 'garden', 'Domestic & Garden Water', 'KL', 41],
      ['GW3', 'West Plantation Drip', 'garden', 'Domestic & Garden Water', 'KL', 42],
      ['GW4', 'Canteen Courtyard Lawn', 'garden', 'Domestic & Garden Water', 'KL', 43],
      ['GW5', 'Greenbelt Trees Zone 1', 'garden', 'Domestic & Garden Water', 'KL', 44],
      ['GW6', 'Greenbelt Trees Zone 2', 'garden', 'Domestic & Garden Water', 'KL', 45],
      ['GW7', 'Nursery & Greenhouse', 'garden', 'Domestic & Garden Water', 'KL', 46],
      ['GW8', 'Solar Panel Area Grass', 'garden', 'Domestic & Garden Water', 'KL', 47],
      ['GW9', 'Substation Perimeter', 'garden', 'Domestic & Garden Water', 'KL', 48],
      ['GW10', 'Main Gate Flowerbeds', 'garden', 'Domestic & Garden Water', 'KL', 49],

      ['OW1', 'Outside Contractor Wash', 'outside', 'Outside Water', 'KL', 60],
      ['OW2', 'Tanker Filling Bay Outlet', 'outside', 'Outside Water', 'KL', 61],
    ];

    for (const m of defaultMeters) {
      await runAsync('INSERT INTO meters (code, name, category, area, unit, display_order) VALUES (?, ?, ?, ?, ?, ?)', m);
    }
  }

  console.log('Database initialization complete with distinct area credentials.');
}

module.exports = {
  db,
  dbPath,
  runAsync,
  allAsync,
  getAsync,
  withTransaction,
  checkDatabaseIntegrity,
  getDatabaseStats,
  initDB
};
