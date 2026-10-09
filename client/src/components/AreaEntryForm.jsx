import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getReadings, saveReadings } from '../services/api';
import { 
  Calendar, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Zap, 
  Droplets, 
  Factory, 
  WifiOff, 
  RefreshCw,
  Lock,
  Check,
  HelpCircle
} from 'lucide-react';

export default function AreaEntryForm({ initialDate }) {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(initialDate || todayStr);
  const [selectedArea, setSelectedArea] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [draftSaved, setDraftSaved] = useState(false);

  const [targetData, setTargetData] = useState({
    production_mt: '',
    manpower: '',
    garden_area_m2: 2500,
    intake_target_kl: 3000,
    domestic_target_kl: 45,
    specific_total_target: 1.5,
    specific_process_target: 1.2,
    domestic_lpd_target: 30,
    garden_lpd_target: 5.0
  });

  const [metersList, setMetersList] = useState([]);
  const [meterValues, setMeterValues] = useState({});
  const [stpEtpValues, setStpEtpValues] = useState({
    STP_stp_inlet_kl: '',
    STP_stp_generation_kl: '',
    STP_stp_recycle_process_kl: '',
    STP_stp_recycle_garden_kl: '',
    ETP_eff_pw1_kl: '',
    ETP_eff_pw2_kl: '',
    ETP_eff_pw3_kl: '',
    ETP_total_effluent_kl: '',
    ETP_ro_feed_kl: '',
    ETP_permeate_kl: '',
    ETP_reject_kl: '',
    ETP_mee_condensate_kl: '',
    ETP_salt_gen_mt: '',
    ETP_recycle_kl: ''
  });

  const isOperator = user?.role === 'Operator';
  const assignedAreaName = isOperator && user?.assigned_areas?.length > 0 ? user.assigned_areas[0] : 'Water Intake';
  const availableAreas = ['Water Intake', 'Process Water', 'Domestic & Garden Water', 'Outside Water', 'STP', 'ETP'];

  // Lock selected area strictly for operators
  useEffect(() => {
    if (isOperator) {
      setSelectedArea(assignedAreaName);
    } else if (!selectedArea) {
      setSelectedArea('Water Intake');
    }
  }, [user, isOperator, assignedAreaName]);

  useEffect(() => {
    if (selectedArea) {
      fetchReadingsForDate();
    }
  }, [date, selectedArea]);

  const fetchReadingsForDate = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      setWarnings([]);

      const data = await getReadings(date, isOperator ? assignedAreaName : selectedArea);

      if (data.target) {
        setTargetData({
          production_mt: data.target.production_mt || '',
          manpower: data.target.manpower || '',
          garden_area_m2: data.target.garden_area_m2 || 2500,
          intake_target_kl: data.target.intake_target_kl || 3000,
          domestic_target_kl: data.target.domestic_target_kl || 45,
          specific_total_target: data.target.specific_total_target || 1.5,
          specific_process_target: data.target.specific_process_target || 1.2,
          domestic_lpd_target: data.target.domestic_lpd_target || 30,
          garden_lpd_target: data.target.garden_lpd_target || 5.0
        });
      }

      setMetersList(data.meters || []);

      const vals = {};
      (data.meters || []).forEach(m => {
        vals[m.code] = m.current_value !== null && m.current_value !== undefined ? m.current_value : '';
      });
      setMeterValues(vals);

      if (data.stpEtpMap) {
        setStpEtpValues(prev => ({
          ...prev,
          ...data.stpEtpMap
        }));
      }

      const draftKey = `aqua_draft_${date}_${selectedArea}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setDraftSaved(true);
      }
    } catch (err) {
      console.error('Error loading readings:', err);
      setErrorMsg('Failed to load readings for the selected date.');
    } finally {
      setLoading(false);
    }
  };

  const handleMeterChange = (code, val) => {
    const newVals = { ...meterValues, [code]: val };
    setMeterValues(newVals);
    autoSaveLocalDraft(newVals, stpEtpValues, targetData);
  };

  const handleStpEtpChange = (key, val) => {
    const newStpEtp = { ...stpEtpValues, [key]: val };
    setStpEtpValues(newStpEtp);
    autoSaveLocalDraft(meterValues, newStpEtp, targetData);
  };

  const handleTargetChange = (key, val) => {
    const newTargets = { ...targetData, [key]: val };
    setTargetData(newTargets);
    autoSaveLocalDraft(meterValues, stpEtpValues, newTargets);
  };

  const autoSaveLocalDraft = (mVals, sVals, tData) => {
    const draftKey = `aqua_draft_${date}_${selectedArea}`;
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        meterValues: mVals,
        stpEtpValues: sVals,
        targetData: tData
      })
    );
    setDraftSaved(true);
  };

  const restoreDraft = () => {
    const draftKey = `aqua_draft_${date}_${selectedArea}`;
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      const parsed = JSON.parse(savedDraft);
      if (parsed.meterValues) setMeterValues(parsed.meterValues);
      if (parsed.stpEtpValues) setStpEtpValues(parsed.stpEtpValues);
      if (parsed.targetData) setTargetData(parsed.targetData);
      setSuccessMsg(t('restoreDraft', 'Draft restored successfully!'));
    }
  };

  const calcCatSubtotal = (cat) => {
    return metersList
      .filter(m => m.category === cat)
      .reduce((sum, m) => sum + (parseFloat(meterValues[m.code]) || 0), 0);
  };

  const areaTotal = metersList.reduce((sum, m) => sum + (parseFloat(meterValues[m.code]) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    setWarnings([]);

    try {
      const meter_readings = metersList.map(m => ({
        meter_code: m.code,
        category: m.category,
        value: meterValues[m.code] !== undefined && meterValues[m.code] !== '' ? meterValues[m.code] : null
      })).filter(item => item.value !== null);

      const stp_etp_readings = [];
      Object.entries(stpEtpValues).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined) {
          const parts = key.split('_');
          const plant_type = parts[0];
          const field_code = parts.slice(1).join('_');
          stp_etp_readings.push({
            plant_type,
            field_code,
            value: parseFloat(val)
          });
        }
      });

      const payload = {
        date,
        production_data: {
          production_mt: parseFloat(targetData.production_mt) || 0,
          manpower: parseInt(targetData.manpower) || 0,
          garden_area_m2: parseFloat(targetData.garden_area_m2) || 2500
        },
        meter_readings,
        stp_etp_readings
      };

      const res = await saveReadings(payload);

      setSuccessMsg(`Readings for ${selectedArea} saved successfully! / அளவீடுகள் வெற்றி கரமாக சேமிக்கப்பட்டன!`);
      if (res.warnings && res.warnings.length > 0) {
        setWarnings(res.warnings);
      }

      const draftKey = `aqua_draft_${date}_${selectedArea}`;
      localStorage.removeItem(draftKey);
      setDraftSaved(false);

      fetchReadingsForDate();
    } catch (err) {
      console.error('Save error:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to save readings to database.');
    } finally {
      setSaving(false);
    }
  };

  const groupedMeters = {};
  metersList.forEach(m => {
    if (!groupedMeters[m.category]) groupedMeters[m.category] = [];
    groupedMeters[m.category].push(m);
  });

  const categoryTitles = {
    intake: t('waterIntakeMeters', 'Water Intake Meters (KL)'),
    process: t('processWaterMeters', 'Process Water Meters (PW1–PWn) (KL)'),
    domestic: t('domesticWaterMeters', 'Domestic Water Meters (DW1–DW10) (KL)'),
    garden: t('gardenWaterMeters', 'Garden Water Meters (GW1–GW10) (KL)'),
    outside: t('outsideWaterMeters', 'Outside Water Meters (OW1–OW2) (KL)')
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Step-by-Step Operator Guidance */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 font-bold text-slate-800">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold text-xs">
              ?
            </span>
            <span className="text-sm font-bold">{t('howToSubmit', 'Data Entry Workflow:')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-slate-600">
            <span className="flex items-center gap-1.5 font-semibold text-slate-800 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100">
              <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
              {t('step1', 'Verify Date')}
            </span>
            <span className="text-slate-300">→</span>
            <span className="flex items-center gap-1.5 font-semibold text-slate-800 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100">
              <span className="w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
              {t('step2', 'Enter Meter Values')}
            </span>
            <span className="text-slate-300">→</span>
            <span className="flex items-center gap-1.5 font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
              {t('step3', 'Click Save Readings')}
            </span>
          </div>
        </div>
      </div>

      {/* Header Banner per Area */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 border-l-4 border-l-sky-600 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-sky-50 text-sky-700 border border-sky-100 rounded-xl">
              <Layers className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {selectedArea} {t('entryPage', 'Data Entry')}
              </h2>
              <p className="text-xs text-slate-500">
                {isOperator
                  ? `${t('workerInterface', 'Worker Entry Screen')} • ${selectedArea}`
                  : t('adminEntryView', 'Admin Data Entry View')}
              </p>
            </div>
          </div>
        </div>

        {/* Date & Control Tools */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              {t('readingDate', 'Reading Date:')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isOperator && date !== todayStr}
                className="bg-white border border-slate-300 text-slate-900 font-mono text-xs font-bold rounded-lg px-3 py-2 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none disabled:opacity-60"
              />
              {date !== todayStr && (
                <button
                  onClick={() => setDate(todayStr)}
                  className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-sky-800 rounded-lg text-xs font-semibold border border-slate-200 cursor-pointer whitespace-nowrap"
                  title="Return to today's date"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Area Selector for Admin */}
          {!isOperator && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {t('selectArea', 'Section (Admin):')}
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="bg-white border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg px-3 py-2 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
              >
                {availableAreas.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}

          {isOperator && (
            <div className="px-3 py-2 bg-sky-50 border border-sky-200 rounded-lg text-xs font-mono text-sky-800 flex items-center space-x-1.5 font-semibold">
              <Lock className="w-3.5 h-3.5 text-sky-600" />
              <span>{t('lockedArea', 'Assigned:')} {selectedArea}</span>
            </div>
          )}

          {draftSaved && (
            <button
              onClick={restoreDraft}
              className="flex items-center space-x-1.5 px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              <span>{t('restoreDraft', 'Restore Draft')}</span>
            </button>
          )}

          <button
            onClick={fetchReadingsForDate}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Subtotal & Metrics Banner */}
      <div className={`bg-white p-5 rounded-xl border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
        (selectedArea === 'Water Intake' && targetData.intake_target_kl > 0 && areaTotal > targetData.intake_target_kl) ||
        (parseFloat(targetData.production_mt) > 0 && (areaTotal / parseFloat(targetData.production_mt)) > targetData.specific_total_target)
          ? 'border-amber-300 bg-amber-50/40'
          : 'border-slate-200'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {t('meteredVolTotal', 'Total Water Entered for')} {selectedArea}
            </span>
            {selectedArea === 'Water Intake' && targetData.intake_target_kl > 0 && areaTotal > targetData.intake_target_kl && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" /> {t('exceedsIntakeTarget', 'Intake exceeds target')} ({targetData.intake_target_kl} KL)
              </span>
            )}
            {parseFloat(targetData.production_mt) > 0 && (areaTotal / parseFloat(targetData.production_mt)) > targetData.specific_total_target && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" /> {t('exceedsSpecificRatio', 'High Ratio')} ({(areaTotal / parseFloat(targetData.production_mt)).toFixed(2)} &gt; {targetData.specific_total_target} KL/MT)
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500 font-mono">Date: {date}</span>
        </div>

        <div className="flex items-baseline space-x-1.5">
          <span className={`text-3xl font-bold font-mono ${
            (selectedArea === 'Water Intake' && targetData.intake_target_kl > 0 && areaTotal > targetData.intake_target_kl)
              ? 'text-amber-700'
              : 'text-sky-700'
          }`}>
            {areaTotal.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-slate-600">KL</span>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2 text-sm font-medium shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center space-x-2 text-sm font-medium shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm space-y-1 shadow-xs">
          <div className="flex items-center space-x-2 font-bold text-amber-900 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Operational Note</span>
          </div>
          {warnings.map((w, idx) => (
            <p key={idx} className="text-xs text-amber-800 pl-6">• {w}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Daily Production & Manpower Context */}
        {(selectedArea === 'Water Intake' || selectedArea === 'Process Water' || selectedArea === 'Domestic & Garden Water') && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Factory className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-slate-800 text-sm">{t('facilityContext', 'Production Output & Staff Count')}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('dailyProductionMt', 'Daily Production (MT)')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={targetData.production_mt}
                  onChange={(e) => handleTargetChange('production_mt', e.target.value)}
                  placeholder="e.g. 636.0"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('plantManpower', 'Workers Count Today')}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={targetData.manpower}
                  onChange={(e) => handleTargetChange('manpower', e.target.value)}
                  placeholder="e.g. 906"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('gardenAreaM2', 'Garden Area (m²)')}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={targetData.garden_area_m2}
                  onChange={(e) => handleTargetChange('garden_area_m2', e.target.value)}
                  placeholder="e.g. 11632"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Meter Groups */}
        {Object.entries(groupedMeters).map(([cat, list]) => (
          <div key={cat} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                  <Droplets className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">{categoryTitles[cat] || cat}</h3>
              </div>
              <span className="text-xs text-sky-800 font-mono font-semibold px-3 py-1 bg-sky-50 border border-sky-100 rounded-md">
                {t('subtotal', 'Section Total')}: {calcCatSubtotal(cat).toFixed(1)} KL
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map(m => {
                const val = meterValues[m.code] !== undefined ? meterValues[m.code] : '';
                const numVal = parseFloat(val) || 0;
                const avg7 = m.avg_7day || 0;
                const isJump = avg7 > 0 && numVal > 3 * avg7;

                return (
                  <div key={m.code} className={`p-4 rounded-xl border transition-all ${
                    isJump 
                      ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300' 
                      : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-sky-800 font-mono bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-100 tracking-wider">
                        {m.code}
                      </span>
                      {avg7 > 0 && (
                        <span className="text-[11px] text-slate-500 font-mono">
                          7-Day Avg: <strong className="text-slate-700">{avg7.toFixed(1)}</strong> KL
                        </span>
                      )}
                    </div>
                    <label className="block text-xs font-semibold text-slate-800 mb-2 truncate" title={m.name}>
                      {m.name}
                    </label>

                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={val}
                        onChange={(e) => handleMeterChange(m.code, e.target.value)}
                        placeholder="0.0"
                        className={`w-full bg-white border text-slate-900 font-mono text-base font-bold rounded-lg px-3 py-2 pr-12 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors ${
                          isJump ? 'border-amber-400 bg-amber-50/20' : 'border-slate-300'
                        }`}
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-mono font-bold text-slate-400">
                        {m.unit}
                      </span>
                    </div>

                    {isJump && (
                      <div className="flex items-center space-x-1 mt-2 text-[11px] font-semibold text-amber-800 bg-amber-100/60 p-1.5 rounded-md border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                        <span>High value ({numVal} &gt; 3x avg)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* STP Module */}
        {(selectedArea === 'STP' || (!isOperator && selectedArea === 'STP')) && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-800 text-sm">{t('stpModule', 'STP (Sewage Treatment Plant)')}</h3>
              </div>
              <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-100">
                Treated Water Recycling
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-700 mb-1.5 font-semibold">Inlet Raw Sewage (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.STP_stp_inlet_kl || ''}
                  onChange={(e) => handleStpEtpChange('STP_stp_inlet_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 mb-1.5 font-semibold">STP Water Generation (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.STP_stp_generation_kl || ''}
                  onChange={(e) => handleStpEtpChange('STP_stp_generation_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 mb-1.5 font-semibold">Recycle to Process (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.STP_stp_recycle_process_kl || ''}
                  onChange={(e) => handleStpEtpChange('STP_stp_recycle_process_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 mb-1.5 font-semibold">Recycle to Garden (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.STP_stp_recycle_garden_kl || ''}
                  onChange={(e) => handleStpEtpChange('STP_stp_recycle_garden_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* ETP Module */}
        {(selectedArea === 'ETP' || (!isOperator && selectedArea === 'ETP')) && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-800 text-sm">{t('etpModule', 'ETP (Effluent Treatment Plant)')}</h3>
              </div>
              <span className="text-xs text-sky-700 font-semibold bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-100">
                RO & MEE Condensate Recovery
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-700 mb-1.5 font-semibold">EFF PW1 Line 1 (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.ETP_eff_pw1_kl || ''}
                  onChange={(e) => handleStpEtpChange('ETP_eff_pw1_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 mb-1.5 font-semibold">EFF PW2 Line 2 (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.ETP_eff_pw2_kl || ''}
                  onChange={(e) => handleStpEtpChange('ETP_eff_pw2_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 mb-1.5 font-semibold">EFF PW3 Boiler/Cooling (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.ETP_eff_pw3_kl || ''}
                  onChange={(e) => handleStpEtpChange('ETP_eff_pw3_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 mb-1.5 font-semibold">Total Effluent Gen (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.ETP_total_effluent_kl || ''}
                  onChange={(e) => handleStpEtpChange('ETP_total_effluent_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 mb-1.5 font-semibold">RO Feed (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.ETP_ro_feed_kl || ''}
                  onChange={(e) => handleStpEtpChange('ETP_ro_feed_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 mb-1.5 font-semibold">RO Permeate (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.ETP_permeate_kl || ''}
                  onChange={(e) => handleStpEtpChange('ETP_permeate_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 mb-1.5 font-semibold">MEE Condensate (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.ETP_mee_condensate_kl || ''}
                  onChange={(e) => handleStpEtpChange('ETP_mee_condensate_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 mb-1.5 font-semibold">Salt Generation (MT)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={stpEtpValues.ETP_salt_gen_mt || ''}
                  onChange={(e) => handleStpEtpChange('ETP_salt_gen_mt', e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Button Section */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600 text-center sm:text-left">
            <span className="font-bold text-slate-800 block text-sm">{t('finishedEntering', 'Finished entering readings?')}</span>
            <span>{t('clickSaveTip', 'Click Save to persist today\'s meter readings into the database.')}</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center space-x-2.5 px-7 py-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? t('savingReadings', 'Saving to Database...') : t('saveReadingsBtn', 'SAVE READINGS NOW')}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
