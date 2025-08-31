import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import { useDocuments } from "@/contexts/DocumentContext";
import { useOCRSettings } from "@/contexts/OCRSettingsContext";
import { useOCRWorker } from "@/lib/ocrWorker";
import ScannerHeader from "@/components/scanner/ScannerHeader";
import EmptyState from "@/components/scanner/EmptyState";
import { DocumentPage, SignatureInstance, ScanMode, IDCardScan, QRCodeScan } from "@/types/scan";
import { OCRLanguage } from "@/contexts/OCRSettingsContext";
import { optimizeDocumentImage, OptimizedImageResult } from "@/lib/imageOptimizer";
import { 
  fullDocumentEnhancement, 
  quickDocumentEnhancement, 
  ProcessingResult,
  validateDocumentImage 
} from "@/lib/advancedImageProcessor";

// Lazy load heavy components to improve initial render time
const TextFormatter = lazy(() => import("@/components/TextFormatter"));
const ImageScanView = lazy(() => import("@/components/scanner/ImageScanView"));
const ResultsView = lazy(() => import("@/components/scanner/ResultsView"));
const PageThumbnails = lazy(() => import("@/components/scanner/PageThumbnails"));
const MultiPageView = lazy(() => import("@/components/scanner/MultiPageView"));
const MultiPageResultsView = lazy(() => import("@/components/scanner/MultiPageResultsView"));
const ImageEditView = lazy(() => import("@/components/scanner/ImageEditView"));
const SignatureManager = lazy(() => import("@/components/signature/SignatureManager"));
const OptimizationOverlay = lazy(() => import("@/components/scanner/OptimizationOverlay"));
const OCRProgressIndicator = lazy(() => import("@/components/scanner/OCRProgressIndicator"));
const AdvancedProcessingOverlay = lazy(() => import("@/components/scanner/AdvancedProcessingOverlay"));
const ScanModeSelector = lazy(() => import("@/components/scanner/ScanModeSelector"));
const IDCardScanner = lazy(() => import("@/components/scanner/IDCardScanner"));
const QRCodeScanner = lazy(() => import("@/components/scanner/QRCodeScanner"));

// Loading component for lazy-loaded components
const ComponentLoader = () => (
  <View style={styles.loaderContainer}>
    <ActivityIndicator size="small" color="#3b82f6" />
  </View>
);



export default function ScannerScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
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
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState<string>('');
  const [activeOCRTasks, setActiveOCRTasks] = useState<Set<string>>(new Set());
  const [isAdvancedProcessing, setIsAdvancedProcessing] = useState(false);
  const [advancedProcessingStep, setAdvancedProcessingStep] = useState<string>('');
  const [appliedEnhancements, setAppliedEnhancements] = useState<string[]>([]);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [currentScanMode, setCurrentScanMode] = useState<ScanMode | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const { addDocument } = useDocuments();
  const { selectedLanguage } = useOCRSettings();
  const { submitTask, getResult, clearResults, isProcessing, queueStatus } = useOCRWorker();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Handle OCR results - optimized with requestAnimationFrame for better performance
  useEffect(() => {
    let animationFrame: number;
    
    const checkForResults = () => {
      const tasksToCheck = Array.from(activeOCRTasks);
      
      tasksToCheck.forEach(taskId => {
        const result = getResult(taskId);
        if (result) {
          handleOCRResult(taskId, result.text, result.error);
          setActiveOCRTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
        }
      });
      
      // Continue checking if there are still active tasks
      if (activeOCRTasks.size > 0) {
        animationFrame = requestAnimationFrame(() => {
          setTimeout(checkForResults, 500);
        });
      }
    };

    if (activeOCRTasks.size > 0) {
      checkForResults();
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [activeOCRTasks, getResult]);

  const getLanguagePrompt = (languageCode: OCRLanguage): string => {
    const languageMap: Record<OCRLanguage, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'auto': 'Auto-detect',
    };
    return languageMap[languageCode] || 'English';
  };

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
        const imageUri = result.assets[0].uri;
        
        // Validate and process image with advanced enhancements
        setIsAdvancedProcessing(true);
        setAdvancedProcessingStep('Validating image...');
        setAppliedEnhancements([]);
        
        try {
          console.log('🔍 Validating document image...');
          const validation = await validateDocumentImage(imageUri);
          
          if (!validation.isValid) {
            console.warn('⚠️ Image validation issues:', validation.issues);
            // Still proceed but show warnings
          }
          
          console.log('🚀 Starting advanced document processing...');
          setAdvancedProcessingStep('Processing document...');
          
          // Apply full document enhancement
          const processingResult = await fullDocumentEnhancement(imageUri);
          setProcessingResult(processingResult);
          setAppliedEnhancements(processingResult.appliedEnhancements);
          setAdvancedProcessingStep('Complete');
          
          console.log(`✅ Advanced processing complete in ${processingResult.processingTimeMs}ms`);
          console.log(`📊 Applied enhancements: ${processingResult.appliedEnhancements.join(', ')}`);
          
          // Show image editor with processed image
          setTimeout(() => {
            setImageToEdit(processingResult.uri);
            setShowImageEditor(true);
            setIsAdvancedProcessing(false);
          }, 1500); // Show results for a moment
          
        } catch (error) {
          console.error('⚠️ Advanced processing failed, using original:', error);
          // Fallback to original image if processing fails
          setImageToEdit(imageUri);
          setShowImageEditor(true);
          setIsAdvancedProcessing(false);
        }
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

  const handleOCRResult = (taskId: string, text: string, error?: string) => {
    if (error) {
      console.error(`OCR failed for task ${taskId}:`, error);
      Alert.alert("Error", "Failed to extract text. Please check your internet connection and try again.");
      return;
    }

    console.log(`OCR completed for task ${taskId}:`, text.length, 'characters');
    
    // Check if this is for a single image or a page
    if (taskId.startsWith('single-')) {
      setExtractedText(text);
      
      if (text !== "No text detected") {
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
        
        // Generate a title and save document in background
        const title = generateDocumentTitle(text);
        
        if (!isDocumentSaved && selectedImage) {
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
    } else if (taskId.startsWith('page-')) {
      // Update specific page with extracted text
      const pageId = taskId.replace('page-', '');
      setPages(prevPages => {
        const updatedPages = prevPages.map(p => 
          p.id === pageId ? { ...p, extractedText: text } : p
        );
        
        // Check if all pages are now processed
        const allProcessed = updatedPages.every(page => page.extractedText);
        if (allProcessed) {
          // Stop pulse animation and start success animation
          pulseAnim.stopAnimation();
          pulseAnim.setValue(1);
          
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
        }
        
        return updatedPages;
      });
    }
  };

  const extractTextFromImage = async (imageUri: string) => {
    if (!imageUri) return;
    if (isDocumentSaved && extractedText) return;

    const taskId = `single-${Date.now()}`;
    
    // Start loading animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Add task to active set
    setActiveOCRTasks(prev => new Set(prev.add(taskId)));
    
    // Submit OCR task to background worker
    submitTask({
      id: taskId,
      imageUri,
      language: selectedLanguage,
      onProgress: (progress) => {
        setOcrProgress(progress);
      },
    });
    
    console.log(`🚀 Submitted OCR task ${taskId} for single image`);
  };

  const extractText = async () => {
    if (!selectedImage) return;
    await extractTextFromImage(selectedImage);
  };

  const extractAllPagesText = async () => {
    if (pages.length === 0) return;
    
    // Start loading animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    try {
      const tasksToSubmit: string[] = [];
      
      // Submit all pages for OCR processing in parallel
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (!page.extractedText) {
          console.log(`🔄 Submitting page ${i + 1} of ${pages.length} for OCR`);
          
          // Optimize each page image before OCR if not already optimized
          let imageUri = page.imageUri;
          try {
            console.log(`🖼️ Optimizing page ${i + 1} for OCR...`);
            const optimizedResult = await optimizeDocumentImage(page.imageUri);
            imageUri = optimizedResult.uri;
            console.log(`✅ Page ${i + 1} optimized: ${optimizedResult.originalSizeKB}KB → ${optimizedResult.optimizedSizeKB}KB`);
            
            // Update page with optimized image URI
            setPages(prevPages => 
              prevPages.map(p => 
                p.id === page.id ? { ...p, imageUri } : p
              )
            );
          } catch (optimizationError) {
            console.warn(`⚠️ Failed to optimize page ${i + 1}, using original:`, optimizationError);
          }
          
          const taskId = `page-${page.id}`;
          tasksToSubmit.push(taskId);
          
          // Submit OCR task to background worker
          submitTask({
            id: taskId,
            imageUri,
            language: selectedLanguage,
            onProgress: (progress) => {
              setOcrProgress(`Page ${i + 1}: ${progress}`);
            },
          });
        }
      }
      
      // Add all tasks to active set
      setActiveOCRTasks(prev => {
        const newSet = new Set(prev);
        tasksToSubmit.forEach(taskId => newSet.add(taskId));
        return newSet;
      });
      
      console.log(`🚀 Submitted ${tasksToSubmit.length} OCR tasks for multi-page processing`);
      
    } catch (error: any) {
      console.error("Error submitting pages for OCR:", error);
      Alert.alert("Error", "Failed to start text extraction. Please try again.");
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

  const handleImageEdited = async (editedImageUri: string) => {
    setShowImageEditor(false);
    setImageToEdit(null);
    
    // Apply quick enhancement after editing for final optimization
    setIsAdvancedProcessing(true);
    setAdvancedProcessingStep('Final optimization...');
    setAppliedEnhancements([]);
    
    try {
      console.log('🔧 Applying final enhancement after editing...');
      const finalProcessingResult = await quickDocumentEnhancement(editedImageUri);
      setProcessingResult(finalProcessingResult);
      setAppliedEnhancements(finalProcessingResult.appliedEnhancements);
      setAdvancedProcessingStep('Complete');
      
      console.log(`🎯 Final enhancement: ${finalProcessingResult.originalSizeKB}KB → ${finalProcessingResult.processedSizeKB}KB`);
      
      const finalImageUri = finalProcessingResult.uri;
      
      if (pages.length === 0) {
        // First image - single page mode
        setSelectedImage(finalImageUri);
        setExtractedText("");
        setCurrentDocumentId(null);
        setIsDocumentSaved(false);
        
        // Automatically start text extraction after image editing
        setTimeout(() => {
          extractTextFromImage(finalImageUri);
        }, 100);
      } else {
        // Adding to existing multi-page document
        addPageToDocument(finalImageUri);
      }
    } catch (error) {
      console.error('⚠️ Final enhancement failed, using edited image:', error);
      // Fallback to edited image if final enhancement fails
      if (pages.length === 0) {
        setSelectedImage(editedImageUri);
        setExtractedText("");
        setCurrentDocumentId(null);
        setIsDocumentSaved(false);
        
        setTimeout(() => {
          extractTextFromImage(editedImageUri);
        }, 100);
      } else {
        addPageToDocument(editedImageUri);
      }
    } finally {
      setTimeout(() => {
        setIsAdvancedProcessing(false);
      }, 1000);
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

  const handleExistingImageEdited = async (editedImageUri: string) => {
    setShowImageEditor(false);
    setImageToEdit(null);
    
    // Apply quick enhancement after editing existing image
    setIsAdvancedProcessing(true);
    setAdvancedProcessingStep('Enhancing edited image...');
    setAppliedEnhancements([]);
    
    try {
      console.log('🔄 Enhancing existing edited image...');
      const enhancementResult = await quickDocumentEnhancement(editedImageUri);
      setProcessingResult(enhancementResult);
      setAppliedEnhancements(enhancementResult.appliedEnhancements);
      setAdvancedProcessingStep('Complete');
      
      console.log(`✨ Existing image enhanced: ${enhancementResult.originalSizeKB}KB → ${enhancementResult.processedSizeKB}KB`);
      
      setSelectedImage(enhancementResult.uri);
      
      // Re-extract text from the optimized edited image
      setExtractedText("");
      setCurrentDocumentId(null);
      setIsDocumentSaved(false);
      
      setTimeout(() => {
        extractTextFromImage(enhancementResult.uri);
      }, 100);
    } catch (error) {
      console.error('⚠️ Enhancement of edited image failed:', error);
      // Fallback to edited image
      setSelectedImage(editedImageUri);
      
      setExtractedText("");
      setCurrentDocumentId(null);
      setIsDocumentSaved(false);
      
      setTimeout(() => {
        extractTextFromImage(editedImageUri);
      }, 100);
    } finally {
      setTimeout(() => {
        setIsAdvancedProcessing(false);
      }, 1000);
    }
  };

  const clearScan = () => {
    // Cancel any active OCR tasks
    activeOCRTasks.forEach(taskId => {
      console.log(`🚫 Cancelling OCR task ${taskId}`);
    });
    setActiveOCRTasks(new Set());
    clearResults();
    
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
    setOcrProgress('');
    setIsAdvancedProcessing(false);
    setAdvancedProcessingStep('');
    setAppliedEnhancements([]);
    setProcessingResult(null);
    
    // Reset animations
    sparkleAnim.setValue(0);
    slideAnim.setValue(0);
    pulseAnim.setValue(1);
    pulseAnim.stopAnimation();
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

  const handleModeSelect = (mode: ScanMode) => {
    setCurrentScanMode(mode);
    setShowModeSelector(false);
    console.log(`🎯 Selected scan mode: ${mode}`);
  };

  const handleModeCancel = () => {
    setShowModeSelector(false);
    setCurrentScanMode(null);
  };

  const handleIDCardComplete = (scan: IDCardScan) => {
    console.log('✅ ID Card scan completed:', scan);
    Alert.alert(
      'ID Card Scanned',
      `Successfully scanned ID card with ${Object.keys(scan.extractedData).length} data fields extracted.`,
      [
        { text: 'OK', onPress: () => setCurrentScanMode(null) }
      ]
    );
  };

  const handleQRCodeComplete = (scan: QRCodeScan) => {
    console.log('✅ QR Code scan completed:', scan);
    Alert.alert(
      'QR Code Scanned',
      `Successfully scanned ${scan.type} QR code: ${scan.data.substring(0, 50)}${scan.data.length > 50 ? '...' : ''}`,
      [
        { text: 'OK', onPress: () => setCurrentScanMode(null) }
      ]
    );
  };

  const handleSpecializedScanCancel = () => {
    setCurrentScanMode(null);
  };

  const showScanModeSelector = () => {
    setShowModeSelector(true);
  };

  // Show mode selector
  if (showModeSelector) {
    return (
      <Suspense fallback={<ComponentLoader />}>
        <ScanModeSelector
          onSelectMode={handleModeSelect}
          onCancel={handleModeCancel}
        />
      </Suspense>
    );
  }

  // Show specialized scanners
  if (currentScanMode === 'id-card') {
    return (
      <Suspense fallback={<ComponentLoader />}>
        <IDCardScanner
          onComplete={handleIDCardComplete}
          onCancel={handleSpecializedScanCancel}
        />
      </Suspense>
    );
  }

  if (currentScanMode === 'qr-code') {
    return (
      <Suspense fallback={<ComponentLoader />}>
        <QRCodeScanner
          onComplete={handleQRCodeComplete}
          onCancel={handleSpecializedScanCancel}
        />
      </Suspense>
    );
  }

  // Show signature manager
  if (showSignatureManager) {
    return (
      <Suspense fallback={<ComponentLoader />}>
        <SignatureManager
          mode={signatureMode}
          imageUri={selectedImage || undefined}
          existingSignatures={documentSignatures}
          onSave={handleSignatureSave}
          onSaveSignatures={handleSignaturesSave}
          onCancel={handleSignatureCancel}
        />
      </Suspense>
    );
  }

  // Show image editor
  if (showImageEditor && imageToEdit) {
    const isEditingExisting = selectedImage === imageToEdit;
    return (
      <Suspense fallback={<ComponentLoader />}>
        <ImageEditView
          imageUri={imageToEdit}
          onSave={isEditingExisting ? handleExistingImageEdited : handleImageEdited}
          onCancel={handleImageEditCanceled}
        />
      </Suspense>
    );
  }

  if (showFormatter && extractedText) {
    return (
      <Suspense fallback={<ComponentLoader />}>
        <TextFormatter
          initialText={extractedText}
          onBack={closeFormatter}
          documentId={currentDocumentId || undefined}
        />
      </Suspense>
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
          <Suspense fallback={<ComponentLoader />}>
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
              isProcessing={isProcessing || activeOCRTasks.size > 0}
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
          </Suspense>
        </ScrollView>
        
        <Suspense fallback={null}>
          <OptimizationOverlay
            visible={isOptimizingImage}
            progress={optimizationProgress}
          />
          
          <OCRProgressIndicator
            visible={isProcessing || activeOCRTasks.size > 0}
            progress={ocrProgress || 'Processing text extraction...'}
            queueLength={queueStatus.queueLength}
            activeTasks={queueStatus.activeTasks}
          />
        </Suspense>
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
            onShowModeSelector={showScanModeSelector}
            sparkleAnim={sparkleAnim}
          />
        ) : (
          <View style={styles.scanContainer}>
            <Suspense fallback={<ComponentLoader />}>
              <ImageScanView
                selectedImage={selectedImage}
                isLoading={isProcessing || activeOCRTasks.size > 0}
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
            </Suspense>
          </View>
        )}
      </ScrollView>
      
      <Suspense fallback={null}>
        <OptimizationOverlay
          visible={isOptimizingImage}
          progress={optimizationProgress}
        />
        
        <AdvancedProcessingOverlay
          visible={isAdvancedProcessing}
          currentStep={advancedProcessingStep}
          appliedEnhancements={appliedEnhancements}
          processingTimeMs={processingResult?.processingTimeMs}
          documentBounds={processingResult?.documentBounds}
        />
        
        <OCRProgressIndicator
          visible={isProcessing || activeOCRTasks.size > 0}
          progress={ocrProgress || 'Processing text extraction...'}
          queueLength={queueStatus.queueLength}
          activeTasks={queueStatus.activeTasks}
        />
      </Suspense>
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});