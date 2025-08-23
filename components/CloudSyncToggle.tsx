import React from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Cloud, RefreshCw, Settings, HardDrive } from 'lucide-react-native';
import { useCloudSync } from '@/contexts/CloudSyncContext';

export default function CloudSyncToggle() {
  const { 
    settings, 
    isLoading, 
    isSyncing, 
    toggleAutoSync, 
    performManualSync, 
    getStorageUsage, 
    formatLastSyncTime 
  } = useCloudSync();

  const storageUsage = getStorageUsage();

  const handleManualSync = async () => {
    try {
      await performManualSync();
      Alert.alert('Sync Complete', 'Your documents have been synchronized with the cloud.');
    } catch (error) {
      Alert.alert('Sync Failed', 'Failed to synchronize documents. Please try again.');
    }
  };

  const showCloudAccountInfo = () => {
    Alert.alert(
      'Cloud Account',
      'Connected to Supabase Cloud Storage\n\nYour documents are securely stored and synchronized across all your devices.',
      [{ text: 'OK' }]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#0066CC" />
        <Text style={styles.loadingText}>Loading sync settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Auto Sync Toggle */}
      <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <View style={styles.iconContainer}>
            <Cloud size={20} color="#0066CC" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.settingTitle}>Auto Sync</Text>
            <Text style={styles.settingSubtitle}>
              Automatically sync documents to cloud
            </Text>
          </View>
        </View>
        <Switch
          value={settings.autoSync}
          onValueChange={toggleAutoSync}
          trackColor={{ false: '#E5E5EA', true: '#34C759' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#E5E5EA"
        />
      </View>

      {/* Manual Sync Button */}
      <TouchableOpacity 
        style={[styles.settingItem, styles.syncButton]} 
        onPress={handleManualSync}
        disabled={isSyncing}
      >
        <View style={styles.settingLeft}>
          <View style={styles.iconContainer}>
            {isSyncing ? (
              <ActivityIndicator size={16} color="#0066CC" />
            ) : (
              <RefreshCw size={20} color="#0066CC" />
            )}
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.settingTitle}>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Text>
            <Text style={styles.settingSubtitle}>
              Last sync: {formatLastSyncTime()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Storage Usage */}
      <View style={styles.storageContainer}>
        <View style={styles.storageHeader}>
          <View style={styles.iconContainer}>
            <HardDrive size={20} color="#0066CC" />
          </View>
          <Text style={styles.storageTitle}>Cloud Storage</Text>
        </View>
        
        <View style={styles.storageInfo}>
          <Text style={styles.storageText}>
            {storageUsage.used} MB of {storageUsage.total} MB used
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.max(storageUsage.percentage, 2)}%` }
              ]} 
            />
          </View>
          <Text style={styles.storagePercentage}>
            {storageUsage.percentage}% used
          </Text>
        </View>
      </View>

      {/* Manage Cloud Account */}
      <TouchableOpacity style={styles.settingItem} onPress={showCloudAccountInfo}>
        <View style={styles.settingLeft}>
          <View style={styles.iconContainer}>
            <Settings size={20} color="#0066CC" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.settingTitle}>Manage Cloud Account</Text>
            <Text style={styles.settingSubtitle}>
              View account details and settings
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  syncButton: {
    opacity: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 3,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  storageContainer: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 16,
  },
  storageInfo: {
    marginLeft: 52,
  },
  storageText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0066CC',
    borderRadius: 3,
  },
  storagePercentage: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
  },
});