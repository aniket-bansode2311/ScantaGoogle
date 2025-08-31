import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateDocument = useCallback(async (id: string, updates: Partial<Document>) => {
    try {
      const { data, error } = await documents.update(id, updates);

      if (error) {
        console.error('Error updating document:', error);
        return { data: null, error };
      }

      if (data && mountedRef.current) {
        setDocs(prev => prev.map(doc => doc.id === id ? (data as Document) : doc));
      }

      return { data: data as Document | null, error: null };
    } catch (error) {
      console.error('Error updating document:', error);
      return { data: null, error: { message: 'Failed to update document' } };
    }
  }, []);

  const generateThumbnailsForDocument = useCallback(async (documentId: string, imageUri: string) => {
    if (thumbnailGenerationQueue.has(documentId)) {
      console.log(`⏭️ Skipping thumbnail generation for ${documentId} - already in queue`);
      return;
    }

    if (!mountedRef.current) return;

    setThumbnailGenerationQueue(prev => new Set([...prev, documentId]));

    try {
      console.log(`🖼️ Generating progressive thumbnails for document ${documentId}`);
      const endTracking = trackPerformance.thumbnailGeneration(documentId);
      const thumbnails = await createProgressiveThumbnails(imageUri);
      endTracking();
      
      if (!mountedRef.current) return;
      
      const updates = {
        thumbnail_low_url: thumbnails.lowRes.uri,
        thumbnail_medium_url: thumbnails.mediumRes.uri,
        thumbnail_high_url: thumbnails.highRes?.uri,
      };
      
      await updateDocument(documentId, updates);
      console.log(`✅ Thumbnails generated and saved for document ${documentId}`);
      
      if (Math.random() < 0.1) {
        setTimeout(() => trackPerformance.report(), 1000);
      }
      
    } catch (error) {
      console.error(`❌ Failed to generate thumbnails for document ${documentId}:`, error);
    } finally {
      if (mountedRef.current) {
        setThumbnailGenerationQueue(prev => {
          const newSet = new Set(prev);
          newSet.delete(documentId);
          return newSet;
        });
      }
    }
  }, [updateDocument, thumbnailGenerationQueue]);

  const generateMissingThumbnails = useCallback(async (documentsToCheck?: Document[]) => {
    if (!user || !mountedRef.current) return;

    let documentsNeedingThumbnails: Pick<Document, 'id' | 'image_url' | 'created_at'>[];
    
    if (documentsToCheck) {
      documentsNeedingThumbnails = documentsToCheck
        .filter(doc => doc.image_url && !doc.thumbnail_low_url && !thumbnailGenerationQueue.has(doc.id))
        .map(doc => ({ id: doc.id, image_url: doc.image_url!, created_at: doc.created_at }));
    } else {
      const { data } = await documents.getDocumentsNeedingThumbnails(user.id, 10);
      documentsNeedingThumbnails = (data || []).filter(doc => !thumbnailGenerationQueue.has(doc.id));
    }

    if (documentsNeedingThumbnails.length === 0) return;

    console.log(`🖼️ Generating thumbnails for ${documentsNeedingThumbnails.length} documents`);

    const batchSize = 2;
    for (let i = 0; i < documentsNeedingThumbnails.length && mountedRef.current; i += batchSize) {
      const batch = documentsNeedingThumbnails.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (doc) => {
          if (doc.image_url && mountedRef.current) {
            await generateThumbnailsForDocument(doc.id, doc.image_url);
          }
        })
      );
      
      if (i + batchSize < documentsNeedingThumbnails.length && mountedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }, [user, thumbnailGenerationQueue, generateThumbnailsForDocument]);

  const loadDocuments = useCallback(async (reset: boolean = true) => {
    if (!user || !mountedRef.current) {
      if (mountedRef.current) {
        setDocs([]);
        setTotalCount(0);
        setHasMore(false);
      }
      return;
    }

    if (reset && mountedRef.current) {
      setLoading(true);
      setDocs([]);
    }

    try {
      const offset = reset ? 0 : docs.length;
      const endTracking = trackPerformance.documentListLoad(DOCUMENTS_PER_PAGE);
      
      const { count } = await documents.getCount(user.id);
      if (mountedRef.current) {
        setTotalCount(count || 0);
      }
      
      const { data, error } = await documents.getAll(user.id, {
        limit: DOCUMENTS_PER_PAGE,
        offset
      });
      
      endTracking();
      
      if (!mountedRef.current) return;
      
      if (error) {
        console.error('Error loading documents:', error);
      } else {
        const newDocs = (data as Document[]) || [];
        if (reset) {
          setDocs(newDocs);
          setTimeout(() => generateMissingThumbnails(newDocs), 1000);
        } else {
          setDocs(prev => {
            const combined = [...prev, ...newDocs];
            setTimeout(() => generateMissingThumbnails(newDocs), 500);
            return combined;
          });
        }
        
        const totalLoaded = reset ? newDocs.length : docs.length + newDocs.length;
        setHasMore(totalLoaded < (count || 0));
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      if (reset && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, docs.length, generateMissingThumbnails]);

  const loadMoreDocuments = useCallback(async () => {
    if (!user || loadingMore || !hasMore || !mountedRef.current) {
      return;
    }

    setLoadingMore(true);
    try {
      const offset = docs.length;
      
      const { data, error } = await documents.getAll(user.id, {
        limit: DOCUMENTS_PER_PAGE,
        offset
      });
      
      if (!mountedRef.current) return;
      
      if (error) {
        console.error('Error loading more documents:', error);
      } else {
        const newDocs = (data as Document[]) || [];
        setDocs(prev => {
          const combined = [...prev, ...newDocs];
          setTimeout(() => generateMissingThumbnails(newDocs), 500);
          return combined;
        });
        
        const totalLoaded = docs.length + newDocs.length;
        setHasMore(totalLoaded < totalCount);
      }
    } catch (error) {
      console.error('Error loading more documents:', error);
    } finally {
      if (mountedRef.current) {
        setLoadingMore(false);
      }
    }
  }, [user, loadingMore, hasMore, docs.length, totalCount, generateMissingThumbnails]);

  useEffect(() => {
    if (user && mountedRef.current) {
      loadDocuments();
    }
  }, [user, loadDocuments]);

  const addDocument = useCallback(async (document: Omit<Document, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
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

      if (data && mountedRef.current) {
        setDocs(prev => [(data as Document), ...prev]);
      }

      return { data: data as Document | null, error: null };
    } catch (error) {
      console.error('Error adding document:', error);
      return { data: null, error: { message: 'Failed to add document' } };
    }
  }, [user]);

  const deleteDocument = useCallback(async (id: string) => {
    try {
      const { error } = await documents.delete(id);

      if (error) {
        console.error('Error deleting document:', error);
        throw error;
      }

      if (mountedRef.current) {
        setDocs(prev => prev.filter(doc => doc.id !== id));
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }, []);

  const clearAllDocuments = useCallback(async () => {
    if (!user) return;

    try {
      const deletePromises = docs.map(doc => documents.delete(doc.id));
      await Promise.all(deletePromises);
      
      if (mountedRef.current) {
        setDocs([]);
      }
    } catch (error) {
      console.error('Error clearing all documents:', error);
      throw error;
    }
  }, [user, docs]);

  const refreshDocuments = useCallback(async () => {
    await loadDocuments(true);
  }, [loadDocuments]);

  const searchDocuments = useCallback(async (query: string): Promise<Document[]> => {
    if (!user || !query.trim()) {
      return docs;
    }

    try {
      const { data, error } = await documents.search(user.id, query);
      if (error) {
        console.error('Error searching documents:', error);
        return [];
      }
      return (data as Document[]) || [];
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }, [user, docs]);

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