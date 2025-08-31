import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { 
  FileText, 
  CreditCard, 
  QrCode,
  Zap,
  Camera,
  Scan
} from 'lucide-react-native';
import { ScanMode } from '@/types/scan';

interface ScanModeSelectorProps {
  onSelectMode: (mode: ScanMode) => void;
  onCancel: () => void;
}

interface ModeOption {
  mode: ScanMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
}

export default function ScanModeSelector({ onSelectMode, onCancel }: ScanModeSelectorProps) {
  const modes: ModeOption[] = [
    {
      mode: 'document',
      title: 'Document Scanner',
      description: 'Scan documents, receipts, and text',
      icon: <FileText size={32} color='#3b82f6' />,
      color: '#3b82f6',
      features: ['OCR text extraction', 'Multi-page support', 'Auto enhancement', 'PDF export'],
    },
    {
      mode: 'id-card',
      title: 'ID Card Scanner',
      description: 'Scan both sides of ID cards',
      icon: <CreditCard size={32} color='#10b981' />,
      color: '#10b981',
      features: ['Front & back capture', 'Data extraction', 'Secure processing', 'Auto-parsing'],
    },
    {
      mode: 'qr-code',
      title: 'QR Code Scanner',
      description: 'Quick QR code detection & actions',
      icon: <QrCode size={32} color='#f59e0b' />,
      color: '#f59e0b',
      features: ['Instant recognition', 'Smart actions', 'All QR types', 'Auto-execute'],
    },
  ];

  const handleModeSelect = (mode: ScanMode) => {
    console.log(`🎯 Selected scan mode: ${mode}`);
    onSelectMode(mode);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Scan size={28} color='#3b82f6' />
          </View>
          <View>
            <Text style={styles.headerTitle}>Choose Scan Mode</Text>
            <Text style={styles.headerSubtitle}>Select the type of scanning you need</Text>
          </View>
        </View>
      </View>

      {/* Mode Options */}
      <View style={styles.modesContainer}>
        {modes.map((mode, index) => (
          <TouchableOpacity
            key={mode.mode}
            style={[styles.modeCard, { borderLeftColor: mode.color }]}
            onPress={() => handleModeSelect(mode.mode)}
            activeOpacity={0.7}
          >
            <View style={styles.modeHeader}>
              <View style={[styles.modeIcon, { backgroundColor: `${mode.color}15` }]}>
                {mode.icon}
              </View>
              <View style={styles.modeInfo}>
                <Text style={styles.modeTitle}>{mode.title}</Text>
                <Text style={styles.modeDescription}>{mode.description}</Text>
              </View>
              <View style={styles.modeAction}>
                <Camera size={20} color='#6b7280' />
              </View>
            </View>
            
            <View style={styles.featuresContainer}>
              {mode.features.map((feature, featureIndex) => (
                <View key={featureIndex} style={styles.featureItem}>
                  <Zap size={12} color={mode.color} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Access Info */}
      <View style={styles.quickAccessInfo}>
        <Text style={styles.quickAccessTitle}>Quick Access</Text>
        <Text style={styles.quickAccessText}>
          Each mode is optimized for specific scanning needs with specialized features and processing.
        </Text>
      </View>

      {/* Cancel Button */}
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  modesContainer: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  modeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  modeAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  quickAccessInfo: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickAccessTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  quickAccessText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  cancelButton: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});