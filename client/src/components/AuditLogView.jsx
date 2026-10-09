import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../services/api';
import { ShieldCheck } from 'lucide-react';

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
      
      <div className="bg-white p-6 rounded-xl border border-slate-200 border-l-4 border-l-sky-600 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-sky-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Compliance & System Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete historical record of reading submissions, back-dated edits, and configuration changes
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-sky-50/70 border-b border-sky-100 text-sky-900 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Target ID</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sky-700 font-bold">{log.username}</td>
                  <td className="py-3 px-4 font-sans">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      log.action.includes('UPDATE') || log.action.includes('EDIT') ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      'bg-sky-50 text-sky-800 border border-sky-200'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-sans">{log.entity_type}</td>
                  <td className="py-3 px-4 text-slate-800">{log.entity_id}</td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate font-sans">{log.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
