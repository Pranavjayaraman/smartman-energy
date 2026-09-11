import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Droplet, 
  LayoutDashboard, 
  ClipboardEdit, 
  Sliders, 
  ShieldCheck, 
  Database,
  LogOut, 
  UserCheck, 
  Download,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Globe
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenExport }) {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === 'Admin';

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header Bar with Drawer Toggle */}
      <div className="lg:hidden sticky top-0 z-50 glass-panel border-b border-slate-700/80 px-4 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl shadow-md text-white">
            <Droplet className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-base text-white tracking-tight">{t('brandName', 'AquaTrack')}</span>
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              {isAdmin ? t('adminConsole', 'Admin') : t('worker', 'Operator')}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Language Toggle on Mobile Header */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
            className="px-2.5 py-1.5 bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold text-xs rounded-xl flex items-center space-x-1"
            title="Switch Language / மொழி மாற்றவும்"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'தமிழ்' : 'EN'}</span>
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2.5 bg-slate-800 border border-slate-700 text-slate-200 hover:text-white rounded-xl focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Overlay backdrop for mobile menu */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Left Sidebar Navigation (Top to Bottom on Left Side) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-slate-900/95 border-r border-slate-800/80 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Upper Portion: Logo, Branding & Main Nav */}
        <div className="flex-1 flex flex-col overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
          
          {/* Top Brand Logo Banner */}
          <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20 shadow-lg space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/30 text-white flex-shrink-0">
                <Droplet className="w-7 h-7 animate-pulse" />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center space-x-1.5">
                  <h1 className="font-extrabold text-xl text-white tracking-tight">{t('brandName', 'AquaTrack')}</h1>
                  <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                </div>
                <p className="text-[11px] text-cyan-300 font-semibold truncate">
                  {t('brandSub', 'Industrial Water Portal')}
                </p>
              </div>
            </div>

            {/* Language Switcher Control */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                {t('selectLanguage', 'Language / மொழி')}:
              </span>

              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                <button
                  onClick={() => setLang('en')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    lang === 'en' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang('ta')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    lang === 'ta' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  தமிழ்
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Mode:</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold uppercase">
                {isAdmin ? t('adminConsole', 'Admin Console') : `${user?.assigned_areas?.[0] || 'Operator'}`}
              </span>
            </div>
          </div>

          {/* Section Divider & Header */}
          <div className="space-y-1">
            <span className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('workerNav', 'Worker Navigation')}
            </span>
            <p className="px-3 text-[10px] text-slate-400">
              {t('navDesc', 'Select your task below')}
            </p>
          </div>

          {/* Vertical Navigation Links */}
          <nav className="space-y-2">
            
            {/* Dashboard detail is STRICTLY shown to Admin only */}
            {isAdmin && (
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left font-bold transition-all group ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400/40'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div className={`p-2 rounded-xl ${activeTab === 'dashboard' ? 'bg-white/20 text-white' : 'bg-slate-800 text-cyan-400 group-hover:bg-slate-700'}`}>
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-sm">{t('liveDashboard', 'Live Dashboard')}</span>
                    <span className={`block text-[10px] font-normal ${activeTab === 'dashboard' ? 'text-cyan-100' : 'text-slate-400'}`}>
                      {t('dashboardDesc', 'Overview & Water Analytics')}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'dashboard' ? 'translate-x-1 text-white' : 'text-slate-600 group-hover:text-slate-400'}`} />
              </button>
            )}

            {/* Area Entry Tab - Primary workspace for Operators and Admin */}
            <button
              onClick={() => handleNavClick('entry')}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left font-bold transition-all group ${
                activeTab === 'entry'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400/40'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <div className={`p-2 rounded-xl ${activeTab === 'entry' ? 'bg-white/20 text-white' : 'bg-slate-800 text-cyan-400 group-hover:bg-slate-700'}`}>
                  <ClipboardEdit className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-sm">{t('areaDataEntry', 'Area Data Entry')}</span>
                  <span className={`block text-[10px] font-normal ${activeTab === 'entry' ? 'text-cyan-100' : 'text-slate-400'}`}>
                    {t('areaEntryDesc', 'Enter & Update Meter Values')}
                  </span>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'entry' ? 'translate-x-1 text-white' : 'text-slate-600 group-hover:text-slate-400'}`} />
            </button>

            {/* Past Records (PDF Uploaded Data) Tab */}
            <button
              onClick={() => handleNavClick('records')}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left font-bold transition-all group ${
                activeTab === 'records'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400/40'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <div className={`p-2 rounded-xl ${activeTab === 'records' ? 'bg-white/20 text-white' : 'bg-slate-800 text-cyan-400 group-hover:bg-slate-700'}`}>
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-sm">{t('pastRecords', 'Past Records')}</span>
                  <span className={`block text-[10px] font-normal ${activeTab === 'records' ? 'text-cyan-100' : 'text-slate-400'}`}>
                    {t('pastRecordsDesc', 'View 2026 PDF Historical Logs')}
                  </span>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'records' ? 'translate-x-1 text-white' : 'text-slate-600 group-hover:text-slate-400'}`} />
            </button>

            {/* Admin Only Tools */}
            {isAdmin && (
              <>
                <button
                  onClick={() => handleNavClick('meters')}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left font-bold transition-all group ${
                    activeTab === 'meters'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400/40'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`p-2 rounded-xl ${activeTab === 'meters' ? 'bg-white/20 text-white' : 'bg-slate-800 text-cyan-400 group-hover:bg-slate-700'}`}>
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-sm">{t('metersConfig', 'Meters Config')}</span>
                      <span className={`block text-[10px] font-normal ${activeTab === 'meters' ? 'text-cyan-100' : 'text-slate-400'}`}>
                        {t('metersConfigDesc', 'Configure Sub-meters & Lines')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'meters' ? 'translate-x-1 text-white' : 'text-slate-600 group-hover:text-slate-400'}`} />
                </button>

                <button
                  onClick={() => handleNavClick('security')}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left font-bold transition-all group ${
                    activeTab === 'security'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400/40'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`p-2 rounded-xl ${activeTab === 'security' ? 'bg-white/20 text-white' : 'bg-slate-800 text-cyan-400 group-hover:bg-slate-700'}`}>
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-sm">{t('dbSecurity', 'Database & Security')}</span>
                      <span className={`block text-[10px] font-normal ${activeTab === 'security' ? 'text-cyan-100' : 'text-slate-400'}`}>
                        {t('dbSecurityDesc', 'Backups, Health & Anti-Data-Loss')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'security' ? 'translate-x-1 text-white' : 'text-slate-600 group-hover:text-slate-400'}`} />
                </button>

                <button
                  onClick={() => handleNavClick('audit')}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left font-bold transition-all group ${
                    activeTab === 'audit'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400/40'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`p-2 rounded-xl ${activeTab === 'audit' ? 'bg-white/20 text-white' : 'bg-slate-800 text-cyan-400 group-hover:bg-slate-700'}`}>
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-sm">{t('auditTrail', 'Audit Trail')}</span>
                      <span className={`block text-[10px] font-normal ${activeTab === 'audit' ? 'text-cyan-100' : 'text-slate-400'}`}>
                        {t('auditTrailDesc', 'System & Entry Change Logs')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'audit' ? 'translate-x-1 text-white' : 'text-slate-600 group-hover:text-slate-400'}`} />
                </button>

                {/* Excel Export Action Button */}
                <div className="pt-4">
                  <button
                    onClick={() => {
                      onOpenExport();
                      setMobileOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 transition-all cursor-pointer border border-emerald-400/30"
                  >
                    <Download className="w-5 h-5" />
                    <span>{t('downloadExcel', 'Download Excel Ledger')}</span>
                  </button>
                </div>
              </>
            )}

          </nav>
        </div>

        {/* Lower Portion: User Profile Card & Sign Out Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
          <div className="glass-panel p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="p-2.5 bg-slate-800 text-cyan-400 border border-slate-700 rounded-xl flex-shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="block text-sm font-bold text-white truncate">
                  {user?.name || 'Worker'}
                </span>
                <span className="block text-[10px] font-semibold text-cyan-400 uppercase tracking-wider truncate">
                  {user?.role} {user?.role === 'Operator' && user?.assigned_areas?.length > 0 ? `(${user.assigned_areas[0]})` : ''}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-800/90 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition-all font-bold text-xs cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>{t('signOut', 'Sign Out')}</span>
          </button>
        </div>

      </aside>
    </>
  );
}
