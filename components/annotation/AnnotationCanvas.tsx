import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Dimensions,
  TextInput,
  Modal,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { Annotation, HighlightAnnotation, DrawingAnnotation, TextBoxAnnotation } from '@/types/scan';

interface AnnotationCanvasProps {
  imageUri: string;
  annotations: Annotation[];
  selectedTool: 'highlight' | 'drawing' | 'textbox' | 'eraser' | null;
  selectedColor: string;
  strokeWidth: number;
  onAnnotationAdd: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
  canvasWidth: number;
  canvasHeight: number;
}

interface DrawingPath {
  path: string;
  color: string;
  width: number;
}

export default function AnnotationCanvas({
  annotations,
  selectedTool,
  selectedColor,
  strokeWidth,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  canvasWidth,
  canvasHeight,
}: AnnotationCanvasProps) {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [textModalPosition, setTextModalPosition] = useState({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = useState('');
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);

  const pathRef = useRef<string>('');
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => selectedTool !== null,
    onMoveShouldSetPanResponder: () => selectedTool !== null,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      
      if (selectedTool === 'eraser') {
        handleEraser(locationX, locationY);
        return;
      }

      if (selectedTool === 'textbox') {
        setTextModalPosition({ x: locationX, y: locationY });
        setShowTextModal(true);
        return;
      }

      if (selectedTool === 'highlight') {
        startPointRef.current = { x: locationX, y: locationY };
        return;
      }

      if (selectedTool === 'drawing') {
        setIsDrawing(true);
        pathRef.current = `M${locationX},${locationY}`;
        setCurrentPath(pathRef.current);
      }
    },

    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;

      if (selectedTool === 'drawing' && isDrawing) {
        pathRef.current += ` L${locationX},${locationY}`;
        setCurrentPath(pathRef.current);
      }

      if (selectedTool === 'highlight' && startPointRef.current) {
        // Show preview of highlight rectangle
        const startX = Math.min(startPointRef.current.x, locationX);
        const startY = Math.min(startPointRef.current.y, locationY);
        const width = Math.abs(locationX - startPointRef.current.x);
        const height = Math.abs(locationY - startPointRef.current.y);
        
        // Update current highlight preview
        setCurrentPath(`M${startX},${startY} L${startX + width},${startY} L${startX + width},${startY + height} L${startX},${startY + height} Z`);
      }
    },

    onPanResponderRelease: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;

      if (selectedTool === 'drawing' && isDrawing) {
        setIsDrawing(false);
        
        if (pathRef.current.length > 10) { // Only save if path is substantial
          const drawingAnnotation: Omit<DrawingAnnotation, 'id' | 'createdAt'> = {
            type: 'drawing',
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight,
            paths: [pathRef.current],
            strokeColor: selectedColor,
            strokeWidth: strokeWidth,
          };
          
          onAnnotationAdd(drawingAnnotation);
        }
        
        setCurrentPath('');
        pathRef.current = '';
      }

      if (selectedTool === 'highlight' && startPointRef.current) {
        const startX = Math.min(startPointRef.current.x, locationX);
        const startY = Math.min(startPointRef.current.y, locationY);
        const width = Math.abs(locationX - startPointRef.current.x);
        const height = Math.abs(locationY - startPointRef.current.y);
        
        if (width > 10 && height > 10) { // Only create if highlight is substantial
          const highlightAnnotation: Omit<HighlightAnnotation, 'id' | 'createdAt'> = {
            type: 'highlight',
            x: startX,
            y: startY,
            width: width,
            height: height,
            color: selectedColor,
            opacity: 0.3,
          };
          
          onAnnotationAdd(highlightAnnotation);
        }
        
        setCurrentPath('');
        startPointRef.current = null;
      }
    },
  });

  const handleEraser = useCallback((x: number, y: number) => {
    // Find annotation at this position and delete it
    const annotationToDelete = annotations.find(annotation => {
      if (annotation.type === 'highlight' || annotation.type === 'textbox') {
        return (
          x >= annotation.x &&
          x <= annotation.x + annotation.width &&
          y >= annotation.y &&
          y <= annotation.y + annotation.height
        );
      }
      return false; // For drawing annotations, we'd need more complex hit detection
    });

    if (annotationToDelete) {
      Alert.alert(
        'Delete Annotation',
        'Are you sure you want to delete this annotation?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onAnnotationDelete(annotationToDelete.id) },
        ]
      );
    }
  }, [annotations, onAnnotationDelete]);

  const handleTextSubmit = useCallback(() => {
    if (textInputValue.trim()) {
      const textAnnotation: Omit<TextBoxAnnotation, 'id' | 'createdAt'> = {
        type: 'textbox',
        x: textModalPosition.x,
        y: textModalPosition.y,
        width: 200,
        height: 40,
        text: textInputValue.trim(),
        fontSize: 16,
        fontColor: selectedColor,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
      };
      
      onAnnotationAdd(textAnnotation);
    }
    
    setShowTextModal(false);
    setTextInputValue('');
  }, [textInputValue, textModalPosition, selectedColor, onAnnotationAdd]);

  const renderAnnotation = useCallback((annotation: Annotation) => {
    switch (annotation.type) {
      case 'highlight':
        return (
          <Rect
            key={annotation.id}
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            fill={annotation.color}
            opacity={annotation.opacity}
            onPress={() => setSelectedAnnotation(annotation.id)}
          />
        );
      
      case 'drawing':
        return annotation.paths.map((path, index) => (
          <Path
            key={`${annotation.id}-${index}`}
            d={path}
            stroke={annotation.strokeColor}
            strokeWidth={annotation.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ));
      
      case 'textbox':
        return (
          <React.Fragment key={annotation.id}>
            {annotation.backgroundColor && (
              <Rect
                x={annotation.x}
                y={annotation.y}
                width={annotation.width}
                height={annotation.height}
                fill={annotation.backgroundColor}
                rx={4}
              />
            )}
            <SvgText
              x={annotation.x + 8}
              y={annotation.y + annotation.fontSize + 8}
              fontSize={annotation.fontSize}
              fill={annotation.fontColor}
              onPress={() => setSelectedAnnotation(annotation.id)}
            >
              {annotation.text}
            </SvgText>
          </React.Fragment>
        );
      
      default:
        return null;
    }
  }, []);

  return (
    <View style={styles.container}>
      <View
        style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}
        {...panResponder.panHandlers}
      >
        <Svg width={canvasWidth} height={canvasHeight} style={styles.svg}>
          {/* Render existing annotations */}
          {annotations.map(renderAnnotation)}
          
          {/* Render current drawing path */}
          {currentPath && selectedTool === 'drawing' && (
            <Path
              d={currentPath}
              stroke={selectedColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          
          {/* Render current highlight preview */}
          {currentPath && selectedTool === 'highlight' && (
            <Path
              d={currentPath}
              fill={selectedColor}
              opacity={0.3}
            />
          )}
        </Svg>
      </View>

      {/* Text Input Modal */}
      <Modal
        visible={showTextModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTextModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.textModal}>
            <Text style={styles.modalTitle}>Add Text</Text>
            <TextInput
              style={styles.textInput}
              value={textInputValue}
              onChangeText={setTextInputValue}
              placeholder="Enter text..."
              multiline
              autoFocus
              testID="text-annotation-input"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowTextModal(false)}
                testID="text-annotation-cancel"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleTextSubmit}
                testID="text-annotation-submit"
              >
                <Text style={styles.submitButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    backgroundColor: 'transparent',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});