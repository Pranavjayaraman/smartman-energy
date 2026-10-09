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
  Droplets, 
  CheckCircle2, 
  AlertTriangle,
  X,
  Layers,
  ArrowUpDown,
  Edit3
} from 'lucide-react';

export default function PastRecordsView({ onSelectDateForEdit, onOpenExport }) {
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [dailySeries, setDailySeries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('DESC');
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

  const filteredRecords = useMemo(() => {
    return dailySeries.filter(row => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!row.date.toLowerCase().includes(query)) return false;
      }

      if (selectedMonth !== 'ALL') {
        if (!row.date.startsWith(selectedMonth)) return false;
      }

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedMonth, selectedStatus, sortOrder]);

  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, currentPage]);

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
      <div className="bg-white p-6 rounded-xl border border-slate-200 border-l-4 border-l-sky-600 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {t('pastRecordsTitle', 'Past Water Records & Historical Dataset')}
              </h2>
              <p className="text-xs text-slate-500">
                {t('pastRecordsSub', 'Search and audit daily water logs across the 2026 operational calendar')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="flex items-center space-x-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t('exportToExcel', 'Export to Excel')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-l-4 border-l-sky-500 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{t('totalDaysFiltered', 'Records Found')}</span>
          <div className="text-2xl font-bold text-slate-900 font-mono">{summary.count} <span className="text-xs text-slate-500 font-sans">Days</span></div>
          <span className="text-[11px] text-sky-700">Filtered Days Count</span>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-l-4 border-l-blue-600 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{t('filteredIntake', 'Total Water Intake')}</span>
          <div className="text-2xl font-bold text-sky-700 font-mono">{summary.totalIntake.toLocaleString()} <span className="text-xs text-slate-600 font-sans">KL</span></div>
          <span className="text-[11px] text-slate-500">Incoming raw supply</span>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-l-4 border-l-indigo-500 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{t('totalConsumption', 'Total Water Used')}</span>
          <div className="text-2xl font-bold text-indigo-700 font-mono">{summary.totalCons.toLocaleString()} <span className="text-xs text-slate-600 font-sans">KL</span></div>
          <span className="text-[11px] text-slate-500">Process + Domestic + Garden</span>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200 border-l-4 border-l-teal-500 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{t('avgRatio', 'Average Specific Ratio')}</span>
          <div className="text-2xl font-bold text-teal-700 font-mono">{summary.avgRatio} <span className="text-xs text-slate-600 font-sans">KL/MT</span></div>
          <span className="text-[11px] text-slate-500">Standard Baseline: ≤ 1.5</span>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search date (e.g. 2026-05-12)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 pl-9 text-slate-900 text-xs font-medium focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Month Selector */}
          <div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-semibold focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
            >
              {monthsOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-semibold focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
            >
              <option value="ALL">All Compliance Statuses</option>
              <option value="PASS">Compliant (&le; 1.5 KL/MT)</option>
              <option value="HIGH">Elevated (&gt; 1.5 KL/MT)</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <div>
            <button
              onClick={() => setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC')}
              className="w-full flex items-center justify-center space-x-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-sky-600" />
              <span>{sortOrder === 'DESC' ? 'Newest First (DESC)' : 'Oldest First (ASC)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Historical Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-sky-50/70 border-b border-sky-100 text-sky-900 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">{t('date', 'Date')}</th>
                <th className="py-3 px-4">{t('intakeKl', 'Intake (KL)')}</th>
                <th className="py-3 px-4">{t('processKl', 'Process (KL)')}</th>
                <th className="py-3 px-4">{t('domesticKl', 'Domestic (KL)')}</th>
                <th className="py-3 px-4">{t('gardenKl', 'Garden (KL)')}</th>
                <th className="py-3 px-4">{t('totalConsKl', 'Total Used (KL)')}</th>
                <th className="py-3 px-4">{t('prodMt', 'Production (MT)')}</th>
                <th className="py-3 px-4">{t('ratioKlMt', 'Ratio (KL/MT)')}</th>
                <th className="py-3 px-4">{t('status', 'Status')}</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                    No historical logs match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map(row => {
                  const passed = row.specific_total_kl_mt > 0 && row.specific_total_kl_mt <= 1.5;
                  return (
                    <tr key={row.date} className="hover:bg-slate-50 transition-colors font-mono">
                      <td className="py-3 px-4 font-bold text-slate-900 font-sans">{row.date}</td>
                      <td className="py-3 px-4 text-sky-700 font-semibold">{row.intake_kl.toFixed(1)}</td>
                      <td className="py-3 px-4 text-slate-700">{row.process_kl.toFixed(1)}</td>
                      <td className="py-3 px-4 text-slate-700">{row.domestic_kl.toFixed(1)}</td>
                      <td className="py-3 px-4 text-slate-700">{row.garden_kl.toFixed(1)}</td>
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
                      <td className="py-3 px-4 text-right space-x-1.5 font-sans">
                        <button
                          onClick={() => setSelectedRecordDetail(row)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-sky-50 text-sky-700 rounded-md border border-slate-200 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center space-x-1"
                          title="Inspect full day breakdown"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        {onSelectDateForEdit && (
                          <button
                            onClick={() => onSelectDateForEdit(row.date)}
                            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-xs font-semibold cursor-pointer transition-colors inline-flex items-center space-x-1"
                            title="Open in Entry Form"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-800">{paginatedRecords.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</strong> to{' '}
            <strong className="text-slate-800">{Math.min(currentPage * rowsPerPage, filteredRecords.length)}</strong> of{' '}
            <strong className="text-slate-800">{filteredRecords.length}</strong> records
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecordDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg p-6 rounded-2xl border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-base">Record Details for {selectedRecordDetail.date}</h3>
              </div>
              <button
                onClick={() => setSelectedRecordDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Intake Water:</span>
                <span className="font-mono font-bold text-sky-700 text-base">{selectedRecordDetail.intake_kl.toFixed(1)} KL</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Process Water:</span>
                <span className="font-mono font-bold text-slate-800 text-base">{selectedRecordDetail.process_kl.toFixed(1)} KL</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Domestic Water:</span>
                <span className="font-mono font-bold text-slate-800 text-base">{selectedRecordDetail.domestic_kl.toFixed(1)} KL</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Garden Water:</span>
                <span className="font-mono font-bold text-slate-800 text-base">{selectedRecordDetail.garden_kl.toFixed(1)} KL</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Total Used:</span>
                <span className="font-mono font-bold text-slate-900 text-base">{selectedRecordDetail.total_consumption_kl.toFixed(1)} KL</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Specific Ratio:</span>
                <span className="font-mono font-bold text-indigo-700 text-base">{selectedRecordDetail.specific_total_kl_mt} KL/MT</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedRecordDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
