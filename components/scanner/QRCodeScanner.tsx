import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { 
  ArrowLeft, 
  QrCode, 
  FlipHorizontal, 
  Copy,
  ExternalLink,
  Phone,
  Mail,
  Wifi,
  User,
  Save,
  CheckCircle,
  Zap
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { QRCodeScan, QRCodeAction } from '@/types/scan';

interface QRCodeScannerProps {
  onComplete: (scan: QRCodeScan) => void;
  onCancel: () => void;
}

type ScanState = 'scanning' | 'processing' | 'results';

export default function QRCodeScanner({ onComplete, onCancel }: QRCodeScannerProps) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [scannedData, setScannedData] = useState<string>('');
  const [qrCodeType, setQrCodeType] = useState<QRCodeScan['type']>('unknown');
  const [availableActions, setAvailableActions] = useState<QRCodeAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start scanning animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    const scanLineAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    
    if (scanState === 'scanning') {
      pulseAnimation.start();
      scanLineAnimation.start();
    } else {
      pulseAnimation.stop();
      scanLineAnimation.stop();
      pulseAnim.setValue(1);
      scanLineAnim.setValue(0);
    }
    
    return () => {
      pulseAnimation.stop();
      scanLineAnimation.stop();
    };
  }, [scanState, pulseAnim, scanLineAnim]);

  const toggleCameraFacing = () => {
    setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'));
  };

  const detectQRCodeType = (data: string): QRCodeScan['type'] => {
    const lowerData = data.toLowerCase();
    
    if (data.startsWith('http://') || data.startsWith('https://')) {
      return 'url';
    }
    if (data.startsWith('mailto:')) {
      return 'email';
    }
    if (data.startsWith('tel:') || /^\+?[\d\s\-\(\)]+$/.test(data)) {
      return 'phone';
    }
    if (data.startsWith('wifi:')) {
      return 'wifi';
    }
    if (lowerData.includes('vcard') || lowerData.includes('begin:vcard')) {
      return 'contact';
    }
    
    return 'text';
  };

  const generateActions = (data: string, type: QRCodeScan['type']): QRCodeAction[] => {
    const actions: QRCodeAction[] = [];
    
    // Always add copy action
    actions.push({
      type: 'copy',
      label: 'Copy',
      icon: 'copy',
    });
    
    switch (type) {
      case 'url':
        actions.unshift({
          type: 'open',
          label: 'Open Link',
          icon: 'external-link',
        });
        break;
      case 'email':
        actions.unshift({
          type: 'email',
          label: 'Send Email',
          icon: 'mail',
        });
        break;
      case 'phone':
        actions.unshift({
          type: 'call',
          label: 'Call',
          icon: 'phone',
        });
        break;
      case 'wifi':
        actions.unshift({
          type: 'connect',
          label: 'Connect to WiFi',
          icon: 'wifi',
        });
        break;
      case 'contact':
        actions.unshift({
          type: 'save',
          label: 'Save Contact',
          icon: 'user',
        });
        break;
    }
    
    return actions;
  };

  const handleQRCodeScanned = async (data: string) => {
    if (isProcessing || scanState !== 'scanning') return;
    
    setIsProcessing(true);
    setScanState('processing');
    
    console.log('📱 QR Code detected:', data);
    
    try {
      const type = detectQRCodeType(data);
      const actions = generateActions(data, type);
      
      setScannedData(data);
      setQrCodeType(type);
      setAvailableActions(actions);
      
      // Success animation
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
      setScanState('results');
      console.log('✅ QR Code processed successfully');
      
    } catch (error) {
      console.error('❌ Error processing QR code:', error);
      Alert.alert('Error', 'Failed to process QR code. Please try again.');
      setScanState('scanning');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeAction = async (action: QRCodeAction) => {
    try {
      switch (action.type) {
        case 'open':
          if (qrCodeType === 'url') {
            const supported = await Linking.canOpenURL(scannedData);
            if (supported) {
              await Linking.openURL(scannedData);
            } else {
              Alert.alert('Error', 'Cannot open this URL');
            }
          }
          break;
          
        case 'copy':
          await Clipboard.setStringAsync(scannedData);
          Alert.alert('Copied', 'QR code data copied to clipboard!');
          break;
          
        case 'call':
          const phoneUrl = scannedData.startsWith('tel:') ? scannedData : `tel:${scannedData}`;
          const canCall = await Linking.canOpenURL(phoneUrl);
          if (canCall) {
            await Linking.openURL(phoneUrl);
          } else {
            Alert.alert('Error', 'Cannot make phone calls on this device');
          }
          break;
          
        case 'email':
          const emailUrl = scannedData.startsWith('mailto:') ? scannedData : `mailto:${scannedData}`;
          const canEmail = await Linking.canOpenURL(emailUrl);
          if (canEmail) {
            await Linking.openURL(emailUrl);
          } else {
            Alert.alert('Error', 'No email app available');
          }
          break;
          
        case 'connect':
          if (Platform.OS === 'ios') {
            Alert.alert('WiFi Connection', 'Please manually connect to the WiFi network using the provided credentials.');
          } else {
            Alert.alert('WiFi Connection', 'WiFi auto-connection is not supported on this platform.');
          }
          break;
          
        case 'save':
          Alert.alert('Save Contact', 'Contact saving functionality would be implemented here.');
          break;
          
        default:
          console.warn('Unknown action type:', action.type);
      }
    } catch (error) {
      console.error('Error executing action:', error);
      Alert.alert('Error', 'Failed to execute action. Please try again.');
    }
  };

  const saveQRCode = () => {
    const qrCodeScan: QRCodeScan = {
      id: Date.now().toString(),
      data: scannedData,
      type: qrCodeType,
      timestamp: new Date(),
    };
    
    onComplete(qrCodeScan);
  };

  const resetScanner = () => {
    setScanState('scanning');
    setScannedData('');
    setQrCodeType('unknown');
    setAvailableActions([]);
    slideAnim.setValue(0);
  };

  const getTypeIcon = (type: QRCodeScan['type']) => {
    switch (type) {
      case 'url': return <ExternalLink size={24} color='#3b82f6' />;
      case 'email': return <Mail size={24} color='#3b82f6' />;
      case 'phone': return <Phone size={24} color='#3b82f6' />;
      case 'wifi': return <Wifi size={24} color='#3b82f6' />;
      case 'contact': return <User size={24} color='#3b82f6' />;
      default: return <QrCode size={24} color='#3b82f6' />;
    }
  };

  const getTypeLabel = (type: QRCodeScan['type']) => {
    switch (type) {
      case 'url': return 'Website URL';
      case 'email': return 'Email Address';
      case 'phone': return 'Phone Number';
      case 'wifi': return 'WiFi Network';
      case 'contact': return 'Contact Info';
      case 'text': return 'Text';
      default: return 'QR Code';
    }
  };

  const getActionIcon = (iconName: string) => {
    switch (iconName) {
      case 'external-link': return <ExternalLink size={20} color='#FFFFFF' />;
      case 'copy': return <Copy size={20} color='#FFFFFF' />;
      case 'phone': return <Phone size={20} color='#FFFFFF' />;
      case 'mail': return <Mail size={20} color='#FFFFFF' />;
      case 'wifi': return <Wifi size={20} color='#FFFFFF' />;
      case 'user': return <User size={20} color='#FFFFFF' />;
      default: return <QrCode size={20} color='#FFFFFF' />;
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <QrCode size={64} color='#3b82f6' />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan QR codes quickly and accurately.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Results view
  if (scanState === 'results') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={resetScanner}>
            <ArrowLeft size={24} color='#3b82f6' />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QR Code Scanned</Text>
          <TouchableOpacity style={styles.headerButton} onPress={saveQRCode}>
            <Save size={24} color='#10b981' />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.resultsContainer}>
          <Animated.View 
            style={[
              styles.resultCard,
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  })
                }],
                opacity: slideAnim,
              }
            ]}
          >
            {/* Success Indicator */}
            <View style={styles.successHeader}>
              <CheckCircle size={32} color='#10b981' />
              <Text style={styles.successTitle}>QR Code Detected!</Text>
            </View>

            {/* Type Information */}
            <View style={styles.typeContainer}>
              {getTypeIcon(qrCodeType)}
              <Text style={styles.typeLabel}>{getTypeLabel(qrCodeType)}</Text>
            </View>

            {/* Scanned Data */}
            <View style={styles.dataContainer}>
              <Text style={styles.dataLabel}>Content:</Text>
              <Text style={styles.dataValue} numberOfLines={0}>
                {scannedData}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              <Text style={styles.actionsTitle}>Available Actions:</Text>
              <View style={styles.actionButtons}>
                {availableActions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.actionButton,
                      action.type === 'open' && styles.primaryActionButton,
                    ]}
                    onPress={() => executeAction(action)}
                  >
                    {getActionIcon(action.icon)}
                    <Text style={[
                      styles.actionButtonText,
                      action.type === 'open' && styles.primaryActionButtonText,
                    ]}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quick Actions Info */}
            <View style={styles.quickActionsInfo}>
              <Zap size={16} color='#6b7280' />
              <Text style={styles.quickActionsText}>
                Tap any action above to execute it instantly
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Processing view
  if (scanState === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.processingContainer}>
          <Animated.View
            style={{
              transform: [{ scale: pulseAnim }],
            }}
          >
            <QrCode size={64} color='#3b82f6' />
          </Animated.View>
          <Text style={styles.processingTitle}>Processing QR Code</Text>
          <Text style={styles.processingText}>
            Analyzing the scanned data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Camera view
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onCancel}>
          <ArrowLeft size={24} color='#FFFFFF' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code Scanner</Text>
        <TouchableOpacity style={styles.headerButton} onPress={toggleCameraFacing}>
          <FlipHorizontal size={24} color='#FFFFFF' />
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={({ data }) => handleQRCodeScanned(data)}
        >
          {/* QR Code Frame Overlay */}
          <Animated.View 
            style={[
              styles.qrFrame,
              {
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            <View style={styles.qrFrameCorner} />
            <View style={[styles.qrFrameCorner, styles.qrFrameCornerTopRight]} />
            <View style={[styles.qrFrameCorner, styles.qrFrameCornerBottomLeft]} />
            <View style={[styles.qrFrameCorner, styles.qrFrameCornerBottomRight]} />
            
            {/* Scanning Line */}
            <Animated.View 
              style={[
                styles.scanLine,
                {
                  transform: [{
                    translateY: scanLineAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 200],
                    })
                  }],
                  opacity: scanLineAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                  }),
                }
              ]}
            />
          </Animated.View>
          
          {/* Instruction Text */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              Position the QR code within the frame to scan
            </Text>
          </View>
        </CameraView>
      </View>

      {/* Info Panel */}
      <View style={styles.infoPanel}>
        <View style={styles.infoItem}>
          <QrCode size={20} color='#3b82f6' />
          <Text style={styles.infoText}>Supports all QR code types</Text>
        </View>
        <View style={styles.infoItem}>
          <Zap size={20} color='#f59e0b' />
          <Text style={styles.infoText}>Instant recognition & actions</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
    gap: 16,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  qrFrame: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    width: '70%',
    height: '25%',
    borderRadius: 12,
  },
  qrFrameCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#10b981',
    borderWidth: 4,
    top: -4,
    left: -4,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  qrFrameCornerTopRight: {
    top: -4,
    right: -4,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 0,
  },
  qrFrameCornerBottomLeft: {
    bottom: -4,
    top: 'auto',
    left: -4,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 4,
  },
  qrFrameCornerBottomRight: {
    bottom: -4,
    right: -4,
    top: 'auto',
    left: 'auto',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
  },
  instructionText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
  },
  infoPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    gap: 16,
  },
  processingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  processingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  resultCard: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  dataContainer: {
    marginBottom: 24,
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  dataValue: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6b7280',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  primaryActionButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
  },
  quickActionsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  quickActionsText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});