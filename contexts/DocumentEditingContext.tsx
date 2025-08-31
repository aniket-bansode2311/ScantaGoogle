import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import {
  Annotation,
  DocumentPage,
  MultiPageDocument,
  DocumentMergeOptions,
  DocumentSplitOptions,
  PDFExportOptions,
  AnnotatedDocument,
} from '@/types/scan';
import { useDocuments } from './DocumentContext';

interface DocumentEditingContextType {
  annotations: Annotation[];
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  mergeDocuments: (documents: MultiPageDocument[], options: DocumentMergeOptions) => Promise<MultiPageDocument | null>;
  splitDocument: (document: MultiPageDocument, options: DocumentSplitOptions) => Promise<MultiPageDocument[] | null>;
  exportToPDF: (document: AnnotatedDocument, options: PDFExportOptions) => Promise<string | null>;
  duplicatePage: (page: DocumentPage) => DocumentPage;
  rotatePage: (pageId: string, degrees: number) => void;
  isProcessing: boolean;
  setProcessing: (processing: boolean) => void;
}

const DocumentEditingContext = createContext<DocumentEditingContextType | undefined>(undefined);

export function DocumentEditingProvider({ children }: { children: React.ReactNode }) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { addDocument, updateDocument } = useDocuments();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const addAnnotation = useCallback((annotation: Omit<Annotation, 'id' | 'createdAt'>) => {
    if (!mountedRef.current) return;

    let newAnnotation: Annotation;
    
    const baseAnnotation = {
      ...annotation,
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    
    switch (annotation.type) {
      case 'highlight':
        newAnnotation = {
          ...baseAnnotation,
          type: 'highlight',
          color: (annotation as any).color || '#FFFF00',
          opacity: (annotation as any).opacity || 0.3,
        };
        break;
      case 'drawing':
        newAnnotation = {
          ...baseAnnotation,
          type: 'drawing',
          paths: (annotation as any).paths || [],
          strokeColor: (annotation as any).strokeColor || '#000000',
          strokeWidth: (annotation as any).strokeWidth || 2,
        };
        break;
      case 'textbox':
        newAnnotation = {
          ...baseAnnotation,
          type: 'textbox',
          text: (annotation as any).text || '',
          fontSize: (annotation as any).fontSize || 14,
          fontColor: (annotation as any).fontColor || '#000000',
          backgroundColor: (annotation as any).backgroundColor,
        };
        break;
      default:
        throw new Error(`Unknown annotation type: ${(annotation as any).type}`);
    }
    
    setAnnotations(prev => [...prev, newAnnotation]);
    console.log('📝 Added annotation:', newAnnotation.type, newAnnotation.id);
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    if (!mountedRef.current) return;

    setAnnotations(prev => 
      prev.map(annotation => {
        if (annotation.id === id) {
          return { ...annotation, ...updates } as Annotation;
        }
        return annotation;
      })
    );
    console.log('✏️ Updated annotation:', id);
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    if (!mountedRef.current) return;

    setAnnotations(prev => prev.filter(annotation => annotation.id !== id));
    console.log('🗑️ Deleted annotation:', id);
  }, []);

  const clearAnnotations = useCallback(() => {
    if (!mountedRef.current) return;

    setAnnotations([]);
    console.log('🧹 Cleared all annotations');
  }, []);

  const mergeDocuments = useCallback(async (
    documents: MultiPageDocument[], 
    options: DocumentMergeOptions
  ): Promise<MultiPageDocument | null> => {
    if (documents.length === 0) {
      Alert.alert('Error', 'No documents selected for merging');
      return null;
    }

    if (!mountedRef.current) return null;

    setIsProcessing(true);
    
    try {
      console.log(`🔗 Merging ${documents.length} documents...`);
      
      const allPages: DocumentPage[] = [];
      let pageOrder = 0;
      
      for (const pageId of options.pageOrder) {
        for (const document of documents) {
          const page = document.pages.find(p => p.id === pageId);
          if (page) {
            allPages.push({
              ...page,
              order: pageOrder++,
            });
            break;
          }
        }
      }
      
      if (allPages.length === 0) {
        throw new Error('No valid pages found for merging');
      }
      
      const mergedDocument: Omit<MultiPageDocument, 'id' | 'createdAt' | 'updatedAt'> = {
        title: options.title,
        pages: allPages,
      };
      
      const { data: savedDocument, error } = await addDocument({
        title: options.title,
        content: allPages.map(p => p.extractedText || '').join('\n\n'),
        image_url: allPages[0]?.imageUri || '',
        formatted_content: JSON.stringify({
          pages: allPages,
          annotations: options.includeAnnotations ? annotations : []
        }),
      });
      
      if (error || !savedDocument) {
        throw new Error('Failed to save merged document');
      }
      
      console.log(`✅ Successfully merged ${allPages.length} pages into document: ${options.title}`);
      
      return {
        id: savedDocument.id,
        title: savedDocument.title,
        pages: allPages,
        createdAt: new Date(savedDocument.created_at),
        updatedAt: new Date(savedDocument.updated_at),
      };
      
    } catch (error) {
      console.error('❌ Error merging documents:', error);
      Alert.alert('Error', 'Failed to merge documents. Please try again.');
      return null;
    } finally {
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [addDocument, annotations]);

  const splitDocument = useCallback(async (
    document: MultiPageDocument, 
    options: DocumentSplitOptions
  ): Promise<MultiPageDocument[] | null> => {
    if (options.pagesToExtract.length === 0) {
      Alert.alert('Error', 'No pages selected for extraction');
      return null;
    }

    if (!mountedRef.current) return null;

    setIsProcessing(true);
    
    try {
      console.log(`✂️ Splitting document: ${document.title}`);
      
      const extractedPages = document.pages
        .filter(page => options.pagesToExtract.includes(page.id))
        .map((page, index) => ({ ...page, order: index }));
      
      const newDocument: Omit<MultiPageDocument, 'id' | 'createdAt' | 'updatedAt'> = {
        title: options.newDocumentTitle,
        pages: extractedPages,
      };
      
      const { data: savedDocument, error } = await addDocument({
        title: options.newDocumentTitle,
        content: extractedPages.map(p => p.extractedText || '').join('\n\n'),
        image_url: extractedPages[0]?.imageUri || '',
        formatted_content: JSON.stringify({ pages: extractedPages }),
      });
      
      if (error || !savedDocument) {
        throw new Error('Failed to save split document');
      }
      
      const remainingPages = document.pages
        .filter(page => !options.pagesToExtract.includes(page.id))
        .map((page, index) => ({ ...page, order: index }));
      
      if (remainingPages.length > 0) {
        await updateDocument(document.id, {
          content: remainingPages.map(p => p.extractedText || '').join('\n\n'),
          formatted_content: JSON.stringify({ pages: remainingPages }),
        });
      }
      
      console.log(`✅ Successfully split document. New document: ${options.newDocumentTitle}`);
      
      const newDocumentResult: MultiPageDocument = {
        id: savedDocument.id,
        title: savedDocument.title,
        pages: extractedPages,
        createdAt: new Date(savedDocument.created_at),
        updatedAt: new Date(savedDocument.updated_at),
      };
      
      const updatedOriginal: MultiPageDocument = {
        ...document,
        pages: remainingPages,
        updatedAt: new Date(),
      };
      
      return remainingPages.length > 0 ? [updatedOriginal, newDocumentResult] : [newDocumentResult];
      
    } catch (error) {
      console.error('❌ Error splitting document:', error);
      Alert.alert('Error', 'Failed to split document. Please try again.');
      return null;
    } finally {
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [addDocument, updateDocument]);

  const exportToPDF = useCallback(async (
    document: AnnotatedDocument, 
    options: PDFExportOptions
  ): Promise<string | null> => {
    if (!mountedRef.current) return null;

    setIsProcessing(true);
    
    try {
      console.log(`📄 Exporting document to PDF: ${document.title}`);
      
      const pdfPages: string[] = [];
      
      for (const page of document.pages) {
        try {
          const pageUri = page.imageUri;
          pdfPages.push(pageUri);
        } catch (error) {
          console.warn(`⚠️ Failed to process page ${page.id}:`, error);
        }
      }
      
      if (pdfPages.length === 0) {
        throw new Error('No pages could be processed for PDF export');
      }
      
      const pdfPath = `${FileSystem.documentDirectory}${document.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      
      console.log(`📄 PDF would be created at: ${pdfPath}`);
      console.log(`📊 PDF options:`, options);
      
      Alert.alert(
        'PDF Export',
        `Document "${document.title}" has been prepared for export with ${pdfPages.length} pages.\n\nNote: Full PDF export requires additional PDF processing capabilities.`,
        [{ text: 'OK' }]
      );
      
      return pdfPath;
      
    } catch (error) {
      console.error('❌ Error exporting to PDF:', error);
      Alert.alert('Error', 'Failed to export document to PDF. Please try again.');
      return null;
    } finally {
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, []);

  const duplicatePage = useCallback((page: DocumentPage): DocumentPage => {
    const duplicatedPage: DocumentPage = {
      ...page,
      id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      order: page.order + 1,
    };
    
    console.log('📋 Duplicated page:', page.id, '→', duplicatedPage.id);
    return duplicatedPage;
  }, []);

  const rotatePage = useCallback((pageId: string, degrees: number) => {
    console.log(`🔄 Rotating page ${pageId} by ${degrees} degrees`);
  }, []);

  const setProcessing = useCallback((processing: boolean) => {
    if (mountedRef.current) {
      setIsProcessing(processing);
    }
  }, []);

  const value: DocumentEditingContextType = {
    annotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    clearAnnotations,
    mergeDocuments,
    splitDocument,
    exportToPDF,
    duplicatePage,
    rotatePage,
    isProcessing,
    setProcessing,
  };

  return (
    <DocumentEditingContext.Provider value={value}>
      {children}
    </DocumentEditingContext.Provider>
  );
}

export function useDocumentEditing() {
  const context = useContext(DocumentEditingContext);
  if (context === undefined) {
    throw new Error('useDocumentEditing must be used within a DocumentEditingProvider');
  }
  return context;
}