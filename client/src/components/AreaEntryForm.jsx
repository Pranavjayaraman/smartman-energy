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
  Droplet, 
  Factory, 
  WifiOff, 
  RefreshCw,
  Lock,
  Check
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
      setSuccessMsg(t('restoreDraft', 'Draft restored!'));
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
      
      {/* Step-by-Step Worker Guidance Banner */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5 font-extrabold text-white">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500 text-white font-black text-sm shadow">
              ?
            </span>
            <span className="text-sm sm:text-base font-bold">{t('howToSubmit', 'How to enter today\'s water numbers:')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-slate-200">
            <span className="flex items-center gap-1.5 font-bold text-cyan-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold">1</span>
              {t('step1', '1. Check Date')}
            </span>
            <span className="text-slate-600">→</span>
            <span className="flex items-center gap-1.5 font-bold text-cyan-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold">2</span>
              {t('step2', '2. Type Numbers in Boxes')}
            </span>
            <span className="text-slate-600">→</span>
            <span className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-700">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">3</span>
              {t('step3', '3. Press SAVE Button')}
            </span>
          </div>
        </div>
      </div>

      {/* Header Banner per Area */}
      <div className="glass-panel p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-cyan-500">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-3 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-2xl">
              <Layers className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {selectedArea} {t('entryPage', 'Entry Page')}
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                {isOperator
                  ? `${t('workerInterface', 'Simple Worker Entry Screen')} • ${selectedArea}`
                  : t('adminEntryView', 'Admin Data Entry View')}
              </p>
            </div>
          </div>
        </div>

        {/* Date & Control Tools */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-4 h-4 text-cyan-400" />
              {t('readingDate', 'Reading Date:')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isOperator && date !== todayStr}
                className="bg-slate-800 border-2 border-slate-700 text-white font-mono text-sm font-bold rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-cyan-400 focus:outline-none disabled:opacity-60"
              />
              {date !== todayStr && (
                <button
                  onClick={() => setDate(todayStr)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer shadow whitespace-nowrap"
                  title="Return to today's date"
                >
                  ← Today
                </button>
              )}
            </div>
          </div>

          {/* Area Selector is ONLY visible to Admin */}
          {!isOperator && (
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {t('selectArea', 'Select Section (Admin):')}
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="bg-slate-800 border-2 border-slate-700 text-white text-sm font-bold rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
              >
                {availableAreas.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}

          {isOperator && (
            <div className="px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-cyan-300 flex items-center space-x-1.5 font-bold">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>{t('lockedArea', 'Your Section:')} {selectedArea}</span>
            </div>
          )}

          {draftSaved && (
            <button
              onClick={restoreDraft}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-950/80 text-amber-300 border border-amber-800/80 rounded-xl text-xs font-bold hover:bg-amber-900 transition-all cursor-pointer"
            >
              <WifiOff className="w-4 h-4 text-amber-400" />
              <span>{t('restoreDraft', 'Restore Saved Numbers')}</span>
            </button>
          )}

          <button
            onClick={fetchReadingsForDate}
            className="p-2.5 text-slate-300 hover:text-white bg-slate-800 rounded-xl hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Subtotal & Excess Warning Banner */}
      <div className={`glass-card p-5 rounded-2xl border-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg transition-all ${
        (selectedArea === 'Water Intake' && targetData.intake_target_kl > 0 && areaTotal > targetData.intake_target_kl) ||
        (parseFloat(targetData.production_mt) > 0 && (areaTotal / parseFloat(targetData.production_mt)) > targetData.specific_total_target)
          ? 'border-amber-500 bg-amber-950/20'
          : 'border-cyan-500/30'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              {t('meteredVolTotal', 'Total Water Entered for')} {selectedArea}
            </span>
            {selectedArea === 'Water Intake' && targetData.intake_target_kl > 0 && areaTotal > targetData.intake_target_kl && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> {t('exceedsIntakeTarget', 'Water Intake is High!')} ({targetData.intake_target_kl} KL)
              </span>
            )}
            {parseFloat(targetData.production_mt) > 0 && (areaTotal / parseFloat(targetData.production_mt)) > targetData.specific_total_target && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> {t('exceedsSpecificRatio', 'Water Usage per MT is High!')} ({(areaTotal / parseFloat(targetData.production_mt)).toFixed(2)} &gt; {targetData.specific_total_target} KL/MT)
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Date: {date}</span>
        </div>

        <div className="flex items-baseline space-x-1">
          <span className={`text-3xl font-extrabold font-mono ${
            (selectedArea === 'Water Intake' && targetData.intake_target_kl > 0 && areaTotal > targetData.intake_target_kl)
              ? 'text-amber-400'
              : 'text-cyan-400'
          }`}>
            {areaTotal.toFixed(1)}
          </span>
          <span className="text-sm font-bold text-slate-300">KL</span>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 flex items-center space-x-2 text-sm shadow-lg font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 flex items-center space-x-2 text-sm shadow-lg font-bold">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/90 border border-amber-700 text-amber-200 text-sm space-y-1 shadow-lg font-bold">
          <div className="flex items-center space-x-2 font-bold text-amber-300 mb-1">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>High Value Warning</span>
          </div>
          {warnings.map((w, idx) => (
            <p key={idx} className="text-xs text-amber-300/90 pl-7">• {w}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Daily Production & Manpower Context */}
        {(selectedArea === 'Water Intake' || selectedArea === 'Process Water' || selectedArea === 'Domestic & Garden Water') && (
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-700/60 pb-3">
              <Factory className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-slate-100 text-base">{t('facilityContext', 'Today\'s Factory Production & Staff')}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('dailyProductionMt', 'Today\'s Factory Output (MT)')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={targetData.production_mt}
                  onChange={(e) => handleTargetChange('production_mt', e.target.value)}
                  placeholder="e.g. 636.0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('plantManpower', 'Workers Count Today')}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={targetData.manpower}
                  onChange={(e) => handleTargetChange('manpower', e.target.value)}
                  placeholder="e.g. 906"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('gardenAreaM2', 'Garden Area (m²)')}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={targetData.garden_area_m2}
                  onChange={(e) => handleTargetChange('garden_area_m2', e.target.value)}
                  placeholder="e.g. 11632"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Meter Groups */}
        {Object.entries(groupedMeters).map(([cat, list]) => (
          <div key={cat} className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-700/60 pb-3 gap-2">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-xl">
                  <Droplet className="w-5 h-5 text-cyan-400" />
                </span>
                <h3 className="font-extrabold text-slate-100 text-lg">{categoryTitles[cat] || cat}</h3>
              </div>
              <span className="text-xs text-cyan-300 font-mono font-bold px-3 py-1 bg-slate-900 border border-slate-700 rounded-full">
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
                  <div key={m.code} className={`p-4.5 rounded-2xl border-2 transition-all ${isJump ? 'bg-amber-950/30 border-amber-500/80 shadow-lg shadow-amber-950/30' : 'bg-slate-800/70 border-slate-700 hover:border-cyan-500/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-xs text-cyan-300 font-mono bg-cyan-950 px-2.5 py-1 rounded-lg border border-cyan-700 tracking-wider">
                        {m.code}
                      </span>
                      {avg7 > 0 && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          Avg: <strong className="text-slate-200">{avg7.toFixed(1)}</strong> KL
                        </span>
                      )}
                    </div>
                    <label className="block text-sm font-bold text-white mb-2 truncate" title={m.name}>
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
                        className={`w-full bg-slate-950 border-2 text-white font-mono text-lg font-bold rounded-xl px-3.5 py-2.5 pr-12 focus:ring-2 focus:ring-cyan-400 focus:outline-none ${isJump ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-slate-700 focus:border-cyan-400'}`}
                      />
                      <span className="absolute right-3.5 top-3.5 text-xs font-mono font-bold text-cyan-400">
                        {m.unit}
                      </span>
                    </div>

                    {isJump && (
                      <div className="flex items-center space-x-1 mt-2 text-[11px] font-bold text-amber-300 bg-amber-950/80 p-1.5 rounded-lg border border-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                        <span>High number ({numVal} &gt; 3x avg)</span>
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
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-base">{t('stpModule', 'STP (Sewage Treatment Plant)')}</h3>
              </div>
              <span className="text-xs text-emerald-400 font-mono font-bold">Treated Water Recycling</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-bold">Inlet Raw Sewage (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.STP_stp_inlet_kl || ''}
                  onChange={(e) => handleStpEtpChange('STP_stp_inlet_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-bold">STP Water Generation (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.STP_stp_generation_kl || ''}
                  onChange={(e) => handleStpEtpChange('STP_stp_generation_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-bold">Recycle to Process (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.STP_stp_recycle_process_kl || ''}
                  onChange={(e) => handleStpEtpChange('STP_stp_recycle_process_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-bold">Recycle to Garden (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.STP_stp_recycle_garden_kl || ''}
                  onChange={(e) => handleStpEtpChange('STP_stp_recycle_garden_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ETP Module */}
        {(selectedArea === 'ETP' || (!isOperator && selectedArea === 'ETP')) && (
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-slate-100 text-base">{t('etpModule', 'ETP (Effluent Treatment Plant)')}</h3>
              </div>
              <span className="text-xs text-blue-400 font-mono font-bold">RO & MEE Condensate Recovery</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-bold">EFF PW1 Line 1 (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.ETP_eff_pw1_kl || ''}
                  onChange={(e) => handleStpEtpChange('ETP_eff_pw1_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-bold">EFF PW2 Line 2 (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.ETP_eff_pw2_kl || ''}
                  onChange={(e) => handleStpEtpChange('ETP_eff_pw2_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-bold">EFF PW3 Boiler/Cooling (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.ETP_eff_pw3_kl || ''}
                  onChange={(e) => handleStpEtpChange('ETP_eff_pw3_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-bold">Total Effluent Gen (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.ETP_total_effluent_kl || ''}
                  onChange={(e) => handleStpEtpChange('ETP_total_effluent_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-bold">RO Feed (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.ETP_ro_feed_kl || ''}
                  onChange={(e) => handleStpEtpChange('ETP_ro_feed_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-bold">RO Permeate (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.ETP_permeate_kl || ''}
                  onChange={(e) => handleStpEtpChange('ETP_permeate_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-bold">MEE Condensate (KL)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stpEtpValues.ETP_mee_condensate_kl || ''}
                  onChange={(e) => handleStpEtpChange('ETP_mee_condensate_kl', e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-bold">Salt Generation (MT)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={stpEtpValues.ETP_salt_gen_mt || ''}
                  onChange={(e) => handleStpEtpChange('ETP_salt_gen_mt', e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="glass-panel p-5 rounded-2xl border-2 border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900">
          <div className="text-xs text-slate-300 text-center sm:text-left">
            <span className="font-bold text-white block text-sm">{t('finishedEntering', 'Finished entering numbers?')}</span>
            <span>{t('clickSaveTip', 'Click the green button below to save today\'s numbers.')}</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-black text-base shadow-2xl shadow-emerald-500/30 border border-emerald-300/40 transition-all disabled:opacity-50 cursor-pointer hover:scale-[1.02]"
          >
            <Save className={`w-6 h-6 ${saving ? 'animate-bounce' : ''}`} />
            <span>{saving ? t('savingReadings', 'Saving Numbers to Database...') : t('saveReadingsBtn', 'SAVE WATER NUMBERS NOW')}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
