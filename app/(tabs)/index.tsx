import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { Camera, Image as ImageIcon, Copy, Trash2, Edit3, Sparkles, FileText, Zap, ArrowLeft } from "lucide-react-native";
import { useDocuments } from "@/contexts/DocumentContext";
import TextFormatter from "@/components/TextFormatter";

const { width } = Dimensions.get('window');

export default function ScannerScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFormatter, setShowFormatter] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [isDocumentSaved, setIsDocumentSaved] = useState(false);
  const { addDocument } = useDocuments();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const pickImage = async (useCamera: boolean) => {
    try {
      const { status } = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          `We need ${useCamera ? "camera" : "photo library"} permissions to scan documents.`
        );
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.6, // Reduced for faster processing
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.6, // Reduced for faster processing
          });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setExtractedText("");
        setCurrentDocumentId(null);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const extractText = async () => {
    if (!selectedImage) return;
    if (isLoading) return; // Prevent multiple simultaneous requests
    if (isDocumentSaved && extractedText) return; // Don't save again if already saved

    setIsLoading(true);
    
    // Start loading animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 600, // Faster animation
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600, // Faster animation
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    try {
      console.log('Starting text extraction...');
      
      // Optimize image processing
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      
      // Use Promise-based approach for faster processing
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      console.log('Image converted to base64, sending to AI...');
      
      // Add timeout and optimized prompt for faster processing
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const aiResponse = await fetch("https://toolkit.rork.com/text/llm/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract text from this image quickly. Return only the text content, no formatting or commentary.",
                },
                {
                  type: "image",
                  image: base64Data,
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!aiResponse.ok) {
        throw new Error(`AI API error: ${aiResponse.status}`);
      }
      
      const data = await aiResponse.json();
      const text = data.completion || "No text detected";
      
      console.log('Text extraction completed:', text.length, 'characters');
      
      setExtractedText(text);
      
      if (text !== "No text detected") {
        // Success animation
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 400, // Faster animation
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 1,
            duration: 300, // Faster animation
            useNativeDriver: true,
          }),
        ]).start();
        
        // Generate a title from the first line or words of extracted text
        const title = generateDocumentTitle(text);
        
        // Save to Supabase only if not already saved (run in background)
        if (!isDocumentSaved) {
          // Don't await this to make UI faster
          addDocument({
            title,
            content: text,
            image_url: selectedImage,
          }).then(({ data: document, error }) => {
            if (error) {
              console.error("Error saving document:", error);
              Alert.alert("Warning", "Text extracted but failed to save to cloud. You can still copy and format the text.");
            } else if (document) {
              setCurrentDocumentId(document.id);
              setIsDocumentSaved(true);
            }
          }).catch(error => {
            console.error("Error saving document:", error);
          });
        }
      }
    } catch (error: any) {
      console.error("Error extracting text:", error);
      if (error.name === 'AbortError') {
        Alert.alert("Timeout", "Text extraction is taking too long. Please try with a smaller or clearer image.");
      } else {
        Alert.alert("Error", "Failed to extract text. Please check your internet connection and try again.");
      }
    } finally {
      setIsLoading(false);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  };

  const generateDocumentTitle = (text: string): string => {
    // Take the first meaningful line or first 50 characters
    const lines = text.trim().split('\n');
    const firstLine = lines[0]?.trim();
    
    if (firstLine && firstLine.length > 3) {
      return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
    }
    
    // Fallback to timestamp-based title
    const now = new Date();
    return `Document ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const copyToClipboard = async () => {
    if (extractedText) {
      await Clipboard.setStringAsync(extractedText);
      Alert.alert("Copied", "Text copied to clipboard!");
    }
  };

  const clearScan = () => {
    setSelectedImage(null);
    setExtractedText("");
    setShowFormatter(false);
    setCurrentDocumentId(null);
    setIsDocumentSaved(false);
    
    // Reset animations
    sparkleAnim.setValue(0);
    slideAnim.setValue(0);
    pulseAnim.setValue(1);
  };

  const openFormatter = () => {
    if (extractedText) {
      setShowFormatter(true);
    }
  };

  const closeFormatter = () => {
    setShowFormatter(false);
  };

  if (showFormatter && extractedText) {
    return (
      <TextFormatter
        initialText={extractedText}
        onBack={closeFormatter}
        documentId={currentDocumentId || undefined}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <FileText size={28} color="#0066CC" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Document Scanner</Text>
            <Text style={styles.headerSubtitle}>AI-powered text extraction</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!selectedImage ? (
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
                onPress={() => pickImage(true)}
              >
                <View style={styles.buttonIconContainer}>
                  <Camera size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.primaryButtonText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.mainActionButton, styles.secondaryButton]}
                onPress={() => pickImage(false)}
              >
                <View style={styles.buttonIconContainer}>
                  <ImageIcon size={22} color="#0066CC" />
                </View>
                <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
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
        ) : (
          <View style={styles.scanContainer}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              <View style={styles.imageOverlay}>
                <TouchableOpacity style={styles.clearButton} onPress={clearScan}>
                  <Trash2 size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[styles.extractButton, isLoading && styles.extractButtonDisabled]}
                onPress={extractText}
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

            {extractedText ? (
              <Animated.View 
                style={[
                  styles.resultContainer,
                  {
                    opacity: sparkleAnim,
                    transform: [{
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      })
                    }]
                  }
                ]}
              >
                <View style={styles.resultHeader}>
                  <View style={styles.resultTitleContainer}>
                    <View style={styles.successIcon}>
                      <Sparkles size={16} color="#34C759" />
                    </View>
                    <Text style={styles.resultTitle}>Text Extracted</Text>
                    {currentDocumentId && (
                      <View style={styles.savedBadge}>
                        <Text style={styles.savedText}>Saved</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                {/* Action Buttons - Full Width */}
                <View style={styles.fullWidthActionButtons}>
                  <TouchableOpacity
                    style={[styles.fullWidthActionButton, styles.formatActionButton]}
                    onPress={openFormatter}
                  >
                    <Edit3 size={18} color="#0066CC" />
                    <Text style={styles.fullWidthActionButtonText}>Format Text</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.fullWidthActionButton, styles.copyActionButton]}
                    onPress={copyToClipboard}
                  >
                    <Copy size={18} color="#34C759" />
                    <Text style={[styles.fullWidthActionButtonText, { color: '#34C759' }]}>Copy to Clipboard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.fullWidthActionButton, styles.backActionButton]}
                    onPress={clearScan}
                  >
                    <ArrowLeft size={18} color="#FF3B30" />
                    <Text style={[styles.fullWidthActionButtonText, { color: '#FF3B30' }]}>Scan Another Document</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.extractedText}>{extractedText}</Text>
                </View>
              </Animated.View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  content: {
    flex: 1,
    padding: 20,
  },
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
  clearButton: {
    position: "absolute",
    top: 16,
    right: 16,
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
  resultContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: "#E8F5E8",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  resultTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  successIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E8F5E8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginRight: 8,
  },
  savedBadge: {
    backgroundColor: "#34C759",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  savedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  fullWidthActionButtons: {
    marginTop: 16,
    gap: 12,
  },
  fullWidthActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fullWidthActionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0066CC",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formatActionButton: {
    backgroundColor: "#E3F2FD",
  },
  copyActionButton: {
    backgroundColor: "#E8F5E8",
  },
  backActionButton: {
    backgroundColor: "#FFE8E8",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0066CC",
  },
  textContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  extractedText: {
    fontSize: 16,
    lineHeight: 26,
    color: "#1A1A1A",
    fontWeight: "400",
  },
});