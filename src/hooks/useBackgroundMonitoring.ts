import { useEffect, useRef, useState } from 'react';
import { Monitor } from '../types/monitor';
import { monitorService } from '../services/monitorService';

interface UseBackgroundMonitoringProps {
  isActive?: boolean;
  onMonitorsUpdate: (monitors: Monitor[]) => void;
}

export const useBackgroundMonitoring = ({
  isActive = true,
  onMonitorsUpdate
}: UseBackgroundMonitoringProps) => {
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isBackgroundActive, setIsBackgroundActive] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with database every 30 seconds to get latest status
  const syncWithDatabase = async () => {
    try {
      console.log('🔄 Syncing with database for latest monitor status...');
      const latestMonitors = await monitorService.getAllMonitors();
      onMonitorsUpdate(latestMonitors);
      setLastSync(new Date());
      console.log(`✅ Database sync completed. Updated ${latestMonitors.length} monitors`);
    } catch (error) {
      console.error('❌ Database sync failed:', error);
    }
  };

  // Trigger background monitoring check
  const triggerBackgroundCheck = async () => {
    try {
      console.log('🚀 Triggering background monitoring check...');
      setIsBackgroundActive(true);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ Supabase credentials not available for background check');
        return;
      }

      // Call the background monitor checker edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/monitor-checker`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Background check triggered successfully:', result);
        
        // Sync with database after background check
        setTimeout(() => {
          syncWithDatabase();
        }, 2000); // Wait 2 seconds for background process to complete
      } else {
        console.warn('⚠️ Background check request failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Failed to trigger background check:', error);
    } finally {
      setIsBackgroundActive(false);
    }
  };

  useEffect(() => {
    if (!isActive) {
      // Clear intervals when not active
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      if (backgroundCheckRef.current) {
        clearInterval(backgroundCheckRef.current);
        backgroundCheckRef.current = null;
      }
      return;
    }

    console.log('🔄 Setting up background monitoring system...');

    // Set up database sync every 30 seconds
    syncIntervalRef.current = setInterval(() => {
      syncWithDatabase();
    }, 30000); // 30 seconds

    // Set up background check trigger every 2 minutes
    // This ensures monitors are checked even if no one is viewing the site
    backgroundCheckRef.current = setInterval(() => {
      triggerBackgroundCheck();
    }, 120000); // 2 minutes

    // Initial sync
    syncWithDatabase();

    // Cleanup function
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      if (backgroundCheckRef.current) {
        clearInterval(backgroundCheckRef.current);
        backgroundCheckRef.current = null;
      }
    };
  }, [isActive]);

  // Manual trigger for background check
  const manualBackgroundCheck = async () => {
    await triggerBackgroundCheck();
  };

  // Manual database sync
  const manualSync = async () => {
    await syncWithDatabase();
  };

  return {
    lastSync,
    isBackgroundActive,
    manualBackgroundCheck,
    manualSync
  };
};