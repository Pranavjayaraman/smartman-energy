import React, { useState, useEffect } from 'react';
import { getDashboardData } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  Droplets, 
  TrendingUp, 
  Target, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  FileSpreadsheet
} from 'lucide-react';

const CATEGORY_COLORS = ['#0284c7', '#0ea5e9', '#0d9488', '#6366f1'];

export default function Dashboard({ onOpenExport }) {
  const { t } = useLanguage();
  const [timeframe, setTimeframe] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, [timeframe]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await getDashboardData({ timeframe });
      setData(res);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const latestKPI = data?.latestKPI || {};
  const dailySeries = data?.dailySeries || [];

  const intakeVal = latestKPI.intake_kl || 0;
  const intakeTarget = latestKPI.intake_target_kl || 3000;
  const intakePct = intakeTarget > 0 ? Math.min(100, Math.round((intakeVal / intakeTarget) * 100)) : 0;

  const specVal = latestKPI.specific_total_kl_mt || 0;
  const specTarget = latestKPI.specific_total_target || 1.5;
  const isSpecTargetPassed = specVal > 0 && specVal <= specTarget;

  const categoryData = [
    { name: t('processKl', 'Process Water'), value: parseFloat((latestKPI.process_kl || 0).toFixed(1)) },
    { name: t('domesticKl', 'Domestic Water'), value: parseFloat((latestKPI.domestic_kl || 0).toFixed(1)) },
    { name: t('gardenKl', 'Garden Water'), value: parseFloat((latestKPI.garden_kl || 0).toFixed(1)) },
    { name: t('outsideKl', 'Outside Water'), value: parseFloat((latestKPI.outside_kl || 0).toFixed(1)) }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 border-l-4 border-l-sky-600 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Droplets className="w-6 h-6 text-sky-600" />
            {t('waterOpsOverview', 'Water Operations Overview')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('opsOverviewSub', 'Daily water intake balance, consumption analytics, and ratio compliance')}
          </p>
        </div>

        {/* Filter buttons & Excel Export Trigger */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Export Full Excel Ledger or Area Worksheets"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          )}

          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center space-x-1 text-xs">
            <button
              onClick={() => setTimeframe('daily')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                timeframe === 'daily' ? 'bg-white text-sky-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('last30Days', 'All 2026 Records')}
            </button>
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                timeframe === 'monthly' ? 'bg-white text-sky-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('monthlySummary', 'Monthly Summary')}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Water Intake */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 border-l-4 border-l-sky-500 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('waterIntakeCard', 'Water Intake')}</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Droplets className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
              {intakeVal.toFixed(1)} <span className="text-xs font-semibold text-sky-700 font-sans">KL</span>
            </div>
            <span className="text-xs text-slate-500">Incoming Supply • Limit: {intakeTarget} KL</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${intakeVal > intakeTarget ? 'bg-amber-500' : 'bg-sky-500'}`}
              style={{ width: `${intakePct}%` }}
            />
          </div>
        </div>

        {/* Card 2: Total Consumption */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 border-l-4 border-l-blue-600 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('totalConsumption', 'Total Water Used')}</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
              {(latestKPI.total_consumption_kl || 0).toFixed(1)} <span className="text-xs font-semibold text-blue-700 font-sans">KL</span>
            </div>
            <span className="text-xs text-slate-500">Plant Usage (Process + Domestic)</span>
          </div>
          <div className="text-xs text-blue-800 font-medium bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 inline-block">
            {t('process', 'Process')}: {(latestKPI.process_kl || 0).toFixed(0)} KL
          </div>
        </div>

        {/* Card 3: Specific Ratio */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 border-l-4 border-l-indigo-500 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('efficiencyRatio', 'Specific Ratio')}</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Target className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
              {specVal} <span className="text-xs font-semibold text-indigo-700 font-sans">KL/MT</span>
            </div>
            <span className="text-xs text-slate-500">Standard Baseline: ≤ {specTarget} KL/MT</span>
          </div>
          <div>
            {isSpecTargetPassed ? (
              <span className="text-xs text-emerald-800 font-semibold inline-flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {t('goodEfficiency', 'Compliant Target')}
              </span>
            ) : (
              <span className="text-xs text-amber-800 font-semibold inline-flex items-center gap-1 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> {t('higherThanTarget', 'Elevated Consumption')}
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Domestic LPD */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 border-l-4 border-l-teal-500 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('domesticPerPerson', 'Domestic Usage')}</span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
              {latestKPI.domestic_lpd || 0} <span className="text-xs font-semibold text-teal-700 font-sans">LPD</span>
            </div>
            <span className="text-xs text-slate-500">Liters per person per day</span>
          </div>
          <div className="text-xs text-teal-800 font-medium bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100 inline-block">
            Limit: 30 LPD • Manpower: {latestKPI.manpower || 0}
          </div>
        </div>

      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{t('dailyIntakeVsCons', 'Daily Water Intake vs. Consumption')}</h3>
              <p className="text-xs text-slate-500">{t('compareIntakeCons', 'Comparison of total raw water vs total plant consumption (KL)')}</p>
            </div>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    borderColor: '#cbd5e1', 
                    borderRadius: '8px', 
                    color: '#0f172a',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar isAnimationActive={false} dataKey="intake_kl" name={t('intakeKl', 'Intake (KL)')} fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar isAnimationActive={false} dataKey="total_consumption_kl" name={t('totalConsKl', 'Total Used (KL)')} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Pie Chart (1/3 width) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{t('whereIsWaterUsed', 'Consumption Breakdown')}</h3>
            <p className="text-xs text-slate-500">{t('todayBreakdown', 'Proportional volume distribution')}</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  isAnimationActive={false}
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    borderColor: '#cbd5e1', 
                    borderRadius: '8px', 
                    color: '#0f172a',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs">
            {categoryData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 font-medium">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx] }} />
                  <span className="text-slate-700">{item.name}</span>
                </div>
                <span className="font-mono font-semibold text-slate-900">{item.value} KL</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">{t('recentDailyLogs', 'Recent Operational Records')}</h3>
          <span className="text-xs text-slate-500">Showing latest 7 entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-sky-50/70 border-b border-sky-100 text-sky-900 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">{t('date', 'Date')}</th>
                <th className="py-3 px-4">{t('intakeKl', 'Intake (KL)')}</th>
                <th className="py-3 px-4">{t('processKl', 'Process (KL)')}</th>
                <th className="py-3 px-4">{t('domesticKl', 'Domestic (KL)')}</th>
                <th className="py-3 px-4">{t('totalConsKl', 'Total Used (KL)')}</th>
                <th className="py-3 px-4">{t('prodMt', 'Production (MT)')}</th>
                <th className="py-3 px-4">{t('ratioKlMt', 'Ratio (KL/MT)')}</th>
                <th className="py-3 px-4">{t('status', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailySeries.slice(-7).reverse().map(row => {
                const passed = row.specific_total_kl_mt > 0 && row.specific_total_kl_mt <= 1.5;
                return (
                  <tr key={row.date} className="hover:bg-slate-50 transition-colors font-mono">
                    <td className="py-3 px-4 font-bold text-slate-900 font-sans">{row.date}</td>
                    <td className="py-3 px-4 text-sky-700 font-semibold">{row.intake_kl.toFixed(1)}</td>
                    <td className="py-3 px-4 text-slate-700">{row.process_kl.toFixed(1)}</td>
                    <td className="py-3 px-4 text-slate-700">{row.domestic_kl.toFixed(1)}</td>
                    <td className="py-3 px-4 text-slate-900 font-bold">{row.total_consumption_kl.toFixed(1)}</td>
                    <td className="py-3 px-4 text-slate-600">{row.production_mt}</td>
                    <td className="py-3 px-4 text-indigo-700 font-bold">{row.specific_total_kl_mt}</td>
                    <td className="py-3 px-4 font-sans">
                      {passed ? (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                          {t('pass', 'Compliant')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                          {t('high', 'Elevated')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
