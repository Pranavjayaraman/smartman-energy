import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Droplets, 
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
      role: 'Admin',
      icon: ShieldCheck,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      tag: 'Full Access'
    },
    {
      id: 'intake',
      title: 'Water Intake Operator',
      titleTa: 'நீர் உட்கொள்ளல் ஆபரேட்டர்',
      user: 'op_intake',
      role: 'Operator',
      icon: Droplets,
      color: 'bg-sky-50 text-sky-700 border-sky-200',
      tag: 'Borewell & Sump'
    },
    {
      id: 'process',
      title: 'Process Water Operator',
      titleTa: 'செயல்முறை நீர் ஆபரேட்டர்',
      user: 'op_process',
      role: 'Operator',
      icon: Factory,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      tag: 'Lines PW1-PW5'
    },
    {
      id: 'domestic',
      title: 'Domestic & Garden Operator',
      titleTa: 'உள்நாட்டு & தோட்ட ஆபரேட்டர்',
      user: 'op_dom_gard',
      role: 'Operator',
      icon: Home,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      tag: 'Office & Campus'
    },
    {
      id: 'treatment',
      title: 'STP & ETP Operator',
      titleTa: 'STP & ETP ஆபரேட்டர்',
      user: 'op_treatment',
      role: 'Operator',
      icon: Zap,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      tag: 'Recycle & RO'
    },
    {
      id: 'manager',
      title: 'Operations Manager',
      titleTa: 'ஆலை மேலாளர்',
      user: 'manager',
      role: 'Viewer',
      icon: BarChart3,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      tag: 'Read-Only KPIs'
    }
  ];

  const handleSelectQuickRole = (r) => {
    setUsername(r.user);
    setPassword('');
    setActiveRoleName(lang === 'ta' ? r.titleTa : r.title);
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative">
      
      {/* Top Right Language Switcher */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
        <Globe className="w-4 h-4 text-sky-600" />
        <span className="text-xs font-semibold text-slate-600">{t('selectLanguage', 'Language')}:</span>
        <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setLang('en')}
            className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
              lang === 'en' ? 'bg-white text-sky-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang('ta')}
            className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
              lang === 'ta' ? 'bg-white text-sky-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            தமிழ்
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-3xl w-full flex flex-col items-center space-y-6 pt-10 sm:pt-0">
        
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-sky-600 text-white rounded-2xl shadow-md shadow-sky-600/20 mb-1">
            <Droplets className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('brandName', 'AquaTrack Portal')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto">
            {lang === 'ta' 
              ? 'தொழில்துறை நீர் கண்காணிப்பு போர்டல் • உள்நுழைவு' 
              : 'Industrial Water Monitoring & Operational Utility Portal'}
          </p>
        </div>

        {/* Central Sign In Box */}
        <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white shadow-md space-y-5">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-sky-600" />
              <h2 className="text-base font-bold text-slate-800">
                {lang === 'ta' ? 'கணக்கில் உள்நுழையவும்' : 'Sign In to Account'}
              </h2>
            </div>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Secure Access
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex justify-between">
                <span>{lang === 'ta' ? 'பயனர் ஐடி (User ID)' : 'User ID / Username'}</span>
                {activeRoleName && <span className="text-sky-700 text-[11px] font-medium">{activeRoleName}</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 pl-10 text-slate-900 font-medium text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors font-mono"
                  placeholder="e.g. admin or op_intake"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === 'ta' ? 'கடவுச்சொல் (Password)' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 pl-10 text-slate-900 font-medium text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none transition-colors font-mono"
                  placeholder="Enter Password"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Authenticating...' : (lang === 'ta' ? 'உள்நுழைக →' : 'Sign In')}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Quick Select User ID Grid */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {lang === 'ta' ? 'விரைவு பயனர் ஐடி தேர்வு:' : 'Quick Select Account:'}
              </span>
              <span className="text-[11px] text-slate-400">Click to fill User ID</span>
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
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-sky-50/80 border-sky-500 ring-1 ring-sky-500 shadow-xs' 
                        : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`p-1 rounded-md ${r.color} border flex-shrink-0`}>
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-slate-800 text-[11px] truncate">
                        {lang === 'ta' ? r.titleTa : r.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-sky-700 font-mono mt-1 font-medium">
                      {r.user}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Security Info Footer */}
        <div className="text-center space-y-1 text-xs text-slate-500">
          <p>Role-Based Operational Access • SQLite Journal & Automated Backups</p>
          <p className="text-[11px] text-slate-400 font-mono">AquaTrack Utility System v2.0</p>
        </div>

      </div>

    </div>
  );
}
