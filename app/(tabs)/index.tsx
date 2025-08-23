import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { useDocuments } from "@/contexts/DocumentContext";
import TextFormatter from "@/components/TextFormatter";
import ScannerHeader from "@/components/scanner/ScannerHeader";
import EmptyState from "@/components/scanner/EmptyState";
import ImageScanView from "@/components/scanner/ImageScanView";
import ResultsView from "@/components/scanner/ResultsView";



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
        setIsDocumentSaved(false);
        
        // Automatically start text extraction after image selection
        setTimeout(() => {
          extractTextFromImage(result.assets[0].uri);
        }, 100); // Small delay to ensure state is updated
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const extractTextFromImage = async (imageUri: string) => {
    if (!imageUri) return;
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
      const response = await fetch(imageUri);
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
            image_url: imageUri,
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

  const extractText = async () => {
    if (!selectedImage) return;
    await extractTextFromImage(selectedImage);
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
      <ScannerHeader />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!selectedImage ? (
          <EmptyState
            onTakePhoto={() => pickImage(true)}
            onChooseFromGallery={() => pickImage(false)}
            sparkleAnim={sparkleAnim}
          />
        ) : (
          <View style={styles.scanContainer}>
            <ImageScanView
              selectedImage={selectedImage}
              isLoading={isLoading}
              onClearScan={clearScan}
              onExtractText={extractText}
              pulseAnim={pulseAnim}
            />

            {extractedText ? (
              <ResultsView
                extractedText={extractedText}
                currentDocumentId={currentDocumentId}
                onOpenFormatter={openFormatter}
                onCopyToClipboard={copyToClipboard}
                onClearScan={clearScan}
                sparkleAnim={sparkleAnim}
                slideAnim={slideAnim}
              />
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
  content: {
    flex: 1,
    padding: 20,
  },
  scanContainer: {
    gap: 20,
  },
});