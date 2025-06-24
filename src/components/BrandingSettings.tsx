import React, { useState, useEffect } from 'react';
import { Palette, Save, RotateCcw, Upload, Eye, Image, Type, X } from 'lucide-react';
import { BrandingSettings as IBrandingSettings, BrandingFormData } from '../types/branding';
import { brandingService } from '../services/brandingService';

interface BrandingSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onBrandingUpdate: (settings: IBrandingSettings) => void;
  currentSettings: IBrandingSettings;
}

const BrandingSettings: React.FC<BrandingSettingsProps> = ({
  isOpen,
  onClose,
  onBrandingUpdate,
  currentSettings
}) => {
  const [formData, setFormData] = useState<BrandingFormData>({
    appName: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (isOpen && currentSettings) {
      setFormData({
        appName: currentSettings.appName,
        logoUrl: currentSettings.logoUrl,
        faviconUrl: currentSettings.faviconUrl,
        primaryColor: currentSettings.primaryColor,
        secondaryColor: currentSettings.secondaryColor
      });
    }
  }, [isOpen, currentSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const success = await brandingService.updateBrandingSettings(formData);
      if (success) {
        setMessage({ type: 'success', text: 'Pengaturan branding berhasil disimpan' });
        onBrandingUpdate(formData);
        setTimeout(() => {
          onClose();
          setMessage(null);
        }, 2000);
      } else {
        setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan branding' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan pengaturan' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Apakah Anda yakin ingin mengembalikan ke pengaturan default?')) {
      setIsLoading(true);
      try {
        const success = await brandingService.resetToDefaults();
        if (success) {
          const defaultSettings = await brandingService.getBrandingSettings();
          if (defaultSettings) {
            setFormData(defaultSettings);
            onBrandingUpdate(defaultSettings);
            setMessage({ type: 'success', text: 'Pengaturan berhasil dikembalikan ke default' });
          }
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Gagal mengembalikan pengaturan default' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const validateImageUrl = (url: string): boolean => {
    if (!url) return true; // Empty URL is valid
    try {
      new URL(url);
      return url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) !== null;
    } catch {
      return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>Pengaturan Branding</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* App Name */}
          <div>
            <label htmlFor="appName" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-2">
                <Type className="h-4 w-4" />
                <span>Nama Aplikasi</span>
              </div>
            </label>
            <input
              type="text"
              id="appName"
              value={formData.appName}
              onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="UptimeWatch"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Nama ini akan muncul di navigation bar dan title halaman
            </p>
          </div>

          {/* Logo URL */}
          <div>
            <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-2">
                <Image className="h-4 w-4" />
                <span>URL Logo</span>
              </div>
            </label>
            <input
              type="url"
              id="logoUrl"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                formData.logoUrl && !validateImageUrl(formData.logoUrl) 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL gambar logo (PNG, JPG, SVG). Kosongkan untuk menggunakan ikon default
            </p>
            {formData.logoUrl && !validateImageUrl(formData.logoUrl) && (
              <p className="text-xs text-red-600 mt-1">URL gambar tidak valid</p>
            )}
          </div>

          {/* Favicon URL */}
          <div>
            <label htmlFor="faviconUrl" className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>URL Favicon</span>
              </div>
            </label>
            <input
              type="url"
              id="faviconUrl"
              value={formData.faviconUrl}
              onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                formData.faviconUrl && !validateImageUrl(formData.faviconUrl) 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
              placeholder="/vite.svg"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL ikon yang muncul di tab browser
            </p>
          </div>

          {/* Color Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                Warna Primer
              </label>
              <div className="flex space-x-2">
                <input
                  type="color"
                  id="primaryColor"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-sm"
                  placeholder="#2563eb"
                />
              </div>
            </div>

            <div>
              <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                Warna Sekunder
              </label>
              <div className="flex space-x-2">
                <input
                  type="color"
                  id="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-sm"
                  placeholder="#1e40af"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {(formData.logoUrl || formData.appName !== currentSettings.appName) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Preview Navigation</span>
              </h3>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  {formData.logoUrl ? (
                    <img 
                      src={formData.logoUrl} 
                      alt="Logo" 
                      className="h-6 w-6 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div 
                      className="h-6 w-6 rounded"
                      style={{ backgroundColor: formData.primaryColor }}
                    ></div>
                  )}
                  <span className="text-lg font-bold text-gray-900">{formData.appName}</span>
                </div>
              </div>
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
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset Default</span>
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            
            <button
              type="submit"
              disabled={isLoading || (formData.logoUrl && !validateImageUrl(formData.logoUrl))}
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
                  <span>Simpan Branding</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BrandingSettings;