import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
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

const CLOUD_SYNC_STORAGE_KEY = 'cloud_sync_settings';

export const [CloudSyncProvider, useCloudSync] = createContextHook(() => {
  const { user } = useAuth();
  const { documents } = useDocuments();
  const [settings, setSettings] = useState<CloudSyncSettings>({
    autoSync: true,
    lastSyncTime: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load settings from AsyncStorage
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(CLOUD_SYNC_STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error('Failed to load cloud sync settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: CloudSyncSettings) => {
    try {
      await AsyncStorage.setItem(CLOUD_SYNC_STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save cloud sync settings:', error);
    }
  };

  const toggleAutoSync = useCallback(async () => {
    const newSettings = {
      ...settings,
      autoSync: !settings.autoSync,
    };
    await saveSettings(newSettings);
  }, [settings]);

  const performManualSync = useCallback(async () => {
    if (!user) return;
    
    setIsSyncing(true);
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newSettings = {
        ...settings,
        lastSyncTime: new Date().toISOString(),
      };
      await saveSettings(newSettings);
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [user, settings]);

  // Calculate storage usage based on documents
  const getStorageUsage = useCallback((): CloudStorageUsage => {
    // Estimate document size (rough calculation)
    const estimatedSize = documents.reduce((total, doc) => {
      // Estimate: text content + metadata + images
      const textSize = (doc.content?.length || 0) * 2; // 2 bytes per character
      const imageSize = doc.image_url ? 500 * 1024 : 0; // 500KB per image
      return total + textSize + imageSize;
    }, 0);

    const usedMB = Math.round(estimatedSize / (1024 * 1024) * 100) / 100; // Convert to MB with 2 decimal places
    const totalMB = 1024; // 1GB total storage
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

  return useMemo(() => ({
    settings,
    isLoading,
    isSyncing,
    toggleAutoSync,
    performManualSync,
    getStorageUsage,
    formatLastSyncTime,
  }), [settings, isLoading, isSyncing, toggleAutoSync, performManualSync, getStorageUsage, formatLastSyncTime]);
});