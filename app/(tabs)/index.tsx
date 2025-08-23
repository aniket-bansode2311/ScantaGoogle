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
import PageThumbnails from "@/components/scanner/PageThumbnails";
import MultiPageView from "@/components/scanner/MultiPageView";
import MultiPageResultsView from "@/components/scanner/MultiPageResultsView";
import ImageEditView from "@/components/scanner/ImageEditView";
import SignatureManager from "@/components/signature/SignatureManager";
import { DocumentPage, SignatureInstance } from "@/types/scan";



export default function ScannerScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFormatter, setShowFormatter] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [isDocumentSaved, setIsDocumentSaved] = useState(false);
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isMultiPageMode, setIsMultiPageMode] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [showSignatureManager, setShowSignatureManager] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'create' | 'library' | 'overlay'>('library');
  const [documentSignatures, setDocumentSignatures] = useState<SignatureInstance[]>([]);
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
            quality: 0.6,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.6,
          });

      if (!result.canceled && result.assets[0]) {
        // Show image editor first
        setImageToEdit(result.assets[0].uri);
        setShowImageEditor(true);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const addPageToDocument = (imageUri: string) => {
    const newPage: DocumentPage = {
      id: Date.now().toString(),
      imageUri,
      order: pages.length,
    };
    
    const updatedPages = [...pages, newPage];
    setPages(updatedPages);
    setSelectedPageId(newPage.id);
    
    if (!isMultiPageMode) {
      setIsMultiPageMode(true);
    }
  };

  const deletePageFromDocument = (pageId: string) => {
    const updatedPages = pages.filter(page => page.id !== pageId);
    setPages(updatedPages);
    
    if (updatedPages.length === 0) {
      setIsMultiPageMode(false);
      setSelectedPageId(null);
    } else if (selectedPageId === pageId) {
      setSelectedPageId(updatedPages[0].id);
    }
  };

  const reorderPages = (newPages: DocumentPage[]) => {
    setPages(newPages);
  };

  const selectPage = (pageId: string) => {
    setSelectedPageId(pageId);
  };

  const convertToMultiPage = () => {
    if (selectedImage) {
      const firstPage: DocumentPage = {
        id: Date.now().toString(),
        imageUri: selectedImage,
        extractedText: extractedText || undefined,
        order: 0,
      };
      
      setPages([firstPage]);
      setSelectedPageId(firstPage.id);
      setIsMultiPageMode(true);
      setSelectedImage(null);
      setExtractedText("");
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

  const extractAllPagesText = async () => {
    if (pages.length === 0) return;
    
    setIsLoading(true);
    
    try {
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (!page.extractedText) {
          console.log(`Processing page ${i + 1} of ${pages.length}`);
          
          const response = await fetch(page.imageUri);
          const blob = await response.blob();
          
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
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
          });
          
          if (!aiResponse.ok) {
            throw new Error(`AI API error: ${aiResponse.status}`);
          }
          
          const data = await aiResponse.json();
          const text = data.completion || "No text detected";
          
          // Update the page with extracted text
          setPages(prevPages => 
            prevPages.map(p => 
              p.id === page.id ? { ...p, extractedText: text } : p
            )
          );
        }
      }
      
      // Success animation
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
    } catch (error: any) {
      console.error("Error extracting text from pages:", error);
      Alert.alert("Error", "Failed to extract text from some pages. Please try again.");
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
    if (isMultiPageMode) {
      const combinedText = pages
        .filter(page => page.extractedText)
        .map((page, index) => `--- Page ${index + 1} ---\n${page.extractedText}`)
        .join('\n\n');
      
      if (combinedText) {
        await Clipboard.setStringAsync(combinedText);
        Alert.alert("Copied", "Combined text from all pages copied to clipboard!");
      }
    } else if (extractedText) {
      await Clipboard.setStringAsync(extractedText);
      Alert.alert("Copied", "Text copied to clipboard!");
    }
  };

  const handleImageEdited = (editedImageUri: string) => {
    setShowImageEditor(false);
    setImageToEdit(null);
    
    if (pages.length === 0) {
      // First image - single page mode
      setSelectedImage(editedImageUri);
      setExtractedText("");
      setCurrentDocumentId(null);
      setIsDocumentSaved(false);
      
      // Automatically start text extraction after image editing
      setTimeout(() => {
        extractTextFromImage(editedImageUri);
      }, 100);
    } else {
      // Adding to existing multi-page document
      addPageToDocument(editedImageUri);
    }
  };

  const handleImageEditCanceled = () => {
    setShowImageEditor(false);
    setImageToEdit(null);
  };

  const editCurrentImage = () => {
    if (selectedImage) {
      setImageToEdit(selectedImage);
      setShowImageEditor(true);
    }
  };

  const handleExistingImageEdited = (editedImageUri: string) => {
    setShowImageEditor(false);
    setImageToEdit(null);
    setSelectedImage(editedImageUri);
    
    // Re-extract text from the edited image
    setExtractedText("");
    setCurrentDocumentId(null);
    setIsDocumentSaved(false);
    
    setTimeout(() => {
      extractTextFromImage(editedImageUri);
    }, 100);
  };

  const clearScan = () => {
    setSelectedImage(null);
    setExtractedText("");
    setShowFormatter(false);
    setCurrentDocumentId(null);
    setIsDocumentSaved(false);
    setPages([]);
    setSelectedPageId(null);
    setIsMultiPageMode(false);
    setShowImageEditor(false);
    setImageToEdit(null);
    setShowSignatureManager(false);
    setDocumentSignatures([]);
    
    // Reset animations
    sparkleAnim.setValue(0);
    slideAnim.setValue(0);
    pulseAnim.setValue(1);
  };

  const openFormatter = () => {
    if (isMultiPageMode) {
      const combinedText = pages
        .filter(page => page.extractedText)
        .map((page, index) => `--- Page ${index + 1} ---\n${page.extractedText}`)
        .join('\n\n');
      
      if (combinedText) {
        setExtractedText(combinedText);
        setShowFormatter(true);
      }
    } else if (extractedText) {
      setShowFormatter(true);
    }
  };

  const closeFormatter = () => {
    setShowFormatter(false);
  };

  const handleAddSignature = () => {
    setSignatureMode('library');
    setShowSignatureManager(true);
  };

  const handleSignatureSave = (svgPath: string, width: number, height: number) => {
    console.log('Signature saved:', { svgPath, width, height });
    setShowSignatureManager(false);
    // Here you could add the signature to the document or show a success message
  };

  const handleSignatureCancel = () => {
    setShowSignatureManager(false);
  };

  const handleSignaturesSave = (signatures: SignatureInstance[]) => {
    setDocumentSignatures(signatures);
    setShowSignatureManager(false);
    console.log('Document signatures updated:', signatures);
  };

  // Show signature manager
  if (showSignatureManager) {
    return (
      <SignatureManager
        mode={signatureMode}
        imageUri={selectedImage || undefined}
        existingSignatures={documentSignatures}
        onSave={handleSignatureSave}
        onSaveSignatures={handleSignaturesSave}
        onCancel={handleSignatureCancel}
      />
    );
  }

  // Show image editor
  if (showImageEditor && imageToEdit) {
    const isEditingExisting = selectedImage === imageToEdit;
    return (
      <ImageEditView
        imageUri={imageToEdit}
        onSave={isEditingExisting ? handleExistingImageEdited : handleImageEdited}
        onCancel={handleImageEditCanceled}
      />
    );
  }

  if (showFormatter && extractedText) {
    return (
      <TextFormatter
        initialText={extractedText}
        onBack={closeFormatter}
        documentId={currentDocumentId || undefined}
      />
    );
  }

  // Multi-page mode rendering
  if (isMultiPageMode) {
    const allPagesProcessed = pages.every(page => page.extractedText);
    const hasExtractedText = pages.some(page => page.extractedText);
    
    return (
      <SafeAreaView style={styles.container}>
        <ScannerHeader />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <PageThumbnails
            pages={pages}
            onAddPage={pickImage}
            onDeletePage={deletePageFromDocument}
            onReorderPages={reorderPages}
            selectedPageId={selectedPageId || undefined}
            onSelectPage={selectPage}
          />
          
          <MultiPageView
            pages={pages}
            selectedPageId={selectedPageId || undefined}
            isProcessing={isLoading}
            onExtractAllText={extractAllPagesText}
            onBack={() => setIsMultiPageMode(false)}
            pulseAnim={pulseAnim}
          />
          
          {allPagesProcessed && hasExtractedText && (
            <MultiPageResultsView
              pages={pages}
              onOpenFormatter={openFormatter}
              onCopyToClipboard={copyToClipboard}
              onClearScan={clearScan}
              sparkleAnim={sparkleAnim}
              slideAnim={slideAnim}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Single page mode rendering
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
              onEditImage={editCurrentImage}
              pulseAnim={pulseAnim}
            />

            {extractedText ? (
              <ResultsView
                extractedText={extractedText}
                currentDocumentId={currentDocumentId}
                onOpenFormatter={openFormatter}
                onCopyToClipboard={copyToClipboard}
                onClearScan={clearScan}
                onConvertToMultiPage={convertToMultiPage}
                onAddSignature={handleAddSignature}
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