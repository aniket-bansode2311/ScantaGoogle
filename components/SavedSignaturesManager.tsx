import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Edit3, Trash2, Plus, PenTool } from 'lucide-react-native';
import { useSignatures } from '@/contexts/SignatureContext';
import { SavedSignature } from '@/types/scan';
import SignatureManager from '@/components/signature/SignatureManager';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 80) / 2;

export default function SavedSignaturesManager() {
  const { signatures, deleteSignature, loading } = useSignatures();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSignatureManager, setShowSignatureManager] = useState(false);


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
            } catch {
              Alert.alert('Error', 'Failed to delete signature. Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleEditSignature = () => {
    Alert.alert(
      'Edit Signature',
      'To edit a signature, please delete it and create a new one.',
      [{ text: 'OK' }]
    );
  };

  const handleAddNewSignature = () => {
    setShowSignatureManager(true);
  };

  const handleSignatureManagerClose = () => {
    setShowSignatureManager(false);
  };

  const handleSignatureSave = () => {
    setShowSignatureManager(false);
  };

  const renderSignatureCard = (signature: SavedSignature) => {
    const isDeleting = deletingId === signature.id;
    
    return (
      <View key={signature.id} style={styles.signatureCard}>
        <View style={[styles.signaturePreview, isDeleting && styles.deletingCard]}>
          <View style={styles.signatureContainer}>
            <Svg 
              width={CARD_WIDTH - 20} 
              height={60} 
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
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton, isDeleting && styles.disabledButton]}
            onPress={handleEditSignature}
            disabled={isDeleting}
          >
            <Edit3 size={14} color={isDeleting ? '#9CA3AF' : '#3B82F6'} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton, isDeleting && styles.disabledButton]}
            onPress={() => handleDeleteSignature(signature)}
            disabled={isDeleting}
          >
            <Trash2 size={14} color={isDeleting ? '#9CA3AF' : '#EF4444'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (showSignatureManager) {
    return (
      <SignatureManager
        mode="create"
        onSave={handleSignatureSave}
        onCancel={handleSignatureManagerClose}
        allowSaveToLibrary={true}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading signatures...</Text>
      </View>
    );
  }

  if (signatures.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <PenTool size={32} color="#9CA3AF" />
        </View>
        <Text style={styles.emptyTitle}>No Saved Signatures</Text>
        <Text style={styles.emptyDescription}>
          Create your first signature to use across documents
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddNewSignature}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addButtonText}>Add New Signature</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {signatures.length} Saved Signature{signatures.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity style={styles.addNewButton} onPress={handleAddNewSignature}>
          <Plus size={16} color="#3B82F6" />
          <Text style={styles.addNewButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {signatures.map(renderSignatureCard)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    gap: 4,
  },
  addNewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  scrollView: {
    paddingLeft: 20,
  },
  scrollContent: {
    paddingRight: 20,
    gap: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  signatureCard: {
    width: CARD_WIDTH,
    position: 'relative',
  },
  signaturePreview: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  deletingCard: {
    opacity: 0.5,
  },
  signatureContainer: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  signatureInfo: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  signatureName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  signatureDate: {
    fontSize: 10,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    position: 'absolute',
    top: 6,
    right: 6,
    gap: 4,
  },
  actionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  disabledButton: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
});