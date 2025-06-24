import { supabase } from '../lib/supabase';
import { BrandingSettings } from '../types/branding';

export const brandingService = {
  async getBrandingSettings(): Promise<BrandingSettings | null> {
    try {
      // For now, we'll use localStorage to store branding settings
      // In a real app, this would be stored in the database
      const stored = localStorage.getItem('branding_settings');
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Default branding settings
      return {
        appName: 'UptimeWatch',
        logoUrl: '',
        faviconUrl: '/vite.svg',
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af'
      };
    } catch (error) {
      console.error('Error fetching branding settings:', error);
      return null;
    }
  },

  async updateBrandingSettings(settings: BrandingSettings): Promise<boolean> {
    try {
      // Store in localStorage for now
      localStorage.setItem('branding_settings', JSON.stringify(settings));
      
      // Update favicon dynamically
      this.updateFavicon(settings.faviconUrl);
      
      // Update document title
      document.title = `${settings.appName} - Professional Uptime Monitoring`;
      
      return true;
    } catch (error) {
      console.error('Error updating branding settings:', error);
      return false;
    }
  },

  updateFavicon(faviconUrl: string) {
    try {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = faviconUrl;
      document.getElementsByTagName('head')[0].appendChild(link);
    } catch (error) {
      console.error('Error updating favicon:', error);
    }
  },

  async resetToDefaults(): Promise<boolean> {
    try {
      localStorage.removeItem('branding_settings');
      document.title = 'UptimeWatch - Professional Uptime Monitoring';
      this.updateFavicon('/vite.svg');
      return true;
    } catch (error) {
      console.error('Error resetting branding:', error);
      return false;
    }
  }
};