import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Edit3, Copy, ArrowLeft, Sparkles, Plus, PenTool } from 'lucide-react-native';

interface ResultsViewProps {
  extractedText: string;
  currentDocumentId: string | null;
  onOpenFormatter: () => void;
  onCopyToClipboard: () => void;
  onClearScan: () => void;
  onConvertToMultiPage: () => void;
  onAddSignature?: () => void;
  sparkleAnim: Animated.Value;
  slideAnim: Animated.Value;
}

export default function ResultsView({
  extractedText,
  currentDocumentId,
  onOpenFormatter,
  onCopyToClipboard,
  onClearScan,
  onConvertToMultiPage,
  onAddSignature,
  sparkleAnim,
  slideAnim,
}: ResultsViewProps) {
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
          <Text style={styles.resultTitle}>Text Extracted</Text>
          {currentDocumentId && (
            <View style={styles.savedBadge}>
              <Text style={styles.savedText}>Saved</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.fullWidthActionButtons}>
        <TouchableOpacity
          style={[styles.fullWidthActionButton, styles.formatActionButton]}
          onPress={onOpenFormatter}
        >
          <Edit3 size={18} color="#0066CC" />
          <Text style={styles.fullWidthActionButtonText}>Format Text</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fullWidthActionButton, styles.copyActionButton]}
          onPress={onCopyToClipboard}
        >
          <Copy size={18} color="#34C759" />
          <Text style={[styles.fullWidthActionButtonText, { color: '#34C759' }]}>Copy to Clipboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fullWidthActionButton, styles.multiPageActionButton]}
          onPress={onConvertToMultiPage}
        >
          <Plus size={18} color="#FF9500" />
          <Text style={[styles.fullWidthActionButtonText, { color: '#FF9500' }]}>Add More Pages</Text>
        </TouchableOpacity>
        {onAddSignature && (
          <TouchableOpacity
            style={[styles.fullWidthActionButton, styles.signatureActionButton]}
            onPress={onAddSignature}
          >
            <PenTool size={18} color="#8B5CF6" />
            <Text style={[styles.fullWidthActionButtonText, { color: '#8B5CF6' }]}>Add Signature</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.fullWidthActionButton, styles.backActionButton]}
          onPress={onClearScan}
        >
          <ArrowLeft size={18} color="#FF3B30" />
          <Text style={[styles.fullWidthActionButtonText, { color: '#FF3B30' }]}>Scan Another Document</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.extractedText}>{extractedText}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  resultContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: "#E8F5E8",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  resultTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  successIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E8F5E8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginRight: 8,
  },
  savedBadge: {
    backgroundColor: "#34C759",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  savedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  fullWidthActionButtons: {
    marginTop: 16,
    gap: 12,
  },
  fullWidthActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fullWidthActionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0066CC",
  },
  formatActionButton: {
    backgroundColor: "#E3F2FD",
  },
  copyActionButton: {
    backgroundColor: "#E8F5E8",
  },
  multiPageActionButton: {
    backgroundColor: "#FFF4E6",
  },
  backActionButton: {
    backgroundColor: "#FFE8E8",
  },
  signatureActionButton: {
    backgroundColor: "#F3E8FF",
  },
  textContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 20,
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  extractedText: {
    fontSize: 16,
    lineHeight: 26,
    color: "#1A1A1A",
    fontWeight: "400",
  },
});