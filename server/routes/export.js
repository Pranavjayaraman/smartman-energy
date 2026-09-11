const express = require('express');
const ExcelJS = require('exceljs');
const { allAsync } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/excel', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, year } = req.query;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = ' WHERE date >= ? AND date <= ?';
      params.push(startDate, endDate);
    } else if (year) {
      dateFilter = ' WHERE strftime("%Y", date) = ?';
      params.push(String(year));
    } else {
      // Default all data
    }

    // Fetch active meters
    const meters = await allAsync('SELECT * FROM meters WHERE is_active = 1 ORDER BY category, display_order, code');
    const pwMeters = meters.filter(m => m.category === 'process');
    const dwMeters = meters.filter(m => m.category === 'domestic');
    const gwMeters = meters.filter(m => m.category === 'garden');
    const owMeters = meters.filter(m => m.category === 'outside');

    // Fetch data
    const prodRows = await allAsync(`SELECT * FROM daily_production_targets ${dateFilter} ORDER BY date ASC`, params);
    const prodMap = {};
    prodRows.forEach(p => { prodMap[p.date] = p; });

    const readingRows = await allAsync(`SELECT date, meter_code, category, value FROM meter_readings ${dateFilter} ORDER BY date ASC`, params);

    const stpEtpRows = await allAsync(`SELECT date, plant_type, field_code, value FROM stp_etp_readings ${dateFilter} ORDER BY date ASC`, params);

    // Group by Date
    const allDates = Array.from(new Set([
      ...prodRows.map(r => r.date),
      ...readingRows.map(r => r.date),
      ...stpEtpRows.map(r => r.date)
    ])).sort();

    const dataByDate = {};
    allDates.forEach(d => {
      dataByDate[d] = {
        date: d,
        target: prodMap[d] || { production_mt: 0, manpower: 0, garden_area_m2: 2500, intake_target_kl: 500 },
        readings: {},
        stpEtp: {}
      };
    });

    readingRows.forEach(r => {
      if (dataByDate[r.date]) {
        dataByDate[r.date].readings[r.meter_code] = parseFloat(r.value) || 0;
      }
    });

    stpEtpRows.forEach(r => {
      if (dataByDate[r.date]) {
        dataByDate[r.date].stpEtp[`${r.plant_type}_${r.field_code}`] = parseFloat(r.value) || 0;
      }
    });

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Water Intake & Consumption Portal';
    workbook.created = new Date();

    // Helper styling
    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1F2937' } // Dark gray / navy
    };
    const headerFont = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    const borderStyle = {
      top: { style: 'thin', color: { argb: 'D1D5DB' } },
      left: { style: 'thin', color: { argb: 'D1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
      right: { style: 'thin', color: { argb: 'D1D5DB' } }
    };

    // -------------------------------------------------------------
    // SHEET 1: Water Intake
    // -------------------------------------------------------------
    const intakeSheet = workbook.addWorksheet('Water Intake');
    const intakeHeaders = [
      'Date', 'Borewell 1 (KL)', 'Borewell 2 (KL)', 'Tanker Supply (KL)',
      'Public Supply (KL)', 'Industry Supply (KL)', 'Rainwater (KL)',
      'STP Reuse (KL)', 'ETP Reuse (KL)', 'Total Intake (KL)', 'Target Intake (KL)', 'Variance (KL)'
    ];
    intakeSheet.addRow(intakeHeaders);
    intakeSheet.getRow(1).fill = headerFill;
    intakeSheet.getRow(1).font = headerFont;

    allDates.forEach(d => {
      const item = dataByDate[d];
      const r = item.readings;
      const bw1 = r['BW1'] || 0;
      const bw2 = r['BW2'] || 0;
      const tanker = r['TANKER'] || 0;
      const pub = r['PUB_SUPPLY'] || 0;
      const ind = r['IND_SUPPLY'] || 0;
      const rain = r['RAINWATER'] || 0;
      const stp = r['STP_REUSE'] || 0;
      const etp = r['ETP_REUSE'] || 0;

      const totalIntake = bw1 + bw2 + tanker + pub + ind + rain + stp + etp;
      const target = item.target.intake_target_kl || 500;
      const variance = totalIntake - target;

      const row = intakeSheet.addRow([
        d, bw1, bw2, tanker, pub, ind, rain, stp, etp, totalIntake, target, variance
      ]);
      row.eachCell(cell => { cell.border = borderStyle; });
    });

    intakeSheet.columns.forEach(col => { col.width = 16; });

    // -------------------------------------------------------------
    // SHEET 2: Consumption
    // -------------------------------------------------------------
    const consSheet = workbook.addWorksheet('Consumption');
    const consHeaders = [
      'Date', 'Production (MT)', 'Manpower', 'Garden Area (m²)',
      ...pwMeters.map(m => `${m.code} (${m.name})`), 'Total Process (KL)',
      ...dwMeters.map(m => m.code), 'Total Domestic (KL)',
      ...gwMeters.map(m => m.code), 'Total Garden (KL)',
      ...owMeters.map(m => m.code), 'Total Outside (KL)',
      'Total Consumption (KL)', 'Specific Total (KL/MT)', 'Specific Process (KL/MT)', 'Domestic LPD', 'Garden L/m²/day'
    ];
    consSheet.addRow(consHeaders);
    consSheet.getRow(1).fill = headerFill;
    consSheet.getRow(1).font = headerFont;

    allDates.forEach(d => {
      const item = dataByDate[d];
      const r = item.readings;
      const prod = item.target.production_mt || 0;
      const manpower = item.target.manpower || 0;
      const gardenArea = item.target.garden_area_m2 || 2500;

      const pwVals = pwMeters.map(m => r[m.code] || 0);
      const totalPW = pwVals.reduce((a, b) => a + b, 0);

      const dwVals = dwMeters.map(m => r[m.code] || 0);
      const totalDW = dwVals.reduce((a, b) => a + b, 0);

      const gwVals = gwMeters.map(m => r[m.code] || 0);
      const totalGW = gwVals.reduce((a, b) => a + b, 0);

      const owVals = owMeters.map(m => r[m.code] || 0);
      const totalOW = owVals.reduce((a, b) => a + b, 0);

      const totalCons = totalPW + totalDW + totalGW + totalOW;
      const specTotal = prod > 0 ? +(totalCons / prod).toFixed(2) : 0;
      const specProcess = prod > 0 ? +(totalPW / prod).toFixed(2) : 0;
      const domLpd = manpower > 0 ? +((totalDW * 1000) / manpower).toFixed(1) : 0;
      const gardLpd = gardenArea > 0 ? +((totalGW * 1000) / gardenArea).toFixed(2) : 0;

      const rowValues = [
        d, prod, manpower, gardenArea,
        ...pwVals, totalPW,
        ...dwVals, totalDW,
        ...gwVals, totalGW,
        ...owVals, totalOW,
        totalCons, specTotal, specProcess, domLpd, gardLpd
      ];
      const row = consSheet.addRow(rowValues);
      row.eachCell(cell => { cell.border = borderStyle; });
    });

    consSheet.columns.forEach(col => { col.width = 14; });

    // -------------------------------------------------------------
    // SHEET 3: Consolidated
    // -------------------------------------------------------------
    const consolSheet = workbook.addWorksheet('Consolidated');
    const consolHeaders = [
      'Date', 'Total Intake (KL)', 'Process Water (KL)', 'Domestic Water (KL)',
      'Garden Water (KL)', 'Outside Water (KL)', 'Total Consumption (KL)',
      'Production (MT)', 'Specific Total (KL/MT)', 'Specific Process (KL/MT)',
      'Domestic LPD', 'Garden Rate (L/m²/d)'
    ];
    consolSheet.addRow(consolHeaders);
    consolSheet.getRow(1).fill = headerFill;
    consolSheet.getRow(1).font = headerFont;

    allDates.forEach(d => {
      const item = dataByDate[d];
      const r = item.readings;
      const prod = item.target.production_mt || 0;
      const manpower = item.target.manpower || 0;
      const gardenArea = item.target.garden_area_m2 || 2500;

      const intake = ['BW1', 'BW2', 'TANKER', 'PUB_SUPPLY', 'IND_SUPPLY', 'RAINWATER', 'STP_REUSE', 'ETP_REUSE']
        .reduce((sum, code) => sum + (r[code] || 0), 0);

      const pw = pwMeters.reduce((sum, m) => sum + (r[m.code] || 0), 0);
      const dw = dwMeters.reduce((sum, m) => sum + (r[m.code] || 0), 0);
      const gw = gwMeters.reduce((sum, m) => sum + (r[m.code] || 0), 0);
      const ow = owMeters.reduce((sum, m) => sum + (r[m.code] || 0), 0);
      const totalCons = pw + dw + gw + ow;

      const specTotal = prod > 0 ? +(totalCons / prod).toFixed(2) : 0;
      const specProcess = prod > 0 ? +(pw / prod).toFixed(2) : 0;
      const domLpd = manpower > 0 ? +((dw * 1000) / manpower).toFixed(1) : 0;
      const gardLpd = gardenArea > 0 ? +((gw * 1000) / gardenArea).toFixed(2) : 0;

      const row = consolSheet.addRow([
        d, intake, pw, dw, gw, ow, totalCons, prod, specTotal, specProcess, domLpd, gardLpd
      ]);
      row.eachCell(cell => { cell.border = borderStyle; });
    });

    consolSheet.columns.forEach(col => { col.width = 16; });

    // -------------------------------------------------------------
    // SHEET 4: STP
    // -------------------------------------------------------------
    const stpSheet = workbook.addWorksheet('STP');
    stpSheet.addRow(['Date', 'Inlet Sources (KL)', 'STP Water Generation (KL)', 'Recycle to Process (KL)', 'Recycle to Garden (KL)']);
    stpSheet.getRow(1).fill = headerFill;
    stpSheet.getRow(1).font = headerFont;

    allDates.forEach(d => {
      const s = dataByDate[d].stpEtp;
      const row = stpSheet.addRow([
        d,
        s['STP_stp_inlet_kl'] || 0,
        s['STP_stp_generation_kl'] || 0,
        s['STP_stp_recycle_process_kl'] || 0,
        s['STP_stp_recycle_garden_kl'] || 0
      ]);
      row.eachCell(cell => { cell.border = borderStyle; });
    });
    stpSheet.columns.forEach(col => { col.width = 22; });

    // -------------------------------------------------------------
    // SHEET 5: ETP
    // -------------------------------------------------------------
    const etpSheet = workbook.addWorksheet('ETP');
    etpSheet.addRow([
      'Date', 'Effluent PW1 (KL)', 'Effluent PW2 (KL)', 'Effluent PW3 (KL)',
      'Total Effluent (KL)', 'RO Feed (KL)', 'Permeate (KL)', 'Reject (KL)',
      'MEE Condensate (KL)', 'Salt Generation (MT)', 'Specific Effluent (KL/MT)', 'Specific Salt (MT/MT)'
    ]);
    etpSheet.getRow(1).fill = headerFill;
    etpSheet.getRow(1).font = headerFont;

    allDates.forEach(d => {
      const s = dataByDate[d].stpEtp;
      const prod = dataByDate[d].target.production_mt || 0;
      const totalEff = s['ETP_total_effluent_kl'] || 0;
      const saltGen = s['ETP_salt_gen_mt'] || 0;
      const specEff = prod > 0 ? +(totalEff / prod).toFixed(2) : 0;
      const specSalt = prod > 0 ? +(saltGen / prod).toFixed(3) : 0;

      const row = etpSheet.addRow([
        d,
        s['ETP_eff_pw1_kl'] || 0,
        s['ETP_eff_pw2_kl'] || 0,
        s['ETP_eff_pw3_kl'] || 0,
        totalEff,
        s['ETP_ro_feed_kl'] || 0,
        s['ETP_permeate_kl'] || 0,
        s['ETP_reject_kl'] || 0,
        s['ETP_mee_condensate_kl'] || 0,
        saltGen,
        specEff,
        specSalt
      ]);
      row.eachCell(cell => { cell.border = borderStyle; });
    });
    etpSheet.columns.forEach(col => { col.width = 18; });

    // -------------------------------------------------------------
    // SHEET 6: Dashboard Summary
    // -------------------------------------------------------------
    const dashSheet = workbook.addWorksheet('Dashboard Summary');
    dashSheet.addRow(['WATER INTAKE & CONSUMPTION AUDIT REPORT SUMMARY']);
    dashSheet.getRow(1).font = { name: 'Arial', size: 14, bold: true, color: { argb: '1F2937' } };

    dashSheet.addRow([]);
    dashSheet.addRow(['Report Date Range:', `${allDates[0] || 'N/A'} to ${allDates[allDates.length - 1] || 'N/A'}`]);
    dashSheet.addRow(['Total Days Tracked:', allDates.length]);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Water_Monitoring_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export Excel file' });
  }
});

module.exports = router;
