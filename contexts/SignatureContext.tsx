import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedSignature } from '@/types/scan';

interface SignatureContextType {
  signatures: SavedSignature[];
  loading: boolean;
  saveSignature: (signature: Omit<SavedSignature, 'id' | 'createdAt'>) => Promise<SavedSignature>;
  deleteSignature: (id: string) => Promise<void>;
  getSignature: (id: string) => SavedSignature | undefined;
  refreshSignatures: () => Promise<void>;
}

const SignatureContext = createContext<SignatureContextType | undefined>(undefined);

const SIGNATURES_STORAGE_KEY = '@saved_signatures';

export function SignatureProvider({ children }: { children: React.ReactNode }) {
  const [signatures, setSignatures] = useState<SavedSignature[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSignatures = async () => {
    try {
      const stored = await AsyncStorage.getItem(SIGNATURES_STORAGE_KEY);
      if (stored) {
        const parsedSignatures = JSON.parse(stored).map((sig: any) => ({
          ...sig,
          createdAt: new Date(sig.createdAt),
        }));
        setSignatures(parsedSignatures);
      }
    } catch (error) {
      console.error('Error loading signatures:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSignaturesToStorage = async (sigs: SavedSignature[]) => {
    try {
      await AsyncStorage.setItem(SIGNATURES_STORAGE_KEY, JSON.stringify(sigs));
    } catch (error) {
      console.error('Error saving signatures:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadSignatures();
  }, []);

  const saveSignature = async (signature: Omit<SavedSignature, 'id' | 'createdAt'>): Promise<SavedSignature> => {
    const newSignature: SavedSignature = {
      ...signature,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
    };

    const updatedSignatures = [newSignature, ...signatures];
    setSignatures(updatedSignatures);
    await saveSignaturesToStorage(updatedSignatures);
    
    return newSignature;
  };

  const deleteSignature = async (id: string) => {
    const updatedSignatures = signatures.filter(sig => sig.id !== id);
    setSignatures(updatedSignatures);
    await saveSignaturesToStorage(updatedSignatures);
  };

  const getSignature = (id: string): SavedSignature | undefined => {
    return signatures.find(sig => sig.id === id);
  };

  const refreshSignatures = async () => {
    await loadSignatures();
  };

  const value: SignatureContextType = {
    signatures,
    loading,
    saveSignature,
    deleteSignature,
    getSignature,
    refreshSignatures,
  };

  return (
    <SignatureContext.Provider value={value}>
      {children}
    </SignatureContext.Provider>
  );
}

export function useSignatures() {
  const context = useContext(SignatureContext);
  if (context === undefined) {
    throw new Error('useSignatures must be used within a SignatureProvider');
  }
  return context;
}