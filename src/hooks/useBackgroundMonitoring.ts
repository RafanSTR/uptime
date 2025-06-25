import { useEffect, useRef, useState } from 'react';
import { Monitor } from '../types/monitor';
import { monitorService } from '../services/monitorService';
import { checkUptime, calculateUptime, formatUrlForApi, saveStatusCheck } from '../utils/uptimeChecker';

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
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeChecksRef = useRef<Set<string>>(new Set());

  // Real-time monitoring function
  const performMonitoringCheck = async () => {
    try {
      console.log('🔄 Starting real-time monitoring check...');
      setIsBackgroundActive(true);

      // Get current monitors
      const monitors = await monitorService.getAllMonitors();
      if (monitors.length === 0) {
        console.log('ℹ️ No monitors to check');
        return;
      }

      // Get monitoring settings
      const { monitoringService: settingsService } = await import('../services/monitoringService');
      const settings = await settingsService.getSettings();
      const globalInterval = settings?.enableGlobalInterval ? settings.globalCheckInterval : null;

      // Filter monitors that need checking
      const now = new Date();
      const monitorsToCheck = monitors.filter(monitor => {
        const lastChecked = new Date(monitor.lastChecked);
        const interval = globalInterval || monitor.checkInterval || 5;
        const nextCheckTime = new Date(lastChecked.getTime() + (interval * 60 * 1000));
        
        const needsCheck = now >= nextCheckTime;
        console.log(`📊 Monitor ${monitor.name}:`, {
          lastChecked: lastChecked.toLocaleString(),
          nextCheck: nextCheckTime.toLocaleString(),
          interval: `${interval}m`,
          needsCheck
        });
        
        return needsCheck;
      });

      console.log(`📊 Found ${monitorsToCheck.length} monitors that need checking out of ${monitors.length} total`);

      if (monitorsToCheck.length === 0) {
        return;
      }

      // Check each monitor
      const updatedMonitors = [...monitors];
      
      for (const monitor of monitorsToCheck) {
        if (activeChecksRef.current.has(monitor.id)) {
          console.log(`⏭️ Skipping ${monitor.name} - already being checked`);
          continue;
        }

        activeChecksRef.current.add(monitor.id);
        
        try {
          console.log(`🔄 Checking monitor: ${monitor.name} (${monitor.url})`);
          
          // Update UI to show checking status immediately
          const checkingIndex = updatedMonitors.findIndex(m => m.id === monitor.id);
          if (checkingIndex !== -1) {
            updatedMonitors[checkingIndex] = {
              ...updatedMonitors[checkingIndex],
              status: 'checking' as const
            };
            onMonitorsUpdate([...updatedMonitors]);
          }

          // Perform the actual check
          const formattedUrl = formatUrlForApi(monitor.url, monitor.method);
          const checkResult = await checkUptime(formattedUrl, monitor.method);
          
          // Save status check to history
          await saveStatusCheck(monitor.id, checkResult.status, checkResult.responseTime);
          
          // Calculate uptime from history
          const uptime = await calculateUptime(monitor.id);

          // Update monitor in database
          await monitorService.updateMonitorStatus(
            monitor.id,
            checkResult.status,
            checkResult.responseTime,
            uptime
          );

          // Update local state immediately
          const updateIndex = updatedMonitors.findIndex(m => m.id === monitor.id);
          if (updateIndex !== -1) {
            updatedMonitors[updateIndex] = {
              ...updatedMonitors[updateIndex],
              status: checkResult.status,
              responseTime: checkResult.responseTime,
              uptime: uptime,
              lastChecked: new Date()
            };
          }

          console.log(`✅ Monitor ${monitor.name} checked: ${checkResult.status} (${checkResult.responseTime}ms, ${uptime}% uptime)`);

        } catch (error) {
          console.error(`❌ Error checking monitor ${monitor.name}:`, error);
          
          // Save failed check
          await saveStatusCheck(monitor.id, 'down', 0);
          
          // Calculate uptime after failed check
          const uptime = await calculateUptime(monitor.id);

          // Update monitor as down in database
          await monitorService.updateMonitorStatus(monitor.id, 'down', 0, uptime);

          // Update local state
          const failIndex = updatedMonitors.findIndex(m => m.id === monitor.id);
          if (failIndex !== -1) {
            updatedMonitors[failIndex] = {
              ...updatedMonitors[failIndex],
              status: 'down' as const,
              responseTime: 0,
              uptime: uptime,
              lastChecked: new Date()
            };
          }
        } finally {
          activeChecksRef.current.delete(monitor.id);
        }
      }

      // Update UI with all changes
      onMonitorsUpdate([...updatedMonitors]);
      setLastSync(new Date());

      console.log(`✅ Real-time monitoring check completed. Checked ${monitorsToCheck.length} monitors`);

    } catch (error) {
      console.error('❌ Real-time monitoring error:', error);
    } finally {
      setIsBackgroundActive(false);
    }
  };

  // Sync with database to get latest status
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

  useEffect(() => {
    if (!isActive) {
      // Clear intervals when not active
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
      }
      activeChecksRef.current.clear();
      return;
    }

    console.log('🔄 Setting up real-time monitoring system...');

    // Set up database sync every 30 seconds
    syncIntervalRef.current = setInterval(() => {
      syncWithDatabase();
    }, 30000); // 30 seconds

    // Set up real-time monitoring check every 60 seconds
    monitoringIntervalRef.current = setInterval(() => {
      performMonitoringCheck();
    }, 60000); // 1 minute

    // Initial sync and check
    syncWithDatabase();
    
    // Start monitoring after 10 seconds
    setTimeout(() => {
      performMonitoringCheck();
    }, 10000);

    // Cleanup function
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
        monitoringIntervalRef.current = null;
      }
      activeChecksRef.current.clear();
    };
  }, [isActive]);

  // Manual trigger for monitoring check
  const manualBackgroundCheck = async () => {
    await performMonitoringCheck();
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