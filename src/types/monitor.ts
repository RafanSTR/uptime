export interface Monitor {
  id: string;
  name: string;
  url: string;
  method: 'http' | 'ping';
  status: 'up' | 'down' | 'checking';
  responseTime: number;
  uptime: number;
  lastChecked: Date;
  createdAt: Date;
  checkInterval: number; // in minutes
  statusHistory?: StatusCheck[];
}

export interface StatusCheck {
  timestamp: Date;
  status: 'up' | 'down';
  responseTime: number;
}

export interface MonitorFormData {
  name: string;
  url: string;
  method: 'http' | 'ping';
  checkInterval: number; // in minutes
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

export interface MonitoringSettings {
  globalCheckInterval: number; // in minutes
  enableGlobalInterval: boolean;
}