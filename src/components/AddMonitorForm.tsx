import React, { useState, useEffect } from 'react';
import { Monitor, MonitorFormData } from '../types/monitor';
import { Plus, X, Globe, Wifi, Clock } from 'lucide-react';

interface AddMonitorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MonitorFormData) => void;
  editingMonitor?: Monitor | null;
}

const AddMonitorForm: React.FC<AddMonitorFormProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingMonitor 
}) => {
  const [formData, setFormData] = useState<MonitorFormData>({
    name: '',
    url: '',
    method: 'http',
    checkInterval: 5
  });

  useEffect(() => {
    if (editingMonitor) {
      setFormData({
        name: editingMonitor.name,
        url: editingMonitor.url,
        method: editingMonitor.method,
        checkInterval: editingMonitor.checkInterval
      });
    } else {
      setFormData({ name: '', url: '', method: 'http', checkInterval: 5 });
    }
  }, [editingMonitor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim() && formData.url.trim()) {
      onSubmit(formData);
      setFormData({ name: '', url: '', method: 'http', checkInterval: 5 });
      onClose();
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
          <h2 className="text-xl font-semibold text-gray-900">
            {editingMonitor ? 'Edit Monitor' : 'Tambah Monitor Baru'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nama Monitor
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="contoh: Website Saya"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="method" className="block text-sm font-medium text-gray-700 mb-2">
              Metode Monitoring
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, method: 'http' })}
                className={`p-3 border rounded-lg flex items-center space-x-2 transition-colors ${
                  formData.method === 'http'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Globe className="h-4 w-4" />
                <span className="text-sm font-medium">HTTP/HTTPS</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, method: 'ping' })}
                className={`p-3 border rounded-lg flex items-center space-x-2 transition-colors ${
                  formData.method === 'ping'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Wifi className="h-4 w-4" />
                <span className="text-sm font-medium">Ping</span>
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              {formData.method === 'ping' ? 'Hostname atau IP Address' : 'URL Website'}
            </label>
            <input
              type="text"
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder={formData.method === 'ping' ? 'example.com atau 8.8.8.8' : 'example.com atau https://example.com'}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.method === 'ping' 
                ? 'Masukkan nama domain atau IP address untuk di-ping'
                : 'Masukkan domain atau URL lengkap (protokol akan ditambahkan otomatis jika tidak ada)'
              }
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="checkInterval" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Interval Pengecekan</span>
              </div>
            </label>
            <select
              id="checkInterval"
              value={formData.checkInterval}
              onChange={(e) => setFormData({ ...formData, checkInterval: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              {intervalOptions.map(option => (
                <option key={option.value} value={option.value}>
                  Setiap {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Seberapa sering monitor ini akan dicek
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>{editingMonitor ? 'Update' : 'Tambah'} Monitor</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMonitorForm;