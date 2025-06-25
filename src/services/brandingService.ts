import { supabase, isEnvConfigured } from '../lib/supabase';
import { BrandingSettings } from '../types/branding';

export const brandingService = {
  async getBrandingSettings(): Promise<BrandingSettings | null> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured');
        return this.getDefaultSettings();
      }

      console.log('🎨 Fetching branding settings from database...');

      const { data, error } = await supabase
        .from('branding_settings')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching branding settings:', error);
        // Fallback to localStorage if database fails
        return this.getLocalStorageSettings() || this.getDefaultSettings();
      }

      if (!data) {
        console.log('No branding settings found, creating default...');
        return await this.createDefaultSettings();
      }

      const settings: BrandingSettings = {
        appName: data.app_name,
        logoUrl: data.logo_url || '',
        faviconUrl: data.favicon_url,
        primaryColor: data.primary_color,
        secondaryColor: data.secondary_color
      };

      console.log('✅ Branding settings loaded from database:', settings);
      
      // Also update localStorage for offline fallback
      this.saveToLocalStorage(settings);
      
      return settings;
    } catch (error) {
      console.error('Error fetching branding settings:', error);
      return this.getLocalStorageSettings() || this.getDefaultSettings();
    }
  },

  async updateBrandingSettings(settings: BrandingSettings): Promise<boolean> {
    try {
      if (!isEnvConfigured || !supabase) {
        console.error('Supabase not configured, saving to localStorage only');
        this.saveToLocalStorage(settings);
        this.applyBrandingToDOM(settings);
        return true;
      }

      console.log('🎨 Updating branding settings in database...', settings);

      // Check if settings exist
      const { data: existing } = await supabase
        .from('branding_settings')
        .select('id')
        .single();

      let result;
      if (existing) {
        // Update existing settings
        result = await supabase
          .from('branding_settings')
          .update({
            app_name: settings.appName,
            logo_url: settings.logoUrl,
            favicon_url: settings.faviconUrl,
            primary_color: settings.primaryColor,
            secondary_color: settings.secondaryColor,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Insert new settings
        result = await supabase
          .from('branding_settings')
          .insert({
            app_name: settings.appName,
            logo_url: settings.logoUrl,
            favicon_url: settings.faviconUrl,
            primary_color: settings.primaryColor,
            secondary_color: settings.secondaryColor
          });
      }

      if (result.error) {
        console.error('Error updating branding settings:', result.error);
        // Fallback to localStorage
        this.saveToLocalStorage(settings);
        this.applyBrandingToDOM(settings);
        return false;
      }

      console.log('✅ Branding settings updated in database successfully');
      
      // Also save to localStorage for offline fallback
      this.saveToLocalStorage(settings);
      
      // Apply changes to DOM immediately
      this.applyBrandingToDOM(settings);
      
      return true;
    } catch (error) {
      console.error('Error updating branding settings:', error);
      // Fallback to localStorage
      this.saveToLocalStorage(settings);
      this.applyBrandingToDOM(settings);
      return false;
    }
  },

  async resetToDefaults(): Promise<boolean> {
    try {
      const defaultSettings = this.getDefaultSettings();
      
      if (!isEnvConfigured || !supabase) {
        console.log('Supabase not configured, resetting localStorage only');
        localStorage.removeItem('branding_settings');
        this.applyBrandingToDOM(defaultSettings);
        return true;
      }

      console.log('🎨 Resetting branding settings to defaults...');

      // Delete all existing settings
      await supabase
        .from('branding_settings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      // Insert default settings
      const { error } = await supabase
        .from('branding_settings')
        .insert({
          app_name: defaultSettings.appName,
          logo_url: defaultSettings.logoUrl,
          favicon_url: defaultSettings.faviconUrl,
          primary_color: defaultSettings.primaryColor,
          secondary_color: defaultSettings.secondaryColor
        });

      if (error) {
        console.error('Error resetting branding settings:', error);
        return false;
      }

      console.log('✅ Branding settings reset to defaults');
      
      // Clear localStorage and apply defaults
      localStorage.removeItem('branding_settings');
      this.applyBrandingToDOM(defaultSettings);
      
      return true;
    } catch (error) {
      console.error('Error resetting branding:', error);
      return false;
    }
  },

  async createDefaultSettings(): Promise<BrandingSettings> {
    const defaultSettings = this.getDefaultSettings();
    
    if (isEnvConfigured && supabase) {
      try {
        await supabase
          .from('branding_settings')
          .insert({
            app_name: defaultSettings.appName,
            logo_url: defaultSettings.logoUrl,
            favicon_url: defaultSettings.faviconUrl,
            primary_color: defaultSettings.primaryColor,
            secondary_color: defaultSettings.secondaryColor
          });
        console.log('✅ Default branding settings created in database');
      } catch (error) {
        console.error('Error creating default branding settings:', error);
      }
    }
    
    return defaultSettings;
  },

  getDefaultSettings(): BrandingSettings {
    return {
      appName: 'UptimeWatch',
      logoUrl: '',
      faviconUrl: '/vite.svg',
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af'
    };
  },

  getLocalStorageSettings(): BrandingSettings | null {
    try {
      const stored = localStorage.getItem('branding_settings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error reading localStorage branding settings:', error);
    }
    return null;
  },

  saveToLocalStorage(settings: BrandingSettings): void {
    try {
      localStorage.setItem('branding_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  applyBrandingToDOM(settings: BrandingSettings): void {
    try {
      // Update favicon
      this.updateFavicon(settings.faviconUrl);
      
      // Update document title
      document.title = `${settings.appName} - Professional Uptime Monitoring`;
      
      // Apply CSS custom properties for colors (if needed in future)
      document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
      document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
      
      console.log('✅ Branding applied to DOM:', {
        title: document.title,
        favicon: settings.faviconUrl,
        primaryColor: settings.primaryColor
      });
    } catch (error) {
      console.error('Error applying branding to DOM:', error);
    }
  },

  updateFavicon(faviconUrl: string): void {
    try {
      // Remove existing favicon links
      const existingLinks = document.querySelectorAll("link[rel*='icon']");
      existingLinks.forEach(link => link.remove());
      
      // Create new favicon link
      const link = document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = faviconUrl;
      document.getElementsByTagName('head')[0].appendChild(link);
      
      console.log('✅ Favicon updated:', faviconUrl);
    } catch (error) {
      console.error('Error updating favicon:', error);
    }
  }
};