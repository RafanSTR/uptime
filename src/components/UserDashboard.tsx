import React, { useMemo, useEffect, useState } from 'react';
import { Monitor } from '../types/monitor';
import MonitorCard from './MonitorCard';
import RealTimeIndicator from './RealTimeIndicator';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import { monitorService } from '../services/monitorService';

interface UserDashboardProps {
  monitors: Monitor[];
  lastUpdateTime: Date;
  activeChecks: Set<string>;
  isMonitoring: boolean;
  onMonitorsUpdate: () => Promise<void>;
  refreshInterval?: number;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ 
  monitors, 
  lastUpdateTime, 
  activeChecks, 
  isMonitoring,
  onMonitorsUpdate,
  refreshInterval = 30000 // Default 30 seconds
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastManualRefresh, setLastManualRefresh] = useState<Date>(new Date());

  // Auto-refresh monitors data
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await onMonitorsUpdate();
      } catch (err) {
        console.error('Error auto-refreshing monitors:', err);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, onMonitorsUpdate]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await onMonitorsUpdate();
      } catch (err) {
        console.error('Failed to load monitors:', err);
        setError('Gagal memuat data monitor. Silakan coba refresh halaman.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [onMonitorsUpdate]);

  const handleManualRefresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await onMonitorsUpdate();
      setLastManualRefresh(new Date());
    } catch (err) {
      console.error('Error refreshing monitors:', err);
      setError('Gagal merefresh data. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const upMonitors = monitors.filter(m => m.status === 'up').length;
    const downMonitors = monitors.filter(m => m.status === 'down').length;
    const checkingMonitors = monitors.filter(m => m.status === 'checking').length;
    const avgResponseTime = monitors.length > 0 
      ? Math.round(monitors.reduce((acc, m) => acc + (m.responseTime || 0), 0) / monitors.length)
      : 0;

    return { upMonitors, downMonitors, checkingMonitors, avgResponseTime };
  }, [monitors]);

  const { upMonitors, downMonitors, checkingMonitors, avgResponseTime } = stats;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-600">Memuat data monitor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
          <button 
            onClick={handleManualRefresh} 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Refresh</title>
              <path d="M10 3v2a5 5 0 0 0-3.54 8.54l-1.41 1.41A7 7 0 0 1 10 3zm4.95 2.05A7 7 0 0 1 10 17v-2a5 5 0 0 0 3.54-8.54l1.41-1.41zM10 20l-4-4 4-4v8z"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Status Sistem</h1>
            <p className="text-gray-600 text-sm">Monitoring real-time semua layanan dan website</p>
          </div>
          <button
            onClick={handleManualRefresh}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            disabled={isLoading}
          >
            <Clock className="h-4 w-4 mr-1" />
            <span>
              Terakhir diperbarui: {lastManualRefresh.toLocaleTimeString()}
            </span>
          </button>
        </div>
      </div>

      {/* Real-time Indicator */}
      <div className="mb-4">
        <RealTimeIndicator
          isMonitoring={isMonitoring}
          lastUpdateTime={lastUpdateTime}
          activeChecks={activeChecks}
          totalMonitors={monitors.length}
        />
      </div>

      {/* Overall Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Status Keseluruhan Sistem</h2>
          <div className="flex items-center space-x-2">
            {downMonitors === 0 ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium text-sm">Semua Sistem Normal</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-red-600 font-medium text-sm">Ada Masalah Terdeteksi</span>
              </>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-green-50 rounded-lg transition-colors duration-200">
            <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-green-600">{upMonitors}</div>
            <div className="text-xs text-gray-600">Online</div>
          </div>
          
          <div className="text-center p-3 bg-red-50 rounded-lg transition-colors duration-200">
            <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-red-600">{downMonitors}</div>
            <div className="text-xs text-gray-600">Offline</div>
          </div>
          
          <div className="text-center p-3 bg-yellow-50 rounded-lg transition-colors duration-200">
            <Clock className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-yellow-600">{checkingMonitors}</div>
            <div className="text-xs text-gray-600">Mengecek</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg transition-colors duration-200">
            <Activity className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-blue-600">{avgResponseTime}ms</div>
            <div className="text-xs text-gray-600">Rata-rata</div>
          </div>
        </div>
      </div>

      {/* Monitors Grid */}
      {monitors.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900 mb-1">Belum ada monitor</h3>
          <p className="text-gray-600 text-sm">Hubungi administrator untuk mengatur monitoring</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {monitors.map((monitor) => (
            <MonitorCard
              key={monitor.id}
              monitor={monitor}
              isAdmin={false}
              hideUrl={true}
              isActivelyChecking={activeChecks.has(monitor.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
