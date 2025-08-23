import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { X, Plus, Trash2, Edit3 } from 'lucide-react-native';
import { useSignatures } from '@/contexts/SignatureContext';
import { SavedSignature } from '@/types/scan';

interface SignatureLibraryProps {
  onSelectSignature: (signature: SavedSignature) => void;
  onCreateNew: () => void;
  onCancel: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 60) / 2;

export default function SignatureLibrary({ onSelectSignature, onCreateNew, onCancel }: SignatureLibraryProps) {
  const { signatures, deleteSignature, loading } = useSignatures();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteSignature = (signature: SavedSignature) => {
    Alert.alert(
      'Delete Signature',
      `Are you sure you want to delete "${signature.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(signature.id);
            try {
              await deleteSignature(signature.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete signature. Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const renderSignatureCard = (signature: SavedSignature) => {
    const isDeleting = deletingId === signature.id;
    
    return (
      <View key={signature.id} style={styles.signatureCard}>
        <TouchableOpacity
          style={[styles.signaturePreview, isDeleting && styles.deletingCard]}
          onPress={() => !isDeleting && onSelectSignature(signature)}
          disabled={isDeleting}
        >
          <View style={styles.signatureContainer}>
            <Svg 
              width={CARD_WIDTH - 20} 
              height={80} 
              viewBox={`0 0 ${signature.width} ${signature.height}`}
            >
              <Path
                d={signature.svgPath}
                stroke="#000"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </View>
          
          <View style={styles.signatureInfo}>
            <Text style={styles.signatureName} numberOfLines={1}>
              {signature.name}
            </Text>
            <Text style={styles.signatureDate}>
              {signature.createdAt.toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.deletingButton]}
          onPress={() => handleDeleteSignature(signature)}
          disabled={isDeleting}
        >
          <Trash2 size={16} color={isDeleting ? '#9CA3AF' : '#EF4444'} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
          <X size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Signature Library</Text>
        <TouchableOpacity onPress={onCreateNew} style={styles.headerButton}>
          <Plus size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading signatures...</Text>
          </View>
        ) : signatures.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Edit3 size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Saved Signatures</Text>
            <Text style={styles.emptyDescription}>
              Create your first signature to get started
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={onCreateNew}>
              <Plus size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Signature</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {signatures.length} Saved Signature{signatures.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity style={styles.newSignatureButton} onPress={onCreateNew}>
                <Plus size={16} color="#3B82F6" />
                <Text style={styles.newSignatureButtonText}>New</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.signaturesGrid}>
              {signatures.map(renderSignatureCard)}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  newSignatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    gap: 4,
  },
  newSignatureButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  signaturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  signatureCard: {
    width: CARD_WIDTH,
    position: 'relative',
  },
  signaturePreview: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  deletingCard: {
    opacity: 0.5,
  },
  signatureContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  signatureInfo: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  signatureName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  signatureDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  deletingButton: {
    backgroundColor: '#F3F4F6',
  },
});