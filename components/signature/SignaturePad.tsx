import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { X, Check, RotateCcw, Save } from 'lucide-react-native';
import { useSignatures } from '@/contexts/SignatureContext';

interface SignaturePadProps {
  onSave: (svgPath: string, width: number, height: number) => void;
  onCancel: () => void;
  allowSaveToLibrary?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const SIGNATURE_AREA_HEIGHT = 300;
const SIGNATURE_AREA_WIDTH = screenWidth - 40;

export default function SignaturePad({ onSave, onCancel, allowSaveToLibrary = true }: SignaturePadProps) {
  const [path, setPath] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const pathRef = useRef<string>('');
  const { saveSignature } = useSignatures();

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const newPath = `M${locationX},${locationY}`;
      pathRef.current = newPath;
      setPath(newPath);
      setIsDrawing(true);
    },

    onPanResponderMove: (evt) => {
      if (!isDrawing) return;
      const { locationX, locationY } = evt.nativeEvent;
      const newPath = `${pathRef.current} L${locationX},${locationY}`;
      pathRef.current = newPath;
      setPath(newPath);
    },

    onPanResponderRelease: () => {
      setIsDrawing(false);
    },
  });

  const clearSignature = () => {
    setPath('');
    pathRef.current = '';
  };

  const handleSave = () => {
    if (!path.trim()) {
      Alert.alert('No Signature', 'Please draw a signature first.');
      return;
    }

    if (allowSaveToLibrary) {
      setShowSaveDialog(true);
    } else {
      onSave(path, SIGNATURE_AREA_WIDTH, SIGNATURE_AREA_HEIGHT);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!signatureName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your signature.');
      return;
    }

    try {
      await saveSignature({
        name: signatureName.trim(),
        svgPath: path,
        width: SIGNATURE_AREA_WIDTH,
        height: SIGNATURE_AREA_HEIGHT,
      });
      
      Alert.alert('Saved', 'Signature saved to your library!');
      onSave(path, SIGNATURE_AREA_WIDTH, SIGNATURE_AREA_HEIGHT);
    } catch (error) {
      Alert.alert('Error', 'Failed to save signature. Please try again.');
    }
  };

  const handleSkipSave = () => {
    onSave(path, SIGNATURE_AREA_WIDTH, SIGNATURE_AREA_HEIGHT);
  };

  if (showSaveDialog) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowSaveDialog(false)} style={styles.headerButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Save Signature</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.content}>
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Preview:</Text>
            <View style={styles.previewSignature}>
              <Svg width={200} height={100} viewBox={`0 0 ${SIGNATURE_AREA_WIDTH} ${SIGNATURE_AREA_HEIGHT}`}>
                <Path
                  d={path}
                  stroke="#000"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Signature Name:</Text>
            <TextInput
              style={styles.textInput}
              value={signatureName}
              onChangeText={setSignatureName}
              placeholder="Enter a name for this signature"
              autoFocus
            />
          </View>

          <View style={styles.dialogButtons}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkipSave}>
              <Text style={styles.skipButtonText}>Use Without Saving</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveToLibrary}>
              <Save size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save & Use</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
          <X size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Draw Signature</Text>
        <TouchableOpacity onPress={clearSignature} style={styles.headerButton}>
          <RotateCcw size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>
          Draw your signature in the area below
        </Text>

        <View style={styles.signatureContainer}>
          <View style={styles.signatureArea} {...panResponder.panHandlers}>
            <Svg width={SIGNATURE_AREA_WIDTH} height={SIGNATURE_AREA_HEIGHT}>
              <Path
                d={path}
                stroke="#000"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
            
            {!path && (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>Sign here</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.clearButton} onPress={clearSignature}>
            <RotateCcw size={20} color="#666" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.doneButton} onPress={handleSave}>
            <Check size={20} color="#fff" />
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instruction: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  signatureContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureArea: {
    width: SIGNATURE_AREA_WIDTH,
    height: SIGNATURE_AREA_HEIGHT,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    position: 'relative',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  buttons: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 30,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  doneButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    gap: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  previewContainer: {
    marginBottom: 30,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  previewSignature: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputContainer: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#10B981',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});