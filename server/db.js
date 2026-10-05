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

  // Performance Indexes for sub-millisecond lookups
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_meter_readings_date_code ON meter_readings(date, meter_code)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_meter_readings_date_category ON meter_readings(date, category)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_meter_readings_code_date ON meter_readings(meter_code, date)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_stp_etp_readings_date ON stp_etp_readings(date, plant_type, field_code)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_daily_targets_date ON daily_production_targets(date)`);
  await runAsync(`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)`);

  // Create SQL Views so ALL calculations happen directly inside SQLite Database Engine
  await runAsync(`DROP VIEW IF EXISTS v_daily_meter_summary`);
  await runAsync(`
    CREATE VIEW v_daily_meter_summary AS
    SELECT
      date,
      COALESCE(SUM(CASE WHEN category = 'intake' THEN value ELSE 0 END), 0.0) AS intake_kl,
      COALESCE(SUM(CASE WHEN category = 'intake' AND meter_code LIKE 'BW%' THEN value ELSE 0 END), 0.0) AS borewell_kl,
      COALESCE(SUM(CASE WHEN category = 'intake' AND meter_code = 'TANKER' THEN value ELSE 0 END), 0.0) AS tanker_kl,
      COALESCE(SUM(CASE WHEN category = 'intake' AND meter_code = 'PUB_SUPPLY' THEN value ELSE 0 END), 0.0) AS public_kl,
      COALESCE(SUM(CASE WHEN category = 'intake' AND meter_code = 'IND_SUPPLY' THEN value ELSE 0 END), 0.0) AS industry_kl,
      COALESCE(SUM(CASE WHEN category = 'intake' AND meter_code = 'RAINWATER' THEN value ELSE 0 END), 0.0) AS rainwater_kl,
      COALESCE(SUM(CASE WHEN category = 'intake' AND meter_code = 'STP_REUSE' THEN value ELSE 0 END), 0.0) AS stp_reuse_kl,
      COALESCE(SUM(CASE WHEN category = 'intake' AND meter_code = 'ETP_REUSE' THEN value ELSE 0 END), 0.0) AS etp_reuse_kl,
      COALESCE(SUM(CASE WHEN category = 'process' THEN value ELSE 0 END), 0.0) AS process_kl,
      COALESCE(SUM(CASE WHEN category = 'domestic' THEN value ELSE 0 END), 0.0) AS domestic_kl,
      COALESCE(SUM(CASE WHEN category = 'garden' THEN value ELSE 0 END), 0.0) AS garden_kl,
      COALESCE(SUM(CASE WHEN category = 'outside' THEN value ELSE 0 END), 0.0) AS outside_kl,
      COALESCE(SUM(CASE WHEN category IN ('process', 'domestic', 'garden', 'outside') THEN value ELSE 0 END), 0.0) AS total_consumption_kl
    FROM meter_readings
    GROUP BY date
  `);

  await runAsync(`DROP VIEW IF EXISTS v_daily_stp_etp_summary`);
  await runAsync(`
    CREATE VIEW v_daily_stp_etp_summary AS
    SELECT
      date,
      COALESCE(SUM(CASE WHEN plant_type = 'ETP' AND field_code = 'total_effluent_kl' THEN value ELSE 0 END), 0.0) AS total_effluent_kl,
      COALESCE(SUM(CASE WHEN plant_type = 'ETP' AND field_code = 'salt_gen_mt' THEN value ELSE 0 END), 0.0) AS salt_gen_mt,
      COALESCE(SUM(CASE WHEN plant_type = 'STP' AND field_code = 'stp_generation_kl' THEN value ELSE 0 END), 0.0) AS stp_generation_kl
    FROM stp_etp_readings
    GROUP BY date
  `);

  await runAsync(`DROP VIEW IF EXISTS v_all_dates`);
  await runAsync(`
    CREATE VIEW v_all_dates AS
    SELECT DISTINCT date FROM daily_production_targets
    UNION
    SELECT DISTINCT date FROM meter_readings
    UNION
    SELECT DISTINCT date FROM stp_etp_readings
  `);

  await runAsync(`DROP VIEW IF EXISTS v_daily_kpi_report`);
  await runAsync(`
    CREATE VIEW v_daily_kpi_report AS
    SELECT
      d.date,
      ROUND(COALESCE(m.intake_kl, 0.0), 2) AS intake_kl,
      ROUND(COALESCE(m.borewell_kl, 0.0), 2) AS borewell_kl,
      ROUND(COALESCE(m.tanker_kl, 0.0), 2) AS tanker_kl,
      ROUND(COALESCE(m.public_kl, 0.0), 2) AS public_kl,
      ROUND(COALESCE(m.industry_kl, 0.0), 2) AS industry_kl,
      ROUND(COALESCE(m.rainwater_kl, 0.0), 2) AS rainwater_kl,
      ROUND(COALESCE(m.stp_reuse_kl, 0.0), 2) AS stp_reuse_kl,
      ROUND(COALESCE(m.etp_reuse_kl, 0.0), 2) AS etp_reuse_kl,
      ROUND(COALESCE(m.process_kl, 0.0), 2) AS process_kl,
      ROUND(COALESCE(m.domestic_kl, 0.0), 2) AS domestic_kl,
      ROUND(COALESCE(m.garden_kl, 0.0), 2) AS garden_kl,
      ROUND(COALESCE(m.outside_kl, 0.0), 2) AS outside_kl,
      ROUND(COALESCE(m.total_consumption_kl, 0.0), 2) AS total_consumption_kl,
      COALESCE(p.production_mt, 0.0) AS production_mt,
      COALESCE(p.manpower, 0) AS manpower,
      COALESCE(p.garden_area_m2, 2500.0) AS garden_area_m2,
      COALESCE(p.intake_target_kl, 500.0) AS intake_target_kl,
      COALESCE(p.domestic_target_kl, 60.0) AS domestic_target_kl,
      COALESCE(p.specific_total_target, 3.2) AS specific_total_target,
      COALESCE(p.specific_process_target, 2.5) AS specific_process_target,
      COALESCE(p.domestic_lpd_target, 135.0) AS domestic_lpd_target,
      COALESCE(p.garden_lpd_target, 5.0) AS garden_lpd_target,
      COALESCE(s.total_effluent_kl, 0.0) AS total_effluent_kl,
      COALESCE(s.salt_gen_mt, 0.0) AS salt_gen_mt,
      -- In-Database SQL Specific Consumption Calculations
      CASE 
        WHEN COALESCE(p.production_mt, 0.0) > 0 
        THEN ROUND(COALESCE(m.total_consumption_kl, 0.0) / p.production_mt, 2) 
        ELSE 0.0 
      END AS specific_total_kl_mt,
      CASE 
        WHEN COALESCE(p.production_mt, 0.0) > 0 
        THEN ROUND(COALESCE(m.process_kl, 0.0) / p.production_mt, 2) 
        ELSE 0.0 
      END AS specific_process_kl_mt,
      CASE 
        WHEN COALESCE(p.manpower, 0) > 0 
        THEN ROUND((COALESCE(m.domestic_kl, 0.0) * 1000.0) / p.manpower, 1) 
        ELSE 0.0 
      END AS domestic_lpd,
      CASE 
        WHEN COALESCE(p.garden_area_m2, 2500.0) > 0 
        THEN ROUND((COALESCE(m.garden_kl, 0.0) * 1000.0) / p.garden_area_m2, 2) 
        ELSE 0.0 
      END AS garden_lpd,
      CASE 
        WHEN COALESCE(p.production_mt, 0.0) > 0 
        THEN ROUND(COALESCE(s.total_effluent_kl, 0.0) / p.production_mt, 2) 
        ELSE 0.0 
      END AS specific_effluent_kl_mt,
      CASE 
        WHEN COALESCE(p.production_mt, 0.0) > 0 
        THEN ROUND(COALESCE(s.salt_gen_mt, 0.0) / p.production_mt, 3) 
        ELSE 0.0 
      END AS specific_salt_mt_mt
    FROM v_all_dates d
    LEFT JOIN daily_production_targets p ON d.date = p.date
    LEFT JOIN v_daily_meter_summary m ON d.date = m.date
    LEFT JOIN v_daily_stp_etp_summary s ON d.date = s.date
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

const dbProcedures = {
  /**
   * Stored SQL Procedure for Dashboard Metrics & Aggregations
   * All calculations are evaluated directly inside the SQLite Database Engine Views
   */
  async getDashboardData({ timeframe = 'daily', startDate, endDate, month, year } = {}) {
    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = ' WHERE date >= ? AND date <= ?';
      params.push(startDate, endDate);
    } else if (month && year) {
      dateFilter = ' WHERE strftime("%Y-%m", date) = ?';
      params.push(`${year}-${String(month).padStart(2, '0')}`);
    } else if (year) {
      dateFilter = ' WHERE strftime("%Y", date) = ?';
      params.push(String(year));
    } else {
      dateFilter = ' WHERE date >= "2026-01-01"';
    }

    // 1. Fetch daily series computed 100% in SQL View
    const dailySeries = await allAsync(
      `SELECT * FROM v_daily_kpi_report ${dateFilter} ORDER BY date ASC`,
      params
    );

    // 2. Fetch Period Summary computed 100% in SQL View
    const summaryRow = await getAsync(
      `SELECT
        COALESCE(ROUND(SUM(intake_kl), 1), 0.0) AS total_intake_kl,
        COALESCE(ROUND(SUM(total_consumption_kl), 1), 0.0) AS total_consumption_kl,
        COALESCE(ROUND(SUM(process_kl), 1), 0.0) AS total_process_kl,
        COALESCE(ROUND(SUM(domestic_kl), 1), 0.0) AS total_domestic_kl,
        COALESCE(ROUND(SUM(garden_kl), 1), 0.0) AS total_garden_kl,
        COALESCE(ROUND(SUM(outside_kl), 1), 0.0) AS total_outside_kl,
        COALESCE(ROUND(SUM(production_mt), 1), 0.0) AS total_production_mt,
        COALESCE(ROUND(AVG(specific_total_kl_mt), 2), 0.0) AS avg_specific_total,
        COALESCE(ROUND(AVG(specific_process_kl_mt), 2), 0.0) AS avg_specific_process,
        COALESCE(ROUND(AVG(domestic_lpd), 1), 0.0) AS avg_domestic_lpd,
        COALESCE(ROUND(AVG(garden_lpd), 2), 0.0) AS avg_garden_lpd,
        COALESCE(ROUND(SUM(borewell_kl), 1), 0.0) AS total_borewell,
        COALESCE(ROUND(SUM(tanker_kl), 1), 0.0) AS total_tanker,
        COALESCE(ROUND(SUM(public_kl), 1), 0.0) AS total_public,
        COALESCE(ROUND(SUM(industry_kl), 1), 0.0) AS total_industry,
        COALESCE(ROUND(SUM(rainwater_kl), 1), 0.0) AS total_rainwater,
        COALESCE(ROUND(SUM(stp_reuse_kl), 1), 0.0) AS total_stp_reuse,
        COALESCE(ROUND(SUM(etp_reuse_kl), 1), 0.0) AS total_etp_reuse
      FROM v_daily_kpi_report ${dateFilter}`,
      params
    );

    // 3. Latest KPI directly from SQL View
    const latestRow = await getAsync(`SELECT * FROM v_daily_kpi_report ORDER BY date DESC LIMIT 1`);
    const latestKPI = latestRow || {
      date: new Date().toISOString().split('T')[0],
      intake_kl: 0,
      total_consumption_kl: 0,
      process_kl: 0,
      domestic_kl: 0,
      garden_kl: 0,
      outside_kl: 0,
      specific_total_kl_mt: 0,
      specific_process_kl_mt: 0,
      domestic_lpd: 0,
      garden_lpd: 0,
      intake_target_kl: 500,
      specific_total_target: 3.2
    };

    const intakeSourceBreakdown = [
      { name: 'Borewell', value: summaryRow?.total_borewell || 0 },
      { name: 'Tanker Supply', value: summaryRow?.total_tanker || 0 },
      { name: 'Public Supply', value: summaryRow?.total_public || 0 },
      { name: 'Industry Supply', value: summaryRow?.total_industry || 0 },
      { name: 'Rainwater', value: summaryRow?.total_rainwater || 0 },
      { name: 'STP Reuse', value: summaryRow?.total_stp_reuse || 0 },
      { name: 'ETP Reuse', value: summaryRow?.total_etp_reuse || 0 }
    ];

    return {
      latestDate: latestKPI.date,
      latestKPI,
      periodSummary: summaryRow || {},
      dailySeries: dailySeries.map(row => ({
        ...row,
        intake_sources: {
          borewell: row.borewell_kl,
          tanker: row.tanker_kl,
          public: row.public_kl,
          industry: row.industry_kl,
          rainwater: row.rainwater_kl,
          stp_reuse: row.stp_reuse_kl,
          etp_reuse: row.etp_reuse_kl
        }
      })),
      intakeSourceBreakdown
    };
  },

  /**
   * Stored SQL Procedure for Readings, Meters & 7-Day Rolling Averages
   * Computes 7-day rolling average in SQL in a single fast query
   */
  async getReadingsForDate({ date, effectiveArea, user }) {
    let target = await getAsync('SELECT * FROM daily_production_targets WHERE date = ?', [date]);
    if (!target) {
      target = {
        date,
        production_mt: 0,
        manpower: 0,
        garden_area_m2: 2500,
        intake_target_kl: 500,
        domestic_target_kl: 60,
        specific_total_target: 3.2,
        specific_process_target: 2.5,
        domestic_lpd_target: 135,
        garden_lpd_target: 5.0
      };
    }

    let meterSql = `
      SELECT 
        m.id, m.code, m.name, m.category, m.area, m.unit, m.is_active, m.display_order,
        r.value AS current_value,
        COALESCE((
          SELECT ROUND(AVG(r2.value), 2)
          FROM meter_readings r2
          WHERE r2.meter_code = m.code 
            AND r2.date >= date(?, '-7 days') 
            AND r2.date < ?
        ), 0.0) AS avg_7day
      FROM meters m
      LEFT JOIN meter_readings r ON m.code = r.meter_code AND r.date = ?
      WHERE m.is_active = 1
    `;
    const meterParams = [date, date, date];
    if (effectiveArea) {
      meterSql += ' AND m.area = ?';
      meterParams.push(effectiveArea);
    }
    meterSql += ' ORDER BY m.category, m.display_order, m.code';

    const activeMeters = await allAsync(meterSql, meterParams);
    const readingsMap = {};
    activeMeters.forEach(m => {
      if (m.current_value !== null && m.current_value !== undefined) {
        readingsMap[m.code] = m.current_value;
      }
    });

    let stpEtpSql = 'SELECT plant_type, field_code, value FROM stp_etp_readings WHERE date = ?';
    const stpEtpParams = [date];
    if (user.role === 'Operator') {
      if (effectiveArea === 'STP') {
        stpEtpSql += ' AND plant_type = "STP"';
      } else if (effectiveArea === 'ETP') {
        stpEtpSql += ' AND plant_type = "ETP"';
      } else {
        stpEtpSql += ' AND plant_type = "NONE"';
      }
    }
    const stpEtpRows = await allAsync(stpEtpSql, stpEtpParams);
    const stpEtpMap = {};
    stpEtpRows.forEach(r => {
      stpEtpMap[`${r.plant_type}_${r.field_code}`] = r.value;
    });

    return {
      date,
      assignedArea: effectiveArea,
      target,
      meters: activeMeters.map(m => ({
        ...m,
        current_value: m.current_value !== null && m.current_value !== undefined ? m.current_value : ''
      })),
      readingsMap,
      stpEtpMap
    };
  }
};

module.exports = {
  db,
  dbPath,
  runAsync,
  allAsync,
  getAsync,
  withTransaction,
  checkDatabaseIntegrity,
  getDatabaseStats,
  initDB,
  dbProcedures
};

