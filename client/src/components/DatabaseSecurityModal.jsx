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
  KeyRound
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
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
        <span className="text-slate-600 font-medium text-sm">Inspecting Database Security & Integrity...</span>
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
      <div className="bg-white p-6 rounded-xl border border-slate-200 border-l-4 border-l-sky-600 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {lang === 'ta' ? 'தரவுத்தளம் & பாதுகாப்பு மையம்' : 'Database Security & Safety Backups'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'ta' 
                  ? 'தரவு இழப்பு தடுப்பு, தானியங்கி காப்புப்பிரதிகள் மற்றும் பாதுகாப்பு பதிவுகள்' 
                  : 'Anti-data-loss protection, WAL concurrency, automated backups, and access defense.'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSecurityData}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Feedback message */}
      {feedback.message && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center space-x-2 border shadow-xs ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 4 Health & Protection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Integrity Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Integrity Check</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-1.5">
              {isHealthy ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <span className="text-emerald-700">Healthy</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                  <span className="text-rose-700">Warning</span>
                </>
              )}
            </div>
            <span className="text-xs text-slate-500 font-mono">Status: {dbStatus?.integrity?.status || 'OK'}</span>
          </div>
        </div>

        {/* Card 2: Journal Mode */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage Engine</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Database className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {dbStatus?.journal_mode?.toUpperCase() || 'WAL'}
            </div>
            <span className="text-xs text-slate-500">Write-Ahead Logging Active</span>
          </div>
        </div>

        {/* Card 3: Database Size */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Database Size</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <HardDrive className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-indigo-700 font-mono">
              {dbStatus?.database_size_formatted || '0 KB'}
            </div>
            <span className="text-xs text-slate-500 font-mono">Tables: {dbStatus?.tables?.length || 8}</span>
          </div>
        </div>

        {/* Card 4: Backup Count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stored Snapshots</span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-teal-700 font-mono">
              {backups.length} <span className="text-xs font-semibold text-slate-500 font-sans">Backups</span>
            </div>
            <span className="text-xs text-slate-500">Point-in-Time Restore Ready</span>
          </div>
        </div>

      </div>

      {/* Manual Backup Action Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Trigger Manual Backup Snapshot</h3>
            <p className="text-xs text-slate-500">Create an instant verifiable database copy before making major updates</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={backupReason}
            onChange={(e) => setBackupReason(e.target.value)}
            placeholder="Reason for backup (e.g., Pre-Shift Data Revision)"
            className="w-full sm:flex-1 bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
          />
          <button
            onClick={handleCreateBackup}
            disabled={creatingBackup}
            className="w-full sm:w-auto px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{creatingBackup ? 'Creating Backup...' : 'Create Backup Snapshot'}</span>
          </button>
        </div>
      </div>

      {/* Backups List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Available Backup Snapshots</h3>
          <span className="text-xs text-slate-500 font-mono">{backups.length} snapshots on disk</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-sky-50/70 border-b border-sky-100 text-sky-900 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Backup Filename</th>
                <th className="py-3 px-4">Created Timestamp</th>
                <th className="py-3 px-4">File Size</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 font-sans">
                    No backups found. Click Create Backup above to create one.
                  </td>
                </tr>
              ) : (
                backups.map(b => (
                  <tr key={b.filename} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{b.filename}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sky-700 font-semibold">{b.sizeFormatted}</td>
                    <td className="py-3 px-4 text-right space-x-2 font-sans">
                      <button
                        onClick={() => handleDownloadBackup(b.filename)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center space-x-1"
                        title="Download backup file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => handleRestoreBackup(b.filename)}
                        disabled={restoringFilename === b.filename}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-xs font-semibold cursor-pointer transition-colors inline-flex items-center space-x-1"
                        title="Restore database from this snapshot"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{restoringFilename === b.filename ? 'Restoring...' : 'Restore'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
