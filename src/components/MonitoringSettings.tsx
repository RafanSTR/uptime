import React, { useState, useEffect } from 'react';
import { Settings, Save, Clock, Globe } from 'lucide-react';
import { MonitoringSettings as IMonitoringSettings } from '../types/monitor';
import { monitoringService } from '../services/monitoringService';

interface MonitoringSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdate: (settings: IMonitoringSettings) => void;
}

const MonitoringSettings: React.FC<MonitoringSettingsProps> = ({
  isOpen,
  onClose,
  onSettingsUpdate
}) => {
  const [settings, setSettings] = useState<IMonitoringSettings>({
    globalCheckInterval: 5,
    enableGlobalInterval: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const currentSettings = await monitoringService.getSettings();
      if (currentSettings) {
        setSettings(currentSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const success = await monitoringService.updateSettings(settings);
      if (success) {
        setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan' });
        onSettingsUpdate(settings);
        setTimeout(() => {
          onClose();
          setMessage(null);
        }, 2000);
      } else {
        setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan pengaturan' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const intervalOptions = [
    { value: 1, label: '1 menit' },
    { value: 2, label: '2 menit' },
    { value: 5, label: '5 menit' },
    { value: 10, label: '10 menit' },
    { value: 15, label: '15 menit' },
    { value: 30, label: '30 menit' },
    { value: 60, label: '1 jam' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Pengaturan Monitoring</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Globe className="h-4 w-4 text-blue-600" />
              <h3 className="font-medium text-blue-900">Interval Global</h3>
            </div>
            <p className="text-sm text-blue-700 mb-3">
              Gunakan interval yang sama untuk semua monitor
            </p>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.enableGlobalInterval}
                  onChange={(e) => setSettings({
                    ...settings,
                    enableGlobalInterval: e.target.checked
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Aktifkan interval global</span>
              </label>

              {settings.enableGlobalInterval && (
                <div>
                  <label htmlFor="globalInterval" className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Interval Pengecekan Global</span>
                    </div>
                  </label>
                  <select
                    id="globalInterval"
                    value={settings.globalCheckInterval}
                    onChange={(e) => setSettings({
                      ...settings,
                      globalCheckInterval: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    {intervalOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        Setiap {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Semua monitor akan dicek dengan interval ini
                  </p>
                </div>
              )}
            </div>
          </div>

          {!settings.enableGlobalInterval && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>Mode Individual:</strong> Setiap monitor akan menggunakan interval yang telah ditentukan saat pembuatan atau pengeditan monitor.
              </p>
            </div>
          )}

          {message && (
            <div className={`p-3 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-600' 
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Simpan Pengaturan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MonitoringSettings;