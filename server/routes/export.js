const express = require('express');
const ExcelJS = require('exceljs');
const { allAsync } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/excel', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, year, area } = req.query;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = ' WHERE date >= ? AND date <= ?';
      params.push(startDate, endDate);
    } else if (year) {
      dateFilter = ' WHERE strftime("%Y", date) = ?';
      params.push(String(year));
    }

    // Fetch active meters
    const meters = await allAsync('SELECT * FROM meters WHERE is_active = 1 ORDER BY category, display_order, code');
    const intakeMeters = meters.filter(m => m.category === 'intake');
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
        target: prodMap[d] || { 
          production_mt: 0, 
          manpower: 0, 
          garden_area_m2: 2500, 
          intake_target_kl: 500,
          domestic_target_kl: 60,
          specific_total_target: 3.2,
          specific_process_target: 2.5,
          domestic_lpd_target: 135,
          garden_lpd_target: 5.0
        },
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
    workbook.creator = 'AQ TRACK - Industrial Water Monitoring System';
    workbook.created = new Date();

    // Standard Styles
    const primaryHeaderFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '0F172A' } // Slate 900
    };
    const accentHeaderFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '065F46' } // Emerald 800
    };
    const headerFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    const borderStyle = {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } }
    };
    const numFmtNumber = '#,##0.00';
    const numFmtInteger = '#,##0';

    const applySheetFormatting = (sheet, minWidth = 14) => {
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
      sheet.columns.forEach(column => {
        let maxLen = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const len = cell.value ? String(cell.value).length : 0;
          if (len > maxLen) maxLen = len;
        });
        column.width = Math.max(maxLen + 4, minWidth);
      });
    };

    // Normalize area selector
    const selectedArea = (area || 'all').toLowerCase().trim();

    // -------------------------------------------------------------
    // BUILDERS FOR EACH AREA SHEET
    // -------------------------------------------------------------

    // 1. EXECUTIVE / DASHBOARD SUMMARY
    const buildSummarySheet = () => {
      const sheet = workbook.addWorksheet('Overview Summary');
      sheet.addRow(['AQ TRACK - INDUSTRIAL WATER MONITORING & OPERATIONS REPORT']);
      sheet.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: '0F172A' } };
      sheet.addRow([]);

      const startDateLabel = allDates[0] || 'N/A';
      const endDateLabel = allDates[allDates.length - 1] || 'N/A';
      sheet.addRow(['Report Filter:', selectedArea === 'all' ? 'Overall All Areas History' : `Area: ${area}`]);
      sheet.addRow(['Date Range:', `${startDateLabel} to ${endDateLabel}`]);
      sheet.addRow(['Total Days Tracked:', allDates.length]);
      sheet.addRow(['Generated On:', new Date().toLocaleString()]);
      sheet.addRow([]);

      // Aggregate totals
      let sumIntake = 0;
      let sumPW = 0;
      let sumDW = 0;
      let sumGW = 0;
      let sumOW = 0;
      let sumProd = 0;

      allDates.forEach(d => {
        const item = dataByDate[d];
        const r = item.readings;
        intakeMeters.forEach(m => { sumIntake += (r[m.code] || 0); });
        pwMeters.forEach(m => { sumPW += (r[m.code] || 0); });
        dwMeters.forEach(m => { sumDW += (r[m.code] || 0); });
        gwMeters.forEach(m => { sumGW += (r[m.code] || 0); });
        owMeters.forEach(m => { sumOW += (r[m.code] || 0); });
        sumProd += (item.target.production_mt || 0);
      });

      const totalCons = sumPW + sumDW + sumGW + sumOW;
      const avgSpecCons = sumProd > 0 ? (totalCons / sumProd).toFixed(2) : '0.00';

      const metricsHeaderRow = sheet.addRow(['KEY OPERATIONAL KPI METRICS', 'TOTAL ACCUMULATED', 'UNIT']);
      metricsHeaderRow.fill = primaryHeaderFill;
      metricsHeaderRow.font = headerFont;

      const metricRows = [
        ['Total Water Intake', +sumIntake.toFixed(2), 'KL'],
        ['Total Water Consumption', +totalCons.toFixed(2), 'KL'],
        ['Process Water Consumption', +sumPW.toFixed(2), 'KL'],
        ['Domestic Water Consumption', +sumDW.toFixed(2), 'KL'],
        ['Garden Water Consumption', +sumGW.toFixed(2), 'KL'],
        ['Outside Water Consumption', +sumOW.toFixed(2), 'KL'],
        ['Total Production Output', +sumProd.toFixed(2), 'MT'],
        ['Overall Specific Water Consumption', +avgSpecCons, 'KL/MT']
      ];

      metricRows.forEach(rowVals => {
        const r = sheet.addRow(rowVals);
        r.eachCell(c => { c.border = borderStyle; });
      });

      applySheetFormatting(sheet, 20);
    };

    // 2. WATER INTAKE SHEET
    const buildIntakeSheet = () => {
      const sheet = workbook.addWorksheet('Water Intake');
      const meterHeaders = intakeMeters.map(m => `${m.code} (${m.name})`);
      const headers = ['Date', ...meterHeaders, 'Total Intake (KL)', 'Intake Target (KL)', 'Variance (KL)', 'Status'];
      
      const headerRow = sheet.addRow(headers);
      headerRow.fill = primaryHeaderFill;
      headerRow.font = headerFont;

      allDates.forEach(d => {
        const item = dataByDate[d];
        const r = item.readings;
        const intakeVals = intakeMeters.map(m => r[m.code] || 0);
        const totalIntake = intakeVals.reduce((a, b) => a + b, 0);
        const target = item.target.intake_target_kl || 500;
        const variance = +(totalIntake - target).toFixed(2);
        const status = totalIntake <= target ? 'Optimal' : 'Exceeded Target';

        const row = sheet.addRow([
          d,
          ...intakeVals,
          +totalIntake.toFixed(2),
          +target.toFixed(2),
          variance,
          status
        ]);
        row.eachCell(cell => { cell.border = borderStyle; });
      });

      applySheetFormatting(sheet, 16);
    };

    // 3. PROCESS WATER SHEET
    const buildProcessSheet = () => {
      const sheet = workbook.addWorksheet('Process Water');
      const meterHeaders = pwMeters.map(m => `${m.code} (${m.name})`);
      const headers = ['Date', 'Daily Production (MT)', ...meterHeaders, 'Total Process (KL)', 'Process Target (KL/MT)', 'Actual Specific (KL/MT)'];

      const headerRow = sheet.addRow(headers);
      headerRow.fill = accentHeaderFill;
      headerRow.font = headerFont;

      allDates.forEach(d => {
        const item = dataByDate[d];
        const r = item.readings;
        const prod = item.target.production_mt || 0;
        const pwVals = pwMeters.map(m => r[m.code] || 0);
        const totalPW = pwVals.reduce((a, b) => a + b, 0);
        const specProcess = prod > 0 ? +(totalPW / prod).toFixed(2) : 0;
        const targetSpec = item.target.specific_process_target || 2.5;

        const row = sheet.addRow([
          d,
          prod,
          ...pwVals,
          +totalPW.toFixed(2),
          targetSpec,
          specProcess
        ]);
        row.eachCell(cell => { cell.border = borderStyle; });
      });

      applySheetFormatting(sheet, 16);
    };

    // 4. DOMESTIC WATER SHEET
    const buildDomesticSheet = () => {
      const sheet = workbook.addWorksheet('Domestic Water');
      const meterHeaders = dwMeters.map(m => `${m.code} (${m.name})`);
      const headers = ['Date', 'Manpower Count', ...meterHeaders, 'Total Domestic (KL)', 'Target LPD', 'Actual Domestic (LPD)'];

      const headerRow = sheet.addRow(headers);
      headerRow.fill = primaryHeaderFill;
      headerRow.font = headerFont;

      allDates.forEach(d => {
        const item = dataByDate[d];
        const r = item.readings;
        const manpower = item.target.manpower || 0;
        const dwVals = dwMeters.map(m => r[m.code] || 0);
        const totalDW = dwVals.reduce((a, b) => a + b, 0);
        const actualLpd = manpower > 0 ? +((totalDW * 1000) / manpower).toFixed(1) : 0;
        const targetLpd = item.target.domestic_lpd_target || 135;

        const row = sheet.addRow([
          d,
          manpower,
          ...dwVals,
          +totalDW.toFixed(2),
          targetLpd,
          actualLpd
        ]);
        row.eachCell(cell => { cell.border = borderStyle; });
      });

      applySheetFormatting(sheet, 16);
    };

    // 5. GARDEN WATER SHEET
    const buildGardenSheet = () => {
      const sheet = workbook.addWorksheet('Garden Water');
      const meterHeaders = gwMeters.map(m => `${m.code} (${m.name})`);
      const headers = ['Date', 'Garden Area (m²)', ...meterHeaders, 'Total Garden (KL)', 'Target L/m²/d', 'Actual Garden Rate (L/m²/d)'];

      const headerRow = sheet.addRow(headers);
      headerRow.fill = accentHeaderFill;
      headerRow.font = headerFont;

      allDates.forEach(d => {
        const item = dataByDate[d];
        const r = item.readings;
        const gardenArea = item.target.garden_area_m2 || 2500;
        const gwVals = gwMeters.map(m => r[m.code] || 0);
        const totalGW = gwVals.reduce((a, b) => a + b, 0);
        const actualRate = gardenArea > 0 ? +((totalGW * 1000) / gardenArea).toFixed(2) : 0;
        const targetRate = item.target.garden_lpd_target || 5.0;

        const row = sheet.addRow([
          d,
          gardenArea,
          ...gwVals,
          +totalGW.toFixed(2),
          targetRate,
          actualRate
        ]);
        row.eachCell(cell => { cell.border = borderStyle; });
      });

      applySheetFormatting(sheet, 16);
    };

    // 6. OUTSIDE WATER SHEET
    const buildOutsideSheet = () => {
      const sheet = workbook.addWorksheet('Outside Water');
      const meterHeaders = owMeters.map(m => `${m.code} (${m.name})`);
      const headers = ['Date', ...meterHeaders, 'Total Outside Consumption (KL)'];

      const headerRow = sheet.addRow(headers);
      headerRow.fill = primaryHeaderFill;
      headerRow.font = headerFont;

      allDates.forEach(d => {
        const item = dataByDate[d];
        const r = item.readings;
        const owVals = owMeters.map(m => r[m.code] || 0);
        const totalOW = owVals.reduce((a, b) => a + b, 0);

        const row = sheet.addRow([
          d,
          ...owVals,
          +totalOW.toFixed(2)
        ]);
        row.eachCell(cell => { cell.border = borderStyle; });
      });

      applySheetFormatting(sheet, 18);
    };

    // 7. STP PLANT SHEET
    const buildStpSheet = () => {
      const sheet = workbook.addWorksheet('STP Plant');
      const headers = ['Date', 'Inlet Sources (KL)', 'STP Water Generation (KL)', 'Recycle to Process (KL)', 'Recycle to Garden (KL)', 'Total Recycled (KL)'];

      const headerRow = sheet.addRow(headers);
      headerRow.fill = accentHeaderFill;
      headerRow.font = headerFont;

      allDates.forEach(d => {
        const s = dataByDate[d].stpEtp;
        const inlet = s['STP_stp_inlet_kl'] || 0;
        const gen = s['STP_stp_generation_kl'] || 0;
        const recProc = s['STP_stp_recycle_process_kl'] || 0;
        const recGard = s['STP_stp_recycle_garden_kl'] || 0;
        const totRec = +(recProc + recGard).toFixed(2);

        const row = sheet.addRow([
          d,
          inlet,
          gen,
          recProc,
          recGard,
          totRec
        ]);
        row.eachCell(cell => { cell.border = borderStyle; });
      });

      applySheetFormatting(sheet, 20);
    };

    // 8. ETP PLANT SHEET
    const buildEtpSheet = () => {
      const sheet = workbook.addWorksheet('ETP Plant');
      const headers = [
        'Date', 'Daily Production (MT)', 'Effluent PW1 (KL)', 'Effluent PW2 (KL)', 'Effluent PW3 (KL)',
        'Total Effluent (KL)', 'RO Feed (KL)', 'Permeate (KL)', 'Reject (KL)',
        'MEE Condensate (KL)', 'Salt Generation (MT)', 'Specific Effluent (KL/MT)', 'Specific Salt (MT/MT)'
      ];

      const headerRow = sheet.addRow(headers);
      headerRow.fill = primaryHeaderFill;
      headerRow.font = headerFont;

      allDates.forEach(d => {
        const s = dataByDate[d].stpEtp;
        const prod = dataByDate[d].target.production_mt || 0;
        const totalEff = s['ETP_total_effluent_kl'] || 0;
        const saltGen = s['ETP_salt_gen_mt'] || 0;
        const specEff = prod > 0 ? +(totalEff / prod).toFixed(2) : 0;
        const specSalt = prod > 0 ? +(saltGen / prod).toFixed(3) : 0;

        const row = sheet.addRow([
          d,
          prod,
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

      applySheetFormatting(sheet, 18);
    };

    // 9. PRODUCTION & TARGETS SHEET
    const buildProductionSheet = () => {
      const sheet = workbook.addWorksheet('Production & Targets');
      const headers = [
        'Date', 'Production (MT)', 'Manpower', 'Garden Area (m²)',
        'Intake Target (KL)', 'Domestic Target (KL)', 'Specific Total Target (KL/MT)',
        'Specific Process Target (KL/MT)', 'Domestic Target (LPD)', 'Garden Target (L/m²/d)', 'Updated By'
      ];

      const headerRow = sheet.addRow(headers);
      headerRow.fill = accentHeaderFill;
      headerRow.font = headerFont;

      allDates.forEach(d => {
        const t = dataByDate[d].target;
        const row = sheet.addRow([
          d,
          t.production_mt || 0,
          t.manpower || 0,
          t.garden_area_m2 || 2500,
          t.intake_target_kl || 500,
          t.domestic_target_kl || 60,
          t.specific_total_target || 3.2,
          t.specific_process_target || 2.5,
          t.domestic_lpd_target || 135,
          t.garden_lpd_target || 5.0,
          t.updated_by || 'System'
        ]);
        row.eachCell(cell => { cell.border = borderStyle; });
      });

      applySheetFormatting(sheet, 18);
    };

    // 10. CONSOLIDATED BALANCE SHEET
    const buildConsolidatedSheet = () => {
      const sheet = workbook.addWorksheet('Consolidated Balance');
      const headers = [
        'Date', 'Total Intake (KL)', 'Process Water (KL)', 'Domestic Water (KL)',
        'Garden Water (KL)', 'Outside Water (KL)', 'Total Consumption (KL)',
        'Production (MT)', 'Specific Total (KL/MT)', 'Specific Process (KL/MT)',
        'Domestic LPD', 'Garden Rate (L/m²/d)'
      ];

      const headerRow = sheet.addRow(headers);
      headerRow.fill = primaryHeaderFill;
      headerRow.font = headerFont;

      allDates.forEach(d => {
        const item = dataByDate[d];
        const r = item.readings;
        const prod = item.target.production_mt || 0;
        const manpower = item.target.manpower || 0;
        const gardenArea = item.target.garden_area_m2 || 2500;

        const intake = intakeMeters.reduce((sum, m) => sum + (r[m.code] || 0), 0);
        const pw = pwMeters.reduce((sum, m) => sum + (r[m.code] || 0), 0);
        const dw = dwMeters.reduce((sum, m) => sum + (r[m.code] || 0), 0);
        const gw = gwMeters.reduce((sum, m) => sum + (r[m.code] || 0), 0);
        const ow = owMeters.reduce((sum, m) => sum + (r[m.code] || 0), 0);
        const totalCons = pw + dw + gw + ow;

        const specTotal = prod > 0 ? +(totalCons / prod).toFixed(2) : 0;
        const specProcess = prod > 0 ? +(pw / prod).toFixed(2) : 0;
        const domLpd = manpower > 0 ? +((dw * 1000) / manpower).toFixed(1) : 0;
        const gardLpd = gardenArea > 0 ? +((gw * 1000) / gardenArea).toFixed(2) : 0;

        const row = sheet.addRow([
          d,
          +intake.toFixed(2),
          +pw.toFixed(2),
          +dw.toFixed(2),
          +gw.toFixed(2),
          +ow.toFixed(2),
          +totalCons.toFixed(2),
          prod,
          specTotal,
          specProcess,
          domLpd,
          gardLpd
        ]);
        row.eachCell(cell => { cell.border = borderStyle; });
      });

      applySheetFormatting(sheet, 16);
    };

    // -------------------------------------------------------------
    // SHEET COMPOSITION BASED ON USER AREA SELECTION
    // -------------------------------------------------------------
    if (selectedArea === 'water intake' || selectedArea === 'intake') {
      buildSummarySheet();
      buildIntakeSheet();
    } else if (selectedArea === 'process water' || selectedArea === 'process') {
      buildSummarySheet();
      buildProcessSheet();
    } else if (selectedArea === 'domestic water' || selectedArea === 'domestic') {
      buildSummarySheet();
      buildDomesticSheet();
    } else if (selectedArea === 'garden water' || selectedArea === 'garden') {
      buildSummarySheet();
      buildGardenSheet();
    } else if (selectedArea === 'domestic & garden water' || selectedArea === 'domestic_garden') {
      buildSummarySheet();
      buildDomesticSheet();
      buildGardenSheet();
    } else if (selectedArea === 'outside water' || selectedArea === 'outside') {
      buildSummarySheet();
      buildOutsideSheet();
    } else if (selectedArea === 'stp') {
      buildSummarySheet();
      buildStpSheet();
    } else if (selectedArea === 'etp') {
      buildSummarySheet();
      buildEtpSheet();
    } else if (selectedArea === 'production' || selectedArea === 'production & targets') {
      buildSummarySheet();
      buildProductionSheet();
    } else if (selectedArea === 'consolidated') {
      buildSummarySheet();
      buildConsolidatedSheet();
    } else {
      // ALL AREAS: Build full complete multi-sheet ledger
      buildSummarySheet();
      buildIntakeSheet();
      buildProcessSheet();
      buildDomesticSheet();
      buildGardenSheet();
      buildOutsideSheet();
      buildStpSheet();
      buildEtpSheet();
      buildProductionSheet();
      buildConsolidatedSheet();
    }

    // Generate output binary buffer
    const buffer = await workbook.xlsx.writeBuffer();

    let cleanAreaTag = 'All_Areas';
    if (selectedArea !== 'all') {
      cleanAreaTag = selectedArea.replace(/[^a-zA-Z0-9]/g, '_');
    }

    const filename = `AQ_TRACK_${cleanAreaTag}_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.byteLength || buffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export Excel file: ' + (err.message || 'Unknown error') });
  }
});

module.exports = router;
