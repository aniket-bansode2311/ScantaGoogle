import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  PanResponder,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Check, 
  RotateCw, 
  Crop, 
  Palette,
  Sun,
  Contrast,
  Filter
} from 'lucide-react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const EDIT_AREA_HEIGHT = screenHeight * 0.6;
const EDIT_AREA_WIDTH = screenWidth - 40;

interface ImageEditViewProps {
  imageUri: string;
  onSave: (editedImageUri: string) => void;
  onCancel: () => void;
}

type FilterType = 'none' | 'grayscale' | 'sepia' | 'blackwhite' | 'vintage';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageEditView({ imageUri, onSave, onCancel }: ImageEditViewProps) {
  const [rotation, setRotation] = useState(0);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('none');
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 1, height: 1 });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const cropPan = useRef(new Animated.ValueXY()).current;
  const cropScale = useRef(new Animated.Value(1)).current;

  const filters: { type: FilterType; name: string; icon: any }[] = [
    { type: 'none', name: 'Original', icon: Filter },
    { type: 'grayscale', name: 'Grayscale', icon: Palette },
    { type: 'blackwhite', name: 'B&W', icon: Contrast },
    { type: 'sepia', name: 'Sepia', icon: Sun },
  ];

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => isCropping,
    onPanResponderGrant: () => {
      cropPan.setOffset({
        x: (cropPan.x as any)._value,
        y: (cropPan.y as any)._value,
      });
    },
    onPanResponderMove: Animated.event(
      [null, { dx: cropPan.x, dy: cropPan.y }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: () => {
      cropPan.flattenOffset();
    },
  });

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const toggleCrop = () => {
    setIsCropping(!isCropping);
    if (!isCropping) {
      // Reset crop area when entering crop mode
      setCropArea({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
      cropPan.setValue({ x: 0, y: 0 });
    }
  };

  const applyFilter = (filter: FilterType) => {
    setCurrentFilter(filter);
  };

  const adjustBrightness = (value: number) => {
    setBrightness(Math.max(0.5, Math.min(2, value)));
  };

  const adjustContrast = (value: number) => {
    setContrast(Math.max(0.5, Math.min(2, value)));
  };

  const processImage = async () => {
    setIsProcessing(true);
    try {
      let manipulateActions: any[] = [];

      // Apply rotation
      if (rotation !== 0) {
        manipulateActions.push({ rotate: rotation });
      }

      // Apply crop if in cropping mode
      if (isCropping && (cropArea.width < 1 || cropArea.height < 1)) {
        manipulateActions.push({
          crop: {
            originX: cropArea.x * EDIT_AREA_WIDTH,
            originY: cropArea.y * EDIT_AREA_HEIGHT,
            width: cropArea.width * EDIT_AREA_WIDTH,
            height: cropArea.height * EDIT_AREA_HEIGHT,
          },
        });
      }

      // Apply filters and adjustments
      if (currentFilter !== 'none' || brightness !== 1 || contrast !== 1) {
        const filterActions: any = {};
        
        if (brightness !== 1) {
          filterActions.brightness = brightness;
        }
        
        if (contrast !== 1) {
          filterActions.contrast = contrast;
        }

        // Apply color filters
        switch (currentFilter) {
          case 'grayscale':
            filterActions.grayscale = 1;
            break;
          case 'sepia':
            filterActions.sepia = 1;
            break;
          case 'blackwhite':
            filterActions.contrast = 2;
            filterActions.brightness = 1.2;
            filterActions.grayscale = 1;
            break;
        }

        if (Object.keys(filterActions).length > 0) {
          manipulateActions.push(filterActions);
        }
      }

      let result;
      if (manipulateActions.length > 0) {
        result = await manipulateAsync(
          imageUri,
          manipulateActions,
          { compress: 0.8, format: SaveFormat.JPEG }
        );
      } else {
        // No changes, return original
        result = { uri: imageUri };
      }

      onSave(result.uri);
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getImageStyle = () => {
    const baseStyle = {
      width: EDIT_AREA_WIDTH,
      height: EDIT_AREA_HEIGHT,
      transform: [{ rotate: `${rotation}deg` }],
    };

    // Apply filter styles
    const filterStyle: any = {};
    
    if (currentFilter === 'grayscale') {
      filterStyle.tintColor = '#888888';
    } else if (currentFilter === 'sepia') {
      filterStyle.tintColor = '#D2691E';
    }

    return [baseStyle, filterStyle];
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onCancel}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Image</Text>
        <TouchableOpacity 
          style={[styles.headerButton, styles.saveButton]} 
          onPress={processImage}
          disabled={isProcessing}
        >
          <Check size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Image Edit Area */}
      <View style={styles.editArea}>
        <View style={styles.imageContainer} {...panResponder.panHandlers}>
          <Image 
            source={{ uri: imageUri }} 
            style={getImageStyle()}
            resizeMode="contain"
          />
          
          {/* Crop Overlay */}
          {isCropping && (
            <Animated.View 
              style={[
                styles.cropOverlay,
                {
                  transform: [
                    { translateX: cropPan.x },
                    { translateY: cropPan.y },
                    { scale: cropScale },
                  ],
                },
              ]}
            >
              <View style={styles.cropBorder} />
              <View style={styles.cropCorner} />
            </Animated.View>
          )}
        </View>
      </View>

      {/* Tools */}
      <View style={styles.toolsContainer}>
        {/* Main Tools */}
        <View style={styles.mainTools}>
          <TouchableOpacity 
            style={[styles.toolButton, isCropping && styles.toolButtonActive]} 
            onPress={toggleCrop}
          >
            <Crop size={20} color={isCropping ? "#FFFFFF" : "#333"} />
            <Text style={[styles.toolText, isCropping && styles.toolTextActive]}>Crop</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.toolButton} onPress={rotateImage}>
            <RotateCw size={20} color="#333" />
            <Text style={styles.toolText}>Rotate</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <View style={styles.filtersList}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.type}
                style={[
                  styles.filterButton,
                  currentFilter === filter.type && styles.filterButtonActive,
                ]}
                onPress={() => applyFilter(filter.type)}
              >
                <filter.icon 
                  size={16} 
                  color={currentFilter === filter.type ? "#FFFFFF" : "#666"} 
                />
                <Text 
                  style={[
                    styles.filterText,
                    currentFilter === filter.type && styles.filterTextActive,
                  ]}
                >
                  {filter.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Adjustments */}
        <View style={styles.adjustmentsContainer}>
          <Text style={styles.sectionTitle}>Adjustments</Text>
          
          <View style={styles.adjustmentRow}>
            <Sun size={16} color="#666" />
            <Text style={styles.adjustmentLabel}>Brightness</Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity 
                style={styles.adjustButton} 
                onPress={() => adjustBrightness(brightness - 0.1)}
              >
                <Text style={styles.adjustButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.adjustValue}>{brightness.toFixed(1)}</Text>
              <TouchableOpacity 
                style={styles.adjustButton} 
                onPress={() => adjustBrightness(brightness + 0.1)}
              >
                <Text style={styles.adjustButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.adjustmentRow}>
            <Contrast size={16} color="#666" />
            <Text style={styles.adjustmentLabel}>Contrast</Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity 
                style={styles.adjustButton} 
                onPress={() => adjustContrast(contrast - 0.1)}
              >
                <Text style={styles.adjustButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.adjustValue}>{contrast.toFixed(1)}</Text>
              <TouchableOpacity 
                style={styles.adjustButton} 
                onPress={() => adjustContrast(contrast + 0.1)}
              >
                <Text style={styles.adjustButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Processing Overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContainer}>
            <Text style={styles.processingText}>Processing image...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  saveButton: {
    backgroundColor: '#0066CC',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  editArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#0066CC',
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
  },
  cropBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderWidth: 2,
    borderColor: '#0066CC',
    borderStyle: 'dashed',
  },
  cropCorner: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 16,
    height: 16,
    backgroundColor: '#0066CC',
    borderRadius: 8,
  },
  toolsContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  mainTools: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  toolButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    minWidth: 80,
  },
  toolButtonActive: {
    backgroundColor: '#0066CC',
  },
  toolText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    marginTop: 4,
  },
  toolTextActive: {
    color: '#FFFFFF',
  },
  filtersContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filtersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  filterButtonActive: {
    backgroundColor: '#0066CC',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  adjustmentsContainer: {
    gap: 12,
  },
  adjustmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adjustmentLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  adjustValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    minWidth: 32,
    textAlign: 'center',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
});