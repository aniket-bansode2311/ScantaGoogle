export interface ScanResult {
  id: string;
  imageUri: string;
  extractedText: string;
  timestamp: Date;
}

export interface DocumentPage {
  id: string;
  imageUri: string;
  extractedText?: string;
  order: number;
  signatures?: SignatureInstance[];
}

export interface MultiPageDocument {
  id: string;
  title: string;
  pages: DocumentPage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedSignature {
  id: string;
  name: string;
  svgPath: string;
  width: number;
  height: number;
  createdAt: Date;
}

export interface SignatureInstance {
  id: string;
  signatureId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}