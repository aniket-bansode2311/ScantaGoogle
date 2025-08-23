import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { Plus, X, Move, Camera, ImageIcon } from 'lucide-react-native';
import { DocumentPage } from '@/types/scan';

interface PageThumbnailsProps {
  pages: DocumentPage[];
  onAddPage: (useCamera: boolean) => void;
  onDeletePage: (pageId: string) => void;
  onReorderPages: (pages: DocumentPage[]) => void;
  selectedPageId?: string;
  onSelectPage?: (pageId: string) => void;
}

export default function PageThumbnails({
  pages,
  onAddPage,
  onDeletePage,
  onReorderPages,
  selectedPageId,
  onSelectPage,
}: PageThumbnailsProps) {
  const handleDeletePage = (pageId: string) => {
    if (pages.length === 1) {
      Alert.alert(
        'Cannot Delete',
        'You must have at least one page in the document.'
      );
      return;
    }
    
    Alert.alert(
      'Delete Page',
      'Are you sure you want to delete this page?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeletePage(pageId) },
      ]
    );
  };

  const movePageUp = (index: number) => {
    if (index === 0) return;
    const newPages = [...pages];
    [newPages[index - 1], newPages[index]] = [newPages[index], newPages[index - 1]];
    // Update order numbers
    newPages.forEach((page, idx) => {
      page.order = idx;
    });
    onReorderPages(newPages);
  };

  const movePageDown = (index: number) => {
    if (index === pages.length - 1) return;
    const newPages = [...pages];
    [newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]];
    // Update order numbers
    newPages.forEach((page, idx) => {
      page.order = idx;
    });
    onReorderPages(newPages);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Document Pages ({pages.length})</Text>
        <View style={styles.addButtons}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onAddPage(true)}
          >
            <Camera size={16} color="#0066CC" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onAddPage(false)}
          >
            <ImageIcon size={16} color="#0066CC" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {pages.map((page, index) => (
          <View key={page.id} style={styles.pageContainer}>
            <TouchableOpacity
              style={[
                styles.thumbnail,
                selectedPageId === page.id && styles.selectedThumbnail,
              ]}
              onPress={() => onSelectPage?.(page.id)}
            >
              <Image source={{ uri: page.imageUri }} style={styles.thumbnailImage} />
              <View style={styles.pageNumber}>
                <Text style={styles.pageNumberText}>{index + 1}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePage(page.id)}
              >
                <X size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </TouchableOpacity>
            
            <View style={styles.reorderButtons}>
              <TouchableOpacity
                style={[
                  styles.reorderButton,
                  index === 0 && styles.reorderButtonDisabled,
                ]}
                onPress={() => movePageUp(index)}
                disabled={index === 0}
              >
                <Move size={12} color={index === 0 ? '#CCCCCC' : '#666666'} />
                <Text style={[
                  styles.reorderText,
                  index === 0 && styles.reorderTextDisabled,
                ]}>↑</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.reorderButton,
                  index === pages.length - 1 && styles.reorderButtonDisabled,
                ]}
                onPress={() => movePageDown(index)}
                disabled={index === pages.length - 1}
              >
                <Move size={12} color={index === pages.length - 1 ? '#CCCCCC' : '#666666'} />
                <Text style={[
                  styles.reorderText,
                  index === pages.length - 1 && styles.reorderTextDisabled,
                ]}>↓</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        <TouchableOpacity
          style={styles.addPageThumbnail}
          onPress={() => {
            Alert.alert(
              'Add Page',
              'Choose how to add a new page',
              [
                { text: 'Camera', onPress: () => onAddPage(true) },
                { text: 'Gallery', onPress: () => onAddPage(false) },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }}
        >
          <Plus size={24} color="#0066CC" />
          <Text style={styles.addPageText}>Add Page</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  addButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  pageContainer: {
    alignItems: 'center',
  },
  thumbnail: {
    width: 80,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    position: 'relative',
  },
  selectedThumbnail: {
    borderColor: '#0066CC',
    borderWidth: 3,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pageNumberText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButtons: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  reorderButtonDisabled: {
    backgroundColor: '#F8F8F8',
  },
  reorderText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666666',
    marginLeft: 2,
  },
  reorderTextDisabled: {
    color: '#CCCCCC',
  },
  addPageThumbnail: {
    width: 80,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0066CC',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FBFF',
  },
  addPageText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0066CC',
    marginTop: 4,
    textAlign: 'center',
  },
});