import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AreaEntryForm from './components/AreaEntryForm';
import PastRecordsView from './components/PastRecordsView';
import MeterConfigModal from './components/MeterConfigModal';
import AuditLogView from './components/AuditLogView';
import DatabaseSecurityModal from './components/DatabaseSecurityModal';
import ExcelExportModal from './components/ExcelExportModal';
import LoginModal from './components/LoginModal';

function MainApp() {
  const { user, loading, logout } = useAuth();
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-cyan-400 font-mono text-sm">
        Initializing AQ TRACK Portal...
      </div>
    );
  }

  // The starting page is strictly the Login Page if not authenticated
  if (!user) {
    return <LoginModal />;
  }

  const handleSelectDateForEdit = (dateStr) => {
    setSelectedEditDate(dateStr);
    setActiveTab('entry');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans antialiased">
      {/* Left Sidebar Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden min-h-screen">
        
        {/* Top Header Navigation Bar with Prominent Back Buttons */}
        <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            {/* Show Back Button if user is on any sub-tab other than default */}
            {((user?.role === 'Admin' || user?.role === 'Viewer') && activeTab !== 'dashboard') ? (
              <button
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-white border border-cyan-700/80 text-xs font-bold transition-all cursor-pointer shadow group"
                title="Return to Main Dashboard"
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                <span>Back to Dashboard</span>
              </button>
            ) : (user?.role === 'Operator' && activeTab !== 'entry') ? (
              <button
                onClick={() => setActiveTab('entry')}
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-white border border-cyan-700/80 text-xs font-bold transition-all cursor-pointer shadow group"
                title="Return to Area Data Entry"
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                <span>Back to Daily Entry</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>AQ TRACK Portal</span>
              </div>
            )}

            <span className="text-slate-600 hidden sm:inline">•</span>

            {/* Breadcrumb Title */}
            <span className="text-xs font-bold text-slate-200 capitalize hidden sm:inline">
              {activeTab === 'dashboard' && 'Live Dashboard & Analytics'}
              {activeTab === 'entry' && 'Daily Area Meter Entry'}
              {activeTab === 'records' && 'Past Records & PDF Dataset'}
              {activeTab === 'meters' && 'Meters Configuration'}
              {activeTab === 'security' && 'Database Security & Safety Backups'}
              {activeTab === 'audit' && 'System Audit Log'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick switch between Entry and Records for Operators */}
            {user?.role === 'Operator' && (
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('entry')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'entry' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Entry Form
                </button>
                <button
                  onClick={() => setActiveTab('records')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'records' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Past Records
                </button>
              </div>
            )}

            {/* Quick Back to Dashboard chip for Admin if not on dashboard */}
            {(user?.role === 'Admin' || user?.role === 'Viewer') && activeTab !== 'dashboard' && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className="hidden md:flex items-center space-x-1 text-xs text-slate-400 hover:text-cyan-400 font-semibold cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <span>🏠 Home</span>
              </button>
            )}

            {/* Prominent Log Out / Switch Account Button to return to Login Page */}
            <button
              onClick={logout}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800 text-xs font-bold transition-all cursor-pointer shadow"
              title="Sign Out and Return to Login Page"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Dashboard is accessible for Admin and Viewer roles */}
          {activeTab === 'dashboard' && (user?.role === 'Admin' || user?.role === 'Viewer') && <Dashboard />}
          
          {/* Area Entry is accessible for Operators & Admin to enter/check/update readings */}
          {activeTab === 'entry' && <AreaEntryForm initialDate={selectedEditDate} />}
          
          {/* Past Records View (PDF Historical Data) */}
          {activeTab === 'records' && (
            <PastRecordsView
              onSelectDateForEdit={handleSelectDateForEdit}
              onOpenExport={() => setIsExportOpen(true)}
            />
          )}

          {/* Admin only tabs */}
          {activeTab === 'meters' && user?.role === 'Admin' && <MeterConfigModal />}
          {activeTab === 'security' && user?.role === 'Admin' && <DatabaseSecurityModal />}
          {activeTab === 'audit' && user?.role === 'Admin' && <AuditLogView />}
        </main>

        <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-400 glass-panel mt-auto">
          AQ TRACK Industrial Water Monitoring Portal • Simple Worker Interface
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
