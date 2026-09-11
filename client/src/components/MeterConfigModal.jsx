import React, { useState, useEffect } from 'react';
import { getMeters, createMeter, updateMeter } from '../services/api';
import { Sliders, Plus, CheckCircle, XCircle, Edit, Save, AlertCircle } from 'lucide-react';

export default function MeterConfigModal() {
  const [meters, setMeters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [newMeter, setNewMeter] = useState({
    code: '',
    name: '',
    category: 'process',
    area: 'Process Water',
    unit: 'KL',
    display_order: 10
  });

  const categories = [
    { code: 'intake', name: 'Water Intake', area: 'Water Intake' },
    { code: 'process', name: 'Process Water', area: 'Process Water' },
    { code: 'domestic', name: 'Domestic Water', area: 'Domestic & Garden Water' },
    { code: 'garden', name: 'Garden Water', area: 'Domestic & Garden Water' },
    { code: 'outside', name: 'Outside Water', area: 'Outside Water' }
  ];

  useEffect(() => {
    fetchMeters();
  }, []);

  const fetchMeters = async () => {
    try {
      setLoading(true);
      const data = await getMeters();
      setMeters(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg('');
    setErrorMsg('');

    try {
      await createMeter(newMeter);
      setMsg(`Meter ${newMeter.code} added successfully!`);
      setShowAddForm(false);
      setNewMeter({ code: '', name: '', category: 'process', area: 'Process Water', unit: 'KL', display_order: 10 });
      fetchMeters();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to add meter');
    }
  };

  const handleToggleActive = async (code, currentActive) => {
    try {
      await updateMeter(code, { is_active: currentActive ? 0 : 1 });
      fetchMeters();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      <div className="glass-panel p-6 rounded-2xl shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Dynamic Meter & Sub-point Configuration</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure numbered meters (PW1–PWn, DW1–DWn, GW1–GWn, OW1–OWn) per area
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Close Form' : 'Add New Meter'}</span>
        </button>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-sm flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span>{msg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950 border border-rose-800 text-rose-300 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Add New Meter Form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="glass-panel p-6 rounded-2xl space-y-4 border border-cyan-500/40">
          <h3 className="font-bold text-white text-sm">Add New Meter / Sub-Point</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Meter Code (e.g. PW6, DW11)</label>
              <input
                type="text"
                required
                value={newMeter.code}
                onChange={(e) => setNewMeter({ ...newMeter, code: e.target.value.toUpperCase() })}
                placeholder="PW6"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm uppercase focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Meter Name / Description</label>
              <input
                type="text"
                required
                value={newMeter.name}
                onChange={(e) => setNewMeter({ ...newMeter, name: e.target.value })}
                placeholder="Process Line 6 Outlet"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category & Area</label>
              <select
                value={newMeter.category}
                onChange={(e) => {
                  const catObj = categories.find(c => c.code === e.target.value);
                  setNewMeter({
                    ...newMeter,
                    category: e.target.value,
                    area: catObj ? catObj.area : 'Process Water'
                  });
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cyan-500"
              >
                {categories.map(c => (
                  <option key={c.code} value={c.code}>{c.name} ({c.area})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
            >
              Create Meter
            </button>
          </div>
        </form>
      )}

      {/* Existing Meters List */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-white text-sm">Active & Configured Industrial Meters</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs text-slate-400 uppercase font-mono">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Assigned Area</th>
                <th className="p-3">Unit</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {meters.map(m => (
                <tr key={m.code} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono font-bold text-cyan-400">{m.code}</td>
                  <td className="p-3 text-white font-medium">{m.name}</td>
                  <td className="p-3 capitalize">{m.category}</td>
                  <td className="p-3">{m.area}</td>
                  <td className="p-3 font-mono">{m.unit}</td>
                  <td className="p-3">
                    {m.is_active ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleToggleActive(m.code, m.is_active)}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                        m.is_active
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900'
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                      }`}
                    >
                      {m.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
