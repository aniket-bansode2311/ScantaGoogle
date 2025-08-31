import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Download, 
  Merge, 
  Split, 
  Copy, 
  RotateCw, 
  Trash2,
  FileText,
  Settings,
} from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import { DocumentPage, MultiPageDocument, Annotation } from '@/types/scan';
import { useDocumentEditing } from '@/contexts/DocumentEditingContext';
import AnnotationToolbar from '@/components/annotation/AnnotationToolbar';
import AnnotationCanvas from '@/components/annotation/AnnotationCanvas';

interface DocumentEditingScreenProps {
  document: MultiPageDocument;
  onBack: () => void;
  onDocumentUpdate: (document: MultiPageDocument) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const CANVAS_WIDTH = screenWidth - 32;
const CANVAS_HEIGHT = (CANVAS_WIDTH * 4) / 3; // 4:3 aspect ratio

export default function DocumentEditingScreen({
  document,
  onBack,
  onDocumentUpdate,
}: DocumentEditingScreenProps) {
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [selectedTool, setSelectedTool] = useState<'highlight' | 'drawing' | 'textbox' | 'eraser' | null>(null);
  const [selectedColor, setSelectedColor] = useState('#FFFF00');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [mergeTitle, setMergeTitle] = useState('');
  const [splitTitle, setSplitTitle] = useState('');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);

  const canvasRef = useRef<View>(null);
  
  const {
    annotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    clearAnnotations,
    mergeDocuments,
    splitDocument,
    exportToPDF,
    duplicatePage,
    isProcessing,
  } = useDocumentEditing();

  const currentPage = document.pages[selectedPageIndex];

  const handlePageSelect = useCallback((index: number) => {
    setSelectedPageIndex(index);
    clearAnnotations(); // Clear annotations when switching pages
  }, [clearAnnotations]);

  const handleDuplicatePage = useCallback(() => {
    if (currentPage) {
      const duplicated = duplicatePage(currentPage);
      const updatedPages = [...document.pages];
      updatedPages.splice(selectedPageIndex + 1, 0, duplicated);
      
      const updatedDocument = {
        ...document,
        pages: updatedPages.map((page, index) => ({ ...page, order: index })),
      };
      
      onDocumentUpdate(updatedDocument);
      setSelectedPageIndex(selectedPageIndex + 1);
    }
  }, [currentPage, document, duplicatePage, onDocumentUpdate, selectedPageIndex]);

  const handleDeletePage = useCallback(() => {
    if (document.pages.length <= 1) {
      Alert.alert('Cannot Delete', 'Document must have at least one page.');
      return;
    }

    Alert.alert(
      'Delete Page',
      'Are you sure you want to delete this page?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedPages = document.pages.filter((_, index) => index !== selectedPageIndex);
            const updatedDocument = {
              ...document,
              pages: updatedPages.map((page, index) => ({ ...page, order: index })),
            };
            
            onDocumentUpdate(updatedDocument);
            
            // Adjust selected page index
            if (selectedPageIndex >= updatedPages.length) {
              setSelectedPageIndex(updatedPages.length - 1);
            }
          },
        },
      ]
    );
  }, [document, onDocumentUpdate, selectedPageIndex]);

  const handleMergeDocuments = useCallback(async () => {
    if (!mergeTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the merged document.');
      return;
    }

    const result = await mergeDocuments([document], {
      title: mergeTitle.trim(),
      pageOrder: document.pages.map(p => p.id),
      includeAnnotations: true,
    });

    if (result) {
      Alert.alert('Success', 'Document merged successfully!');
      setShowMergeModal(false);
      setMergeTitle('');
    }
  }, [document, mergeDocuments, mergeTitle]);

  const handleSplitDocument = useCallback(async () => {
    if (!splitTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the new document.');
      return;
    }

    if (selectedPages.length === 0) {
      Alert.alert('Error', 'Please select pages to extract.');
      return;
    }

    const result = await splitDocument(document, {
      originalDocumentId: document.id,
      pagesToExtract: selectedPages,
      newDocumentTitle: splitTitle.trim(),
    });

    if (result) {
      Alert.alert('Success', 'Document split successfully!');
      setShowSplitModal(false);
      setSplitTitle('');
      setSelectedPages([]);
      
      // Update the current document with remaining pages
      if (result.length > 1) {
        onDocumentUpdate(result[0]);
      }
    }
  }, [document, splitDocument, splitTitle, selectedPages, onDocumentUpdate]);

  const handleExportToPDF = useCallback(async () => {
    const annotatedDocument = {
      ...document,
      annotations,
    };

    await exportToPDF(annotatedDocument, {
      quality: 'high',
      includeAnnotations: true,
      pageSize: 'A4',
      orientation: 'portrait',
    });

    setShowExportModal(false);
  }, [document, annotations, exportToPDF]);

  const handleCaptureAndShare = useCallback(async () => {
    if (canvasRef.current) {
      try {
        const uri = await captureRef(canvasRef.current, {
          format: 'png',
          quality: 0.9,
        });
        
        Alert.alert(
          'Page Captured',
          'Page with annotations has been captured.',
          [{ text: 'OK' }]
        );
        
        console.log('Captured page:', uri);
      } catch (error) {
        console.error('Failed to capture page:', error);
        Alert.alert('Error', 'Failed to capture page.');
      }
    }
  }, []);

  const togglePageSelection = useCallback((pageId: string) => {
    setSelectedPages(prev => 
      prev.includes(pageId) 
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} testID="back-button">
          <ArrowLeft size={24} color="#333333" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{document.title}</Text>
          <Text style={styles.headerSubtitle}>
            Page {selectedPageIndex + 1} of {document.pages.length}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => setShowExportModal(true)} 
            style={styles.headerButton}
            testID="export-button"
          >
            <Download size={20} color="#333333" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setShowMergeModal(true)} 
            style={styles.headerButton}
            testID="merge-button"
          >
            <Merge size={20} color="#333333" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setShowSplitModal(true)} 
            style={styles.headerButton}
            testID="split-button"
          >
            <Split size={20} color="#333333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Page Thumbnails */}
      <ScrollView 
        horizontal 
        style={styles.thumbnailContainer}
        showsHorizontalScrollIndicator={false}
      >
        {document.pages.map((page, index) => (
          <TouchableOpacity
            key={page.id}
            style={[
              styles.thumbnail,
              selectedPageIndex === index && styles.selectedThumbnail,
            ]}
            onPress={() => handlePageSelect(index)}
            testID={`page-thumbnail-${index}`}
          >
            <Image source={{ uri: page.imageUri }} style={styles.thumbnailImage} />
            <Text style={styles.thumbnailLabel}>{index + 1}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main Canvas */}
      <ScrollView style={styles.canvasContainer} contentContainerStyle={styles.canvasContent}>
        <View ref={canvasRef} style={styles.canvasWrapper}>
          <Image 
            source={{ uri: currentPage?.imageUri }} 
            style={[styles.pageImage, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }]}
            resizeMode="contain"
          />
          
          <AnnotationCanvas
            imageUri={currentPage?.imageUri || ''}
            annotations={annotations}
            selectedTool={selectedTool}
            selectedColor={selectedColor}
            strokeWidth={strokeWidth}
            onAnnotationAdd={addAnnotation}
            onAnnotationUpdate={updateAnnotation}
            onAnnotationDelete={deleteAnnotation}
            canvasWidth={CANVAS_WIDTH}
            canvasHeight={CANVAS_HEIGHT}
          />
        </View>

        {/* Page Actions */}
        <View style={styles.pageActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleDuplicatePage}
            testID="duplicate-page"
          >
            <Copy size={20} color="#666666" />
            <Text style={styles.actionButtonText}>Duplicate</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => {/* Rotate page */}}
            testID="rotate-page"
          >
            <RotateCw size={20} color="#666666" />
            <Text style={styles.actionButtonText}>Rotate</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleCaptureAndShare}
            testID="capture-page"
          >
            <Download size={20} color="#666666" />
            <Text style={styles.actionButtonText}>Capture</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={handleDeletePage}
            testID="delete-page"
          >
            <Trash2 size={20} color="#FF6B6B" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Annotation Toolbar */}
      <AnnotationToolbar
        selectedTool={selectedTool}
        onToolSelect={setSelectedTool}
        selectedColor={selectedColor}
        onColorSelect={setSelectedColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        onClearAll={clearAnnotations}
      />

      {/* Merge Modal */}
      <Modal visible={showMergeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Merge Document</Text>
            <TextInput
              style={styles.modalInput}
              value={mergeTitle}
              onChangeText={setMergeTitle}
              placeholder="Enter merged document title"
              testID="merge-title-input"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowMergeModal(false)}
                testID="merge-cancel"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleMergeDocuments}
                disabled={isProcessing}
                testID="merge-confirm"
              >
                <Text style={styles.submitButtonText}>
                  {isProcessing ? 'Merging...' : 'Merge'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Split Modal */}
      <Modal visible={showSplitModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Split Document</Text>
            <TextInput
              style={styles.modalInput}
              value={splitTitle}
              onChangeText={setSplitTitle}
              placeholder="Enter new document title"
              testID="split-title-input"
            />
            
            <Text style={styles.modalSubtitle}>Select pages to extract:</Text>
            <ScrollView style={styles.pageSelector}>
              {document.pages.map((page, index) => (
                <TouchableOpacity
                  key={page.id}
                  style={[
                    styles.pageOption,
                    selectedPages.includes(page.id) && styles.selectedPageOption,
                  ]}
                  onPress={() => togglePageSelection(page.id)}
                  testID={`split-page-${index}`}
                >
                  <Text style={styles.pageOptionText}>Page {index + 1}</Text>
                  {selectedPages.includes(page.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSplitModal(false)}
                testID="split-cancel"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSplitDocument}
                disabled={isProcessing}
                testID="split-confirm"
              >
                <Text style={styles.submitButtonText}>
                  {isProcessing ? 'Splitting...' : 'Split'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal visible={showExportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Export to PDF</Text>
            <Text style={styles.modalDescription}>
              Export this document with all annotations as a PDF file.
            </Text>
            
            <View style={styles.exportOptions}>
              <View style={styles.exportOption}>
                <FileText size={20} color="#666666" />
                <Text style={styles.exportOptionText}>High Quality PDF</Text>
              </View>
              <View style={styles.exportOption}>
                <Settings size={20} color="#666666" />
                <Text style={styles.exportOptionText}>Include Annotations</Text>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowExportModal(false)}
                testID="export-cancel"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleExportToPDF}
                disabled={isProcessing}
                testID="export-confirm"
              >
                <Text style={styles.submitButtonText}>
                  {isProcessing ? 'Exporting...' : 'Export'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  thumbnailContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  thumbnail: {
    width: 60,
    height: 80,
    marginHorizontal: 4,
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedThumbnail: {
    borderColor: '#3B82F6',
  },
  thumbnailImage: {
    width: '100%',
    height: 60,
    backgroundColor: '#F5F5F5',
  },
  thumbnailLabel: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666666',
    paddingVertical: 4,
  },
  canvasContainer: {
    flex: 1,
  },
  canvasContent: {
    padding: 16,
  },
  canvasWrapper: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pageImage: {
    backgroundColor: '#F5F5F5',
  },
  pageActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    minWidth: 80,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FFF5F5',
  },
  deleteButtonText: {
    color: '#FF6B6B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
    marginBottom: 16,
  },
  pageSelector: {
    maxHeight: 200,
    marginBottom: 16,
  },
  pageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#F5F5F5',
  },
  selectedPageOption: {
    backgroundColor: '#E3F2FD',
  },
  pageOptionText: {
    fontSize: 16,
    color: '#333333',
  },
  checkmark: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  exportOptions: {
    marginBottom: 16,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  exportOptionText: {
    fontSize: 16,
    color: '#333333',
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