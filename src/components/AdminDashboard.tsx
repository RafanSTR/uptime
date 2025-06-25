import React, { useState, useMemo, useEffect } from 'react';
import { Monitor, MonitorFormData, MonitoringSettings as IMonitoringSettings } from '../types/monitor';
import MonitorCard from './MonitorCard';
import AddMonitorForm from './AddMonitorForm';
import MonitoringSettings from './MonitoringSettings';
import BrandingSettings from './BrandingSettings';
import RealTimeIndicator from './RealTimeIndicator';
import { BrandingSettings as IBrandingSettings } from '../types/branding';
import { cleanupOldStatusChecks } from '../utils/uptimeChecker';
import { Plus, Settings, BarChart3, Clock, Palette, Trash2 } from 'lucide-react';
import { monitorService } from '../services/monitorService';

interface AdminDashboardProps {
  monitors: Monitor[];
  onAddMonitor: (data: MonitorFormData) => Promise<void>;
  onEditMonitor: (id: string, data: MonitorFormData) => Promise<void>;
  onDeleteMonitor: (id: string) => Promise<void>;
  monitoringSettings: IMonitoringSettings;
  onSettingsUpdate: (settings: IMonitoringSettings) => void;
  lastUpdateTime: Date;
  activeChecks: Set<string>;
  isMonitoring: boolean;
  brandingSettings: IBrandingSettings;
  onBrandingUpdate: (settings: IBrandingSettings) => void;
  onMonitorsUpdate: () => Promise<void>;
  onForceCheck: (monitorId: string) => Promise<void>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  monitors,
  onAddMonitor,
  onEditMonitor,
  onDeleteMonitor,
  monitoringSettings,
  onSettingsUpdate,
  lastUpdateTime,
  activeChecks,
  isMonitoring,
  brandingSettings,
  onBrandingUpdate,
  onMonitorsUpdate,
  onForceCheck
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await onMonitorsUpdate();
      } catch (err) {
        console.error('Failed to load monitors:', err);
        setError('Gagal memuat data monitor. Silakan coba lagi.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [onMonitorsUpdate]);

  const stats = useMemo(() => {
    const upMonitors = monitors.filter(m => m.status === 'up').length;
    const downMonitors = monitors.filter(m => m.status === 'down').length;
    const avgUptime = monitors.length > 0 
      ? Math.round(monitors.reduce((acc, m) => acc + m.uptime, 0) / monitors.length)
      : 0;
    return { upMonitors, downMonitors, avgUptime };
  }, [monitors]);

  const handleEdit = (monitor: Monitor) => {
    setEditingMonitor(monitor);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: MonitorFormData) => {
    try {
      setIsLoading(true);
      if (editingMonitor) {
        await onEditMonitor(editingMonitor.id, data);
      } else {
        await onAddMonitor(data);
      }
      setIsFormOpen(false);
      setEditingMonitor(null);
      await onMonitorsUpdate();
    } catch (err) {
      console.error('Error saving monitor:', err);
      setError('Gagal menyimpan monitor. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingMonitor(null);
  };

  const handleDeleteMonitor = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus monitor ini?')) {
      try {
        setIsLoading(true);
        await onDeleteMonitor(id);
        await onMonitorsUpdate();
      } catch (err) {
        console.error('Error deleting monitor:', err);
        setError('Gagal menghapus monitor. Silakan coba lagi.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleManualCleanup = async () => {
    if (confirm('Apakah Anda yakin ingin menjalankan cleanup manual? Ini akan menghapus data status checks yang lebih dari 90 hari.')) {
      setIsCleaningUp(true);
      setError(null);
      try {
        const result = await cleanupOldStatusChecks();
        if (result.success) {
          alert(`✅ Cleanup berhasil! ${result.deletedCount} records lama telah dihapus.`);
          await onMonitorsUpdate();
        } else {
          setError(`❌ Cleanup gagal: ${result.error}`);
        }
      } catch (err) {
        console.error('Error during cleanup:', err);
        setError('Terjadi kesalahan saat cleanup');
      } finally {
        setIsCleaningUp(false);
      }
    }
  };

  const handleForceCheck = async (monitorId: string) => {
    try {
      setIsLoading(true);
      await onForceCheck(monitorId);
      await onMonitorsUpdate();
    } catch (err) {
      console.error('Error forcing check:', err);
      setError('Gagal memaksa pengecekan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const getNextCheckTime = (monitor: Monitor) => {
    const interval = monitoringSettings.enableGlobalInterval 
      ? monitoringSettings.globalCheckInterval 
      : monitor.checkInterval;
    const nextCheck = new Date(monitor.lastChecked.getTime() + (interval * 60 * 1000));
    const now = new Date();
    const diff = Math.max(0, Math.ceil((nextCheck.getTime() - now.getTime()) / 1000));
    
    if (diff < 60) return `${diff}s`;
    return `${Math.ceil(diff / 60)}m`;
  };

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
            onClick={() => setError(null)} 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard Admin</h1>
            <p className="text-gray-600 text-sm mt-1">Kelola monitor website dan lihat analitik real-time</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleManualCleanup}
              disabled={isCleaningUp}
              className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Cleanup data lama (>90 hari)"
            >
              {isCleaningUp ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Cleanup...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Cleanup</span>
                </>
              )}
            </button>
            <button
              onClick={() => setIsBrandingOpen(true)}
              className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 text-sm"
            >
              <Palette className="h-4 w-4" />
              <span>Branding</span>
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2 text-sm"
            >
              <Settings className="h-4 w-4" />
              <span>Pengaturan</span>
            </button>
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Monitor</span>
            </button>
          </div>
        </div>

        <div className="mb-4">
          <RealTimeIndicator
            isMonitoring={isMonitoring}
            lastUpdateTime={lastUpdateTime}
            activeChecks={activeChecks}
            totalMonitors={monitors.length}
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 mb-1">
            <Clock className="h-4 w-4 text-blue-600" />
            <h3 className="font-medium text-blue-900 text-sm">Status Monitoring</h3>
          </div>
          <p className="text-xs text-blue-700">
            {monitoringSettings.enableGlobalInterval 
              ? `Monitoring berjalan dengan interval global: setiap ${monitoringSettings.globalCheckInterval} menit`
              : 'Monitoring berjalan dengan interval individual untuk setiap monitor'
            }
            {' • '}
            <span className="font-medium">Auto-cleanup aktif setiap 24 jam</span>
            {' (data >90 hari akan dihapus otomatis)'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Monitor</p>
                <p className="text-xl font-bold text-gray-900">{monitors.length}</p>
              </div>
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Status Overview</p>
                <p className="text-xl font-bold text-green-600">{stats.upMonitors} Up</p>
                <p className="text-xs text-red-600">{stats.downMonitors} Down</p>
              </div>
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Rata-rata Uptime</p>
                <p className="text-xl font-bold text-gray-900">{stats.avgUptime}%</p>
              </div>
              <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xs">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {monitors.length === 0 ? (
        <div className="text-center py-8">
          <Settings className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900 mb-1">Belum ada monitor</h3>
          <p className="text-gray-600 text-sm mb-3">Mulai dengan menambahkan monitor website pertama Anda</p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Monitor Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {monitors.map((monitor) => (
            <div key={monitor.id} className="relative">
              <MonitorCard
                monitor={monitor}
                isAdmin={true}
                onEdit={handleEdit}
                onDelete={handleDeleteMonitor}
                onForceCheck={handleForceCheck}
                isActivelyChecking={activeChecks.has(monitor.id)}
              />
              <div className="absolute top-2 left-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs text-gray-600 shadow-sm">
                Next: {getNextCheckTime(monitor)}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddMonitorForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        editingMonitor={editingMonitor}
      />

      <MonitoringSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdate={onSettingsUpdate}
        currentSettings={monitoringSettings}
      />

      <BrandingSettings
        isOpen={isBrandingOpen}
        onClose={() => setIsBrandingOpen(false)}
        onBrandingUpdate={onBrandingUpdate}
        currentSettings={brandingSettings}
      />
    </div>
  );
};

export default AdminDashboard;
