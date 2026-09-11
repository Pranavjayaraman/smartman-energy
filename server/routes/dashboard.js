const express = require('express');
const { allAsync } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Live Dashboard & Historical metrics
router.get('/', authenticateToken, authorizeRoles('Admin', 'Viewer', 'Operator'), async (req, res) => {
  try {
    const { timeframe = 'daily', startDate, endDate, month, year } = req.query;

    const meters = await allAsync('SELECT code, name, category, area FROM meters WHERE is_active = 1');
    const meterCategoryMap = {};
    meters.forEach(m => {
      meterCategoryMap[m.code] = m.category;
    });

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
    } else if (timeframe === 'daily') {
      // Default to last 30 days of data or recent year 2026
      dateFilter = ' WHERE date >= "2026-01-01"';
    } else {
      dateFilter = ' WHERE date >= "2026-01-01"';
    }

    const productionRows = await allAsync(
      `SELECT * FROM daily_production_targets ${dateFilter} ORDER BY date ASC`,
      params
    );
    const prodMap = {};
    productionRows.forEach(p => {
      prodMap[p.date] = p;
    });

    const readingRows = await allAsync(
      `SELECT date, meter_code, category, value FROM meter_readings ${dateFilter} ORDER BY date ASC`,
      params
    );

    const stpEtpRows = await allAsync(
      `SELECT date, plant_type, field_code, value FROM stp_etp_readings ${dateFilter} ORDER BY date ASC`,
      params
    );

    const dailyMap = {};

    const allDatesSet = new Set([
      ...productionRows.map(r => r.date),
      ...readingRows.map(r => r.date),
      ...stpEtpRows.map(r => r.date)
    ]);
    const sortedDates = Array.from(allDatesSet).sort();

    sortedDates.forEach(d => {
      dailyMap[d] = {
        date: d,
        intake_kl: 0,
        intake_sources: {
          borewell: 0,
          tanker: 0,
          public: 0,
          industry: 0,
          rainwater: 0,
          stp_reuse: 0,
          etp_reuse: 0
        },
        process_kl: 0,
        domestic_kl: 0,
        garden_kl: 0,
        outside_kl: 0,
        total_consumption_kl: 0,
        production_mt: prodMap[d]?.production_mt || 0,
        manpower: prodMap[d]?.manpower || 0,
        garden_area_m2: prodMap[d]?.garden_area_m2 || 2500,
        intake_target_kl: prodMap[d]?.intake_target_kl || 500,
        domestic_target_kl: prodMap[d]?.domestic_target_kl || 60,
        specific_total_target: prodMap[d]?.specific_total_target || 3.2,
        specific_process_target: prodMap[d]?.specific_process_target || 2.5,
        domestic_lpd_target: prodMap[d]?.domestic_lpd_target || 135,
        garden_lpd_target: prodMap[d]?.garden_lpd_target || 5.0,
        total_effluent_kl: 0,
        salt_gen_mt: 0
      };
    });

    readingRows.forEach(r => {
      if (!dailyMap[r.date]) return;
      const val = parseFloat(r.value) || 0;
      const cat = r.category;
      const code = r.meter_code;

      if (cat === 'intake') {
        dailyMap[r.date].intake_kl += val;
        if (code.startsWith('BW')) dailyMap[r.date].intake_sources.borewell += val;
        else if (code === 'TANKER') dailyMap[r.date].intake_sources.tanker += val;
        else if (code === 'PUB_SUPPLY') dailyMap[r.date].intake_sources.public += val;
        else if (code === 'IND_SUPPLY') dailyMap[r.date].intake_sources.industry += val;
        else if (code === 'RAINWATER') dailyMap[r.date].intake_sources.rainwater += val;
        else if (code === 'STP_REUSE') dailyMap[r.date].intake_sources.stp_reuse += val;
        else if (code === 'ETP_REUSE') dailyMap[r.date].intake_sources.etp_reuse += val;
      } else if (cat === 'process') {
        dailyMap[r.date].process_kl += val;
      } else if (cat === 'domestic') {
        dailyMap[r.date].domestic_kl += val;
      } else if (cat === 'garden') {
        dailyMap[r.date].garden_kl += val;
      } else if (cat === 'outside') {
        dailyMap[r.date].outside_kl += val;
      }
    });

    stpEtpRows.forEach(r => {
      if (!dailyMap[r.date]) return;
      const val = parseFloat(r.value) || 0;
      if (r.plant_type === 'ETP' && r.field_code === 'total_effluent_kl') {
        dailyMap[r.date].total_effluent_kl = val;
      } else if (r.plant_type === 'ETP' && r.field_code === 'salt_gen_mt') {
        dailyMap[r.date].salt_gen_mt = val;
      }
    });

    const dailySeries = sortedDates.map(d => {
      const item = dailyMap[d];
      item.total_consumption_kl = item.process_kl + item.domestic_kl + item.garden_kl + item.outside_kl;

      const prod = item.production_mt;
      const manpower = item.manpower;
      const gardenArea = item.garden_area_m2;

      item.specific_total_kl_mt = prod > 0 ? +(item.total_consumption_kl / prod).toFixed(2) : 0;
      item.specific_process_kl_mt = prod > 0 ? +(item.process_kl / prod).toFixed(2) : 0;
      item.domestic_lpd = manpower > 0 ? +((item.domestic_kl * 1000) / manpower).toFixed(1) : 0;
      item.garden_lpd = gardenArea > 0 ? +((item.garden_kl * 1000) / gardenArea).toFixed(2) : 0;
      item.specific_effluent_kl_mt = prod > 0 ? +(item.total_effluent_kl / prod).toFixed(2) : 0;
      item.specific_salt_mt_mt = prod > 0 ? +(item.salt_gen_mt / prod).toFixed(3) : 0;

      return item;
    });

    const latestDate = sortedDates[sortedDates.length - 1] || new Date().toISOString().split('T')[0];
    const latestKPI = dailyMap[latestDate] || {
      date: latestDate,
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

    const totalDays = dailySeries.length || 1;
    const periodSummary = {
      total_intake_kl: +(dailySeries.reduce((acc, x) => acc + x.intake_kl, 0)).toFixed(1),
      total_consumption_kl: +(dailySeries.reduce((acc, x) => acc + x.total_consumption_kl, 0)).toFixed(1),
      total_process_kl: +(dailySeries.reduce((acc, x) => acc + x.process_kl, 0)).toFixed(1),
      total_domestic_kl: +(dailySeries.reduce((acc, x) => acc + x.domestic_kl, 0)).toFixed(1),
      total_garden_kl: +(dailySeries.reduce((acc, x) => acc + x.garden_kl, 0)).toFixed(1),
      total_outside_kl: +(dailySeries.reduce((acc, x) => acc + x.outside_kl, 0)).toFixed(1),
      total_production_mt: +(dailySeries.reduce((acc, x) => acc + x.production_mt, 0)).toFixed(1),
      avg_specific_total: +(dailySeries.reduce((acc, x) => acc + x.specific_total_kl_mt, 0) / totalDays).toFixed(2),
      avg_specific_process: +(dailySeries.reduce((acc, x) => acc + x.specific_process_kl_mt, 0) / totalDays).toFixed(2),
      avg_domestic_lpd: +(dailySeries.reduce((acc, x) => acc + x.domestic_lpd, 0) / totalDays).toFixed(1),
      avg_garden_lpd: +(dailySeries.reduce((acc, x) => acc + x.garden_lpd, 0) / totalDays).toFixed(2),
    };

    const intakeSourceBreakdown = [
      { name: 'Borewell', value: +(dailySeries.reduce((acc, x) => acc + x.intake_sources.borewell, 0)).toFixed(1) },
      { name: 'Tanker Supply', value: +(dailySeries.reduce((acc, x) => acc + x.intake_sources.tanker, 0)).toFixed(1) },
      { name: 'Public Supply', value: +(dailySeries.reduce((acc, x) => acc + x.intake_sources.public, 0)).toFixed(1) },
      { name: 'Industry Supply', value: +(dailySeries.reduce((acc, x) => acc + x.intake_sources.industry, 0)).toFixed(1) },
      { name: 'Rainwater', value: +(dailySeries.reduce((acc, x) => acc + x.intake_sources.rainwater, 0)).toFixed(1) },
      { name: 'STP Reuse', value: +(dailySeries.reduce((acc, x) => acc + x.intake_sources.stp_reuse, 0)).toFixed(1) },
      { name: 'ETP Reuse', value: +(dailySeries.reduce((acc, x) => acc + x.intake_sources.etp_reuse, 0)).toFixed(1) },
    ];

    res.json({
      latestDate,
      latestKPI,
      periodSummary,
      dailySeries,
      intakeSourceBreakdown
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to generate dashboard metrics' });
  }
});

module.exports = router;
