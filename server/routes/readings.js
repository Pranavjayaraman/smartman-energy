const express = require('express');
const { allAsync, runAsync, getAsync, withTransaction } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { logSecurityEvent } = require('../middleware/security');

const router = express.Router();

// GET readings & targets for a specific date and area
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, area } = req.query;
    const user = req.user;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // 1. Enforce strict area isolation for Operators
    let effectiveArea = area;
    if (user.role === 'Operator') {
      // Operators are strictly locked to their first assigned area
      effectiveArea = user.assigned_areas && user.assigned_areas.length > 0 ? user.assigned_areas[0] : null;
    }

    // 2. Fetch Production & Targets for the date
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

    // 3. Fetch Meters strictly filtered by assigned effectiveArea for Operators
    let meterSql = 'SELECT * FROM meters WHERE is_active = 1';
    const meterParams = [];
    if (effectiveArea) {
      meterSql += ' AND area = ?';
      meterParams.push(effectiveArea);
    }
    meterSql += ' ORDER BY category, display_order, code';
    const activeMeters = await allAsync(meterSql, meterParams);

    // 4. Fetch Existing Meter Readings for date
    const existingReadings = await allAsync(
      'SELECT * FROM meter_readings WHERE date = ?',
      [date]
    );
    const readingsMap = {};
    existingReadings.forEach(r => {
      readingsMap[r.meter_code] = r.value;
    });

    // 5. Fetch STP & ETP Readings for date (filtered by plant_type matching effectiveArea if Operator)
    let stpEtpSql = 'SELECT * FROM stp_etp_readings WHERE date = ?';
    const stpEtpParams = [date];
    if (user.role === 'Operator') {
      if (effectiveArea === 'STP') {
        stpEtpSql += ' AND plant_type = "STP"';
      } else if (effectiveArea === 'ETP') {
        stpEtpSql += ' AND plant_type = "ETP"';
      } else {
        stpEtpSql += ' AND plant_type = "NONE"'; // Hide STP/ETP from intake/process/domestic operators
      }
    }
    const stpEtpRows = await allAsync(stpEtpSql, stpEtpParams);
    const stpEtpMap = {};
    stpEtpRows.forEach(r => {
      stpEtpMap[`${r.plant_type}_${r.field_code}`] = r.value;
    });

    // 6. Calculate 7-day averages per meter
    const sevenDaysAgo = new Date(new Date(date).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const avgRows = await allAsync(
      `SELECT meter_code, AVG(value) as avg_val 
       FROM meter_readings 
       WHERE date >= ? AND date < ? 
       GROUP BY meter_code`,
      [sevenDaysAgo, date]
    );
    const averagesMap = {};
    avgRows.forEach(row => {
      averagesMap[row.meter_code] = row.avg_val;
    });

    res.json({
      date,
      assignedArea: effectiveArea,
      target,
      meters: activeMeters.map(m => ({
        ...m,
        current_value: readingsMap[m.code] !== undefined ? readingsMap[m.code] : '',
        avg_7day: averagesMap[m.code] || 0
      })),
      readingsMap,
      stpEtpMap
    });
  } catch (err) {
    console.error('Fetch readings error:', err);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

// POST save / edit readings for a date (strictly scoped to assigned area)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { date, production_data, meter_readings, stp_etp_readings } = req.body;
    const user = req.user;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const isBackDating = date !== todayStr;

    if (isBackDating && user.role !== 'Admin') {
      await logSecurityEvent(user.username, 'UNAUTHORIZED_BACKDATE_ATTEMPT', 'READINGS', date, 'Operator attempted back-dated edit');
      return res.status(403).json({ error: 'Only Administrators can submit or edit readings for past/future dates.' });
    }

    const warnings = [];

    // Execute all updates inside an ACID SQLite Transaction
    await withTransaction(async ({ runAsync, getAsync }) => {
      // Upsert Production Data & Targets if provided
      if (production_data) {
        const existingTarget = await getAsync('SELECT * FROM daily_production_targets WHERE date = ?', [date]);
        await runAsync(
          `INSERT INTO daily_production_targets (
            date, production_mt, manpower, garden_area_m2, intake_target_kl, domestic_target_kl,
            specific_total_target, specific_process_target, domestic_lpd_target, garden_lpd_target, updated_by, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(date) DO UPDATE SET
            production_mt = COALESCE(excluded.production_mt, production_mt),
            manpower = COALESCE(excluded.manpower, manpower),
            garden_area_m2 = COALESCE(excluded.garden_area_m2, garden_area_m2),
            intake_target_kl = COALESCE(excluded.intake_target_kl, intake_target_kl),
            domestic_target_kl = COALESCE(excluded.domestic_target_kl, domestic_target_kl),
            specific_total_target = COALESCE(excluded.specific_total_target, specific_total_target),
            specific_process_target = COALESCE(excluded.specific_process_target, specific_process_target),
            domestic_lpd_target = COALESCE(excluded.domestic_lpd_target, domestic_lpd_target),
            garden_lpd_target = COALESCE(excluded.garden_lpd_target, garden_lpd_target),
            updated_by = excluded.updated_by,
            updated_at = CURRENT_TIMESTAMP`,
          [
            date,
            production_data.production_mt || 0,
            production_data.manpower || 0,
            production_data.garden_area_m2 || 2500,
            production_data.intake_target_kl || 500,
            production_data.domestic_target_kl || 60,
            production_data.specific_total_target || 3.2,
            production_data.specific_process_target || 2.5,
            production_data.domestic_lpd_target || 135,
            production_data.garden_lpd_target || 5.0,
            user.username
          ]
        );

        if (existingTarget && isBackDating) {
          await runAsync(
            'INSERT INTO audit_logs (username, action, entity_type, entity_id, old_value, new_value, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user.username, 'EDIT_PRODUCTION', 'TARGETS', date, JSON.stringify(existingTarget), JSON.stringify(production_data), 'Back-dated production target edit']
          );
        }
      }

      // Upsert Meter Readings
      if (meter_readings && Array.isArray(meter_readings)) {
        for (const item of meter_readings) {
          const { meter_code, category, value } = item;
          if (value === '' || value === null || value === undefined) continue;

          const numVal = parseFloat(value);
          if (isNaN(numVal) || numVal < 0) {
            throw new Error(`Invalid non-negative value for meter ${meter_code}`);
          }

          // Verify meter belongs to operator's assigned area if Operator role
          if (user.role === 'Operator') {
            const meterObj = await getAsync('SELECT area FROM meters WHERE code = ?', [meter_code]);
            if (!meterObj || !user.assigned_areas.includes(meterObj.area)) {
              await logSecurityEvent(user.username, 'UNAUTHORIZED_METER_WRITE', 'METER', meter_code, `Denied write to unassigned area meter ${meter_code}`);
              throw new Error(`Permission denied: Meter ${meter_code} does not belong to your assigned area.`);
            }
          }

          const sevenDaysAgo = new Date(new Date(date).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const avgRow = await getAsync(
            'SELECT AVG(value) as avg_val FROM meter_readings WHERE meter_code = ? AND date >= ? AND date < ?',
            [meter_code, sevenDaysAgo, date]
          );
          if (avgRow && avgRow.avg_val > 0 && numVal > 3 * avgRow.avg_val) {
            warnings.push(`Reading for ${meter_code} (${numVal} KL) is > 3x the 7-day average (${avgRow.avg_val.toFixed(1)} KL). Recorded with anomaly flag.`);
          }

          const existingReading = await getAsync('SELECT * FROM meter_readings WHERE date = ? AND meter_code = ?', [date, meter_code]);

          await runAsync(
            `INSERT INTO meter_readings (date, meter_code, category, value, entered_by, updated_at)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(date, meter_code) DO UPDATE SET
               value = excluded.value,
               entered_by = excluded.entered_by,
               updated_at = CURRENT_TIMESTAMP`,
            [date, meter_code, category, numVal, user.username]
          );

          if (existingReading) {
            await runAsync(
              'INSERT INTO audit_logs (username, action, entity_type, entity_id, old_value, new_value, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [user.username, 'UPDATE_READING', 'METER_READING', `${date}:${meter_code}`, JSON.stringify(existingReading), JSON.stringify({ value: numVal }), isBackDating ? 'Back-dated edit' : 'Reading edit']
            );
          } else {
            await runAsync(
              'INSERT INTO audit_logs (username, action, entity_type, entity_id, new_value, notes) VALUES (?, ?, ?, ?, ?, ?)',
              [user.username, 'CREATE_READING', 'METER_READING', `${date}:${meter_code}`, JSON.stringify({ value: numVal }), 'New reading entry']
            );
          }
        }
      }

      // Upsert STP / ETP Readings
      if (stp_etp_readings && Array.isArray(stp_etp_readings)) {
        for (const item of stp_etp_readings) {
          const { plant_type, field_code, value } = item;
          if (value === '' || value === null || value === undefined) continue;

          const numVal = parseFloat(value);
          if (isNaN(numVal) || numVal < 0) {
            throw new Error(`Invalid non-negative value for ${plant_type} ${field_code}`);
          }

          if (user.role === 'Operator') {
            if ((plant_type === 'STP' && !user.assigned_areas.includes('STP')) ||
                (plant_type === 'ETP' && !user.assigned_areas.includes('ETP'))) {
              await logSecurityEvent(user.username, 'UNAUTHORIZED_PLANT_WRITE', plant_type, field_code, `Denied write to unassigned plant type ${plant_type}`);
              throw new Error(`Permission denied: ${plant_type} entry is not assigned to your role.`);
            }
          }

          const existingStpEtp = await getAsync(
            'SELECT * FROM stp_etp_readings WHERE date = ? AND plant_type = ? AND field_code = ?',
            [date, plant_type, field_code]
          );

          await runAsync(
            `INSERT INTO stp_etp_readings (date, plant_type, field_code, value, entered_by, updated_at)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(date, plant_type, field_code) DO UPDATE SET
               value = excluded.value,
               entered_by = excluded.entered_by,
               updated_at = CURRENT_TIMESTAMP`,
            [date, plant_type, field_code, numVal, user.username]
          );

          if (existingStpEtp) {
            await runAsync(
              'INSERT INTO audit_logs (username, action, entity_type, entity_id, old_value, new_value, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [user.username, 'UPDATE_READING', 'STP_ETP', `${date}:${plant_type}:${field_code}`, JSON.stringify(existingStpEtp), JSON.stringify({ value: numVal }), isBackDating ? 'Back-dated edit' : 'Reading edit']
            );
          }
        }
      }
    });

    res.json({
      message: 'Readings saved successfully',
      warnings
    });
  } catch (err) {
    console.error('Save readings error:', err);
    res.status(err.message.startsWith('Permission denied') ? 403 : 400).json({ error: err.message || 'Failed to save readings' });
  }
});

module.exports = router;
