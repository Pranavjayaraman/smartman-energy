import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../services/api';
import { ShieldCheck, Clock, User, FileText } from 'lucide-react';

export default function AuditLogView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getAuditLogs(100);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      <div className="glass-panel p-6 rounded-2xl shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Compliance & System Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete record of reading submissions, back-dated edits, and configuration changes
          </p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs text-slate-400 uppercase font-mono">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">User</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity Type</th>
                <th className="p-3">Target ID</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40 font-mono text-xs">
                  <td className="p-3 text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3 text-cyan-400 font-bold">{log.username}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.action.includes('CREATE') ? 'bg-emerald-950 text-emerald-400' :
                      log.action.includes('UPDATE') || log.action.includes('EDIT') ? 'bg-amber-950 text-amber-400' :
                      'bg-blue-950 text-blue-400'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{log.entity_type}</td>
                  <td className="p-3 text-cyan-300">{log.entity_id}</td>
                  <td className="p-3 text-slate-400 max-w-xs truncate">{log.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
