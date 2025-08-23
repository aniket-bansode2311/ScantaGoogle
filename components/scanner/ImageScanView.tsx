import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Trash2, Zap, Edit3 } from 'lucide-react-native';

interface ImageScanViewProps {
  selectedImage: string;
  isLoading: boolean;
  onClearScan: () => void;
  onExtractText: () => void;
  onEditImage?: () => void;
  pulseAnim: Animated.Value;
}

export default function ImageScanView({
  selectedImage,
  isLoading,
  onClearScan,
  onExtractText,
  onEditImage,
  pulseAnim,
}: ImageScanViewProps) {
  return (
    <View style={styles.scanContainer}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
        <View style={styles.imageOverlay}>
          <View style={styles.imageActions}>
            {onEditImage && (
              <TouchableOpacity style={styles.editButton} onPress={onEditImage}>
                <Edit3 size={18} color="#0066CC" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.clearButton} onPress={onClearScan}>
              <Trash2 size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.extractButton, isLoading && styles.extractButtonDisabled]}
          onPress={onExtractText}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.loadingText}>Processing image...</Text>
            </View>
          ) : (
            <View style={styles.extractButtonContent}>
              <Zap size={20} color="#FFFFFF" />
              <Text style={styles.extractButtonText}>Extract Text with AI</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scanContainer: {
    gap: 20,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  selectedImage: {
    width: "100%",
    height: 320,
    resizeMode: "cover",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  imageActions: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  extractButton: {
    backgroundColor: "#0066CC",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0066CC",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  extractButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0.1,
  },
  extractButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  extractButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 12,
  },
});