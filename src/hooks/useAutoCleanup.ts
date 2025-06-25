import { useEffect, useRef } from 'react';
import { cleanupOldStatusChecks } from '../utils/uptimeChecker';

interface UseAutoCleanupProps {
  isActive?: boolean;
  intervalHours?: number; // Interval cleanup dalam jam
}

export const useAutoCleanup = ({ 
  isActive = true, 
  intervalHours = 24 // Default cleanup setiap 24 jam
}: UseAutoCleanupProps = {}) => {
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCleanupRef = useRef<Date | null>(null);

  const performCleanup = async () => {
    try {
      console.log('🧹 Starting automatic cleanup of old status checks...');
      await cleanupOldStatusChecks();
      lastCleanupRef.current = new Date();
      console.log('✅ Automatic cleanup completed successfully');
    } catch (error) {
      console.error('❌ Automatic cleanup failed:', error);
    }
  };

  const checkAndPerformCleanup = async () => {
    const now = new Date();
    const lastCleanup = lastCleanupRef.current;
    
    // Jika belum pernah cleanup atau sudah lebih dari interval yang ditentukan
    if (!lastCleanup || (now.getTime() - lastCleanup.getTime()) >= (intervalHours * 60 * 60 * 1000)) {
      await performCleanup();
    }
  };

  useEffect(() => {
    if (!isActive) {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
      return;
    }

    // Jalankan cleanup pertama kali setelah 5 menit aplikasi berjalan
    const initialTimeout = setTimeout(() => {
      checkAndPerformCleanup();
    }, 5 * 60 * 1000); // 5 menit

    // Set interval untuk cleanup berkala
    const intervalMs = intervalHours * 60 * 60 * 1000; // Convert jam ke milliseconds
    cleanupIntervalRef.current = setInterval(() => {
      checkAndPerformCleanup();
    }, intervalMs);

    // Cleanup function
    return () => {
      clearTimeout(initialTimeout);
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
    };
  }, [isActive, intervalHours]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
    };
  }, []);

  return {
    lastCleanup: lastCleanupRef.current,
    performManualCleanup: performCleanup
  };
};