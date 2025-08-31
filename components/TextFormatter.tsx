import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Share,
  Modal,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import {
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Download,
  ArrowLeft,
  PenTool,
  X,
  RotateCcw,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

interface TextFormatterProps {
  initialText: string;
  onBack: () => void;
  documentId?: string;
}

type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
type TextAlign = 'left' | 'center' | 'right';
type TextColor = 'black' | 'blue' | 'red' | 'green' | 'purple';

interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: FontSize;
  color?: TextColor;
  align?: TextAlign;
}

interface TextSegment {
  text: string;
  style: TextStyle;
}

interface SignaturePoint {
  x: number;
  y: number;
}

interface Signature {
  points: SignaturePoint[];
  color: string;
  strokeWidth: number;
}

const FONT_SIZES = {
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 22,
};

const TEXT_COLORS = {
  black: '#000000',
  blue: '#0066CC',
  red: '#FF3B30',
  green: '#34C759',
  purple: '#AF52DE',
};

export default function TextFormatter({ initialText, onBack, documentId }: TextFormatterProps) {
  const [segments, setSegments] = useState<TextSegment[]>([{ text: initialText, style: {} }]);
  const [currentStyle, setCurrentStyle] = useState<TextStyle>({});
  const [isExporting, setIsExporting] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [currentSignature, setCurrentSignature] = useState<Signature | null>(null);
  const [signatureColor, setSignatureColor] = useState('#000000');
  const [signatureStrokeWidth, setSignatureStrokeWidth] = useState(3);
  const viewShotRef = useRef<ViewShot>(null);
  const textInputRef = useRef<TextInput>(null);
  const signatureCanvasRef = useRef<View>(null);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  const getFullText = useCallback(() => {
    return segments.map(segment => segment.text).join('');
  }, [segments]);

  const applyStyleToSelection = useCallback((styleUpdate: Partial<TextStyle>) => {
    if (selectionStart === selectionEnd) {
      // No selection, update current style for future typing
      setCurrentStyle(prev => ({ ...prev, ...styleUpdate }));
      return;
    }

    // Create new segments with the style applied to selection
    const newSegments: TextSegment[] = [];
    let currentPos = 0;
    
    for (const segment of segments) {
      const segmentEnd = currentPos + segment.text.length;
      
      if (segmentEnd <= selectionStart || currentPos >= selectionEnd) {
        // Segment is outside selection
        newSegments.push(segment);
      } else {
        // Segment intersects with selection
        const segmentSelectionStart = Math.max(0, selectionStart - currentPos);
        const segmentSelectionEnd = Math.min(segment.text.length, selectionEnd - currentPos);
        
        // Before selection
        if (segmentSelectionStart > 0) {
          newSegments.push({
            text: segment.text.substring(0, segmentSelectionStart),
            style: segment.style
          });
        }
        
        // Selection with new style
        if (segmentSelectionEnd > segmentSelectionStart) {
          newSegments.push({
            text: segment.text.substring(segmentSelectionStart, segmentSelectionEnd),
            style: { ...segment.style, ...styleUpdate }
          });
        }
        
        // After selection
        if (segmentSelectionEnd < segment.text.length) {
          newSegments.push({
            text: segment.text.substring(segmentSelectionEnd),
            style: segment.style
          });
        }
      }
      
      currentPos = segmentEnd;
    }
    
    setSegments(newSegments);
  }, [segments, selectionStart, selectionEnd]);

  const exportAsTXT = async () => {
    try {
      setIsExporting(true);
      
      // Get plain text content
      const plainText = getFullText();
      const fileName = `scanned-document-${Date.now()}.txt`;
      
      if (Platform.OS === 'web') {
        // For web, create and download TXT file
        const blob = new Blob([plainText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'Document exported as TXT file!');
      } else {
        // For mobile, save as text file
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, plainText);
        
        if (Platform.OS === 'ios') {
          await Share.share({ url: fileUri });
        } else {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted') {
            await MediaLibrary.saveToLibraryAsync(fileUri);
            Alert.alert('Success', 'Document saved as TXT file!');
          } else {
            await Share.share({ url: fileUri });
          }
        }
      }
    } catch (error) {
      console.error('Error exporting TXT:', error);
      Alert.alert('Error', 'Failed to export TXT file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsDOC = async () => {
    try {
      setIsExporting(true);
      
      // Create RTF content (Rich Text Format) which can be opened by Word
      let rtfContent = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\\f0\\fs24 ';
      
      // Process each segment with formatting
      segments.forEach(segment => {
        let segmentRtf = segment.text.replace(/\n/g, '\\par ');
        
        // Apply formatting
        if (segment.style.bold) {
          segmentRtf = `{\\b ${segmentRtf}}`;
        }
        if (segment.style.italic) {
          segmentRtf = `{\\i ${segmentRtf}}`;
        }
        if (segment.style.underline) {
          segmentRtf = `{\\ul ${segmentRtf}}`;
        }
        
        // Font size (RTF uses half-points)
        if (segment.style.fontSize) {
          const rtfSize = FONT_SIZES[segment.style.fontSize] * 2;
          segmentRtf = `{\\fs${rtfSize} ${segmentRtf}}`;
        }
        
        // Text alignment
        if (segment.style.align === 'center') {
          segmentRtf = `{\\qc ${segmentRtf}}`;
        } else if (segment.style.align === 'right') {
          segmentRtf = `{\\qr ${segmentRtf}}`;
        }
        
        rtfContent += segmentRtf;
      });
      
      // Add signatures placeholder
      if (signatures.length > 0) {
        rtfContent += '\\par\\par {\\qr [Signature(s) attached]}';
      }
      
      rtfContent += '}';
      
      const fileName = `scanned-document-${Date.now()}.rtf`;
      
      if (Platform.OS === 'web') {
        // For web, create and download RTF file
        const blob = new Blob([rtfContent], { type: 'application/rtf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'Document exported as RTF file (opens in Word)!');
      } else {
        // For mobile, save as RTF file
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, rtfContent);
        
        if (Platform.OS === 'ios') {
          await Share.share({ url: fileUri });
        } else {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted') {
            await MediaLibrary.saveToLibraryAsync(fileUri);
            Alert.alert('Success', 'Document saved as RTF file (opens in Word)!');
          } else {
            await Share.share({ url: fileUri });
          }
        }
      }
    } catch (error) {
      console.error('Error exporting DOC:', error);
      Alert.alert('Error', 'Failed to export DOC file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsPDF = async () => {
    try {
      setIsExporting(true);
      
      // Create HTML content for PDF with rich formatting
      const htmlSegments = segments.map(segment => {
        const style = segment.style;
        let html = segment.text.replace(/\n/g, '<br>');
        
        if (style.bold) html = `<strong>${html}</strong>`;
        if (style.italic) html = `<em>${html}</em>`;
        if (style.underline) html = `<u>${html}</u>`;
        
        const inlineStyles = [];
        if (style.fontSize) inlineStyles.push(`font-size: ${FONT_SIZES[style.fontSize]}px`);
        if (style.color) inlineStyles.push(`color: ${TEXT_COLORS[style.color]}`);
        if (style.align) inlineStyles.push(`text-align: ${style.align}`);
        
        if (inlineStyles.length > 0) {
          html = `<span style="${inlineStyles.join('; ')}">${html}</span>`;
        }
        
        return html;
      }).join('');

      // Add signatures to HTML if any exist
      let signaturesHtml = '';
      if (signatures.length > 0) {
        signaturesHtml = '<div style="margin-top: 40px; text-align: right;">';
                 signatures.forEach((signature, index) => {
           const svgPath = generateSvgPath(signature.points);
          
          signaturesHtml += `
            <svg width="120" height="60" style="margin-bottom: 20px;">
              <path d="${svgPath}" stroke="${signature.color}" stroke-width="${signature.strokeWidth}" fill="none"/>
            </svg>
          `;
        });
        signaturesHtml += '</div>';
      }
      
      const htmlContent = `
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
          <div class="content">${htmlSegments}${signaturesHtml}</div>
        </body>
        </html>
      `;

      // For web, create and download HTML file
      if (Platform.OS === 'web') {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `scanned-document-${Date.now()}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'Document exported as HTML file!');
      } else {
        // For mobile, save as HTML file
        const fileName = `scanned-document-${Date.now()}.html`;
        const fileUri = FileSystem.documentDirectory + fileName;
        
        await FileSystem.writeAsStringAsync(fileUri, htmlContent);
        
        if (Platform.OS === 'ios') {
          await Share.share({ url: fileUri });
        } else {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted') {
            await MediaLibrary.saveToLibraryAsync(fileUri);
            Alert.alert('Success', 'Document saved as HTML file!');
          } else {
            await Share.share({ url: fileUri });
          }
        }
      }
    } catch (error) {
      console.error('Error exporting HTML:', error);
      Alert.alert('Error', 'Failed to export document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsImage = async (format: 'png' | 'jpg') => {
    try {
      setIsExporting(true);
      
      if (!viewShotRef.current) {
        throw new Error('ViewShot ref not available');
      }

      const uri = await (viewShotRef.current as any)?.capture();

      if (!uri) {
        throw new Error('Failed to capture image');
      }

      if (Platform.OS === 'web') {
        // For web, download the image
        const response = await fetch(uri);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `scanned-document-${Date.now()}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Success', `Document exported as ${format.toUpperCase()} file!`);
      } else {
        // For mobile, save to gallery
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert('Success', `Document saved as ${format.toUpperCase()} to your gallery!`);
        } else {
          await Share.share({ url: uri });
        }
      }
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
      Alert.alert('Error', `Failed to export as ${format.toUpperCase()}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  const showExportOptions = () => {
    Alert.alert(
      'Export Document',
      'Choose export format:',
      [
        { text: 'TXT (Plain Text)', onPress: exportAsTXT },
        { text: 'DOC (Word Format)', onPress: exportAsDOC },
        { text: 'HTML (Web Format)', onPress: exportAsPDF },
        { text: 'PNG Image', onPress: () => exportAsImage('png') },
        { text: 'JPG Image', onPress: () => exportAsImage('jpg') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const openSignatureModal = () => {
    setShowSignatureModal(true);
    setCurrentSignature({ points: [], color: signatureColor, strokeWidth: signatureStrokeWidth });
  };

  const updateCurrentSignatureColor = (color: string) => {
    setSignatureColor(color);
    setCurrentSignature(prev => {
      if (!prev) return prev;
      return { ...prev, color };
    });
  };

  const updateCurrentSignatureWidth = (width: number) => {
    setSignatureStrokeWidth(width);
    setCurrentSignature(prev => {
      if (!prev) return prev;
      return { ...prev, strokeWidth: width };
    });
  };

  const closeSignatureModal = () => {
    setShowSignatureModal(false);
    setCurrentSignature(null);
  };

  const clearSignature = () => {
    setCurrentSignature({ points: [], color: signatureColor, strokeWidth: signatureStrokeWidth });
  };

  const saveSignature = () => {
    if (currentSignature && currentSignature.points.length > 0) {
      setSignatures(prev => [...prev, currentSignature]);
      closeSignatureModal();
      Alert.alert('Success', 'Signature added to document!');
    } else {
      Alert.alert('Error', 'Please draw a signature first.');
    }
  };

  const removeSignature = (index: number) => {
    setSignatures(prev => prev.filter((_, i) => i !== index));
  };

  const generateSvgPath = (points: SignaturePoint[]): string => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    
    return path;
  };

  const onSignatureGestureEvent = (event: any) => {
    const { x, y, state } = event.nativeEvent;
    
    if (state === State.ACTIVE) {
      console.log('Drawing at:', x, y);
      setCurrentSignature(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          points: [...prev.points, { x, y }]
        };
      });
    }
  };

  const onSignatureGestureStateChange = (event: any) => {
    const { state, x, y } = event.nativeEvent;
    
    if (state === State.BEGAN) {
      // Start a new stroke
      setCurrentSignature(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          points: [{ x, y }]
        };
      });
    } else if (state === State.END || state === State.CANCELLED) {
      // End the stroke
      console.log('Signature stroke ended with', currentSignature?.points.length, 'points');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={24} color="#0066CC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Format & Export</Text>
        <TouchableOpacity
          style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
          onPress={showExportOptions}
          disabled={isExporting}
        >
          <Download size={20} color="#0066CC" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Formatting Controls */}
        <View style={styles.controlsContainer}>
          <Text style={styles.controlsTitle}>Formatting Options</Text>
          <Text style={styles.controlsSubtitle}>
            {selectionStart === selectionEnd 
              ? 'Select text to apply formatting' 
              : `${selectionEnd - selectionStart} characters selected`}
          </Text>
          
          {/* Text Style */}
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Text Style</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  currentStyle.bold && styles.formatButtonActive,
                ]}
                onPress={() => applyStyleToSelection({ bold: !currentStyle.bold })}
              >
                <Bold size={16} color={currentStyle.bold ? '#FFFFFF' : '#0066CC'} />
                <Text
                  style={[
                    styles.formatButtonText,
                    currentStyle.bold && styles.formatButtonTextActive,
                  ]}
                >
                  Bold
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  currentStyle.italic && styles.formatButtonActive,
                ]}
                onPress={() => applyStyleToSelection({ italic: !currentStyle.italic })}
              >
                <Italic size={16} color={currentStyle.italic ? '#FFFFFF' : '#0066CC'} />
                <Text
                  style={[
                    styles.formatButtonText,
                    currentStyle.italic && styles.formatButtonTextActive,
                  ]}
                >
                  Italic
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  currentStyle.underline && styles.formatButtonActive,
                ]}
                onPress={() => applyStyleToSelection({ underline: !currentStyle.underline })}
              >
                <Underline size={16} color={currentStyle.underline ? '#FFFFFF' : '#0066CC'} />
                <Text
                  style={[
                    styles.formatButtonText,
                    currentStyle.underline && styles.formatButtonTextActive,
                  ]}
                >
                  Underline
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Font Size */}
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Font Size</Text>
            <View style={styles.buttonRow}>
              {(Object.keys(FONT_SIZES) as FontSize[]).map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.formatButton,
                    currentStyle.fontSize === size && styles.formatButtonActive,
                  ]}
                  onPress={() => applyStyleToSelection({ fontSize: size })}
                >
                  <Type size={16} color={currentStyle.fontSize === size ? '#FFFFFF' : '#0066CC'} />
                  <Text
                    style={[
                      styles.formatButtonText,
                      currentStyle.fontSize === size && styles.formatButtonTextActive,
                    ]}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Text Color */}
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Text Color</Text>
            <View style={styles.buttonRow}>
              {(Object.keys(TEXT_COLORS) as TextColor[]).map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: TEXT_COLORS[color] },
                    currentStyle.color === color && styles.colorButtonActive,
                  ]}
                  onPress={() => applyStyleToSelection({ color })}
                >
                  {currentStyle.color === color && (
                    <View style={styles.colorButtonCheck} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Text Alignment */}
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Text Alignment</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  currentStyle.align === 'left' && styles.formatButtonActive,
                ]}
                onPress={() => applyStyleToSelection({ align: 'left' })}
              >
                <AlignLeft size={16} color={currentStyle.align === 'left' ? '#FFFFFF' : '#0066CC'} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  currentStyle.align === 'center' && styles.formatButtonActive,
                ]}
                onPress={() => applyStyleToSelection({ align: 'center' })}
              >
                <AlignCenter size={16} color={currentStyle.align === 'center' ? '#FFFFFF' : '#0066CC'} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  currentStyle.align === 'right' && styles.formatButtonActive,
                ]}
                onPress={() => applyStyleToSelection({ align: 'right' })}
              >
                <AlignRight size={16} color={currentStyle.align === 'right' ? '#FFFFFF' : '#0066CC'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Signature */}
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Signature</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.signatureButton}
                onPress={openSignatureModal}
              >
                <PenTool size={16} color="#0066CC" />
                <Text style={styles.signatureButtonText}>Add Signature</Text>
              </TouchableOpacity>
            </View>
            {signatures.length > 0 && (
              <View style={styles.signaturesList}>
                <Text style={styles.signaturesTitle}>Added Signatures ({signatures.length})</Text>
                {signatures.map((signature, index) => (
                  <View key={index} style={styles.signatureItem}>
                                         <View style={styles.signaturePreview}>
                       <Svg width={60} height={30} style={styles.signatureSvg}>
                         <Path
                           d={generateSvgPath(signature.points)}
                           stroke={signature.color}
                           strokeWidth={signature.strokeWidth}
                           fill="none"
                           strokeLinecap="round"
                           strokeLinejoin="round"
                         />
                       </Svg>
                     </View>
                    <TouchableOpacity
                      style={styles.removeSignatureButton}
                      onPress={() => removeSignature(index)}
                    >
                      <X size={14} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Text Editor */}
        <View style={styles.editorContainer}>
          <Text style={styles.editorTitle}>Edit Text</Text>
          <TextInput
            ref={textInputRef}
            style={styles.textEditor}
            value={getFullText()}
            onChangeText={(newText) => {
              setSegments([{ text: newText, style: {} }]);
            }}
            onSelectionChange={(event) => {
              const { start, end } = event.nativeEvent.selection;
              setSelectionStart(start);
              setSelectionEnd(end);
              
              // Update current style based on selection
              if (start === end && segments.length > 0) {
                // Find the segment at cursor position
                let pos = 0;
                for (const segment of segments) {
                  if (pos + segment.text.length >= start) {
                    setCurrentStyle(segment.style);
                    break;
                  }
                  pos += segment.text.length;
                }
              }
            }}
            multiline
            placeholder="Enter or edit your text here..."
            placeholderTextColor="#8E8E93"
          />
        </View>

        {/* Preview */}
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Preview</Text>
          <ViewShot ref={viewShotRef} style={styles.previewContent}>
            <View style={styles.previewDocument}>
              <Text style={styles.previewText}>
                {segments.length > 0 ? segments.map((segment, index) => {
                  const segmentStyle = {
                    fontSize: segment.style.fontSize ? FONT_SIZES[segment.style.fontSize] : FONT_SIZES.medium,
                    fontWeight: segment.style.bold ? 'bold' as const : 'normal' as const,
                    fontStyle: segment.style.italic ? 'italic' as const : 'normal' as const,
                    color: segment.style.color ? TEXT_COLORS[segment.style.color] : TEXT_COLORS.black,
                    textDecorationLine: segment.style.underline ? 'underline' as const : 'none' as const,
                    textAlign: segment.style.align || 'left' as const,
                  };
                  
                  return (
                    <Text key={index} style={segmentStyle}>
                      {segment.text}
                    </Text>
                  );
                }) : 'Your formatted text will appear here...'}
              </Text>
              
              {/* Signatures */}
              {signatures.length > 0 && (
                <View style={styles.signaturesContainer}>
                                   {signatures.map((signature, index) => (
                   <Svg key={index} width={120} height={60} style={styles.signatureInPreview}>
                     <Path
                       d={generateSvgPath(signature.points)}
                       stroke={signature.color}
                       strokeWidth={signature.strokeWidth}
                       fill="none"
                       strokeLinecap="round"
                       strokeLinejoin="round"
                     />
                   </Svg>
                 ))}
                </View>
              )}
            </View>
          </ViewShot>
        </View>

        {/* Signature Modal */}
        <Modal
          visible={showSignatureModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeSignatureModal} style={styles.modalCloseButton}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Signature</Text>
              <TouchableOpacity onPress={saveSignature} style={styles.modalSaveButton}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.signatureCanvasContainer}>
              <Text style={styles.signatureInstructions}>
                Draw your signature below
              </Text>
              
              <View style={styles.signatureControls}>
                <View style={styles.signatureControlGroup}>
                  <Text style={styles.signatureControlLabel}>Color</Text>
                                     <View style={styles.colorPicker}>
                     {['#000000', '#0066CC', '#FF3B30', '#34C759', '#AF52DE'].map((color) => (
                       <TouchableOpacity
                         key={color}
                         style={[
                           styles.colorOption,
                           { backgroundColor: color },
                           signatureColor === color && styles.colorOptionActive,
                         ]}
                         onPress={() => updateCurrentSignatureColor(color)}
                       />
                     ))}
                   </View>
                </View>
                
                <View style={styles.signatureControlGroup}>
                  <Text style={styles.signatureControlLabel}>Thickness</Text>
                                     <View style={styles.thicknessSlider}>
                     {[1, 2, 3, 4, 5].map((width) => (
                       <TouchableOpacity
                         key={width}
                         style={[
                           styles.thicknessOption,
                           signatureStrokeWidth === width && styles.thicknessOptionActive,
                         ]}
                         onPress={() => updateCurrentSignatureWidth(width)}
                       >
                         <View style={[styles.thicknessIndicator, { height: width }]} />
                       </TouchableOpacity>
                     ))}
                   </View>
                </View>
              </View>
              
              <PanGestureHandler 
                onGestureEvent={onSignatureGestureEvent}
                onHandlerStateChange={onSignatureGestureStateChange}
              >
                <View ref={signatureCanvasRef} style={styles.signatureCanvas}>
                  <Text style={styles.signatureCanvasHint}>
                    {currentSignature && currentSignature.points.length > 0 
                      ? `Drawing... (${currentSignature.points.length} points)`
                      : 'Touch and drag to draw your signature'
                    }
                  </Text>
                  {currentSignature && currentSignature.points.length > 0 && (
                    <Svg width="100%" height="100%" style={styles.signatureSvgCanvas}>
                      <Path
                        d={generateSvgPath(currentSignature.points)}
                        stroke={currentSignature.color}
                        strokeWidth={currentSignature.strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  )}
                </View>
              </PanGestureHandler>
              
              <TouchableOpacity onPress={clearSignature} style={styles.clearSignatureButton}>
                <RotateCcw size={16} color="#0066CC" />
                <Text style={styles.clearSignatureText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  exportButton: {
    padding: 8,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  controlsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  controlsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  controlsSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  controlGroup: {
    marginBottom: 20,
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  formatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066CC',
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  formatButtonActive: {
    backgroundColor: '#0066CC',
  },
  formatButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0066CC',
  },
  formatButtonTextActive: {
    color: '#FFFFFF',
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButtonActive: {
    borderColor: '#0066CC',
    borderWidth: 3,
  },
  colorButtonCheck: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  editorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  textEditor: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    color: '#000000',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  previewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  previewContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewDocument: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
  },
  previewText: {
    lineHeight: 24,
    color: '#000000',
  },
  signatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066CC',
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  signatureButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0066CC',
  },
  signaturesList: {
    marginTop: 12,
  },
  signaturesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  signatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  signaturePreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureSvg: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  removeSignatureButton: {
    padding: 4,
  },
  signaturesContainer: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  signatureInPreview: {
    marginBottom: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalSaveButton: {
    padding: 8,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
  signatureCanvasContainer: {
    flex: 1,
    padding: 20,
  },
  signatureInstructions: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  signatureControls: {
    marginBottom: 20,
  },
  signatureControlGroup: {
    marginBottom: 16,
  },
  signatureControlLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  colorOptionActive: {
    borderColor: '#0066CC',
    borderWidth: 3,
  },
  thicknessSlider: {
    flexDirection: 'row',
    gap: 8,
  },
  thicknessOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  thicknessOptionActive: {
    borderColor: '#0066CC',
    borderWidth: 3,
  },
  thicknessIndicator: {
    width: 20,
    backgroundColor: '#000000',
    borderRadius: 1,
  },
  signatureCanvas: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    marginBottom: 20,
    minHeight: 200,
    position: 'relative',
  },
  signatureCanvasHint: {
    position: 'absolute',
    top: 10,
    left: 10,
    fontSize: 12,
    color: '#8E8E93',
    zIndex: 1,
  },
  signatureSvgCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  clearSignatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    gap: 4,
  },
  clearSignatureText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0066CC',
  },
});