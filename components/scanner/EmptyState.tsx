import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Camera, Image as ImageIcon, Sparkles, Scan } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface EmptyStateProps {
  onTakePhoto: () => void;
  onChooseFromGallery: () => void;
  onShowModeSelector?: () => void;
  sparkleAnim: Animated.Value;
}

export default function EmptyState({ onTakePhoto, onChooseFromGallery, onShowModeSelector, sparkleAnim }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <View style={styles.emptyIcon}>
          <Camera size={48} color="#0066CC" />
        </View>
        <Animated.View 
          style={[
            styles.sparkleIcon,
            {
              transform: [{
                rotate: sparkleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                })
              }]
            }
          ]}
        >
          <Sparkles size={20} color="#FFD700" />
        </Animated.View>
      </View>
      <Text style={styles.emptyTitle}>Ready to Scan</Text>
      <Text style={styles.emptyDescription}>
        Capture or select a document to extract text with AI precision
      </Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.mainActionButton, styles.primaryButton]}
          onPress={onTakePhoto}
        >
          <View style={styles.buttonIconContainer}>
            <Camera size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.primaryButtonText}>Take Photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.mainActionButton, styles.secondaryButton]}
          onPress={onChooseFromGallery}
        >
          <View style={styles.buttonIconContainer}>
            <ImageIcon size={22} color="#0066CC" />
          </View>
          <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
        </TouchableOpacity>
        
        {onShowModeSelector && (
          <TouchableOpacity
            style={[styles.mainActionButton, styles.specialButton]}
            onPress={onShowModeSelector}
          >
            <View style={styles.buttonIconContainer}>
              <Scan size={22} color="#f59e0b" />
            </View>
            <Text style={styles.specialButtonText}>Specialized Scanning</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <View style={styles.featureDot} />
          <Text style={styles.featureText}>Instant text recognition</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureDot} />
          <Text style={styles.featureText}>Cloud storage & sync</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureDot} />
          <Text style={styles.featureText}>Rich text formatting</Text>
        </View>
        <View style={styles.featureItem}>
          <View style={styles.featureDot} />
          <Text style={styles.featureText}>Export to PDF, PNG, JPG</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    position: "relative",
    marginBottom: 32,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0066CC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  sparkleIcon: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
    maxWidth: width * 0.8,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  mainActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButton: {
    backgroundColor: "#0066CC",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E8E8E8",
  },
  buttonIconContainer: {
    marginRight: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  specialButton: {
    backgroundColor: "#fef3c7",
    borderWidth: 2,
    borderColor: "#f59e0b",
  },
  specialButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400e",
  },
  featuresList: {
    marginTop: 40,
    alignSelf: "stretch",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0066CC",
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
});