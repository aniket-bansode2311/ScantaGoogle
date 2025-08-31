import React, { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';
import { DocumentEditingScreen } from '@/components/editing';
import { MultiPageDocument } from '@/types/scan';

// Mock document data - in a real app, this would come from your database
const mockDocument: MultiPageDocument = {
  id: '1',
  title: 'Sample Document',
  pages: [
    {
      id: 'page1',
      imageUri: 'https://picsum.photos/400/600?random=1',
      extractedText: 'This is the first page of the document.',
      order: 0,
    },
    {
      id: 'page2', 
      imageUri: 'https://picsum.photos/400/600?random=2',
      extractedText: 'This is the second page of the document.',
      order: 1,
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

export default function DocumentEditingRoute() {
  const router = useRouter();
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const [document, setDocument] = useState<MultiPageDocument>(mockDocument);

  const handleBack = () => {
    router.back();
  };

  const handleDocumentUpdate = (updatedDocument: MultiPageDocument) => {
    setDocument(updatedDocument);
    
    // In a real app, you would save the updated document to your database here
    console.log('📝 Document updated:', updatedDocument.title);
    
    // Show success message
    Alert.alert('Success', 'Document updated successfully!');
  };

  return (
    <DocumentEditingScreen
      document={document}
      onBack={handleBack}
      onDocumentUpdate={handleDocumentUpdate}
    />
  );
}