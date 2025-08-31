import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { ArrowLeft, Camera, FlipHorizontal, Zap } from 'lucide-react-native';
import { realtimeDocumentPreview, DocumentBounds } from '@/lib/advancedImageProcessor';
import * as ImagePicker from 'expo-image-picker';

// const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SmartCameraViewProps {
  onCapture: (imageUri: string) => void;
  onCancel: () => void;
}

export default function SmartCameraView({ onCapture, onCancel }: SmartCameraViewProps) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [documentBounds, setDocumentBounds] = useState<DocumentBounds | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, []);

  const toggleCameraFacing = () => {
    setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'));
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      console.log('📸 Capturing photo with smart camera...');
      
      if (Platform.OS === 'web') {
        // Web fallback - use image picker
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          onCapture(result.assets[0].uri);
        }
      } else {
        // Native camera capture
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });

        if (photo) {
          console.log('✅ Photo captured, processing...');
          onCapture(photo.uri);
        }
      }
    } catch (error) {
      console.error('❌ Error capturing photo:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const analyzeFrame = async () => {
    if (isAnalyzing || Platform.OS === 'web') return;

    setIsAnalyzing(true);
    try {
      // Take a quick photo for analysis (not saved)
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.3, // Low quality for speed
          base64: false,
        });

        if (photo) {
          // Analyze the frame for document borders
          const result = await realtimeDocumentPreview(photo.uri);
          setDocumentBounds(result.bounds || null);
        }
      }
    } catch (error) {
      console.warn('⚠️ Frame analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
      
      // Schedule next analysis
      analysisTimeoutRef.current = setTimeout(analyzeFrame, 1000) as any;
    }
  };

  // Start real-time analysis on mount
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const startAnalysis = () => {
      if (Platform.OS !== 'web' && permission?.granted) {
        timeout = setTimeout(() => {
          analyzeFrame();
        }, 1000) as any;
      }
    };
    
    startAnalysis();
    
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [permission?.granted]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan documents with real-time border detection.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderDocumentOverlay = () => {
    if (!documentBounds || Platform.OS === 'web') return null;

    const overlayStyle = {
      position: 'absolute' as const,
      left: documentBounds.topLeft.x,
      top: documentBounds.topLeft.y,
      width: documentBounds.topRight.x - documentBounds.topLeft.x,
      height: documentBounds.bottomLeft.y - documentBounds.topLeft.y,
      borderWidth: 3,
      borderColor: documentBounds.confidence > 0.8 ? '#10b981' : '#f59e0b',
      borderRadius: 8,
      backgroundColor: 'transparent',
    };

    return (
      <View style={overlayStyle}>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>
            {Math.round(documentBounds.confidence * 100)}%
          </Text>
        </View>
      </View>
    );
  };

  const getStatusColor = () => {
    if (!documentBounds) return '#6b7280';
    return documentBounds.confidence > 0.8 ? '#10b981' : '#f59e0b';
  };

  const getStatusText = () => {
    if (isAnalyzing) return 'Analyzing...';
    if (!documentBounds) return 'Position document in frame';
    if (documentBounds.confidence > 0.8) return 'Document detected - Ready to capture';
    return 'Adjust position for better detection';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onCancel}>
          <ArrowLeft size={24} color='#FFFFFF' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Scanner</Text>
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
        >
          {/* Document Detection Overlay */}
          {renderDocumentOverlay()}
          
          {/* Guide Lines */}
          <View style={styles.guideLines}>
            <View style={[styles.guideLine, styles.guideLineTopLeft]} />
            <View style={[styles.guideLine, styles.guideLineTopRight]} />
            <View style={[styles.guideLine, styles.guideLineBottomLeft]} />
            <View style={[styles.guideLine, styles.guideLineBottomRight]} />
          </View>
        </CameraView>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.statusText}>{getStatusText()}</Text>
        {documentBounds && (
          <View style={styles.enhancementBadge}>
            <Zap size={12} color='#3b82f6' />
            <Text style={styles.enhancementText}>AI Enhanced</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          <View style={styles.controlSpacer} />
          
          <TouchableOpacity
            style={[
              styles.captureButton,
              isCapturing && styles.captureButtonDisabled,
              documentBounds && documentBounds.confidence > 0.8 && styles.captureButtonReady,
            ]}
            onPress={capturePhoto}
            disabled={isCapturing}
          >
            <View style={styles.captureButtonInner}>
              <Camera size={32} color='#FFFFFF' />
            </View>
          </TouchableOpacity>
          
          <View style={styles.controlSpacer} />
        </View>

        {/* Processing Features Info */}
        <View style={styles.featuresInfo}>
          <Text style={styles.featuresTitle}>Advanced Processing Features:</Text>
          <View style={styles.featuresList}>
            <Text style={styles.featureItem}>• Real-time border detection</Text>
            <Text style={styles.featureItem}>• Automatic perspective correction</Text>
            <Text style={styles.featureItem}>• Glare and shadow removal</Text>
            <Text style={styles.featureItem}>• Contrast enhancement</Text>
          </View>
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
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
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
  guideLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  guideLine: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 2,
  },
  guideLineTopLeft: {
    top: 60,
    left: 40,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  guideLineTopRight: {
    top: 60,
    right: 40,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  guideLineBottomLeft: {
    bottom: 60,
    left: 40,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  guideLineBottomRight: {
    bottom: 60,
    right: 40,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  confidenceBadge: {
    position: 'absolute',
    top: -30,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    gap: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  enhancementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  enhancementText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6',
  },
  controls: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  controlSpacer: {
    flex: 1,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonReady: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderColor: '#10b981',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  featuresList: {
    gap: 4,
  },
  featureItem: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
  },
});