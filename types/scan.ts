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

export interface AnnotationBase {
  id: string;
  type: 'highlight' | 'drawing' | 'textbox';
  x: number;
  y: number;
  width: number;
  height: number;
  pageId?: string;
  createdAt: Date;
}

export interface HighlightAnnotation extends AnnotationBase {
  type: 'highlight';
  color: string;
  opacity: number;
}

export interface DrawingAnnotation extends AnnotationBase {
  type: 'drawing';
  paths: string[];
  strokeColor: string;
  strokeWidth: number;
}

export interface TextBoxAnnotation extends AnnotationBase {
  type: 'textbox';
  text: string;
  fontSize: number;
  fontColor: string;
  backgroundColor?: string;
}

export type Annotation = HighlightAnnotation | DrawingAnnotation | TextBoxAnnotation;

export interface DocumentMergeOptions {
  title: string;
  pageOrder: string[];
  includeAnnotations: boolean;
}

export interface DocumentSplitOptions {
  originalDocumentId: string;
  pagesToExtract: string[];
  newDocumentTitle: string;
}

export interface AnnotatedDocument extends MultiPageDocument {
  annotations: Annotation[];
}

export interface PDFExportOptions {
  quality: 'low' | 'medium' | 'high';
  includeAnnotations: boolean;
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
}