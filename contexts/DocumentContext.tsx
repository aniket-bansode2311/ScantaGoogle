import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { documents, Document } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { createProgressiveThumbnails } from '@/lib/imageOptimizer';
import { trackPerformance } from '@/lib/performanceMonitor';

interface DocumentContextType {
  documents: Document[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  addDocument: (document: Omit<Document, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ data: Document | null; error: any }>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<{ data: Document | null; error: any }>;
  deleteDocument: (id: string) => Promise<void>;
  clearAllDocuments: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
  loadMoreDocuments: () => Promise<void>;
  searchDocuments: (query: string) => Promise<Document[]>;
  generateThumbnailsForDocument: (documentId: string, imageUri: string) => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

const DOCUMENTS_PER_PAGE = 15;

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [thumbnailGenerationQueue, setThumbnailGenerationQueue] = useState<Set<string>>(new Set());

  // Update document function with useCallback
  const updateDocument = useCallback(async (id: string, updates: Partial<Document>) => {
    try {
      const { data, error } = await documents.update(id, updates);

      if (error) {
        console.error('Error updating document:', error);
        return { data: null, error };
      }

      if (data) {
        setDocs(prev => prev.map(doc => doc.id === id ? data : doc));
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error updating document:', error);
      return { data: null, error: { message: 'Failed to update document' } };
    }
  }, []);

  // Generate thumbnails for a specific document
  const generateThumbnailsForDocument = useCallback(async (documentId: string, imageUri: string) => {
    if (thumbnailGenerationQueue.has(documentId)) {
      console.log(`⏭️ Skipping thumbnail generation for ${documentId} - already in queue`);
      return;
    }

    setThumbnailGenerationQueue(prev => new Set([...prev, documentId]));

    try {
      console.log(`🖼️ Generating progressive thumbnails for document ${documentId}`);
      const endTracking = trackPerformance.thumbnailGeneration(documentId);
      const thumbnails = await createProgressiveThumbnails(imageUri);
      endTracking();
      
      // Update document with thumbnail URLs
      const updates = {
        thumbnail_low_url: thumbnails.lowRes.uri,
        thumbnail_medium_url: thumbnails.mediumRes.uri,
        thumbnail_high_url: thumbnails.highRes?.uri,
      };
      
      await updateDocument(documentId, updates);
      console.log(`✅ Thumbnails generated and saved for document ${documentId}`);
      
      // Report performance after a batch of thumbnails
      if (Math.random() < 0.1) { // 10% chance to show report
        setTimeout(() => trackPerformance.report(), 1000);
      }
      
    } catch (error) {
      console.error(`❌ Failed to generate thumbnails for document ${documentId}:`, error);
    } finally {
      setThumbnailGenerationQueue(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  }, [thumbnailGenerationQueue, updateDocument]);

  // Generate thumbnails for documents that don't have them using optimized query
  const generateMissingThumbnails = useCallback(async (documentsToCheck?: Document[]) => {
    if (!user) return;

    let documentsNeedingThumbnails: Pick<Document, 'id' | 'image_url' | 'created_at'>[];
    
    if (documentsToCheck) {
      // Use provided documents (for immediate processing)
      documentsNeedingThumbnails = documentsToCheck
        .filter(doc => doc.image_url && !doc.thumbnail_low_url && !thumbnailGenerationQueue.has(doc.id))
        .map(doc => ({ id: doc.id, image_url: doc.image_url!, created_at: doc.created_at }));
    } else {
      // Use optimized query to get documents needing thumbnails
      const { data } = await documents.getDocumentsNeedingThumbnails(user.id, 10);
      documentsNeedingThumbnails = (data || []).filter(doc => !thumbnailGenerationQueue.has(doc.id));
    }

    if (documentsNeedingThumbnails.length === 0) return;

    console.log(`🖼️ Generating thumbnails for ${documentsNeedingThumbnails.length} documents`);

    // Process in small batches to avoid overwhelming the system
    const batchSize = 2;
    for (let i = 0; i < documentsNeedingThumbnails.length; i += batchSize) {
      const batch = documentsNeedingThumbnails.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (doc) => {
          if (doc.image_url) {
            await generateThumbnailsForDocument(doc.id, doc.image_url);
          }
        })
      );
      
      // Small delay between batches
      if (i + batchSize < documentsNeedingThumbnails.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }, [user, thumbnailGenerationQueue, generateThumbnailsForDocument]);

  const loadDocuments = useCallback(async (reset: boolean = true, immediate: boolean = false) => {
    if (!user) {
      setDocs([]);
      setTotalCount(0);
      setHasMore(false);
      return;
    }

    if (reset) {
      setLoading(true);
      setDocs([]);
    }

    // Defer initial load for better cold start performance
    if (!immediate && reset) {
      setTimeout(() => loadDocuments(reset, true), 500);
      setLoading(false);
      return;
    }

    try {
      const offset = reset ? 0 : docs.length;
      const endTracking = trackPerformance.documentListLoad(DOCUMENTS_PER_PAGE);
      
      // Get total count
      const { count } = await documents.getCount(user.id);
      setTotalCount(count || 0);
      
      // Get documents for current page
      const { data, error } = await documents.getAll(user.id, {
        limit: DOCUMENTS_PER_PAGE,
        offset
      });
      
      endTracking();
      
      if (error) {
        console.error('Error loading documents:', error);
      } else {
        const newDocs = data || [];
        if (reset) {
          setDocs(newDocs);
          // Start generating thumbnails for documents without them
          setTimeout(() => generateMissingThumbnails(newDocs), 1000);
        } else {
          setDocs(prev => {
            const combined = [...prev, ...newDocs];
            // Generate thumbnails for new documents
            setTimeout(() => generateMissingThumbnails(newDocs), 500);
            return combined;
          });
        }
        
        // Check if there are more documents to load
        const totalLoaded = reset ? newDocs.length : docs.length + newDocs.length;
        setHasMore(totalLoaded < (count || 0));
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      if (reset) {
        setLoading(false);
      }
    }
  }, [user, docs.length, generateMissingThumbnails]);

  const loadMoreDocuments = async () => {
    if (!user || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    try {
      const offset = docs.length;
      
      const { data, error } = await documents.getAll(user.id, {
        limit: DOCUMENTS_PER_PAGE,
        offset
      });
      
      if (error) {
        console.error('Error loading more documents:', error);
      } else {
        const newDocs = data || [];
        setDocs(prev => {
          const combined = [...prev, ...newDocs];
          // Generate thumbnails for new documents
          setTimeout(() => generateMissingThumbnails(newDocs), 500);
          return combined;
        });
        
        // Check if there are more documents to load
        const totalLoaded = docs.length + newDocs.length;
        setHasMore(totalLoaded < totalCount);
      }
    } catch (error) {
      console.error('Error loading more documents:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Only load documents when user is available and defer for cold start optimization
    if (user) {
      loadDocuments();
    }
  }, [user, loadDocuments]);

  const addDocument = async (document: Omit<Document, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    try {
      const { data, error } = await documents.create({
        ...document,
        user_id: user.id,
      });

      if (error) {
        console.error('Error adding document:', error);
        return { data: null, error };
      }

      if (data) {
        setDocs(prev => [data, ...prev]);
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error adding document:', error);
      return { data: null, error: { message: 'Failed to add document' } };
    }
  };



  const deleteDocument = async (id: string) => {
    try {
      const { error } = await documents.delete(id);

      if (error) {
        console.error('Error deleting document:', error);
        throw error;
      }

      setDocs(prev => prev.filter(doc => doc.id !== id));
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  };

  const clearAllDocuments = async () => {
    if (!user) return;

    try {
      // Delete all documents for the user
      const deletePromises = docs.map(doc => documents.delete(doc.id));
      await Promise.all(deletePromises);
      
      setDocs([]);
    } catch (error) {
      console.error('Error clearing all documents:', error);
      throw error;
    }
  };

  const refreshDocuments = async () => {
    await loadDocuments(true);
  };

  const searchDocuments = async (query: string): Promise<Document[]> => {
    if (!user || !query.trim()) {
      return docs;
    }

    try {
      const { data, error } = await documents.search(user.id, query);
      if (error) {
        console.error('Error searching documents:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  };

  const value: DocumentContextType = {
    documents: docs,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    addDocument,
    updateDocument,
    deleteDocument,
    clearAllDocuments,
    refreshDocuments,
    loadMoreDocuments,
    searchDocuments,
    generateThumbnailsForDocument,
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
}