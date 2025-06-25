import React, { useState, useEffect } from 'react';
import { Monitor, MonitorFormData, User, MonitoringSettings } from './types/monitor';
import { BrandingSettings } from './types/branding';
import { checkUptime, calculateUptime, formatUrlForApi, saveStatusCheck } from './utils/uptimeChecker';
import { authService } from './services/authService';
import { monitorService } from './services/monitorService';
import { monitoringService } from './services/monitoringService';
import { brandingService } from './services/brandingService';
import { useRealTimeMonitoring } from './hooks/useRealTimeMonitoring';
import { envVars, isEnvConfigured } from './lib/supabase';
import Navigation from './components/Navigation';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import LoginForm from './components/LoginForm';

function App() {
  const [activeView, setActiveView] = useState<'admin' | 'user'>('user');
  const [user, setUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState<string>('');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [monitoringSettings, setMonitoringSettings] = useState<MonitoringSettings>({
    globalCheckInterval: 5,
    enableGlobalInterval: false
  });
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>({
    appName: 'UptimeWatch',
    logoUrl: '',
    faviconUrl: '/vite.svg',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState<'checking' | 'env_error' | 'ready'>('checking');

  // Set up real-time monitoring
  const { lastUpdateTime, activeChecks, isMonitoring } = useRealTimeMonitoring({
    monitors,
    monitoringSettings,
    onMonitorsUpdate: setMonitors,
    isActive: appState === 'ready'
  });

  // Check environment and load data on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🔄 Initializing application...');
        console.log('🔍 Environment check:', {
          hasUrl: !!envVars.supabaseUrl,
          hasKey: !!envVars.supabaseAnonKey,
          isConfigured: isEnvConfigured,
          url: envVars.supabaseUrl ? `${envVars.supabaseUrl.substring(0, 30)}...` : 'missing',
          keyLength: envVars.supabaseAnonKey?.length || 0
        });
        
        // Check environment variables first
        if (!isEnvConfigured) {
          console.log('❌ Environment variables not configured');
          setAppState('env_error');
          setIsLoading(false);
          return;
        }

        console.log('✅ Environment variables validated');
        
        // Load application data
        await loadInitialData();
        setAppState('ready');
        
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setAppState('env_error');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Load initial data
  const loadInitialData = async () => {
    try {
      console.log('🔄 Loading initial data...');
      
      // Load monitors, settings, and branding in parallel
      const [monitorsData, settingsData, brandingData] = await Promise.all([
        monitorService.getAllMonitors(),
        monitoringService.getSettings(),
        brandingService.getBrandingSettings()
      ]);
      
      console.log(`✅ Loaded ${monitorsData.length} monitors`);
      setMonitors(monitorsData);
      
      if (settingsData) {
        console.log('✅ Loaded monitoring settings:', settingsData);
        setMonitoringSettings(settingsData);
      }

      if (brandingData) {
        console.log('✅ Loaded branding settings:', brandingData);
        setBrandingSettings(brandingData);
        // Apply branding immediately
        document.title = `${brandingData.appName} - Professional Uptime Monitoring`;
        brandingService.updateFavicon(brandingData.faviconUrl);
      }
      
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login
  const handleLogin = async (username: string, password: string) => {
    try {
      const adminUser = await authService.login(username, password);
      if (adminUser) {
        const user: User = {
          id: adminUser.id,
          username: adminUser.username,
          role: 'admin'
        };
        setUser(user);
        setLoginError('');
        setActiveView('admin');
        setShowLoginForm(false);
      } else {
        setLoginError('Username atau password salah');
      }
    } catch (error) {
      setLoginError('Login gagal. Silakan coba lagi.');
    }
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    setActiveView('user');
    setLoginError('');
    setShowLoginForm(false);
  };

  // Handle view change with authentication check
  const handleViewChange = (view: 'admin' | 'user') => {
    if (view === 'admin' && (!user || user.role !== 'admin')) {
      setShowLoginForm(true);
      return;
    }
    setActiveView(view);
    setShowLoginForm(false);
  };

  // Handle user update
  const handleUserUpdate = (newUsername: string) => {
    if (user) {
      setUser({ ...user, username: newUsername });
    }
  };

  // Handle branding update
  const handleBrandingUpdate = (newBranding: BrandingSettings) => {
    console.log('🔄 Updating branding settings:', newBranding);
    setBrandingSettings(newBranding);
  };

  const handleAddMonitor = async (data: MonitorFormData) => {
    try {
      console.log('🔄 Adding new monitor:', data.name);
      const newMonitor = await monitorService.createMonitor(data);
      if (newMonitor) {
        setMonitors(prev => [...prev, newMonitor]);
        console.log('✅ Monitor added successfully:', newMonitor.name);
        
        // Perform initial check with delay to prevent UI blocking
        setTimeout(async () => {
          try {
            const formattedUrl = formatUrlForApi(data.url, data.method);
            const result = await checkUptime(formattedUrl, data.method);
            
            // Save initial status check
            await saveStatusCheck(newMonitor.id, result.status, result.responseTime);
            
            // Calculate uptime after initial check
            const realUptime = await calculateUptime(newMonitor.id);
            
            const updatedMonitor = {
              ...newMonitor,
              ...result,
              uptime: realUptime
            };
            
            // Update database in background
            monitorService.updateMonitorStatus(
              newMonitor.id,
              result.status,
              result.responseTime,
              realUptime
            ).catch(error => {
              console.error('Error updating new monitor status:', error);
            });
            
            setMonitors(prev => prev.map(monitor => 
              monitor.id === newMonitor.id ? updatedMonitor : monitor
            ));
          } catch (error) {
            console.error('Error performing initial check:', error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error adding monitor:', error);
    }
  };

  const handleEditMonitor = async (id: string, data: MonitorFormData) => {
    try {
      console.log('🔄 Editing monitor:', data.name);
      const success = await monitorService.updateMonitor(id, data);
      if (success) {
        setMonitors(prev => prev.map(monitor => 
          monitor.id === id 
            ? { 
                ...monitor, 
                name: data.name, 
                url: data.url, 
                method: data.method, 
                checkInterval: data.checkInterval,
                status: 'checking' as const 
              }
            : monitor
        ));
        console.log('✅ Monitor updated successfully');
        
        // Re-check the edited monitor with delay
        setTimeout(async () => {
          try {
            const formattedUrl = formatUrlForApi(data.url, data.method);
            const result = await checkUptime(formattedUrl, data.method);
            
            // Save status check
            await saveStatusCheck(id, result.status, result.responseTime);
            
            // Calculate uptime
            const realUptime = await calculateUptime(id);
            
            // Update database in background
            monitorService.updateMonitorStatus(
              id,
              result.status,
              result.responseTime,
              realUptime
            ).catch(error => {
              console.error('Error updating edited monitor status:', error);
            });
            
            setMonitors(prev => prev.map(m => 
              m.id === id 
                ? { ...m, ...result, uptime: realUptime }
                : m
            ));
          } catch (error) {
            console.error('Error re-checking edited monitor:', error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error editing monitor:', error);
    }
  };

  const handleDeleteMonitor = async (id: string) => {
    try {
      console.log('🔄 Deleting monitor:', id);
      const success = await monitorService.deleteMonitor(id);
      if (success) {
        setMonitors(prev => prev.filter(monitor => monitor.id !== id));
        console.log('✅ Monitor deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting monitor:', error);
    }
  };

  const handleSettingsUpdate = (newSettings: MonitoringSettings) => {
    console.log('🔄 Updating monitoring settings:', newSettings);
    setMonitoringSettings(newSettings);
  };

  // Show environment error screen
  if (appState === 'env_error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Setup Database Diperlukan</h1>
            <p className="text-gray-600 mb-6">
              Aplikasi membutuhkan setup database Supabase untuk berjalan dengan baik.
            </p>
            
            {/* Environment Status */}
            <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="h-5 w-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Status Environment Variables
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white rounded border">
                  <div>
                    <span className="font-medium text-gray-900">VITE_SUPABASE_URL</span>
                    <p className="text-xs text-gray-500">URL project Supabase Anda</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    envVars.supabaseUrl && envVars.supabaseUrl !== 'undefined' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {envVars.supabaseUrl && envVars.supabaseUrl !== 'undefined' ? '✓ Configured' : '✗ Missing'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded border">
                  <div>
                    <span className="font-medium text-gray-900">VITE_SUPABASE_ANON_KEY</span>
                    <p className="text-xs text-gray-500">Anon public key dari Supabase</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    envVars.supabaseAnonKey && envVars.supabaseAnonKey !== 'undefined' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {envVars.supabaseAnonKey && envVars.supabaseAnonKey !== 'undefined' ? '✓ Configured' : '✗ Missing'}
                  </span>
                </div>
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="bg-blue-50 rounded-lg p-4 text-left mb-6">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                Panduan Setup Lengkap
              </h3>
              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex items-start space-x-2">
                  <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="font-medium">Buka README.md</p>
                    <p className="text-xs">Ikuti panduan setup manual yang lengkap</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                  <p>Setup database Supabase dengan SQL yang disediakan</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                  <p>Konfigurasi environment variables</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                  <p>Deploy ke Vercel/Netlify</p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-green-50 rounded-lg p-4 text-left mb-6">
              <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                <svg className="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"></path>
                </svg>
                Quick Links
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
                    → Supabase Dashboard
                  </a>
                  <p className="text-green-700 text-xs">Buat project dan setup database</p>
                </div>
                <div>
                  <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
                    → Vercel Dashboard
                  </a>
                  <p className="text-green-700 text-xs">Deploy aplikasi</p>
                </div>
                <div>
                  <a href="https://app.netlify.com" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
                    → Netlify Dashboard
                  </a>
                  <p className="text-green-700 text-xs">Alternatif deployment</p>
                </div>
              </div>
            </div>

            {/* Debug Info */}
            <div className="bg-gray-100 rounded-lg p-4 text-left mb-6">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">Debug Information</h3>
              <div className="text-xs text-gray-600 space-y-1 font-mono">
                <div>Mode: {import.meta.env.MODE}</div>
                <div>Dev: {import.meta.env.DEV ? 'true' : 'false'}</div>
                <div>Prod: {import.meta.env.PROD ? 'true' : 'false'}</div>
                <div>URL Length: {envVars.supabaseUrl?.length || 0}</div>
                <div>Key Length: {envVars.supabaseAnonKey?.length || 0}</div>
              </div>
            </div>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Refresh Setelah Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show login form when requested
  if (showLoginForm) {
    return (
      <LoginForm 
        onLogin={handleLogin} 
        error={loginError}
      />
    );
  }

  // Show loading screen
  if (isLoading || appState === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">
            {appState === 'checking' ? 'Memeriksa konfigurasi...' : 'Memuat aplikasi...'}
          </p>
        </div>
      </div>
    );
  }

  // Main application
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        activeView={activeView} 
        onViewChange={handleViewChange}
        user={user}
        onLogout={handleLogout}
        onUserUpdate={handleUserUpdate}
        brandingSettings={brandingSettings}
      />
      
      {activeView === 'admin' && user && user.role === 'admin' ? (
        <AdminDashboard
          monitors={monitors}
          onAddMonitor={handleAddMonitor}
          onEditMonitor={handleEditMonitor}
          onDeleteMonitor={handleDeleteMonitor}
          monitoringSettings={monitoringSettings}
          onSettingsUpdate={handleSettingsUpdate}
          lastUpdateTime={lastUpdateTime}
          activeChecks={activeChecks}
          isMonitoring={isMonitoring}
          brandingSettings={brandingSettings}
          onBrandingUpdate={handleBrandingUpdate}
        />
      ) : (
        <UserDashboard 
          monitors={monitors} 
          lastUpdateTime={lastUpdateTime}
          activeChecks={activeChecks}
          isMonitoring={isMonitoring}
        />
      )}
    </div>
  );
}

export default App;