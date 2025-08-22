# Document Scanner App

A powerful document scanner app that extracts text from images using AI technology and stores them securely in the cloud.

## Features

- **Document Scanning**: Scan documents using camera or select from gallery
- **Text Extraction**: AI-powered text extraction from images
- **Text Formatting**: Rich text editing with formatting options
- **Signature Feature**: Add digital signatures to documents
- **Document Management**: Save, organize, and search documents
- **Export Options**: Export as PDF, PNG, or JPG
- **Cloud Storage**: Secure document storage with Supabase

## Signature Feature

The app now includes a powerful signature feature that allows users to:

- **Draw Signatures**: Use touch gestures to draw signatures directly on the screen
- **Customize Appearance**: Choose from multiple colors and stroke thicknesses
- **Multiple Signatures**: Add multiple signatures to a single document
- **Preview**: See signatures in real-time preview
- **Export**: Signatures are included in exported documents (PDF, PNG, JPG)
- **Manage**: Remove signatures individually or clear all

### How to Use Signatures

1. **Open Document Editor**: After scanning a document, tap "Format Text"
2. **Add Signature**: Tap the "Add Signature" button in the formatting controls
3. **Draw Signature**: Use your finger or stylus to draw your signature
4. **Customize**: Choose color and thickness using the controls
5. **Save**: Tap "Save" to add the signature to your document
6. **Preview**: See your signature in the document preview
7. **Export**: Signatures are automatically included when exporting

### Signature Controls

- **Color Options**: Black, Blue, Red, Green, Purple
- **Thickness**: 5 different stroke widths (1-5)
- **Clear**: Reset the signature canvas
- **Remove**: Delete individual signatures from the document

## Technical Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Rork AI for text extraction
- **UI**: Custom components with Lucide React Native icons
- **Gestures**: React Native Gesture Handler for signature drawing
- **Graphics**: React Native SVG for signature rendering

## Getting Started

1. Install dependencies: `npm install`
2. Set up Supabase configuration
3. Run the app: `npm start`
4. Scan documents and add signatures!

## Version

1.0.0 - Now with signature support!
