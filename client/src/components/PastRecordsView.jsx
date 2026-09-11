import React, { useState, useEffect, useMemo } from 'react';
import { getDashboardData } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  Calendar, 
  Search, 
  Filter, 
  Eye, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight, 
  Droplet, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  X,
  Layers,
  ArrowUpDown
} from 'lucide-react';

export default function PastRecordsView({ onSelectDateForEdit, onOpenExport }) {
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [dailySeries, setDailySeries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('DESC'); // DESC = newest first, ASC = oldest first
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecordDetail, setSelectedRecordDetail] = useState(null);
  const rowsPerPage = 15;

  useEffect(() => {
    fetchPastRecords();
  }, []);

  const fetchPastRecords = async () => {
    try {
      setLoading(true);
      const res = await getDashboardData({ timeframe: 'daily' });
      if (res && res.dailySeries) {
        setDailySeries(res.dailySeries);
      }
    } catch (err) {
      console.error('Failed to fetch past records:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort records
  const filteredRecords = useMemo(() => {
    return dailySeries.filter(row => {
      // Search query (matches date YYYY-MM-DD or Month name)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!row.date.toLowerCase().includes(query)) return false;
      }

      // Month filter (e.g. '2026-01', '2026-06')
      if (selectedMonth !== 'ALL') {
        if (!row.date.startsWith(selectedMonth)) return false;
      }

      // Status filter
      if (selectedStatus === 'PASS') {
        if (!(row.specific_total_kl_mt > 0 && row.specific_total_kl_mt <= 1.5)) return false;
      } else if (selectedStatus === 'HIGH') {
        if (row.specific_total_kl_mt <= 1.5) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'ASC') {
        return a.date.localeCompare(b.date);
      }
      return b.date.localeCompare(a.date);
    });
  }, [dailySeries, searchQuery, selectedMonth, selectedStatus, sortOrder]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedMonth, selectedStatus, sortOrder]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, currentPage]);

  // Summary Metrics for current filtered records
  const summary = useMemo(() => {
    const count = filteredRecords.length || 1;
    const totalIntake = filteredRecords.reduce((sum, r) => sum + r.intake_kl, 0);
    const totalCons = filteredRecords.reduce((sum, r) => sum + r.total_consumption_kl, 0);
    const totalProd = filteredRecords.reduce((sum, r) => sum + r.production_mt, 0);
    const avgRatio = filteredRecords.reduce((sum, r) => sum + r.specific_total_kl_mt, 0) / count;

    return {
      count: filteredRecords.length,
      totalIntake: +totalIntake.toFixed(1),
      totalCons: +totalCons.toFixed(1),
      totalProd: +totalProd.toFixed(1),
      avgRatio: +avgRatio.toFixed(2)
    };
  }, [filteredRecords]);

  const monthsOptions = [
    { label: t('allMonths', 'All Months (2026)'), value: 'ALL' },
    { label: 'January 2026', value: '2026-01' },
    { label: 'February 2026', value: '2026-02' },
    { label: 'March 2026', value: '2026-03' },
    { label: 'April 2026', value: '2026-04' },
    { label: 'May 2026', value: '2026-05' },
    { label: 'June 2026', value: '2026-06' },
    { label: 'July 2026', value: '2026-07' },
    { label: 'August 2026', value: '2026-08' },
    { label: 'September 2026', value: '2026-09' },
    { label: 'October 2026', value: '2026-10' },
    { label: 'November 2026', value: '2026-11' },
    { label: 'December 2026', value: '2026-12' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-cyan-500">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-2xl text-white shadow-lg shadow-cyan-500/30">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                {t('pastRecordsTitle', 'Past Water Monitoring Records (PDF Dataset)')}
              </h2>
              <p className="text-xs text-slate-300">
                {t('pastRecordsSub', 'Search and inspect 365 days of 2026 historical water records')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t('exportToExcel', 'Export to Excel')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards for Current Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-panel p-4.5 rounded-2xl border-l-4 border-cyan-500 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('totalDaysFiltered', 'Total Days Shown')}</span>
          <div className="text-2xl font-extrabold text-white font-mono">{summary.count} <span className="text-xs text-slate-400 font-normal">Days</span></div>
          <span className="text-[11px] text-cyan-300">365 Days 2026 Database Records</span>
        </div>

        <div className="glass-panel p-4.5 rounded-2xl border-l-4 border-blue-500 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('filteredIntake', 'Total Water Intake')}</span>
          <div className="text-2xl font-extrabold text-cyan-400 font-mono">{summary.totalIntake.toLocaleString()} <span className="text-xs text-slate-300">KL</span></div>
          <span className="text-[11px] text-slate-400">Total incoming water volume</span>
        </div>

        <div className="glass-panel p-4.5 rounded-2xl border-l-4 border-purple-500 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('totalConsumption', 'Total Water Used')}</span>
          <div className="text-2xl font-extrabold text-purple-300 font-mono">{summary.totalCons.toLocaleString()} <span className="text-xs text-slate-300">KL</span></div>
          <span className="text-[11px] text-slate-400">Process + Domestic + Garden + Outside</span>
        </div>

        <div className="glass-panel p-4.5 rounded-2xl border-l-4 border-emerald-500 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">{t('avgSpecificRatio', 'Average Usage Ratio')}</span>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">{summary.avgRatio} <span className="text-xs text-slate-300">KL/MT</span></div>
          <span className="text-[11px] text-slate-400">Limit: ≤ 1.5 KL/MT</span>
        </div>

      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchByDatePlaceholder', 'Type date (e.g. 2026-06-15 or 2026-03)...')}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white font-mono text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none placeholder-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          <div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white font-semibold rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            >
              {monthsOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white font-semibold rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            >
              <option value="ALL">{t('allRatios', 'All Usage Ratios')}</option>
              <option value="PASS">{t('passTarget', 'Normal Usage (≤ 1.5 KL/MT)')}</option>
              <option value="HIGH">{t('highRatio', 'High Usage (> 1.5 KL/MT)')}</option>
            </select>
          </div>

          <button
            onClick={() => setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
            className="flex items-center space-x-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold transition-all cursor-pointer"
            title="Toggle Date Order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
            <span>{sortOrder === 'DESC' ? t('newestFirst', 'Newest Date First') : t('oldestFirst', 'Oldest Date First')}</span>
          </button>

        </div>

      </div>

      {/* Main Historical Data Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead className="bg-slate-800/90 text-slate-300 uppercase tracking-wider font-extrabold border-b border-slate-700">
              <tr>
                <th className="p-3.5">{t('date', 'Date')}</th>
                <th className="p-3.5">{t('intakeKl', 'Intake (KL)')}</th>
                <th className="p-3.5">{t('processKl', 'Process (KL)')}</th>
                <th className="p-3.5">{t('domesticKl', 'Domestic (KL)')}</th>
                <th className="p-3.5">{t('gardenKl', 'Garden (KL)')}</th>
                <th className="p-3.5">{t('outsideKl', 'Outside (KL)')}</th>
                <th className="p-3.5">{t('totalConsKl', 'Total Used (KL)')}</th>
                <th className="p-3.5">{t('prodMt', 'Production (MT)')}</th>
                <th className="p-3.5">{t('ratioKlMt', 'Ratio (KL/MT)')}</th>
                <th className="p-3.5">{t('status', 'Status')}</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-slate-400 font-sans">
                    Loading historical records...
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-slate-400 font-sans">
                    No past records found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map(row => {
                  const isPass = row.specific_total_kl_mt > 0 && row.specific_total_kl_mt <= 1.5;

                  return (
                    <tr key={row.date} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-bold text-white whitespace-nowrap">{row.date}</td>
                      <td className="p-3.5 text-cyan-400 font-semibold">{row.intake_kl.toFixed(1)}</td>
                      <td className="p-3.5 text-blue-400 font-semibold">{row.process_kl.toFixed(1)}</td>
                      <td className="p-3.5 text-emerald-400 font-semibold">{row.domestic_kl.toFixed(1)}</td>
                      <td className="p-3.5 text-lime-400 font-semibold">{row.garden_kl.toFixed(1)}</td>
                      <td className="p-3.5 text-purple-400 font-semibold">{row.outside_kl.toFixed(1)}</td>
                      <td className="p-3.5 text-white font-extrabold">{row.total_consumption_kl.toFixed(1)}</td>
                      <td className="p-3.5 text-slate-300 font-semibold">{row.production_mt}</td>
                      <td className="p-3.5 text-purple-300 font-extrabold">{row.specific_total_kl_mt}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        {isPass ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            {t('pass', 'Normal')}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-950 text-amber-300 border border-amber-800">
                            {t('high', 'High')}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRecordDetail(row)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 font-semibold text-[11px] transition-all cursor-pointer inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t('viewDetails', 'View Details')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="text-slate-400">
            {t('showing', 'Showing')} <strong className="text-white">{filteredRecords.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</strong> {t('to', 'to')} <strong className="text-white">{Math.min(currentPage * rowsPerPage, filteredRecords.length)}</strong> {t('of', 'of')} <strong className="text-white">{filteredRecords.length}</strong> {t('historicalEntries', 'records')}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold">
              {t('page', 'Page')} {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecordDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700 space-y-6 max-h-[90vh] flex flex-col bg-slate-900">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-cyan-950 border border-cyan-800 text-cyan-400 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {t('dailyLogBreakdown', 'Daily Record Details:')} <span className="text-cyan-400 font-mono">{selectedRecordDetail.date}</span>
                  </h3>
                  <p className="text-xs text-slate-400">AQ TRACK 2026 Data Log</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecordDetail(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-xs font-semibold">
              
              {/* Context Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Water Intake</span>
                  <span className="text-base font-bold text-cyan-400">{selectedRecordDetail.intake_kl.toFixed(1)} KL</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Total Usage</span>
                  <span className="text-base font-bold text-blue-400">{selectedRecordDetail.total_consumption_kl.toFixed(1)} KL</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Production Output</span>
                  <span className="text-base font-bold text-white">{selectedRecordDetail.production_mt} MT</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Efficiency Ratio</span>
                  <span className="text-base font-bold text-purple-300">{selectedRecordDetail.specific_total_kl_mt} KL/MT</span>
                </div>
              </div>

              {/* Intake Sources Breakdown */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-cyan-400" />
                  Intake Sources Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex justify-between">
                    <span className="text-slate-400">Borewell (BW1+2):</span>
                    <span className="text-cyan-300 font-bold">{selectedRecordDetail.intake_sources.borewell} KL</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex justify-between">
                    <span className="text-slate-400">Tanker Water:</span>
                    <span className="text-cyan-300 font-bold">{selectedRecordDetail.intake_sources.tanker} KL</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex justify-between">
                    <span className="text-slate-400">Public Supply:</span>
                    <span className="text-cyan-300 font-bold">{selectedRecordDetail.intake_sources.public} KL</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex justify-between">
                    <span className="text-slate-400">Industry Supply:</span>
                    <span className="text-cyan-300 font-bold">{selectedRecordDetail.intake_sources.industry} KL</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex justify-between">
                    <span className="text-slate-400">Rainwater:</span>
                    <span className="text-cyan-300 font-bold">{selectedRecordDetail.intake_sources.rainwater} KL</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex justify-between">
                    <span className="text-slate-400">ETP Reuse:</span>
                    <span className="text-cyan-300 font-bold">{selectedRecordDetail.intake_sources.etp_reuse} KL</span>
                  </div>
                </div>
              </div>

              {/* Departmental Usage */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Departmental Consumption Summary
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex justify-between">
                    <span className="text-slate-400">Process Water:</span>
                    <span className="text-blue-400 font-bold">{selectedRecordDetail.process_kl.toFixed(1)} KL</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex justify-between">
                    <span className="text-slate-400">Domestic Water:</span>
                    <span className="text-emerald-400 font-bold">{selectedRecordDetail.domestic_kl.toFixed(1)} KL</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex justify-between">
                    <span className="text-slate-400">Garden Water:</span>
                    <span className="text-lime-400 font-bold">{selectedRecordDetail.garden_kl.toFixed(1)} KL</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex justify-between">
                    <span className="text-slate-400">Outside Water:</span>
                    <span className="text-purple-400 font-bold">{selectedRecordDetail.outside_kl.toFixed(1)} KL</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">AQ TRACK SQLite Database</span>
              <div className="flex items-center space-x-2">
                {onSelectDateForEdit && (
                  <button
                    onClick={() => {
                      const d = selectedRecordDetail.date;
                      setSelectedRecordDetail(null);
                      onSelectDateForEdit(d);
                    }}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
                  >
                    {t('openDateInEntry', 'Edit This Date')}
                  </button>
                )}
                <button
                  onClick={() => setSelectedRecordDetail(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {t('close', 'Close')}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
