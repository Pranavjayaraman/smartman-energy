import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AreaEntryForm from './components/AreaEntryForm';
import PastRecordsView from './components/PastRecordsView';
import MeterConfigModal from './components/MeterConfigModal';
import AuditLogView from './components/AuditLogView';
import DatabaseSecurityModal from './components/DatabaseSecurityModal';
import ExcelExportModal from './components/ExcelExportModal';
import LoginModal from './components/LoginModal';
import { 
  ArrowLeft, 
  LogOut, 
  Layers, 
  CheckCircle2, 
  FileSpreadsheet,
  Globe
} from 'lucide-react';

function MainApp() {
  const { user, loading, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('entry'); // Default to area entry for operators
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedEditDate, setSelectedEditDate] = useState(null);

  // Set default active tab based on role when user changes
  useEffect(() => {
    if (user) {
      if (user.role === 'Admin' || user.role === 'Viewer') {
        setActiveTab('dashboard');
      } else {
        setActiveTab('entry'); // Operators strictly start on Area Entry
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-sky-800">
        <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mb-4"></div>
        <p className="font-semibold text-sm text-slate-600">Loading AquaTrack Portal...</p>
      </div>
    );
  }

  // Starting page is strictly the Login Page if not authenticated
  if (!user) {
    return <LoginModal />;
  }

  const handleSelectDateForEdit = (dateStr) => {
    setSelectedEditDate(dateStr);
    setActiveTab('entry');
  };

  const isAdminOrViewer = user?.role === 'Admin' || user?.role === 'Viewer';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row antialiased font-sans">
      {/* Left Sidebar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden min-h-screen">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            {/* Contextual Back Button */}
            {(isAdminOrViewer && activeTab !== 'dashboard') ? (
              <button
                onClick={() => setActiveTab('dashboard')}
                className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold transition-colors cursor-pointer"
                title="Return to Main Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </button>
            ) : (!isAdminOrViewer && activeTab !== 'entry') ? (
              <button
                onClick={() => setActiveTab('entry')}
                className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold transition-colors cursor-pointer"
                title="Return to Daily Entry"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Daily Entry</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-700">AquaTrack Portal</span>
              </div>
            )}

            <span className="text-slate-300 hidden sm:inline">|</span>

            {/* Breadcrumb Title */}
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
              {activeTab === 'dashboard' && 'Operations Dashboard & Water Analytics'}
              {activeTab === 'entry' && 'Daily Water Meter Reading Entry'}
              {activeTab === 'records' && 'Historical Logs & PDF Dataset (2026)'}
              {activeTab === 'meters' && 'Meter Points & Sub-Lines Configuration'}
              {activeTab === 'security' && 'Database Protection & Point-in-Time Backups'}
              {activeTab === 'audit' && 'System Activity & Compliance Audit Log'}
            </span>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center space-x-1.5 transition-colors border border-slate-200"
              title="Switch Language / மொழி மாற்றவும்"
            >
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              <span>{lang === 'en' ? 'தமிழ்' : 'EN'}</span>
            </button>

            {/* Operator Quick Switch */}
            {user?.role === 'Operator' && (
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setActiveTab('entry')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    activeTab === 'entry' ? 'bg-white text-sky-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Entry Form
                </button>
                <button
                  onClick={() => setActiveTab('records')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    activeTab === 'records' ? 'bg-white text-sky-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Past Records
                </button>
              </div>
            )}

            {/* Export Trigger in top bar for quick access */}
            {user?.role === 'Admin' && (
              <button
                onClick={() => setIsExportOpen(true)}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                <span>Excel Ledger</span>
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={logout}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {activeTab === 'dashboard' && isAdminOrViewer && (
            <Dashboard onOpenExport={() => setIsExportOpen(true)} />
          )}
          
          {activeTab === 'entry' && (
            <AreaEntryForm initialDate={selectedEditDate} />
          )}
          
          {activeTab === 'records' && (
            <PastRecordsView
              onSelectDateForEdit={handleSelectDateForEdit}
              onOpenExport={() => setIsExportOpen(true)}
            />
          )}

          {activeTab === 'meters' && user?.role === 'Admin' && (
            <MeterConfigModal />
          )}

          {activeTab === 'security' && user?.role === 'Admin' && (
            <DatabaseSecurityModal />
          )}

          {activeTab === 'audit' && user?.role === 'Admin' && (
            <AuditLogView />
          )}
        </main>

        {/* Professional Clean Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500 mt-auto">
          AquaTrack Industrial Water & Utilities Portal • Operations & Environmental Compliance System
        </footer>
      </div>

      <ExcelExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </LanguageProvider>
  );
}
