import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Highlighter, Pen, Type, Eraser, Palette } from 'lucide-react-native';

interface AnnotationToolbarProps {
  selectedTool: 'highlight' | 'drawing' | 'textbox' | 'eraser' | null;
  onToolSelect: (tool: 'highlight' | 'drawing' | 'textbox' | 'eraser' | null) => void;
  selectedColor: string;
  onColorSelect: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  onClearAll: () => void;
}

const COLORS = [
  '#FFFF00', // Yellow
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Light Yellow
  '#DDA0DD', // Plum
  '#FFA07A', // Light Salmon
  '#000000', // Black
  '#FFFFFF', // White
];

const STROKE_WIDTHS = [1, 2, 4, 6, 8];

export default function AnnotationToolbar({
  selectedTool,
  onToolSelect,
  selectedColor,
  onColorSelect,
  strokeWidth,
  onStrokeWidthChange,
  onClearAll,
}: AnnotationToolbarProps) {
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [showStrokePicker, setShowStrokePicker] = React.useState(false);

  const tools = [
    { id: 'highlight' as const, icon: Highlighter, label: 'Highlight' },
    { id: 'drawing' as const, icon: Pen, label: 'Draw' },
    { id: 'textbox' as const, icon: Type, label: 'Text' },
    { id: 'eraser' as const, icon: Eraser, label: 'Eraser' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        {/* Tool Selection */}
        <View style={styles.toolSection}>
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isSelected = selectedTool === tool.id;
            
            return (
              <TouchableOpacity
                key={tool.id}
                style={[styles.toolButton, isSelected && styles.selectedTool]}
                onPress={() => onToolSelect(isSelected ? null : tool.id)}
                testID={`annotation-tool-${tool.id}`}
              >
                <Icon 
                  size={20} 
                  color={isSelected ? '#FFFFFF' : '#666666'} 
                />
                <Text style={[styles.toolLabel, isSelected && styles.selectedToolLabel]}>
                  {tool.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Color Picker */}
        <TouchableOpacity
          style={styles.colorButton}
          onPress={() => setShowColorPicker(!showColorPicker)}
          testID="color-picker-toggle"
        >
          <View style={[styles.colorPreview, { backgroundColor: selectedColor }]} />
          <Palette size={16} color="#666666" />
        </TouchableOpacity>

        {/* Stroke Width Picker */}
        {(selectedTool === 'drawing' || selectedTool === 'highlight') && (
          <TouchableOpacity
            style={styles.strokeButton}
            onPress={() => setShowStrokePicker(!showStrokePicker)}
            testID="stroke-width-toggle"
          >
            <View style={[styles.strokePreview, { height: strokeWidth }]} />
            <Text style={styles.strokeLabel}>{strokeWidth}px</Text>
          </TouchableOpacity>
        )}

        {/* Clear All Button */}
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onClearAll}
          testID="clear-annotations"
        >
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Color Picker Dropdown */}
      {showColorPicker && (
        <View style={styles.colorPicker}>
          <View style={styles.colorGrid}>
            {COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColor,
                  color === '#FFFFFF' && styles.whiteColorBorder,
                ]}
                onPress={() => {
                  onColorSelect(color);
                  setShowColorPicker(false);
                }}
                testID={`color-option-${color}`}
              />
            ))}
          </View>
        </View>
      )}

      {/* Stroke Width Picker Dropdown */}
      {showStrokePicker && (
        <View style={styles.strokePicker}>
          {STROKE_WIDTHS.map((width) => (
            <TouchableOpacity
              key={width}
              style={[
                styles.strokeOption,
                strokeWidth === width && styles.selectedStroke,
              ]}
              onPress={() => {
                onStrokeWidthChange(width);
                setShowStrokePicker(false);
              }}
              testID={`stroke-width-${width}`}
            >
              <View style={[styles.strokeLine, { height: width }]} />
              <Text style={styles.strokeOptionText}>{width}px</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  toolSection: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  toolButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    minWidth: 60,
  },
  selectedTool: {
    backgroundColor: '#3B82F6',
  },
  toolLabel: {
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
    fontWeight: '500',
  },
  selectedToolLabel: {
    color: '#FFFFFF',
  },
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    gap: 6,
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  strokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    gap: 6,
  },
  strokePreview: {
    width: 20,
    backgroundColor: '#666666',
    borderRadius: 2,
  },
  strokeLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  colorPicker: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#3B82F6',
  },
  whiteColorBorder: {
    borderColor: '#E5E5E5',
  },
  strokePicker: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  strokeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 12,
  },
  selectedStroke: {
    backgroundColor: '#F0F8FF',
  },
  strokeLine: {
    width: 40,
    backgroundColor: '#666666',
    borderRadius: 2,
  },
  strokeOptionText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
});