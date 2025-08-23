import React, { useState } from 'react';
import SignaturePad from './SignaturePad';
import SignatureLibrary from './SignatureLibrary';
import SignatureOverlay from './SignatureOverlay';
import { SavedSignature, SignatureInstance } from '@/types/scan';

interface SignatureManagerProps {
  mode: 'create' | 'library' | 'overlay';
  imageUri?: string;
  existingSignatures?: SignatureInstance[];
  onSave?: (svgPath: string, width: number, height: number) => void;
  onSaveSignatures?: (signatures: SignatureInstance[]) => void;
  onCancel: () => void;
  allowSaveToLibrary?: boolean;
}

export default function SignatureManager({
  mode,
  imageUri,
  existingSignatures,
  onSave,
  onSaveSignatures,
  onCancel,
  allowSaveToLibrary = true,
}: SignatureManagerProps) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [selectedSignature, setSelectedSignature] = useState<SavedSignature | null>(null);

  const handleCreateNew = () => {
    setCurrentMode('create');
  };

  const handleSelectSignature = (signature: SavedSignature) => {
    setSelectedSignature(signature);
    if (onSave) {
      onSave(signature.svgPath, signature.width, signature.height);
    }
  };

  const handleSignaturePadSave = (svgPath: string, width: number, height: number) => {
    if (onSave) {
      onSave(svgPath, width, height);
    }
  };

  const handleOverlaySave = (signatures: SignatureInstance[]) => {
    if (onSaveSignatures) {
      onSaveSignatures(signatures);
    }
  };

  switch (currentMode) {
    case 'create':
      return (
        <SignaturePad
          onSave={handleSignaturePadSave}
          onCancel={onCancel}
          allowSaveToLibrary={allowSaveToLibrary}
        />
      );

    case 'library':
      return (
        <SignatureLibrary
          onSelectSignature={handleSelectSignature}
          onCreateNew={handleCreateNew}
          onCancel={onCancel}
        />
      );

    case 'overlay':
      if (!imageUri) {
        throw new Error('imageUri is required for overlay mode');
      }
      return (
        <SignatureOverlay
          imageUri={imageUri}
          existingSignatures={existingSignatures}
          onSave={handleOverlaySave}
          onCancel={onCancel}
        />
      );

    default:
      return null;
  }
}