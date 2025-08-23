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
}

export interface MultiPageDocument {
  id: string;
  title: string;
  pages: DocumentPage[];
  createdAt: Date;
  updatedAt: Date;
}