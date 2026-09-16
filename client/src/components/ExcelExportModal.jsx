import React, { useState } from 'react';
import { downloadExcelBlob, exportExcelURL } from '../services/api';
import { 
  Download, X, FileSpreadsheet, Calendar, CheckCircle2, 
  CalendarDays, Loader2, AlertCircle, Layers, Droplets, 
  Factory, Home, Trees, ShieldAlert, Sparkles, SlidersHorizontal
} from 'lucide-react';

const AREA_OPTIONS = [
  { id: 'all', label: 'Overall History (All Areas - Multi-Tab)', icon: Layers, desc: 'Includes separate sheets for Intake, Process, Domestic, Garden, Outside, STP, ETP, Targets & Consolidated Balance' },
  { id: 'Water Intake', label: 'Water Intake Area', icon: Droplets, desc: 'Borewells, Tanker, Municipal, Industrial, Rainwater & Recycled Intake Ledgers' },
  { id: 'Process Water', label: 'Process Water Area', icon: Factory, desc: 'Process Line 1-2, Boiler Feed, Cooling Tower & Cleaning Lines with Specific Metrics' },
  { id: 'Domestic Water', label: 'Domestic Water Area', icon: Home, desc: 'Admin Office, Canteen, Restrooms, Labs & Workshop consumption + LPD rates' },
  { id: 'Garden Water', label: 'Garden Water Area', icon: Trees, desc: 'Sprinklers, Boundary, Greenbelt & Nursery irrigation + L/m²/day rates' },
  { id: 'Outside Water', label: 'Outside Water Area', icon: SlidersHorizontal, desc: 'Contractor washing & tanker bay outlet monitoring' },
  { id: 'STP', label: 'STP Treatment Plant', icon: Sparkles, desc: 'Inlet sources, generation, and recycle to process & garden' },
  { id: 'ETP', label: 'ETP Effluent Plant', icon: ShieldAlert, desc: 'Effluent lines, RO Feed, Permeate, Reject, MEE & Salt generation' },
  { id: 'Production & Targets', label: 'Production & Targets', icon: Calendar, desc: 'Daily production output, manpower, garden areas, and operational KPI baselines' },
  { id: 'Consolidated', label: 'Consolidated Balance Sheet', icon: FileSpreadsheet, desc: 'Cross-functional daily water balance overview & specific consumption ratios' },
];

export default function ExcelExportModal({ isOpen, onClose }) {
  const [selectedArea, setSelectedArea] = useState('all');
  const [exportType, setExportType] = useState('full'); // full, range, single, year
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
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
      if (selectedArea && selectedArea !== 'all') {
        params.area = selectedArea;
      }

      if (exportType === 'single') {
        params.startDate = singleDate;
        params.endDate = singleDate;
      } else if (exportType === 'range') {
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (exportType === 'year') {
        params.year = year;
      }

      const blobData = await downloadExcelBlob(params);

      // Check if backend returned JSON error inside blob
      if (blobData instanceof Blob && blobData.type === 'application/json') {
        const text = await blobData.text();
        const json = JSON.parse(text);
        throw new Error(json.error || 'Export failed on server');
      }

      // Trigger file save
      const blob = new Blob([blobData], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      let cleanArea = selectedArea === 'all' ? 'All_Areas' : selectedArea.replace(/[^a-zA-Z0-9]/g, '_');
      let filename = `AQ_TRACK_${cleanArea}_Full_History.xlsx`;
      if (exportType === 'single') filename = `AQ_TRACK_${cleanArea}_${singleDate}.xlsx`;
      else if (exportType === 'range') filename = `AQ_TRACK_${cleanArea}_${startDate}_to_${endDate}.xlsx`;
      else if (exportType === 'year') filename = `AQ_TRACK_${cleanArea}_Year_${year}.xlsx`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMsg(`Excel workbook (${cleanArea}) downloaded successfully!`);
      setTimeout(() => {
        onClose();
      }, 1300);
    } catch (err) {
      console.error('Excel download error:', err);
      // Fallback via direct browser navigation with query token
      try {
        let sDate = null, eDate = null, yVal = null;
        if (exportType === 'single') { sDate = singleDate; eDate = singleDate; }
        else if (exportType === 'range') { sDate = startDate; eDate = endDate; }
        else if (exportType === 'year') { yVal = year; }

        const fallbackUrl = exportExcelURL(sDate, eDate, yVal, selectedArea);
        window.open(fallbackUrl, '_blank');
        onClose();
      } catch (fallbackErr) {
        setErrorMsg(err.message || 'Failed to generate Excel download. Please ensure you are logged in.');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl p-6 rounded-3xl border-2 border-emerald-500/40 shadow-2xl space-y-5 bg-slate-900 my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-2xl shadow-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg sm:text-xl">Export Excel Ledger (.xlsx)</h3>
              <p className="text-xs text-slate-400">Download separate area worksheets, single area data & overall history</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={downloading}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-5 pr-1 flex-grow">
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

          {/* Section 1: Choose Area / Scope */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">
              1. Select Area / Data Scope
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {AREA_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = selectedArea === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedArea(opt.id)}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-lg shadow-emerald-950/40 scale-[1.01]'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:border-slate-600 hover:bg-slate-800/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center space-x-2">
                        <IconComponent className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span className="font-extrabold text-xs text-white">{opt.label}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    </div>
                    <p className="text-[10.5px] text-slate-400 line-clamp-2 leading-relaxed">{opt.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Choose Date Range */}
          <div className="space-y-2.5">
            <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider">
              2. Select Date Range / Timeframe
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option: Full History */}
              <div
                onClick={() => setExportType('full')}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  exportType === 'full'
                    ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-lg'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs">Full History</span>
                  {exportType === 'full' && <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                </div>
                <p className="text-[10px] text-slate-400">Export all recorded dates (365 days ledger)</p>
              </div>

              {/* Option: Date Range */}
              <div
                onClick={() => setExportType('range')}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  exportType === 'range'
                    ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-lg'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs">Custom Range</span>
                  {exportType === 'range' && <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                </div>
                <p className="text-[10px] text-slate-400">Select custom Start & End dates</p>
              </div>

              {/* Option: Single Day */}
              <div
                onClick={() => setExportType('single')}
                className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  exportType === 'single'
                    ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-lg'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs">Single Day</span>
                  {exportType === 'single' && <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                </div>
                <p className="text-[10px] text-slate-400">Export breakdown for 1 specific date</p>
              </div>
            </div>

            {/* Sub-inputs for Range */}
            {exportType === 'range' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">From (Start Date):</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold font-mono rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">To (End Date):</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold font-mono rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Sub-inputs for Single Day */}
            {exportType === 'single' && (
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center space-x-3">
                <label className="text-xs font-bold text-slate-300">Select Date:</label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white text-xs font-bold font-mono rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-400 focus:outline-none flex-1 max-w-xs"
                />
              </div>
            )}
          </div>

          {/* Worksheet Summary Badge */}
          <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
            <div>
              <span className="font-bold text-white">Selected Export Output:</span>
              <span className="text-emerald-400 font-mono ml-2 font-bold">
                {selectedArea === 'all' 
                  ? 'Multi-Tab Workbook (10 Worksheets included)' 
                  : `${selectedArea} Dedicated Workbook (Overview + Detail Sheet)`}
              </span>
            </div>
            <span className="bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300 font-mono font-bold text-[10px]">
              .xlsx format
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={downloading}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer transition-colors"
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
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Ledger...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Excel (.xlsx)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
