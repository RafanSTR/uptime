import { useEffect, useRef, useCallback, useState } from 'react';
import { Monitor, MonitoringSettings } from '../types/monitor';
import { checkUptime, calculateUptime, formatUrlForApi, saveStatusCheck } from '../utils/uptimeChecker';
import { monitorService } from '../services/monitorService';

interface UseRealTimeMonitoringProps {
  monitors: Monitor[];
  monitoringSettings: MonitoringSettings;
  onMonitorsUpdate: (monitors: Monitor[]) => void;
  isActive?: boolean;
}

export const useRealTimeMonitoring = ({
  monitors,
  monitoringSettings,
  onMonitorsUpdate,
  isActive = true
}: UseRealTimeMonitoringProps) => {
  const intervalRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isCheckingRef = useRef<Set<string>>(new Set());
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [activeChecks, setActiveChecks] = useState<Set<string>>(new Set());

  const performCheck = useCallback(async (monitor: Monitor) => {
    // Prevent multiple simultaneous checks for the same monitor
    if (isCheckingRef.current.has(monitor.id)) {
      return;
    }

    isCheckingRef.current.add(monitor.id);
    setActiveChecks(prev => new Set([...prev, monitor.id]));

    try {
      console.log(`🔄 Scheduled check for: ${monitor.name}`);
      
      // Update UI immediately to show checking status
      onMonitorsUpdate(prevMonitors => 
        prevMonitors.map(m => 
          m.id === monitor.id 
            ? { ...m, status: 'checking' as const }
            : m
        )
      );
      
      const formattedUrl = formatUrlForApi(monitor.url, monitor.method);
      const result = await checkUptime(formattedUrl, monitor.method);
      
      console.log(`✅ Scheduled check completed for ${monitor.name}:`, {
        status: result.status,
        responseTime: result.responseTime
      });
      
      // Save status check to history
      await saveStatusCheck(monitor.id, result.status, result.responseTime);
      
      // Calculate real uptime from history
      const realUptime = await calculateUptime(monitor.id);
      
      const updatedMonitor = {
        ...monitor,
        status: result.status,
        responseTime: result.responseTime,
        lastChecked: new Date(),
        uptime: realUptime // Use calculated uptime
      };

      // Update database in background
      monitorService.updateMonitorStatus(
        monitor.id,
        result.status,
        result.responseTime,
        realUptime
      ).catch(error => {
        console.error('Error updating monitor status in database:', error);
      });

      // Update UI with results
      onMonitorsUpdate(prevMonitors => 
        prevMonitors.map(m => m.id === monitor.id ? updatedMonitor : m)
      );

      setLastUpdateTime(new Date());
    } catch (error) {
      console.error(`❌ Scheduled check failed for ${monitor.name}:`, error);
      
      // Save failed check to history
      await saveStatusCheck(monitor.id, 'down', 0);
      
      // Calculate uptime after failed check
      const realUptime = await calculateUptime(monitor.id);
      
      const failedMonitor = {
        ...monitor,
        status: 'down' as const,
        responseTime: 0,
        lastChecked: new Date(),
        uptime: realUptime
      };

      // Update database in background
      monitorService.updateMonitorStatus(
        monitor.id,
        'down',
        0,
        realUptime
      ).catch(error => {
        console.error('Error updating failed monitor status:', error);
      });

      onMonitorsUpdate(prevMonitors => 
        prevMonitors.map(m => m.id === monitor.id ? failedMonitor : m)
      );
    } finally {
      isCheckingRef.current.delete(monitor.id);
      setActiveChecks(prev => {
        const newSet = new Set(prev);
        newSet.delete(monitor.id);
        return newSet;
      });
    }
  }, [onMonitorsUpdate]);

  const scheduleCheck = useCallback((monitor: Monitor) => {
    const checkInterval = monitoringSettings.enableGlobalInterval 
      ? monitoringSettings.globalCheckInterval 
      : monitor.checkInterval;

    const intervalMs = checkInterval * 60 * 1000;
    
    // Clear existing interval if any
    const existingInterval = intervalRefs.current.get(monitor.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Calculate when next check should happen based on last check time
    const timeSinceLastCheck = Date.now() - monitor.lastChecked.getTime();
    const timeUntilNextCheck = Math.max(0, intervalMs - timeSinceLastCheck);

    console.log(`⏰ Scheduling next check for ${monitor.name}:`, {
      lastChecked: monitor.lastChecked.toLocaleString(),
      timeSinceLastCheck: `${Math.round(timeSinceLastCheck / 1000)}s ago`,
      nextCheckIn: `${Math.round(timeUntilNextCheck / 1000)}s`,
      interval: `${checkInterval}m`
    });

    // Schedule initial check only if enough time has passed
    const initialTimeout = setTimeout(() => {
      performCheck(monitor);
      
      // Set up recurring interval
      const recurringInterval = setInterval(() => {
        performCheck(monitor);
      }, intervalMs);
      
      intervalRefs.current.set(monitor.id, recurringInterval);
    }, timeUntilNextCheck);

    intervalRefs.current.set(monitor.id, initialTimeout);
  }, [monitoringSettings, performCheck]);

  // Set up monitoring when monitors or settings change
  useEffect(() => {
    if (!isActive) {
      // Clear all intervals when not active
      intervalRefs.current.forEach(interval => clearInterval(interval));
      intervalRefs.current.clear();
      return;
    }

    console.log('🔄 Setting up monitoring schedules...');

    // Clear existing intervals
    intervalRefs.current.forEach(interval => clearInterval(interval));
    intervalRefs.current.clear();

    // Set up monitoring for each monitor
    monitors.forEach(monitor => {
      scheduleCheck(monitor);
    });

    // Cleanup function
    return () => {
      intervalRefs.current.forEach(interval => clearInterval(interval));
      intervalRefs.current.clear();
    };
  }, [monitors.length, monitoringSettings, isActive, scheduleCheck]);

  // Clean up intervals for removed monitors
  useEffect(() => {
    const currentMonitorIds = new Set(monitors.map(m => m.id));
    
    intervalRefs.current.forEach((interval, monitorId) => {
      if (!currentMonitorIds.has(monitorId)) {
        clearInterval(interval);
        intervalRefs.current.delete(monitorId);
        isCheckingRef.current.delete(monitorId);
        setActiveChecks(prev => {
          const newSet = new Set(prev);
          newSet.delete(monitorId);
          return newSet;
        });
      }
    });
  }, [monitors]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intervalRefs.current.forEach(interval => clearInterval(interval));
      intervalRefs.current.clear();
      isCheckingRef.current.clear();
      setActiveChecks(new Set());
    };
  }, []);

  return {
    lastUpdateTime,
    activeChecks,
    isMonitoring: intervalRefs.current.size > 0
  };
};
      );
    } finally {
      isCheckingRef.current.delete(monitor.id);
      setActiveChecks(prev => {
        const newSet = new Set(prev);
        newSet.delete(monitor.id);
        return newSet;
      });
    }
  }, [onMonitorsUpdate]);

  const scheduleCheck = useCallback((monitor: Monitor) => {
    const checkInterval = monitoringSettings.enableGlobalInterval 
      ? monitoringSettings.globalCheckInterval 
      : monitor.checkInterval;

    const intervalMs = checkInterval * 60 * 1000;
    
    // Clear existing interval if any
    const existingInterval = intervalRefs.current.get(monitor.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Calculate when next check should happen
    const timeSinceLastCheck = Date.now() - monitor.lastChecked.getTime();
    const timeUntilNextCheck = Math.max(0, intervalMs - timeSinceLastCheck);

    // Schedule initial check
    const initialTimeout = setTimeout(() => {
      performCheck(monitor);
      
      // Set up recurring interval
      const recurringInterval = setInterval(() => {
        performCheck(monitor);
      }, intervalMs);
      
      intervalRefs.current.set(monitor.id, recurringInterval);
    }, Math.min(timeUntilNextCheck, 5000)); // Max 5 seconds initial delay

    intervalRefs.current.set(monitor.id, initialTimeout);
  }, [monitoringSettings, performCheck]);

  // Set up monitoring when monitors or settings change
  useEffect(() => {
    if (!isActive) {
      // Clear all intervals when not active
      intervalRefs.current.forEach(interval => clearInterval(interval));
      intervalRefs.current.clear();
      return;
    }

    // Clear existing intervals
    intervalRefs.current.forEach(interval => clearInterval(interval));
    intervalRefs.current.clear();

    // Set up monitoring for each monitor
    monitors.forEach(monitor => {
      scheduleCheck(monitor);
    });

    // Cleanup function
    return () => {
      intervalRefs.current.forEach(interval => clearInterval(interval));
      intervalRefs.current.clear();
    };
  }, [monitors.length, monitoringSettings, isActive, scheduleCheck]);

  // Clean up intervals for removed monitors
  useEffect(() => {
    const currentMonitorIds = new Set(monitors.map(m => m.id));
    
    intervalRefs.current.forEach((interval, monitorId) => {
      if (!currentMonitorIds.has(monitorId)) {
        clearInterval(interval);
        intervalRefs.current.delete(monitorId);
        isCheckingRef.current.delete(monitorId);
        setActiveChecks(prev => {
          const newSet = new Set(prev);
          newSet.delete(monitorId);
          return newSet;
        });
      }
    });
  }, [monitors]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intervalRefs.current.forEach(interval => clearInterval(interval));
      intervalRefs.current.clear();
      isCheckingRef.current.clear();
      setActiveChecks(new Set());
    };
  }, []);

  return {
    lastUpdateTime,
    activeChecks,
    isMonitoring: intervalRefs.current.size > 0
  };
};
