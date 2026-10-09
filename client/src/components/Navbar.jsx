import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Droplets, 
  LayoutDashboard, 
  ClipboardPen, 
  CalendarDays, 
  SlidersHorizontal, 
  ShieldCheck, 
  Database,
  LogOut, 
  UserCheck, 
  FileSpreadsheet,
  Menu,
  X,
  ChevronRight,
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
      <div className="lg:hidden sticky top-0 z-50 bg-[#0c2d48] border-b border-sky-900/60 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-sky-500 text-white rounded-lg shadow-sm">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base text-white tracking-tight">{t('brandName', 'AquaTrack')}</span>
            <span className="ml-2 text-[11px] px-2 py-0.5 rounded-md bg-sky-900 text-sky-200 border border-sky-700 font-medium">
              {isAdmin ? t('adminConsole', 'Admin') : t('worker', 'Operator')}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Language Toggle on Mobile */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
            className="px-2.5 py-1.5 bg-sky-900 border border-sky-700 text-sky-200 font-bold text-xs rounded-lg flex items-center space-x-1"
            title="Switch Language / மொழி மாற்றவும்"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'தமிழ்' : 'EN'}</span>
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 bg-sky-900/80 border border-sky-700 text-sky-100 hover:text-white rounded-lg focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Overlay backdrop for mobile menu */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Left Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-[#0c2d48] border-r border-[#092237] shadow-xl flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Upper Portion: Logo, Brand & Navigation Links */}
        <div className="flex-1 flex flex-col overflow-y-auto px-4 py-5 space-y-6">
          
          {/* Top Brand Logo Banner */}
          <div className="bg-[#082035] p-4 rounded-xl border border-sky-900/80 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-sky-500 rounded-xl text-white shadow-md shadow-sky-500/20 flex-shrink-0">
                <Droplets className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <h1 className="font-extrabold text-lg text-white tracking-tight">{t('brandName', 'AquaTrack')}</h1>
                <p className="text-[11px] text-sky-300 font-medium truncate">
                  {t('brandSub', 'Industrial Water Portal')}
                </p>
              </div>
            </div>

            {/* Language Switcher */}
            <div className="pt-2.5 border-t border-sky-900/60 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-sky-200/80 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                Language / மொழி:
              </span>

              <div className="flex bg-[#051624] p-0.5 rounded-lg border border-sky-900 text-[11px] font-semibold">
                <button
                  onClick={() => setLang('en')}
                  className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                    lang === 'en' ? 'bg-sky-500 text-white shadow-xs' : 'text-sky-300 hover:text-white'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang('ta')}
                  className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                    lang === 'ta' ? 'bg-sky-500 text-white shadow-xs' : 'text-sky-300 hover:text-white'
                  }`}
                >
                  தமிழ்
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-sky-900/60 text-[11px] text-sky-300/80 flex items-center justify-between">
              <span>Access Role:</span>
              <span className="px-2 py-0.5 rounded-md bg-sky-950 text-sky-300 border border-sky-800 font-semibold text-[10px] uppercase">
                {isAdmin ? t('adminConsole', 'Admin Console') : `${user?.assigned_areas?.[0] || 'Operator'}`}
              </span>
            </div>
          </div>

          {/* Section Divider */}
          <div className="space-y-0.5 px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300/70">
              {t('workerNav', 'System Navigation')}
            </span>
          </div>

          {/* Vertical Navigation Links */}
          <nav className="space-y-1.5">
            
            {/* Dashboard for Admin / Viewer */}
            {isAdmin && (
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left font-medium transition-all group ${
                  activeTab === 'dashboard'
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-900/40 font-semibold'
                    : 'text-sky-100/90 hover:bg-[#082035] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-1.5 rounded-lg ${activeTab === 'dashboard' ? 'bg-white/20 text-white' : 'bg-sky-950/60 text-sky-300'}`}>
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold">{t('liveDashboard', 'Live Dashboard')}</span>
                    <span className={`block text-[10px] ${activeTab === 'dashboard' ? 'text-sky-100' : 'text-sky-300/70'}`}>
                      {t('dashboardDesc', 'Overview & Water Analytics')}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'dashboard' ? 'text-white' : 'text-sky-400/50'}`} />
              </button>
            )}

            {/* Area Entry Tab - Primary workspace */}
            <button
              onClick={() => handleNavClick('entry')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left font-medium transition-all group ${
                activeTab === 'entry'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-900/40 font-semibold'
                  : 'text-sky-100/90 hover:bg-[#082035] hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-1.5 rounded-lg ${activeTab === 'entry' ? 'bg-white/20 text-white' : 'bg-sky-950/60 text-sky-300'}`}>
                  <ClipboardPen className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-semibold">{t('areaDataEntry', 'Area Data Entry')}</span>
                  <span className={`block text-[10px] ${activeTab === 'entry' ? 'text-sky-100' : 'text-sky-300/70'}`}>
                    {t('areaEntryDesc', 'Enter & Update Meter Values')}
                  </span>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'entry' ? 'text-white' : 'text-sky-400/50'}`} />
            </button>

            {/* Past Records (2026 Historical Logs) */}
            <button
              onClick={() => handleNavClick('records')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left font-medium transition-all group ${
                activeTab === 'records'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-900/40 font-semibold'
                  : 'text-sky-100/90 hover:bg-[#082035] hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-1.5 rounded-lg ${activeTab === 'records' ? 'bg-white/20 text-white' : 'bg-sky-950/60 text-sky-300'}`}>
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-semibold">{t('pastRecords', 'Past Records')}</span>
                  <span className={`block text-[10px] ${activeTab === 'records' ? 'text-sky-100' : 'text-sky-300/70'}`}>
                    {t('pastRecordsDesc', 'View 2026 Historical Logs')}
                  </span>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'records' ? 'text-white' : 'text-sky-400/50'}`} />
            </button>

            {/* Admin Only Management Tools */}
            {isAdmin && (
              <>
                <div className="pt-2 px-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300/70">
                    Configuration & Admin
                  </span>
                </div>

                <button
                  onClick={() => handleNavClick('meters')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left font-medium transition-all group ${
                    activeTab === 'meters'
                      ? 'bg-sky-500 text-white shadow-md font-semibold'
                      : 'text-sky-100/90 hover:bg-[#082035] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-lg ${activeTab === 'meters' ? 'bg-white/20 text-white' : 'bg-sky-950/60 text-sky-300'}`}>
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold">{t('metersConfig', 'Meters Config')}</span>
                      <span className={`block text-[10px] ${activeTab === 'meters' ? 'text-sky-100' : 'text-sky-300/70'}`}>
                        {t('metersConfigDesc', 'Configure Sub-meters & Lines')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'meters' ? 'text-white' : 'text-sky-400/50'}`} />
                </button>

                <button
                  onClick={() => handleNavClick('security')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left font-medium transition-all group ${
                    activeTab === 'security'
                      ? 'bg-sky-500 text-white shadow-md font-semibold'
                      : 'text-sky-100/90 hover:bg-[#082035] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-lg ${activeTab === 'security' ? 'bg-white/20 text-white' : 'bg-sky-950/60 text-sky-300'}`}>
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold">{t('dbSecurity', 'Database & Security')}</span>
                      <span className={`block text-[10px] ${activeTab === 'security' ? 'text-sky-100' : 'text-sky-300/70'}`}>
                        {t('dbSecurityDesc', 'Backups & Anti-Data-Loss')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'security' ? 'text-white' : 'text-sky-400/50'}`} />
                </button>

                <button
                  onClick={() => handleNavClick('audit')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left font-medium transition-all group ${
                    activeTab === 'audit'
                      ? 'bg-sky-500 text-white shadow-md font-semibold'
                      : 'text-sky-100/90 hover:bg-[#082035] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-lg ${activeTab === 'audit' ? 'bg-white/20 text-white' : 'bg-sky-950/60 text-sky-300'}`}>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold">{t('auditTrail', 'Audit Trail')}</span>
                      <span className={`block text-[10px] ${activeTab === 'audit' ? 'text-sky-100' : 'text-sky-300/70'}`}>
                        {t('auditTrailDesc', 'System & Entry Change Logs')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === 'audit' ? 'text-white' : 'text-sky-400/50'}`} />
                </button>

                {/* Excel Export Action Button */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onOpenExport();
                      setMobileOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{t('downloadExcel', 'Download Excel Ledger')}</span>
                  </button>
                </div>
              </>
            )}

          </nav>
        </div>

        {/* Lower Portion: User Profile Card & Sign Out Button */}
        <div className="p-4 border-t border-[#092237] bg-[#082035] space-y-3">
          <div className="p-3 rounded-xl bg-[#0c2d48] border border-sky-900/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="p-2 bg-sky-900 text-sky-300 rounded-lg flex-shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-white truncate">
                  {user?.name || 'Worker'}
                </span>
                <span className="block text-[10px] font-medium text-sky-300 uppercase tracking-wider truncate">
                  {user?.role} {user?.role === 'Operator' && user?.assigned_areas?.length > 0 ? `(${user.assigned_areas[0]})` : ''}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 py-2 rounded-lg bg-[#0c2d48] hover:bg-rose-900/50 text-sky-200 hover:text-rose-200 border border-sky-900 hover:border-rose-700 transition-all font-semibold text-xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('signOut', 'Sign Out')}</span>
          </button>
        </div>

      </aside>
    </>
  );
}
