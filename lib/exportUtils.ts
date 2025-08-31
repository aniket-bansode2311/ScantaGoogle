import { Platform, Alert, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export interface ExportOptions {
  text: string;
  format: 'txt' | 'doc' | 'html';
  includeFormatting?: boolean;
  fileName?: string;
}

export const exportDocument = async (options: ExportOptions): Promise<void> => {
  const { text, format, fileName } = options;
  const timestamp = Date.now();
  const defaultFileName = fileName || `scanned-document-${timestamp}`;
  
  try {
    let content: string;
    let mimeType: string;
    let fileExtension: string;
    
    switch (format) {
      case 'txt':
        content = text;
        mimeType = 'text/plain';
        fileExtension = 'txt';
        break;
        
      case 'doc':
        // Create RTF content (Rich Text Format) which can be opened by Word
        content = createRTFContent(text);
        mimeType = 'application/rtf';
        fileExtension = 'rtf';
        break;
        
      case 'html':
        content = createHTMLContent(text);
        mimeType = 'text/html';
        fileExtension = 'html';
        break;
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    const fullFileName = `${defaultFileName}.${fileExtension}`;
    
    if (Platform.OS === 'web') {
      // For web, create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fullFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      const formatName = format === 'doc' ? 'RTF (Word)' : format.toUpperCase();
      Alert.alert('Success', `Document exported as ${formatName} file!`);
    } else {
      // For mobile, save file
      const fileUri = FileSystem.documentDirectory + fullFileName;
      await FileSystem.writeAsStringAsync(fileUri, content);
      
      if (Platform.OS === 'ios') {
        await Share.share({ url: fileUri });
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(fileUri);
          const formatName = format === 'doc' ? 'RTF (Word)' : format.toUpperCase();
          Alert.alert('Success', `Document saved as ${formatName} file!`);
        } else {
          await Share.share({ url: fileUri });
        }
      }
    }
  } catch (error) {
    console.error(`Error exporting ${format}:`, error);
    Alert.alert('Error', `Failed to export ${format.toUpperCase()} file. Please try again.`);
  }
};

const createRTFContent = (text: string): string => {
  // Create RTF content (Rich Text Format) which can be opened by Word
  let rtfContent = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\\f0\\fs24 ';
  
  // Process text and convert line breaks
  const processedText = text.replace(/\n/g, '\\par ');
  rtfContent += processedText;
  rtfContent += '}';
  
  return rtfContent;
};

const createHTMLContent = (text: string): string => {
  const htmlText = text.replace(/\n/g, '<br>');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Scanned Document</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 40px;
          line-height: 1.6;
          color: #333;
        }
        .content {
          white-space: pre-wrap;
        }
      </style>
    </head>
    <body>
      <div class="content">${htmlText}</div>
    </body>
    </html>
  `;
};

export const showExportOptions = (text: string, fileName?: string): void => {
  Alert.alert(
    'Export Document',
    'Choose export format:',
    [
      { 
        text: 'TXT (Plain Text)', 
        onPress: () => exportDocument({ text, format: 'txt', fileName }) 
      },
      { 
        text: 'DOC (Word Format)', 
        onPress: () => exportDocument({ text, format: 'doc', fileName }) 
      },
      { 
        text: 'HTML (Web Format)', 
        onPress: () => exportDocument({ text, format: 'html', fileName }) 
      },
      { text: 'Cancel', style: 'cancel' },
    ],
    { cancelable: true }
  );
};