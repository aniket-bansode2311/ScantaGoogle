import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { 
  ArrowLeft, 
  Camera, 
  FlipHorizontal, 
  RotateCcw, 
  Check,
  CreditCard,
  User,
  Calendar,
  MapPin,
  Hash,
  Copy,
  Save
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { IDCardScan } from '@/types/scan';

interface IDCardScannerProps {
  onComplete: (scan: IDCardScan) => void;
  onCancel: () => void;
}

type ScanStep = 'front' | 'back' | 'processing' | 'results';

export default function IDCardScanner({ onComplete, onCancel }: IDCardScannerProps) {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [currentStep, setCurrentStep] = useState<ScanStep>('front');
  const [frontImageUri, setFrontImageUri] = useState<string | null>(null);
  const [backImageUri, setBackImageUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [extractedData, setExtractedData] = useState<IDCardScan['extractedData']>({});
  
  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start pulse animation for guidance
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
    
    if (currentStep === 'front' || currentStep === 'back') {
      pulseAnimation.start();
    } else {
      pulseAnimation.stop();
      pulseAnim.setValue(1);
    }
    
    return () => pulseAnimation.stop();
  }, [currentStep, pulseAnim]);

  const toggleCameraFacing = () => {
    setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'));
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      console.log(`📸 Capturing ${currentStep} of ID card...`);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo) {
        if (currentStep === 'front') {
          setFrontImageUri(photo.uri);
          setCurrentStep('back');
          console.log('✅ Front captured, ready for back');
        } else if (currentStep === 'back') {
          setBackImageUri(photo.uri);
          setCurrentStep('processing');
          console.log('✅ Back captured, processing...');
          await processIDCard(frontImageUri!, photo.uri);
        }
      }
    } catch (error) {
      console.error('❌ Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const processIDCard = async (frontUri: string, backUri: string) => {
    
    try {
      console.log('🔍 Processing ID card data...');
      
      // Process front side
      const frontText = await extractTextFromIDCard(frontUri, 'front');
      
      // Process back side
      const backText = await extractTextFromIDCard(backUri, 'back');
      
      // Parse extracted data
      const parsedData = parseIDCardData(frontText, backText);
      setExtractedData(parsedData);
      
      // Success animation
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
      setCurrentStep('results');
      console.log('✅ ID card processing complete');
      
    } catch (error) {
      console.error('❌ Error processing ID card:', error);
      Alert.alert('Error', 'Failed to process ID card. Please try again.');
      setCurrentStep('front');
      setFrontImageUri(null);
      setBackImageUri(null);
    }
  };

  const extractTextFromIDCard = async (imageUri: string, side: 'front' | 'back'): Promise<string> => {
    try {
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an expert at extracting text from ID cards. Extract all visible text from the ${side} side of this ID card. Focus on names, numbers, dates, and addresses. Return the raw text exactly as it appears.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract all text from this ${side} side of an ID card:`
                },
                {
                  type: 'image',
                  image: imageUri
                }
              ]
            }
          ]
        })
      });

      const result = await response.json();
      return result.completion || '';
    } catch (error) {
      console.error(`Error extracting text from ${side}:`, error);
      return '';
    }
  };

  const parseIDCardData = (frontText: string, backText: string): IDCardScan['extractedData'] => {
    const combinedText = `${frontText}\n${backText}`;
    const data: IDCardScan['extractedData'] = {};
    
    // Simple parsing logic - can be enhanced with more sophisticated patterns
    const lines = combinedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Name patterns
      if (lowerLine.includes('name') || lowerLine.includes('nom')) {
        const nameMatch = line.match(/(?:name|nom)\s*:?\s*(.+)/i);
        if (nameMatch) data.name = nameMatch[1].trim();
      }
      
      // ID Number patterns
      if (lowerLine.includes('id') || lowerLine.includes('number') || lowerLine.includes('no')) {
        const idMatch = line.match(/(?:id|number|no)\s*:?\s*([A-Z0-9]+)/i);
        if (idMatch) data.idNumber = idMatch[1].trim();
      }
      
      // Date of birth patterns
      if (lowerLine.includes('birth') || lowerLine.includes('born') || lowerLine.includes('dob')) {
        const dobMatch = line.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
        if (dobMatch) data.dateOfBirth = dobMatch[1];
      }
      
      // Expiry date patterns
      if (lowerLine.includes('exp') || lowerLine.includes('valid')) {
        const expMatch = line.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
        if (expMatch) data.expiryDate = expMatch[1];
      }
      
      // Address patterns
      if (lowerLine.includes('address') || lowerLine.includes('addr')) {
        const addrMatch = line.match(/(?:address|addr)\s*:?\s*(.+)/i);
        if (addrMatch) data.address = addrMatch[1].trim();
      }
    }
    
    return data;
  };

  const retakePhoto = () => {
    if (currentStep === 'back') {
      setCurrentStep('front');
      setFrontImageUri(null);
      setBackImageUri(null);
    } else if (currentStep === 'results') {
      setCurrentStep('front');
      setFrontImageUri(null);
      setBackImageUri(null);
      setExtractedData({});
      slideAnim.setValue(0);
    }
  };

  const skipBackSide = () => {
    if (frontImageUri) {
      setCurrentStep('processing');
      processIDCard(frontImageUri, '');
    }
  };

  const copyData = async (data: string) => {
    await Clipboard.setStringAsync(data);
    Alert.alert('Copied', 'Data copied to clipboard!');
  };

  const saveIDCard = () => {
    if (!frontImageUri) return;
    
    const idCardScan: IDCardScan = {
      id: Date.now().toString(),
      frontImageUri,
      backImageUri: backImageUri || undefined,
      extractedData,
      timestamp: new Date(),
    };
    
    onComplete(idCardScan);
  };

  const isBackStepCompleted = () => {
    return currentStep === 'processing' || currentStep === 'results';
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <CreditCard size={64} color='#3b82f6' />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan your ID card securely.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Results view
  if (currentStep === 'results') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={retakePhoto}>
            <RotateCcw size={24} color='#3b82f6' />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ID Card Scanned</Text>
          <TouchableOpacity style={styles.headerButton} onPress={saveIDCard}>
            <Save size={24} color='#10b981' />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.resultsContainer}>
          {/* ID Card Images */}
          <View style={styles.cardImagesContainer}>
            <View style={styles.cardImageWrapper}>
              <Text style={styles.cardSideLabel}>Front</Text>
              <Image source={{ uri: frontImageUri! }} style={styles.cardImage} />
            </View>
            {backImageUri && (
              <View style={styles.cardImageWrapper}>
                <Text style={styles.cardSideLabel}>Back</Text>
                <Image source={{ uri: backImageUri }} style={styles.cardImage} />
              </View>
            )}
          </View>

          {/* Extracted Data */}
          <Animated.View 
            style={[
              styles.dataContainer,
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
            <Text style={styles.dataTitle}>Extracted Information</Text>
            
            {extractedData.name && (
              <View style={styles.dataItem}>
                <User size={20} color='#6b7280' />
                <View style={styles.dataContent}>
                  <Text style={styles.dataLabel}>Name</Text>
                  <Text style={styles.dataValue}>{extractedData.name}</Text>
                </View>
                <TouchableOpacity onPress={() => copyData(extractedData.name!)}>
                  <Copy size={16} color='#3b82f6' />
                </TouchableOpacity>
              </View>
            )}
            
            {extractedData.idNumber && (
              <View style={styles.dataItem}>
                <Hash size={20} color='#6b7280' />
                <View style={styles.dataContent}>
                  <Text style={styles.dataLabel}>ID Number</Text>
                  <Text style={styles.dataValue}>{extractedData.idNumber}</Text>
                </View>
                <TouchableOpacity onPress={() => copyData(extractedData.idNumber!)}>
                  <Copy size={16} color='#3b82f6' />
                </TouchableOpacity>
              </View>
            )}
            
            {extractedData.dateOfBirth && (
              <View style={styles.dataItem}>
                <Calendar size={20} color='#6b7280' />
                <View style={styles.dataContent}>
                  <Text style={styles.dataLabel}>Date of Birth</Text>
                  <Text style={styles.dataValue}>{extractedData.dateOfBirth}</Text>
                </View>
                <TouchableOpacity onPress={() => copyData(extractedData.dateOfBirth!)}>
                  <Copy size={16} color='#3b82f6' />
                </TouchableOpacity>
              </View>
            )}
            
            {extractedData.expiryDate && (
              <View style={styles.dataItem}>
                <Calendar size={20} color='#6b7280' />
                <View style={styles.dataContent}>
                  <Text style={styles.dataLabel}>Expiry Date</Text>
                  <Text style={styles.dataValue}>{extractedData.expiryDate}</Text>
                </View>
                <TouchableOpacity onPress={() => copyData(extractedData.expiryDate!)}>
                  <Copy size={16} color='#3b82f6' />
                </TouchableOpacity>
              </View>
            )}
            
            {extractedData.address && (
              <View style={styles.dataItem}>
                <MapPin size={20} color='#6b7280' />
                <View style={styles.dataContent}>
                  <Text style={styles.dataLabel}>Address</Text>
                  <Text style={styles.dataValue}>{extractedData.address}</Text>
                </View>
                <TouchableOpacity onPress={() => copyData(extractedData.address!)}>
                  <Copy size={16} color='#3b82f6' />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Processing view
  if (currentStep === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.processingContainer}>
          <Animated.View
            style={{
              transform: [{ scale: pulseAnim }],
            }}
          >
            <CreditCard size={64} color='#3b82f6' />
          </Animated.View>
          <Text style={styles.processingTitle}>Processing ID Card</Text>
          <Text style={styles.processingText}>
            Extracting information from your ID card...
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
        <Text style={styles.headerTitle}>
          {currentStep === 'front' ? 'Scan Front Side' : 'Scan Back Side'}
        </Text>
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
          {/* ID Card Frame Overlay */}
          <Animated.View 
            style={[
              styles.cardFrame,
              {
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            <View style={styles.cardFrameCorner} />
            <View style={[styles.cardFrameCorner, styles.cardFrameCornerTopRight]} />
            <View style={[styles.cardFrameCorner, styles.cardFrameCornerBottomLeft]} />
            <View style={[styles.cardFrameCorner, styles.cardFrameCornerBottomRight]} />
          </Animated.View>
          
          {/* Instruction Text */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              {currentStep === 'front' 
                ? 'Position the front of your ID card within the frame'
                : 'Now position the back of your ID card within the frame'
              }
            </Text>
          </View>
        </CameraView>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          {currentStep === 'back' && (
            <TouchableOpacity style={styles.skipButton} onPress={skipBackSide}>
              <Text style={styles.skipButtonText}>Skip Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.captureButton,
              isCapturing && styles.captureButtonDisabled,
            ]}
            onPress={capturePhoto}
            disabled={isCapturing}
          >
            <View style={styles.captureButtonInner}>
              {currentStep === 'front' ? (
                <Camera size={32} color='#FFFFFF' />
              ) : (
                <Check size={32} color='#FFFFFF' />
              )}
            </View>
          </TouchableOpacity>
          
          <View style={styles.controlSpacer} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, currentStep !== 'front' && styles.progressDotCompleted]} />
            <Text style={styles.progressLabel}>Front</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <View style={[
              styles.progressDot, 
              isBackStepCompleted() 
                ? styles.progressDotCompleted 
                : styles.progressDotInactive
            ]} />
            <Text style={styles.progressLabel}>Back</Text>
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
  cardFrame: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    width: '80%',
    height: '35%',
    borderRadius: 12,
  },
  cardFrameCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#3b82f6',
    borderWidth: 3,
    top: -3,
    left: -3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cardFrameCornerTopRight: {
    top: -3,
    right: -3,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 0,
  },
  cardFrameCornerBottomLeft: {
    bottom: -3,
    top: 'auto',
    left: -3,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  cardFrameCornerBottomRight: {
    bottom: -3,
    right: -3,
    top: 'auto',
    left: 'auto',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
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
  skipButton: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlSpacer: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  progressStep: {
    alignItems: 'center',
    gap: 4,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  progressDotCompleted: {
    backgroundColor: '#10b981',
  },
  progressDotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressLabel: {
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
  cardImagesContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  cardImageWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  cardSideLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  cardImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  dataContainer: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dataTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  dataContent: {
    flex: 1,
  },
  dataLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 2,
  },
  dataValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
});