import { useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export type OCRLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'auto';

export interface OCRLanguageOption {
  code: OCRLanguage;
  name: string;
  nativeName: string;
}

export const OCR_LANGUAGES: OCRLanguageOption[] = [
  { code: 'auto', name: 'Auto-detect', nativeName: 'Auto-detect' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
];

const OCR_LANGUAGE_KEY = '@ocr_language';

export const [OCRSettingsProvider, useOCRSettings] = createContextHook(() => {
  const [selectedLanguage, setSelectedLanguage] = useState<OCRLanguage>('auto');
  const [isLoading, setIsLoading] = useState(true);

  const isValidLanguage = (language: string): boolean => {
    return OCR_LANGUAGES.some(lang => lang.code === language);
  };

  const loadLanguagePreference = useCallback(async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(OCR_LANGUAGE_KEY);
      if (savedLanguage && isValidLanguage(savedLanguage)) {
        setSelectedLanguage(savedLanguage as OCRLanguage);
      }
    } catch (error) {
      console.error('Error loading OCR language preference:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load saved language preference on mount
  useEffect(() => {
    loadLanguagePreference();
  }, [loadLanguagePreference]);

  const saveLanguagePreference = useCallback(async (language: OCRLanguage) => {
    try {
      await AsyncStorage.setItem(OCR_LANGUAGE_KEY, language);
      setSelectedLanguage(language);
    } catch (error) {
      console.error('Error saving OCR language preference:', error);
      throw error;
    }
  }, []);

  const getLanguageName = useCallback((code: OCRLanguage): string => {
    const language = OCR_LANGUAGES.find(lang => lang.code === code);
    return language ? language.name : 'Auto-detect';
  }, []);

  const getLanguageNativeName = useCallback((code: OCRLanguage): string => {
    const language = OCR_LANGUAGES.find(lang => lang.code === code);
    return language ? language.nativeName : 'Auto-detect';
  }, []);

  return useMemo(() => ({
    selectedLanguage,
    isLoading,
    languages: OCR_LANGUAGES,
    setLanguage: saveLanguagePreference,
    getLanguageName,
    getLanguageNativeName,
  }), [selectedLanguage, isLoading, saveLanguagePreference, getLanguageName, getLanguageNativeName]);
});