import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Check, ChevronDown, Globe } from 'lucide-react-native';
import { useOCRSettings, OCRLanguage, OCRLanguageOption } from '@/contexts/OCRSettingsContext';

interface LanguageSelectorProps {
  onLanguageChange?: (language: OCRLanguage) => void;
}

export default function LanguageSelector({ onLanguageChange }: LanguageSelectorProps) {
  const { selectedLanguage, languages, setLanguage, getLanguageNativeName } = useOCRSettings();
  const [showModal, setShowModal] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageSelect = async (language: OCRLanguage) => {
    if (language === selectedLanguage) {
      setShowModal(false);
      return;
    }

    setIsChanging(true);
    try {
      await setLanguage(language);
      onLanguageChange?.(language);
      setShowModal(false);
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert('Error', 'Failed to save language preference. Please try again.');
    } finally {
      setIsChanging(false);
    }
  };

  const LanguageOption = ({ option }: { option: OCRLanguageOption }) => (
    <TouchableOpacity
      style={[
        styles.languageOption,
        selectedLanguage === option.code && styles.selectedOption,
      ]}
      onPress={() => handleLanguageSelect(option.code)}
      disabled={isChanging}
    >
      <View style={styles.languageInfo}>
        <Text style={[
          styles.languageName,
          selectedLanguage === option.code && styles.selectedText,
        ]}>
          {option.name}
        </Text>
        {option.nativeName !== option.name && (
          <Text style={[
            styles.nativeName,
            selectedLanguage === option.code && styles.selectedSubtext,
          ]}>
            {option.nativeName}
          </Text>
        )}
      </View>
      {selectedLanguage === option.code && (
        <Check size={20} color="#0066CC" />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setShowModal(true)}
        testID="language-selector-button"
      >
        <View style={styles.selectorLeft}>
          <View style={styles.iconContainer}>
            <Globe size={20} color="#0066CC" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.selectorTitle}>OCR Language</Text>
            <Text style={styles.selectorSubtitle}>
              {getLanguageNativeName(selectedLanguage)}
            </Text>
          </View>
        </View>
        <ChevronDown size={20} color="#C7C7CC" />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select OCR Language</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
            <View style={styles.languageSection}>
              <Text style={styles.sectionDescription}>
                Choose the primary language for text extraction. Auto-detect will attempt to identify the language automatically.
              </Text>
              
              {languages.map((language) => (
                <LanguageOption key={language.code} option={language} />
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 3,
  },
  selectorSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 60,
  },
  languageList: {
    flex: 1,
  },
  languageSection: {
    padding: 20,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  selectedOption: {
    backgroundColor: '#E3F2FD',
    borderColor: '#0066CC',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  selectedText: {
    color: '#0066CC',
  },
  nativeName: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedSubtext: {
    color: '#0066CC',
    opacity: 0.8,
  },
});