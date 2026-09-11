import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Droplet, 
  Lock, 
  User, 
  AlertCircle, 
  Factory, 
  Home, 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  ArrowRight,
  Globe,
  CheckCircle2,
  KeyRound
} from 'lucide-react';

export default function LoginModal() {
  const { login } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeRoleName, setActiveRoleName] = useState('');

  const quickRoles = [
    {
      id: 'admin',
      title: 'System Administrator',
      titleTa: 'கணினி நிர்வாகி',
      user: 'admin',
      pass: 'admin123',
      role: 'Admin',
      icon: ShieldCheck,
      color: 'from-rose-600 to-red-600',
      tag: 'Full Access'
    },
    {
      id: 'intake',
      title: 'Water Intake Operator',
      titleTa: 'நீர் உட்கொள்ளல் ஆபரேட்டர்',
      user: 'op_intake',
      pass: 'intake123',
      role: 'Operator',
      icon: Droplet,
      color: 'from-cyan-600 to-blue-600',
      tag: 'Borewell & Sump'
    },
    {
      id: 'process',
      title: 'Process Water Operator',
      titleTa: 'செயல்முறை நீர் ஆபரேட்டர்',
      user: 'op_process',
      pass: 'process123',
      role: 'Operator',
      icon: Factory,
      color: 'from-blue-600 to-indigo-600',
      tag: 'Lines PW1-PW5'
    },
    {
      id: 'domestic',
      title: 'Domestic & Garden Operator',
      titleTa: 'உள்நாட்டு & தோட்ட ஆபரேட்டர்',
      user: 'op_dom_gard',
      pass: 'domestic123',
      role: 'Operator',
      icon: Home,
      color: 'from-emerald-600 to-teal-600',
      tag: 'Office & Campus'
    },
    {
      id: 'treatment',
      title: 'STP & ETP Plant Operator',
      titleTa: 'STP & ETP சுத்திகரிப்பு ஆபரேட்டர்',
      user: 'op_treatment',
      pass: 'treatment123',
      role: 'Operator',
      icon: Zap,
      color: 'from-amber-600 to-orange-600',
      tag: 'Recycle & RO'
    },
    {
      id: 'manager',
      title: 'Operations Manager',
      titleTa: 'ஆலை மேலாளர்',
      user: 'manager',
      pass: 'viewer123',
      role: 'Viewer',
      icon: BarChart3,
      color: 'from-purple-600 to-pink-600',
      tag: 'Read-Only KPIs'
    }
  ];

  const handleSelectQuickRole = (r) => {
    setUsername(r.user);
    setPassword(r.pass);
    setActiveRoleName(r.title);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Please enter both User ID and Password');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || t('invalidCreds', 'Invalid Username or Password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative">
      
      {/* Top Right Language Switcher Banner */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 shadow-xl">
        <Globe className="w-4 h-4 text-cyan-400 ml-1" />
        <span className="text-xs font-bold text-slate-300">{t('selectLanguage', 'Language')}:</span>
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              lang === 'en' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang('ta')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              lang === 'ta' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            தமிழ்
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl w-full flex flex-col items-center space-y-6 pt-10 sm:pt-0">
        
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-3xl shadow-xl shadow-cyan-500/25 text-white mb-1">
            <Droplet className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {t('brandName', 'AQ TRACK')}
          </h1>
          <p className="text-xs sm:text-sm text-cyan-300 font-bold max-w-xl mx-auto">
            {lang === 'ta' 
              ? 'தொழில்துறை நீர் கண்காணிப்பு போர்டல் • உள்நுழைவு பக்கம்' 
              : 'Industrial Water Monitoring Portal • Secure Sign In'}
          </p>
        </div>

        {/* Central Sign In Box */}
        <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl border-2 border-cyan-500/30 shadow-2xl space-y-6 bg-slate-900/95">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">
                {lang === 'ta' ? 'கணக்கில் உள்நுழையவும்' : 'Sign In to Account'}
              </h2>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> WAL Secured
            </span>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-200 text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5 flex justify-between">
                <span>{lang === 'ta' ? 'பயனர் ஐடி (User ID)' : 'User ID / Username'}</span>
                {activeRoleName && <span className="text-cyan-400 text-[11px]">Selected: {activeRoleName}</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-4 py-3 pl-11 text-white font-semibold text-sm focus:ring-2 focus:ring-cyan-400 focus:outline-none font-mono"
                  placeholder="e.g. admin or op_intake"
                />
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                {lang === 'ta' ? 'கடவுச்சொல் (Password)' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-4 py-3 pl-11 text-white font-semibold text-sm focus:ring-2 focus:ring-cyan-400 focus:outline-none font-mono"
                  placeholder="Enter Password"
                />
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Authenticating...' : (lang === 'ta' ? 'உள்நுழைக →' : 'Sign In to AQ TRACK →')}</span>
            </button>
          </form>

          {/* 1-Click Role Selector Chips */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                {lang === 'ta' ? '⚡ 1-கிளிக் விரைவு உள்நுழைவு:' : '⚡ 1-Click Quick Select Role:'}
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">Click to fill</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {quickRoles.map((r) => {
                const isSelected = username === r.user;
                const IconComp = r.icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectQuickRole(r)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-cyan-950/90 border-cyan-400 ring-1 ring-cyan-400 shadow-md' 
                        : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 bg-gradient-to-br ${r.color} rounded-lg text-white flex-shrink-0`}>
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-white text-[11px] truncate">
                        {lang === 'ta' ? r.titleTa : r.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono mt-1.5">
                      {r.user}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Security & System Info Footer */}
        <div className="text-center space-y-1 text-xs text-slate-400">
          <p>Protected by Role-Based Access Control • Automatic Point-in-Time SQLite Backups</p>
          <p className="text-[11px] text-slate-500 font-mono">AQ TRACK Industrial Water Platform v2.0</p>
        </div>

      </div>

    </div>
  );
}
