import React, { useState, useEffect } from 'react';
import { getDashboardData } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { 
  Droplet, 
  TrendingUp, 
  Target, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Layers,
  PieChart as PieIcon
} from 'lucide-react';

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#84cc16', '#a855f7'];

export default function Dashboard() {
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
  const periodSummary = data?.periodSummary || {};
  const dailySeries = data?.dailySeries || [];

  const intakeVal = latestKPI.intake_kl || 0;
  const intakeTarget = latestKPI.intake_target_kl || 3000;
  const intakePct = intakeTarget > 0 ? Math.min(100, Math.round((intakeVal / intakeTarget) * 100)) : 0;

  const specVal = latestKPI.specific_total_kl_mt || 0;
  const specTarget = latestKPI.specific_total_target || 1.5;
  const isSpecTargetPassed = specVal > 0 && specVal <= specTarget;

  // Simple category distribution pie chart data
  const categoryData = [
    { name: t('processKl', 'Process Water'), value: parseFloat((latestKPI.process_kl || 0).toFixed(1)) },
    { name: t('domesticKl', 'Domestic Water'), value: parseFloat((latestKPI.domestic_kl || 0).toFixed(1)) },
    { name: t('gardenKl', 'Garden Water'), value: parseFloat((latestKPI.garden_kl || 0).toFixed(1)) },
    { name: t('outsideKl', 'Outside Water'), value: parseFloat((latestKPI.outside_kl || 0).toFixed(1)) }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header & Simple Time Filter */}
      <div className="glass-panel p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-cyan-500">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Droplet className="w-7 h-7 text-cyan-400" />
            {t('waterOpsOverview', 'Water Operations Overview')}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {t('opsOverviewSub', 'Simple summary of daily water intake, usage, and efficiency')}
          </p>
        </div>

        {/* Filter buttons */}
        <div className="bg-slate-800 p-1.5 rounded-xl border border-slate-700 flex items-center space-x-1 text-xs">
          <button
            onClick={() => setTimeframe('daily')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              timeframe === 'daily' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('last30Days', 'All 2026 Records')}
          </button>
          <button
            onClick={() => setTimeframe('monthly')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              timeframe === 'monthly' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('monthlySummary', 'Monthly Summary')}
          </button>
        </div>
      </div>

      {/* 4 Clean Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Today's Intake */}
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-cyan-500 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-cyan-300 uppercase tracking-wider">{t('waterIntakeCard', 'Water Intake')}</span>
            <Droplet className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-3xl font-black text-white font-mono">{intakeVal.toFixed(1)} <span className="text-sm font-bold text-cyan-300">KL</span></div>
            <span className="text-xs text-slate-300 font-medium">{t('incomingWater', 'Total Water Coming In')} • Limit: {intakeTarget} KL</span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
            <div
              className={`h-full rounded-full ${intakeVal > intakeTarget ? 'bg-amber-500' : 'bg-cyan-400'}`}
              style={{ width: `${intakePct}%` }}
            />
          </div>
        </div>

        {/* Card 2: Total Consumption */}
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-blue-500 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-blue-300 uppercase tracking-wider">{t('totalConsumption', 'Total Water Used')}</span>
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-3xl font-black text-white font-mono">{(latestKPI.total_consumption_kl || 0).toFixed(1)} <span className="text-sm font-bold text-blue-300">KL</span></div>
            <span className="text-xs text-slate-300 font-medium">{t('plantUsage', 'Factory Usage (Process + Domestic)')}</span>
          </div>
          <div className="text-xs text-blue-300 font-bold bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800 inline-block">
            {t('process', 'Process')}: {(latestKPI.process_kl || 0).toFixed(0)} KL
          </div>
        </div>

        {/* Card 3: Efficiency Ratio */}
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-purple-500 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-purple-300 uppercase tracking-wider">{t('efficiencyRatio', 'Water Efficiency Ratio')}</span>
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-3xl font-black text-white font-mono">{specVal} <span className="text-sm font-bold text-purple-300">KL/MT</span></div>
            <span className="text-xs text-slate-300 font-medium">{t('targetRatio', 'Limit: ≤ 1.5 KL per MT')}</span>
          </div>
          <div>
            {isSpecTargetPassed ? (
              <span className="text-xs text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {t('goodEfficiency', 'Good (Normal Water Usage)')}
              </span>
            ) : (
              <span className="text-xs text-amber-300 font-bold flex items-center gap-1 bg-amber-950 px-2.5 py-1 rounded-lg border border-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-400" /> {t('higherThanTarget', 'High Water Usage Warning')}
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Domestic LPD */}
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-emerald-500 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">{t('domesticPerPerson', 'Water Used Per Person')}</span>
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-3xl font-black text-white font-mono">{latestKPI.domestic_lpd || 0} <span className="text-sm font-bold text-emerald-300">LPD</span></div>
            <span className="text-xs text-slate-300 font-medium">{t('litersPerPersonDay', 'Liters per worker each day')}</span>
          </div>
          <div className="text-xs text-emerald-300 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800 inline-block">
            {t('targetLpd', 'Limit: 30 LPD')} | {t('staff', 'Workers')}: {latestKPI.manpower || 0}
          </div>
        </div>

      </div>

      {/* 2 Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Simple Trend Chart (2/3 width) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">{t('dailyIntakeVsCons', 'Daily Water Intake vs. Consumption')}</h3>
              <p className="text-xs text-slate-400">{t('compareIntakeCons', 'Comparison of incoming water with factory usage')}</p>
            </div>
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="intake_kl" name={t('intakeKl', 'Intake (KL)')} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total_consumption_kl" name={t('totalConsKl', 'Total Used (KL)')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Water Usage Breakdown (1/3 width) */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div>
            <h3 className="font-bold text-white text-base">{t('whereIsWaterUsed', 'Where is Water Used?')}</h3>
            <p className="text-xs text-slate-400">{t('todayBreakdown', 'Today\'s usage by section')}</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs">
            {categoryData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 font-semibold">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx] }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-white">{item.value} KL</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Summary Table */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-white text-base">{t('recentDailyLogs', 'Recent Daily Records')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead className="bg-slate-800/90 uppercase text-slate-400">
              <tr>
                <th className="p-3">{t('date', 'Date')}</th>
                <th className="p-3">{t('intakeKl', 'Intake (KL)')}</th>
                <th className="p-3">{t('processKl', 'Process (KL)')}</th>
                <th className="p-3">{t('domesticKl', 'Domestic (KL)')}</th>
                <th className="p-3">{t('totalConsKl', 'Total Used (KL)')}</th>
                <th className="p-3">{t('prodMt', 'Production (MT)')}</th>
                <th className="p-3">{t('ratioKlMt', 'Ratio (KL/MT)')}</th>
                <th className="p-3">{t('status', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {dailySeries.slice(-7).reverse().map(row => {
                const passed = row.specific_total_kl_mt > 0 && row.specific_total_kl_mt <= 1.5;
                return (
                  <tr key={row.date} className="hover:bg-slate-800/40 font-semibold">
                    <td className="p-3 font-bold text-white">{row.date}</td>
                    <td className="p-3 text-cyan-400">{row.intake_kl.toFixed(1)}</td>
                    <td className="p-3 text-blue-400">{row.process_kl.toFixed(1)}</td>
                    <td className="p-3 text-emerald-400">{row.domestic_kl.toFixed(1)}</td>
                    <td className="p-3 text-white font-bold">{row.total_consumption_kl.toFixed(1)}</td>
                    <td className="p-3 text-slate-300">{row.production_mt}</td>
                    <td className="p-3 text-purple-400 font-bold">{row.specific_total_kl_mt}</td>
                    <td className="p-3">
                      {passed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                          {t('pass', 'Normal')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950 text-amber-400 border border-amber-800 font-bold">
                          {t('high', 'High')}
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
