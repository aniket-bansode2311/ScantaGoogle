import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useDocuments } from './DocumentContext';

interface CloudSyncSettings {
  autoSync: boolean;
  lastSyncTime: string | null;
}

interface CloudStorageUsage {
  used: number; // in MB
  total: number; // in MB
  percentage: number;
}

interface CloudSyncContextType {
  settings: CloudSyncSettings;
  isLoading: boolean;
  isSyncing: boolean;
  toggleAutoSync: () => Promise<void>;
  performManualSync: () => Promise<void>;
  getStorageUsage: () => CloudStorageUsage;
  formatLastSyncTime: () => string;
}

const CLOUD_SYNC_STORAGE_KEY = 'cloud_sync_settings';

const CloudSyncContext = createContext<CloudSyncContextType | undefined>(undefined);

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { documents } = useDocuments();
  const [settings, setSettings] = useState<CloudSyncSettings>({
    autoSync: true,
    lastSyncTime: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(CLOUD_SYNC_STORAGE_KEY);
      if (stored && mountedRef.current) {
        const parsedSettings = JSON.parse(stored);
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error('Failed to load cloud sync settings:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const saveSettings = useCallback(async (newSettings: CloudSyncSettings) => {
    try {
      await AsyncStorage.setItem(CLOUD_SYNC_STORAGE_KEY, JSON.stringify(newSettings));
      if (mountedRef.current) {
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Failed to save cloud sync settings:', error);
    }
  }, []);

  const toggleAutoSync = useCallback(async () => {
    const newSettings = {
      ...settings,
      autoSync: !settings.autoSync,
    };
    await saveSettings(newSettings);
  }, [settings, saveSettings]);

  const performManualSync = useCallback(async () => {
    if (!user || !mountedRef.current) return;
    
    setIsSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!mountedRef.current) return;
      
      const newSettings = {
        ...settings,
        lastSyncTime: new Date().toISOString(),
      };
      await saveSettings(newSettings);
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      if (mountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, [user, settings, saveSettings]);

  const getStorageUsage = useCallback((): CloudStorageUsage => {
    const estimatedSize = documents.reduce((total, doc) => {
      const textSize = (doc.content?.length || 0) * 2;
      const imageSize = doc.image_url ? 500 * 1024 : 0;
      return total + textSize + imageSize;
    }, 0);

    const usedMB = Math.round(estimatedSize / (1024 * 1024) * 100) / 100;
    const totalMB = 1024;
    const percentage = Math.min((usedMB / totalMB) * 100, 100);

    return {
      used: usedMB,
      total: totalMB,
      percentage: Math.round(percentage * 100) / 100,
    };
  }, [documents]);

  const formatLastSyncTime = useCallback((): string => {
    if (!settings.lastSyncTime) return 'Never';
    
    const syncDate = new Date(settings.lastSyncTime);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return syncDate.toLocaleDateString();
  }, [settings.lastSyncTime]);

  const value = useMemo(() => ({
    settings,
    isLoading,
    isSyncing,
    toggleAutoSync,
    performManualSync,
    getStorageUsage,
    formatLastSyncTime,
  }), [settings, isLoading, isSyncing, toggleAutoSync, performManualSync, getStorageUsage, formatLastSyncTime]);

  return (
    <CloudSyncContext.Provider value={value}>
      {children}
    </CloudSyncContext.Provider>
  );
}

export function useCloudSync() {
  const context = useContext(CloudSyncContext);
  if (context === undefined) {
    throw new Error('useCloudSync must be used within a CloudSyncProvider');
  }
  return context;
}