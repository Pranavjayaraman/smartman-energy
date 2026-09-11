import React, { useState } from 'react';
import { downloadExcelBlob, exportExcelURL } from '../services/api';
import { Download, X, FileSpreadsheet, Calendar, CheckCircle2, CalendarDays, Loader2, AlertCircle } from 'lucide-react';

export default function ExcelExportModal({ isOpen, onClose }) {
  const [exportType, setExportType] = useState('full'); // full, range, single, year
  const [singleDate, setSingleDate] = useState('2026-01-01');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [year, setYear] = useState('2026');

  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const params = {};
      if (exportType === 'single') {
        params.startDate = singleDate;
        params.endDate = singleDate;
      } else if (exportType === 'range') {
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (exportType === 'year') {
        params.year = year;
      }
      // 'full' sends no date params so it exports all records in the database!

      const blob = await downloadExcelBlob(params);

      // Trigger automatic browser file save
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;

      let filename = 'Water_Monitoring_Report_2026.xlsx';
      if (exportType === 'single') filename = `Water_Monitoring_${singleDate}.xlsx`;
      else if (exportType === 'range') filename = `Water_Monitoring_${startDate}_to_${endDate}.xlsx`;
      else if (exportType === 'year') filename = `Water_Monitoring_Year_${year}.xlsx`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMsg('Excel Ledger workbook downloaded successfully!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Excel download error:', err);
      // Fallback method
      try {
        let fallbackUrl = '';
        if (exportType === 'single') fallbackUrl = exportExcelURL(singleDate, singleDate, null);
        else if (exportType === 'range') fallbackUrl = exportExcelURL(startDate, endDate, null);
        else if (exportType === 'year') fallbackUrl = exportExcelURL(null, null, year);
        else fallbackUrl = exportExcelURL();

        window.open(fallbackUrl, '_blank');
        onClose();
      } catch (fallbackErr) {
        setErrorMsg('Failed to generate Excel download. Please ensure you are logged in.');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border-2 border-emerald-500/40 shadow-2xl space-y-6 bg-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-2xl shadow-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">Export Excel Workbook (.xlsx)</h3>
              <p className="text-xs text-slate-300">Download 2026 PDF historical records & custom date ledgers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={downloading}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Export Options */}
        <div className="space-y-3">
          <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">
            Choose Export Option
          </label>

          {/* Option 1: Full 2026 History (Default) */}
          <div
            onClick={() => setExportType('full')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
              exportType === 'full'
                ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <div>
              <span className="font-extrabold text-sm block">Full 2026 PDF History (365 Days)</span>
              <span className="text-xs text-slate-300">Export complete 365 days of water monitoring data</span>
            </div>
            {exportType === 'full' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
          </div>

          {/* Option 2: Date Range (Start Date to End Date) */}
          <div
            onClick={() => setExportType('range')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              exportType === 'range'
                ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="font-extrabold text-sm block">Custom Date Range</span>
              </div>
              {exportType === 'range' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
            </div>
            <p className="text-xs text-slate-300 mb-2">Export records from a starting date to an ending date</p>

            {exportType === 'range' && (
              <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-emerald-800/60" onClick={(e) => e.stopPropagation()}>
                <div>
                  <label className="block text-[11px] font-bold text-slate-200 mb-1">From (Start Date):</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border-2 border-slate-700 text-white text-xs font-bold font-mono rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-200 mb-1">To (End Date):</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border-2 border-slate-700 text-white text-xs font-bold font-mono rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Option 3: Single Day Detail */}
          <div
            onClick={() => setExportType('single')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              exportType === 'single'
                ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                <span className="font-extrabold text-sm block">Single Day Detail</span>
              </div>
              {exportType === 'single' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
            </div>
            <p className="text-xs text-slate-300 mb-2">Export complete water breakdown for 1 specific day</p>
            
            {exportType === 'single' && (
              <div className="mt-2 pt-2 border-t border-emerald-800/60 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                <label className="text-xs font-bold text-slate-200">Select Date:</label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="bg-slate-950 border-2 border-slate-700 text-white text-xs font-bold font-mono rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                />
              </div>
            )}
          </div>

        </div>

        {/* Worksheet Info */}
        <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
          <span className="font-bold text-white block">Worksheets included in generated .xlsx file:</span>
          <p className="text-slate-400">• Water Intake • Consumption (PW/DW/GW/OW) • Consolidated • STP • ETP • Dashboard Summary</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            disabled={downloading}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xl shadow-emerald-600/30 transition-all cursor-pointer hover:scale-[1.02] disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>Generating Excel File...</span>
              </>
            ) : (
              <>
                <Download className="w-4.5 h-4.5" />
                <span>Download Excel (.xlsx)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
