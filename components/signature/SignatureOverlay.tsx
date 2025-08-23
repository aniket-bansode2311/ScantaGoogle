import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { X, Check, RotateCcw, Move, Maximize2 } from 'lucide-react-native';
import { SavedSignature, SignatureInstance } from '@/types/scan';
import { useSignatures } from '@/contexts/SignatureContext';
import SignatureLibrary from './SignatureLibrary';
import SignaturePad from './SignaturePad';

interface SignatureOverlayProps {
  imageUri: string;
  existingSignatures?: SignatureInstance[];
  onSave: (signatures: SignatureInstance[]) => void;
  onCancel: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const IMAGE_CONTAINER_HEIGHT = screenHeight * 0.6;
const IMAGE_CONTAINER_WIDTH = screenWidth - 40;

interface DraggableSignature extends SignatureInstance {
  signature: SavedSignature;
  isDragging: boolean;
  isResizing: boolean;
}

export default function SignatureOverlay({ 
  imageUri, 
  existingSignatures = [], 
  onSave, 
  onCancel 
}: SignatureOverlayProps) {
  const [signatures, setSignatures] = useState<DraggableSignature[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [showSignatureLibrary, setShowSignatureLibrary] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const { getSignature } = useSignatures();

  const createPanResponder = (signatureId: string, isResize = false) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        setSignatures(prev => prev.map(sig => 
          sig.id === signatureId 
            ? { ...sig, [isResize ? 'isResizing' : 'isDragging']: true }
            : { ...sig, isDragging: false, isResizing: false }
        ));
        setSelectedSignatureId(signatureId);
      },

      onPanResponderMove: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        
        setSignatures(prev => prev.map(sig => {
          if (sig.id !== signatureId) return sig;
          
          if (isResize) {
            const newWidth = Math.max(50, sig.width + dx);
            const newHeight = Math.max(30, sig.height + (dx * sig.height / sig.width));
            return { ...sig, width: newWidth, height: newHeight };
          } else {
            const newX = Math.max(0, Math.min(IMAGE_CONTAINER_WIDTH - sig.width, sig.x + dx));
            const newY = Math.max(0, Math.min(IMAGE_CONTAINER_HEIGHT - sig.height, sig.y + dy));
            return { ...sig, x: newX, y: newY };
          }
        }));
      },

      onPanResponderRelease: () => {
        setSignatures(prev => prev.map(sig => 
          sig.id === signatureId 
            ? { ...sig, isDragging: false, isResizing: false }
            : sig
        ));
      },
    });
  };

  const addSignature = (savedSignature: SavedSignature) => {
    const newSignature: DraggableSignature = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      signatureId: savedSignature.id,
      x: IMAGE_CONTAINER_WIDTH / 2 - 100,
      y: IMAGE_CONTAINER_HEIGHT / 2 - 50,
      width: 200,
      height: 100,
      signature: savedSignature,
      isDragging: false,
      isResizing: false,
    };
    
    setSignatures(prev => [...prev, newSignature]);
    setSelectedSignatureId(newSignature.id);
    setShowSignatureLibrary(false);
  };

  const handleCreateNewSignature = () => {
    setShowSignatureLibrary(false);
    setShowSignaturePad(true);
  };

  const handleSignaturePadSave = (svgPath: string, width: number, height: number) => {
    // Create a temporary signature for immediate use
    const tempSignature: SavedSignature = {
      id: 'temp_' + Date.now().toString(),
      name: 'New Signature',
      svgPath,
      width,
      height,
      createdAt: new Date(),
    };
    
    addSignature(tempSignature);
    setShowSignaturePad(false);
  };

  const handleSignaturePadCancel = () => {
    setShowSignaturePad(false);
    setShowSignatureLibrary(true);
  };

  const handleLibraryCancel = () => {
    setShowSignatureLibrary(false);
  };

  const removeSignature = (signatureId: string) => {
    setSignatures(prev => prev.filter(sig => sig.id !== signatureId));
    setSelectedSignatureId(null);
  };

  const handleSave = () => {
    const signatureInstances: SignatureInstance[] = signatures.map(sig => ({
      id: sig.id,
      signatureId: sig.signatureId,
      x: sig.x,
      y: sig.y,
      width: sig.width,
      height: sig.height,
      rotation: sig.rotation,
    }));
    
    onSave(signatureInstances);
  };

  const clearAllSignatures = () => {
    if (signatures.length === 0) return;
    
    Alert.alert(
      'Clear All Signatures',
      'Are you sure you want to remove all signatures?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => setSignatures([]) },
      ]
    );
  };

  if (showSignaturePad) {
    return (
      <SignaturePad
        onSave={handleSignaturePadSave}
        onCancel={handleSignaturePadCancel}
        allowSaveToLibrary={true}
      />
    );
  }

  if (showSignatureLibrary) {
    return (
      <SignatureLibrary
        onSelectSignature={addSignature}
        onCreateNew={handleCreateNewSignature}
        onCancel={handleLibraryCancel}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
          <X size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Signatures</Text>
        <TouchableOpacity onPress={clearAllSignatures} style={styles.headerButton}>
          <RotateCcw size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <View style={styles.imageWrapper}>
            {/* Document image would be rendered here */}
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>Document Image</Text>
            </View>
            
            {/* Render signatures */}
            {signatures.map((sig) => {
              const isSelected = selectedSignatureId === sig.id;
              const panResponder = createPanResponder(sig.id);
              const resizePanResponder = createPanResponder(sig.id, true);
              
              return (
                <View
                  key={sig.id}
                  style={[
                    styles.signatureWrapper,
                    {
                      left: sig.x,
                      top: sig.y,
                      width: sig.width,
                      height: sig.height,
                    },
                    isSelected && styles.selectedSignature,
                    sig.isDragging && styles.draggingSignature,
                  ]}
                >
                  <View style={styles.signatureContent} {...panResponder.panHandlers}>
                    <Svg 
                      width={sig.width} 
                      height={sig.height} 
                      viewBox={`0 0 ${sig.signature.width} ${sig.signature.height}`}
                    >
                      <Path
                        d={sig.signature.svgPath}
                        stroke="#000"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </Svg>
                  </View>
                  
                  {isSelected && (
                    <>
                      {/* Move handle */}
                      <View style={styles.moveHandle}>
                        <Move size={12} color="#3B82F6" />
                      </View>
                      
                      {/* Resize handle */}
                      <View 
                        style={styles.resizeHandle} 
                        {...resizePanResponder.panHandlers}
                      >
                        <Maximize2 size={12} color="#3B82F6" />
                      </View>
                      
                      {/* Delete button */}
                      <TouchableOpacity 
                        style={styles.deleteHandle}
                        onPress={() => removeSignature(sig.id)}
                      >
                        <X size={12} color="#EF4444" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Tap signatures to select • Drag to move • Use corner handle to resize
          </Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => setShowSignatureLibrary(true)}
          >
            <Text style={styles.addButtonText}>Add Signature</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.doneButton, signatures.length === 0 && styles.disabledButton]} 
            onPress={handleSave}
            disabled={signatures.length === 0}
          >
            <Check size={20} color="#fff" />
            <Text style={styles.doneButtonText}>Done ({signatures.length})</Text>
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
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    width: IMAGE_CONTAINER_WIDTH,
    height: IMAGE_CONTAINER_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  signatureWrapper: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 4,
  },
  selectedSignature: {
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  draggingSignature: {
    opacity: 0.8,
  },
  signatureContent: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 2,
  },
  moveHandle: {
    position: 'absolute',
    top: -12,
    left: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  resizeHandle: {
    position: 'absolute',
    bottom: -12,
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  deleteHandle: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  instructions: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 15,
  },
  addButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
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
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});