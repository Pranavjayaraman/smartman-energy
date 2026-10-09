import React, { useState, useEffect } from 'react';
import { getMeters, createMeter, updateMeter } from '../services/api';
import { SlidersHorizontal, Plus, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
      
      <div className="bg-white p-6 rounded-xl border border-slate-200 border-l-4 border-l-sky-600 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-5 h-5 text-sky-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Meter Points & Sub-Lines Configuration</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure numbered flow meters (PW1–PWn, DW1–DWn, GW1–GWn, OW1–OWn) per factory section
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Close Form' : 'Add New Meter'}</span>
        </button>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2 font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{msg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-2 font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Add New Meter Form */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl border border-sky-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Add New Meter / Sub-Point</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Meter Code (e.g. PW6, DW11)</label>
              <input
                type="text"
                required
                value={newMeter.code}
                onChange={(e) => setNewMeter({ ...newMeter, code: e.target.value.toUpperCase() })}
                placeholder="PW6"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-sm uppercase focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Meter Name / Description</label>
              <input
                type="text"
                required
                value={newMeter.name}
                onChange={(e) => setNewMeter({ ...newMeter, name: e.target.value })}
                placeholder="Process Line 6 Outlet"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category & Area</label>
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
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
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
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Create Meter
            </button>
          </div>
        </form>
      )}

      {/* Existing Meters Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">Active & Configured Industrial Meters</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-sky-50/70 border-b border-sky-100 text-sky-900 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Assigned Area</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {meters.map(m => (
                <tr key={m.code} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-sky-700">{m.code}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{m.name}</td>
                  <td className="py-3 px-4 capitalize">{m.category}</td>
                  <td className="py-3 px-4">{m.area}</td>
                  <td className="py-3 px-4 font-mono">{m.unit}</td>
                  <td className="py-3 px-4">
                    {m.is_active ? (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleActive(m.code, m.is_active)}
                      className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        m.is_active
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
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
