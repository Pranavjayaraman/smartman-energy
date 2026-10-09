import React, { useState } from 'react';
import { downloadExcelBlob, exportExcelURL } from '../services/api';
import { 
  Download, X, FileSpreadsheet, Calendar, CheckCircle2, 
  Loader2, AlertCircle, Layers, Droplets, 
  Factory, Home, Trees, ShieldAlert, Sparkles, SlidersHorizontal
} from 'lucide-react';

const AREA_OPTIONS = [
  { id: 'all', label: 'Overall History (All Areas - Multi-Tab)', icon: Layers, desc: 'Includes separate sheets for Intake, Process, Domestic, Garden, Outside, STP, ETP, Targets & Balance' },
  { id: 'Water Intake', label: 'Water Intake Area', icon: Droplets, desc: 'Borewells, Tanker, Municipal, Rainwater & Recycled Intake Ledgers' },
  { id: 'Process Water', label: 'Process Water Area', icon: Factory, desc: 'Process Line 1-2, Boiler Feed, Cooling Tower & Cleaning Lines' },
  { id: 'Domestic Water', label: 'Domestic Water Area', icon: Home, desc: 'Admin Office, Canteen, Restrooms, Labs & Workshop consumption' },
  { id: 'Garden Water', label: 'Garden Water Area', icon: Trees, desc: 'Sprinklers, Boundary, Greenbelt & Nursery irrigation' },
  { id: 'Outside Water', label: 'Outside Water Area', icon: SlidersHorizontal, desc: 'Contractor washing & tanker bay outlet monitoring' },
  { id: 'STP', label: 'STP Treatment Plant', icon: Sparkles, desc: 'Inlet sources, generation, and recycle to process & garden' },
  { id: 'ETP', label: 'ETP Effluent Plant', icon: ShieldAlert, desc: 'Effluent lines, RO Feed, Permeate, Reject, MEE & Salt generation' },
  { id: 'Production & Targets', label: 'Production & Targets', icon: Calendar, desc: 'Daily production output, manpower, garden areas, and operational KPI baselines' },
  { id: 'Consolidated', label: 'Consolidated Balance Sheet', icon: FileSpreadsheet, desc: 'Cross-functional daily water balance overview & specific consumption ratios' },
];

export default function ExcelExportModal({ isOpen, onClose }) {
  const [selectedArea, setSelectedArea] = useState('all');
  const [exportType, setExportType] = useState('full');
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

      if (blobData instanceof Blob && blobData.type === 'application/json') {
        const text = await blobData.text();
        const json = JSON.parse(text);
        throw new Error(json.error || 'Export failed on server');
      }

      const blob = new Blob([blobData], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      let cleanArea = selectedArea === 'all' ? 'All_Areas' : selectedArea.replace(/[^a-zA-Z0-9]/g, '_');
      let filename = `AquaTrack_${cleanArea}_Full_History.xlsx`;
      if (exportType === 'single') filename = `AquaTrack_${cleanArea}_${singleDate}.xlsx`;
      else if (exportType === 'range') filename = `AquaTrack_${cleanArea}_${startDate}_to_${endDate}.xlsx`;
      else if (exportType === 'year') filename = `AquaTrack_${cleanArea}_Year_${year}.xlsx`;

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
      try {
        let sDate = null, eDate = null, yVal = null;
        if (exportType === 'single') { sDate = singleDate; eDate = singleDate; }
        else if (exportType === 'range') { sDate = startDate; eDate = endDate; }
        else if (exportType === 'year') { yVal = year; }

        const fallbackUrl = exportExcelURL(sDate, eDate, yVal, selectedArea);
        window.open(fallbackUrl, '_blank');
        onClose();
      } catch (fallbackErr) {
        setErrorMsg(err.message || 'Failed to generate Excel download.');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl p-6 rounded-2xl border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-50 text-teal-700 border border-teal-100 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Export Excel Ledger (.xlsx)</h3>
              <p className="text-xs text-slate-500">Download formatted multi-tab spreadsheets and individual area worksheets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={downloading}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-5 pr-1 flex-grow">
          {/* Feedback Banners */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Choose Area */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
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
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-teal-50/70 border-teal-500 text-slate-900 shadow-xs ring-1 ring-teal-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center space-x-2">
                        <IconComponent className={`w-4 h-4 ${isSelected ? 'text-teal-700' : 'text-slate-500'}`} />
                        <span className="font-semibold text-xs text-slate-900">{opt.label}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{opt.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Choose Date Range */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              2. Select Date Range / Timeframe
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option: Full History */}
              <div
                onClick={() => setExportType('full')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  exportType === 'full'
                    ? 'bg-sky-50 border-sky-500 text-slate-900 ring-1 ring-sky-500 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-900">Full 2026 History</span>
                  {exportType === 'full' && <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-500">Export all 365 recorded days</p>
              </div>

              {/* Option: Date Range */}
              <div
                onClick={() => setExportType('range')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  exportType === 'range'
                    ? 'bg-sky-50 border-sky-500 text-slate-900 ring-1 ring-sky-500 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-900">Custom Date Range</span>
                  {exportType === 'range' && <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-500">Choose start and end dates</p>
              </div>

              {/* Option: Single Day */}
              <div
                onClick={() => setExportType('single')}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  exportType === 'single'
                    ? 'bg-sky-50 border-sky-500 text-slate-900 ring-1 ring-sky-500 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-900">Single Day</span>
                  {exportType === 'single' && <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-500">Export 1 specific daily sheet</p>
              </div>
            </div>

            {/* Sub-inputs for Range */}
            {exportType === 'range' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg px-3 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">End Date:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg px-3 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Sub-inputs for Single Day */}
            {exportType === 'single' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-3">
                <label className="text-xs font-semibold text-slate-600">Select Date:</label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg px-3 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none flex-1 max-w-xs"
                />
              </div>
            )}
          </div>

          {/* Worksheet Summary Badge */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800">Export Scope:</span>
              <span className="text-teal-700 font-semibold ml-2">
                {selectedArea === 'all' 
                  ? 'Complete Multi-Sheet Workbook (10 Worksheets)' 
                  : `${selectedArea} Dedicated Workbook`}
              </span>
            </div>
            <span className="bg-white px-2.5 py-0.5 rounded border border-slate-200 text-slate-700 font-mono font-bold text-[10px]">
              .xlsx
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={downloading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
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
