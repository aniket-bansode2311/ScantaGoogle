import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Edit3, Copy, ArrowLeft, Sparkles, FileText } from 'lucide-react-native';
import { DocumentPage } from '@/types/scan';

interface MultiPageResultsViewProps {
  pages: DocumentPage[];
  onOpenFormatter: () => void;
  onCopyToClipboard: () => void;
  onClearScan: () => void;
  sparkleAnim: Animated.Value;
  slideAnim: Animated.Value;
}

export default function MultiPageResultsView({
  pages,
  onOpenFormatter,
  onCopyToClipboard,
  onClearScan,
  sparkleAnim,
  slideAnim,
}: MultiPageResultsViewProps) {
  const combinedText = pages
    .filter(page => page.extractedText)
    .map((page, index) => `--- Page ${index + 1} ---\n${page.extractedText}`)
    .join('\n\n');

  const processedPages = pages.filter(page => page.extractedText).length;

  return (
    <Animated.View 
      style={[
        styles.resultContainer,
        {
          opacity: sparkleAnim,
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            })
          }]
        }
      ]}
    >
      <View style={styles.resultHeader}>
        <View style={styles.resultTitleContainer}>
          <View style={styles.successIcon}>
            <Sparkles size={16} color="#34C759" />
          </View>
          <Text style={styles.resultTitle}>Multi-Page Text Extracted</Text>
          <View style={styles.pagesBadge}>
            <Text style={styles.pagesText}>{processedPages} pages</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.fullWidthActionButtons}>
        <TouchableOpacity
          style={[styles.fullWidthActionButton, styles.formatActionButton]}
          onPress={onOpenFormatter}
        >
          <Edit3 size={18} color="#0066CC" />
          <Text style={styles.fullWidthActionButtonText}>Format Combined Text</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fullWidthActionButton, styles.copyActionButton]}
          onPress={onCopyToClipboard}
        >
          <Copy size={18} color="#34C759" />
          <Text style={[styles.fullWidthActionButtonText, { color: '#34C759' }]}>Copy All Text</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fullWidthActionButton, styles.backActionButton]}
          onPress={onClearScan}
        >
          <ArrowLeft size={18} color="#FF3B30" />
          <Text style={[styles.fullWidthActionButtonText, { color: '#FF3B30' }]}>Start New Document</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.textContainer}>
        <View style={styles.textHeader}>
          <FileText size={16} color="#666666" />
          <Text style={styles.textHeaderTitle}>Combined Text ({combinedText.length} characters)</Text>
        </View>
        <ScrollView style={styles.textScrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.extractedText}>{combinedText}</Text>
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  resultContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#E8F5E8',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginRight: 8,
  },
  pagesBadge: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pagesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fullWidthActionButtons: {
    marginTop: 16,
    gap: 12,
  },
  fullWidthActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fullWidthActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
  formatActionButton: {
    backgroundColor: '#E3F2FD',
  },
  copyActionButton: {
    backgroundColor: '#E8F5E8',
  },
  backActionButton: {
    backgroundColor: '#FFE8E8',
  },
  textContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginTop: 20,
  },
  textHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  textHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  textScrollView: {
    maxHeight: 200,
    padding: 16,
  },
  extractedText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#1A1A1A',
    fontWeight: '400',
  },
});