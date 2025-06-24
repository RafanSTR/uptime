import React from 'react';
import { Shield, Users, Activity, LogOut, Lock } from 'lucide-react';
import { User } from '../types/monitor';
import { BrandingSettings } from '../types/branding';
import AdminSettings from './AdminSettings';

interface NavigationProps {
  activeView: 'admin' | 'user';
  onViewChange: (view: 'admin' | 'user') => void;
  user?: User | null;
  onLogout?: () => void;
  onUserUpdate?: (newUsername: string) => void;
  brandingSettings: BrandingSettings;
}

export default function Navigation({ 
  activeView, 
  onViewChange, 
  user, 
  onLogout,
  onUserUpdate,
  brandingSettings
}: NavigationProps) {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center space-x-2">
            {brandingSettings.logoUrl ? (
              <img 
                src={brandingSettings.logoUrl} 
                alt={`${brandingSettings.appName} Logo`}
                className="h-6 w-6 object-contain"
                onError={(e) => {
                  // Fallback to default icon if image fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.innerHTML = '<svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>';
                  (e.target as HTMLImageElement).parentNode?.insertBefore(fallback.firstChild!, e.target);
                }}
              />
            ) : (
              <Activity className="h-6 w-6 text-blue-600" />
            )}
            <h1 className="text-lg font-bold text-gray-900">{brandingSettings.appName}</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1">
              <button
                onClick={() => onViewChange('user')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-2 transition-colors text-sm ${
                  activeView === 'user'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Status</span>
              </button>
              
              {user && user.role === 'admin' ? (
                <button
                  onClick={() => onViewChange('admin')}
                  className={`px-3 py-1.5 rounded-lg flex items-center space-x-2 transition-colors text-sm ${
                    activeView === 'admin'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin</span>
                </button>
              ) : (
                <button
                  onClick={() => onViewChange('admin')}
                  className={`px-3 py-1.5 rounded-lg flex items-center space-x-2 transition-colors text-sm ${
                    activeView === 'admin'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  <span>Login</span>
                </button>
              )}
            </div>

            {user && (
              <div className="flex items-center space-x-2 pl-3 border-l border-gray-200">
                <div className="text-xs">
                  <span className="text-gray-600">Hi, </span>
                  <span className="font-medium text-gray-900">{user.username}</span>
                </div>
                <AdminSettings 
                  currentUser={{ id: user.id, username: user.username }}
                  onUpdate={onUserUpdate || (() => {})}
                />
                <button
                  onClick={onLogout}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}