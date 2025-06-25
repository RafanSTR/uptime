import React from 'react';
import { Wifi, WifiOff, Clock, Activity, RefreshCw } from 'lucide-react';

interface RealTimeIndicatorProps {
  isMonitoring: boolean;
  lastUpdateTime: Date;
  activeChecks: Set<string>;
  totalMonitors: number;
  onManualSync?: () => void;
}

const RealTimeIndicator: React.FC<RealTimeIndicatorProps> = ({
  isMonitoring,
  lastUpdateTime,
  activeChecks,
  totalMonitors,
  onManualSync
}) => {
  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 10) return 'Baru saja';
    if (diff < 60) return `${diff}d lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    return `${Math.floor(diff / 3600)}j lalu`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isMonitoring ? (
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Wifi className="h-4 w-4 text-green-600" />
                {activeChecks.size > 0 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <span className="text-sm font-medium text-green-600">Real-time Aktif</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <WifiOff className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-500">Monitoring Berhenti</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3 text-xs text-gray-500">
          {activeChecks.size > 0 && (
            <div className="flex items-center space-x-1">
              <Activity className="h-3 w-3 text-blue-500 animate-pulse" />
              <span className="text-blue-600 font-medium">
                {activeChecks.size} sedang dicek
              </span>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Update: {formatLastUpdate(lastUpdateTime)}</span>
          </div>

          {onManualSync && (
            <button
              onClick={onManualSync}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
              title="Refresh manual"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>
      
      {totalMonitors > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Monitoring {totalMonitors} layanan • Cek otomatis setiap 1 menit
        </div>
      )}
    </div>
  );
};

export default RealTimeIndicator;