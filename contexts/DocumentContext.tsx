import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { documents, Document } from '@/lib/supabase';
import { useAuth } from './AuthContext';

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
      
      // Get total count
      const { count } = await documents.getCount(user.id);
      setTotalCount(count || 0);
      
      // Get documents for current page
      const { data, error } = await documents.getAll(user.id, {
        limit: DOCUMENTS_PER_PAGE,
        offset
      });
      
      if (error) {
        console.error('Error loading documents:', error);
      } else {
        const newDocs = data || [];
        if (reset) {
          setDocs(newDocs);
        } else {
          setDocs(prev => [...prev, ...newDocs]);
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
  }, [user, docs.length]);

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
        setDocs(prev => [...prev, ...newDocs]);
        
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

  const updateDocument = async (id: string, updates: Partial<Document>) => {
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