import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Zap, FileText, ArrowLeft } from 'lucide-react-native';
import { DocumentPage } from '@/types/scan';

interface MultiPageViewProps {
  pages: DocumentPage[];
  selectedPageId?: string;
  isProcessing: boolean;
  onExtractAllText: () => void;
  onBack: () => void;
  pulseAnim: Animated.Value;
}

export default function MultiPageView({
  pages,
  selectedPageId,
  isProcessing,
  onExtractAllText,
  onBack,
  pulseAnim,
}: MultiPageViewProps) {
  const selectedPage = pages.find(page => page.id === selectedPageId) || pages[0];
  const hasExtractedText = pages.some(page => page.extractedText);
  const allPagesProcessed = pages.every(page => page.extractedText);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={20} color="#666666" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Multi-Page Document</Text>
      </View>

      <View style={styles.previewContainer}>
        <Image source={{ uri: selectedPage.imageUri }} style={styles.previewImage} />
        
        <View style={styles.pageInfo}>
          <Text style={styles.pageTitle}>
            Page {pages.findIndex(p => p.id === selectedPage.id) + 1} of {pages.length}
          </Text>
          {selectedPage.extractedText && (
            <View style={styles.textPreview}>
              <FileText size={16} color="#34C759" />
              <Text style={styles.textPreviewLabel}>Text extracted</Text>
            </View>
          )}
        </View>
      </View>

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[
            styles.extractButton,
            isProcessing && styles.extractButtonDisabled,
            allPagesProcessed && styles.extractButtonComplete,
          ]}
          onPress={onExtractAllText}
          disabled={isProcessing || allPagesProcessed}
        >
          {isProcessing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.loadingText}>Processing {pages.length} pages...</Text>
            </View>
          ) : allPagesProcessed ? (
            <View style={styles.completeContainer}>
              <FileText size={20} color="#FFFFFF" />
              <Text style={styles.completeText}>All Pages Processed</Text>
            </View>
          ) : (
            <View style={styles.extractButtonContent}>
              <Zap size={20} color="#FFFFFF" />
              <Text style={styles.extractButtonText}>
                Extract Text from All Pages ({pages.length})
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {hasExtractedText && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Progress: {pages.filter(p => p.extractedText).length} / {pages.length} pages processed
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(pages.filter(p => p.extractedText).length / pages.length) * 100}%` }
              ]} 
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  previewImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  pageInfo: {
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  textPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textPreviewLabel: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
  },
  extractButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  extractButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0.1,
  },
  extractButtonComplete: {
    backgroundColor: '#34C759',
    shadowColor: '#34C759',
  },
  extractButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  extractButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  completeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0066CC',
    borderRadius: 4,
  },
});