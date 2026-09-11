import React, { useState, useEffect } from 'react';
import { 
  getDatabaseStatus, 
  getBackupsList, 
  createManualBackup, 
  downloadBackupBlob, 
  restoreBackup, 
  getAuditLogs 
} from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  ShieldCheck, 
  Database, 
  HardDrive, 
  Download, 
  RotateCcw, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Activity, 
  RefreshCw, 
  FileText,
  Clock,
  KeyRound,
  ShieldAlert
} from 'lucide-react';

export default function DatabaseSecurityModal() {
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringFilename, setRestoringFilename] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [backupReason, setBackupReason] = useState('Manual On-Demand Backup');

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const [statusRes, backupsRes, logsRes] = await Promise.all([
        getDatabaseStatus(),
        getBackupsList(),
        getAuditLogs(30)
      ]);
      setDbStatus(statusRes);
      setBackups(backupsRes || []);
      setAuditLogs(logsRes || []);
    } catch (err) {
      console.error('Error fetching database security details:', err);
      setFeedback({ type: 'error', message: 'Failed to load database status: ' + (err.response?.data?.error || err.message) });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      setFeedback({ type: '', message: '' });
      const res = await createManualBackup(backupReason);
      setFeedback({ 
        type: 'success', 
        message: `Success! Backup created: ${res.backup.filename} (${res.backup.sizeFormatted})` 
      });
      await fetchSecurityData();
    } catch (err) {
      setFeedback({ 
        type: 'error', 
        message: 'Backup creation failed: ' + (err.response?.data?.error || err.message) 
      });
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async (filename) => {
    try {
      const blob = await downloadBackupBlob(filename);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to download backup: ' + err.message });
    }
  };

  const handleRestoreBackup = async (filename) => {
    const confirmRestore = window.confirm(
      `CAUTION: Are you sure you want to restore the database from '${filename}'?\n\nA safety backup of the current database will automatically be taken before restoring.`
    );
    if (!confirmRestore) return;

    try {
      setRestoringFilename(filename);
      setFeedback({ type: '', message: '' });
      const res = await restoreBackup(filename);
      setFeedback({ 
        type: 'success', 
        message: `Database successfully restored from ${filename}. Safety backup saved as ${res.result?.safetyBackup}.` 
      });
      await fetchSecurityData();
    } catch (err) {
      setFeedback({ 
        type: 'error', 
        message: 'Restore failed: ' + (err.response?.data?.error || err.message) 
      });
    } finally {
      setRestoringFilename(null);
    }
  };

  if (loading && !dbStatus) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-slate-300 font-mono text-sm">Inspecting Database Security & Integrity...</span>
      </div>
    );
  }

  const isHealthy = dbStatus?.integrity?.status === 'OK';
  const securityLogs = auditLogs.filter(log => 
    log.action.includes('SECURITY') || 
    log.action.includes('BACKUP') || 
    log.action.includes('RESTORE') || 
    log.action.includes('FAILED') ||
    log.action.includes('LOGIN')
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner Header */}
      <div className="glass-panel p-6 rounded-3xl border-l-4 border-cyan-500 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/30 text-white">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {lang === 'ta' ? 'தரவுத்தளம் & பாதுகாப்பு மையம்' : 'Database Security & Protection Center'}
              </h2>
              <p className="text-xs text-slate-300">
                {lang === 'ta' 
                  ? 'தரவு இழப்பு தடுப்பு, WAL பயன்முறை, தானியங்கி காப்புப்பிரதிகள் மற்றும் பாதுகாப்பு பதிவுகள்' 
                  : 'Anti-data-loss protection, WAL concurrency, point-in-time backups, and access defense.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSecurityData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{lang === 'ta' ? 'புதுப்பிக்கவும்' : 'Refresh Status'}</span>
          </button>
        </div>
      </div>

      {/* Live Feedback Alert Banner */}
      {feedback.message && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-sm ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' 
            : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
        }`}>
          <div className="flex items-center space-x-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button 
            onClick={() => setFeedback({ type: '', message: '' })}
            className="text-xs opacity-75 hover:opacity-100 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4 Health & Security KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Database Integrity */}
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-emerald-500 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
              {lang === 'ta' ? 'தரவுத்தள ஒருமைப்பாடு' : 'Database Integrity'}
            </span>
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white flex items-center gap-2">
              {isHealthy ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5" /> 100% HEALTHY
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-5 h-5" /> CHECK FAILED
                </span>
              )}
            </div>
            <span className="text-xs text-slate-300 font-medium">
              SQLite WAL Active • PRAGMA OK
            </span>
          </div>
          <div className="text-[11px] text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800 font-mono">
            Mode: {dbStatus?.stats?.journalMode?.toUpperCase() || 'WAL'}
          </div>
        </div>

        {/* Card 2: Database Size & Records */}
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-cyan-500 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-cyan-300 uppercase tracking-wider">
              {lang === 'ta' ? 'சேமிப்பு & பதிவுகள்' : 'Storage & Records'}
            </span>
            <HardDrive className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              {dbStatus?.stats?.fileSizeFormatted || '0.00 MB'}
            </div>
            <span className="text-xs text-slate-300 font-medium">
              {dbStatus?.stats?.totalRecords || 0} {lang === 'ta' ? 'மொத்த வரிசைகள்' : 'Total DB Rows'}
            </span>
          </div>
          <div className="text-[11px] text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-800">
            {dbStatus?.stats?.tables?.meters || 0} Meters • {dbStatus?.stats?.tables?.meter_readings || 0} Readings
          </div>
        </div>

        {/* Card 3: Backups Snapshot Count */}
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-purple-500 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-purple-300 uppercase tracking-wider">
              {lang === 'ta' ? 'காப்புப்பிரதிகள்' : 'Safety Snapshots'}
            </span>
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              {backups.length} <span className="text-sm font-bold text-purple-300">Saved</span>
            </div>
            <span className="text-xs text-slate-300 font-medium">
              {lang === 'ta' ? 'தானியங்கி சுழற்சி (30 தக்கவைப்பு)' : 'Auto-pruned (Last 30 kept)'}
            </span>
          </div>
          <div className="text-[11px] text-purple-300 bg-purple-950/80 px-2.5 py-1 rounded-lg border border-purple-800">
            Schedule: Every 12h + Startup
          </div>
        </div>

        {/* Card 4: Access Defense */}
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-amber-500 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
              {lang === 'ta' ? 'அணுகல் கட்டுப்பாடு' : 'Access Defense'}
            </span>
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5" /> PROTECTED
            </div>
            <span className="text-xs text-slate-300 font-medium">
              Rate Limiter • RBAC Zone Lock
            </span>
          </div>
          <div className="text-[11px] text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800">
            Brute-Force & DoS Shield Active
          </div>
        </div>

      </div>

      {/* 1-Click Backup Trigger Area */}
      <div className="glass-panel p-6 rounded-3xl border border-cyan-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              {lang === 'ta' ? 'உடனடி தரவுத்தள காப்புப்பிரதி எடுக்கவும்' : 'Take Immediate Point-in-Time Backup'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'ta' 
                ? 'ஒரு நொடியில் முழுமையான SQLite ஸ்னாப்ஷாட்டை உருவாக்கி பாதுகாப்பாக சேமிக்கவும்.' 
                : 'Creates a clean, zero-lock SQLite atomic snapshot and stores it in server/backups/.'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              value={backupReason}
              onChange={(e) => setBackupReason(e.target.value)}
              placeholder="Backup label / reason..."
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none w-full sm:w-64"
            />
            <button
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition-all cursor-pointer whitespace-nowrap border border-cyan-400/40"
            >
              {creatingBackup ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{lang === 'ta' ? 'சேமிக்கிறது...' : 'Backing up...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{lang === 'ta' ? 'இப்போது காப்புப்பிரதி எடு' : 'Create Backup Now'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Backups Ledger & Security Event Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Backups Table (2/3 width) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-white text-base">
                {lang === 'ta' ? 'காப்புப்பிரதி கோப்புகள் பட்டியல்' : 'Available Database Snapshots'}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {backups.length} {lang === 'ta' ? 'கோப்புகள் உள்ளன' : 'snapshots stored'}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">{lang === 'ta' ? 'கோப்பு பெயர்' : 'Backup File'}</th>
                  <th className="p-3.5">{lang === 'ta' ? 'அளவு' : 'Size'}</th>
                  <th className="p-3.5">{lang === 'ta' ? 'உருவாக்கப்பட்ட நேரம்' : 'Timestamp'}</th>
                  <th className="p-3.5 text-right">{lang === 'ta' ? 'செயல்கள்' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-500">
                      No backups generated yet. Click "Create Backup Now" above.
                    </td>
                  </tr>
                ) : (
                  backups.map((b) => (
                    <tr key={b.filename} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-200 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span className="truncate max-w-xs" title={b.filename}>{b.filename}</span>
                      </td>
                      <td className="p-3.5 text-cyan-300 font-semibold">{b.sizeFormatted}</td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleDownloadBackup(b.filename)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all"
                          title="Download database snapshot to local disk"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{lang === 'ta' ? 'பதிவிறக்கு' : 'Download'}</span>
                        </button>
                        <button
                          onClick={() => handleRestoreBackup(b.filename)}
                          disabled={restoringFilename === b.filename}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all"
                          title="Restore database to this point-in-time state"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${restoringFilename === b.filename ? 'animate-spin' : ''}`} />
                          <span>{lang === 'ta' ? 'மீட்டமை' : 'Restore'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security & Audit Feed (1/3 width) */}
        <div className="glass-panel p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">
                {lang === 'ta' ? 'பாதுகாப்பு & அணுகல் பதிவுகள்' : 'Security & Access Logs'}
              </h3>
            </div>
          </div>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
            {securityLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No security alerts logged. System is operating normally.
              </div>
            ) : (
              securityLogs.map((log) => {
                const isAlert = log.action.includes('FAILED') || log.action.includes('UNAUTHORIZED');
                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      isAlert 
                        ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' 
                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                        isAlert ? 'bg-rose-900 text-rose-200' : 'bg-cyan-950 text-cyan-300'
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-white">
                      User: <span className="font-mono text-cyan-300">{log.username}</span>
                    </div>
                    {log.notes && (
                      <p className="text-[10px] text-slate-400 line-clamp-2">
                        {log.notes}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
