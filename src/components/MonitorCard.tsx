import React from 'react';
import { Monitor } from '../types/monitor';
import { Globe, Clock, TrendingUp, Trash2, Edit3, Wifi, Activity } from 'lucide-react';
import { extractHostname } from '../utils/uptimeChecker';

interface MonitorCardProps {
  monitor: Monitor;
  isAdmin?: boolean;
  hideUrl?: boolean;
  onEdit?: (monitor: Monitor) => void;
  onDelete?: (id: string) => void;
  isActivelyChecking?: boolean;
}

const MonitorCard: React.FC<MonitorCardProps> = ({ 
  monitor, 
  isAdmin, 
  hideUrl, 
  onEdit, 
  onDelete,
  isActivelyChecking = false
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'text-green-600 bg-green-100';
      case 'down': return 'text-red-600 bg-red-100';
      case 'checking': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'up': return 'bg-green-500';
      case 'down': return 'bg-red-500';
      case 'checking': return 'bg-yellow-500 animate-pulse';
      default: return 'bg-gray-500';
    }
  };

  const displayUrl = monitor.method === 'ping' ? extractHostname(monitor.url) : monitor.url;
  const MethodIcon = monitor.method === 'ping' ? Wifi : Globe;

  // Calculate time since last check
  const timeSinceCheck = Math.floor((Date.now() - monitor.lastChecked.getTime()) / 60000);
  const formatTimeSince = (minutes: number) => {
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}j`;
    const days = Math.floor(hours / 24);
    return `${days}h`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 will-change-transform ${
      isActivelyChecking ? 'ring-2 ring-blue-200 ring-opacity-50' : ''
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getStatusDot(monitor.status)}`}></div>
            {isActivelyChecking && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-semibold text-gray-900 truncate">{monitor.name}</h3>
              {isActivelyChecking && (
                <Activity className="h-3 w-3 text-blue-500 animate-pulse flex-shrink-0" />
              )}
            </div>
            {!hideUrl && (
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <MethodIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{displayUrl}</span>
                <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded uppercase flex-shrink-0">
                  {monitor.method}
                </span>
              </div>
            )}
            {hideUrl && (
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <MethodIcon className="h-3 w-3 mr-1" />
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded uppercase">
                  {monitor.method}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${getStatusColor(monitor.status)}`}>
            {monitor.status === 'up' ? 'ONLINE' : monitor.status === 'down' ? 'OFFLINE' : 'CEK'}
          </span>
          
          {isAdmin && (
            <div className="flex space-x-1">
              <button
                onClick={() => onEdit?.(monitor)}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Edit monitor"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete?.(monitor.id)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Hapus monitor"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="text-center p-2 bg-gray-50 rounded transition-colors duration-200">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="h-3 w-3 text-green-600" />
          </div>
          <div className="text-sm font-semibold text-gray-900">{monitor.uptime}%</div>
          <div className="text-gray-500">Uptime</div>
        </div>
        
        <div className="text-center p-2 bg-gray-50 rounded transition-colors duration-200">
          <div className="flex items-center justify-center mb-1">
            <Clock className="h-3 w-3 text-blue-600" />
          </div>
          <div className="text-sm font-semibold text-gray-900">
            {monitor.responseTime > 0 ? `${monitor.responseTime}ms` : '-'}
          </div>
          <div className="text-gray-500">
            {monitor.method === 'ping' ? 'Ping' : 'Respon'}
          </div>
        </div>
        
        <div className="text-center p-2 bg-gray-50 rounded transition-colors duration-200">
          <div className="text-sm font-semibold text-gray-900">
            {formatTimeSince(timeSinceCheck)}
          </div>
          <div className="text-gray-500">Terakhir</div>
        </div>
      </div>
    </div>
  );
};

export default MonitorCard;