import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { 
  Scan, 
  Crop, 
  Sun, 
  Contrast, 
  Sparkles, 
  Focus,
  CheckCircle 
} from 'lucide-react-native';

interface AdvancedProcessingOverlayProps {
  visible: boolean;
  currentStep: string;
  appliedEnhancements: string[];
  processingTimeMs?: number;
  documentBounds?: {
    confidence: number;
  };
}

const PROCESSING_STEPS = [
  { key: 'Border Detection', icon: Scan, color: '#3b82f6' },
  { key: 'Perspective Correction', icon: Crop, color: '#10b981' },
  { key: 'Glare Removal', icon: Sparkles, color: '#f59e0b' },
  { key: 'Shadow Removal', icon: Sun, color: '#ef4444' },
  { key: 'Contrast Enhancement', icon: Contrast, color: '#8b5cf6' },
  { key: 'Sharpening', icon: Focus, color: '#06b6d4' },
];

export default function AdvancedProcessingOverlay({
  visible,
  currentStep,
  appliedEnhancements,
  processingTimeMs,
  documentBounds,
}: AdvancedProcessingOverlayProps) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Animate progress based on completed steps
      const progress = appliedEnhancements.length / PROCESSING_STEPS.length;
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      progressAnim.setValue(0);
    }
  }, [visible, appliedEnhancements.length]);

  if (!visible) return null;

  const isComplete = currentStep === 'Complete';
  const progress = appliedEnhancements.length / PROCESSING_STEPS.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              {isComplete ? (
                <CheckCircle size={32} color='#10b981' />
              ) : (
                <ActivityIndicator size={32} color='#3b82f6' />
              )}
            </View>
            <Text style={styles.title}>
              {isComplete ? 'Processing Complete!' : 'Advanced Processing'}
            </Text>
            <Text style={styles.subtitle}>
              {isComplete 
                ? `Completed in ${processingTimeMs}ms`
                : currentStep || 'Initializing...'
              }
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progress * 100)}% Complete
            </Text>
          </View>

          {/* Processing Steps */}
          <View style={styles.stepsContainer}>
            {PROCESSING_STEPS.map((step, index) => {
              const isCompleted = appliedEnhancements.includes(step.key);
              const isCurrent = currentStep === step.key;
              const IconComponent = step.icon;

              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={[
                    styles.stepIcon,
                    isCompleted && styles.stepIconCompleted,
                    isCurrent && styles.stepIconCurrent,
                  ]}>
                    {isCompleted ? (
                      <CheckCircle size={16} color='#FFFFFF' />
                    ) : (
                      <IconComponent 
                        size={16} 
                        color={isCurrent ? '#FFFFFF' : step.color} 
                      />
                    )}
                  </View>
                  <Text style={[
                    styles.stepText,
                    isCompleted && styles.stepTextCompleted,
                    isCurrent && styles.stepTextCurrent,
                  ]}>
                    {step.key}
                  </Text>
                  {isCompleted && (
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>✓</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Document Analysis */}
          {documentBounds && (
            <View style={styles.analysisContainer}>
              <Text style={styles.analysisTitle}>Document Analysis</Text>
              <View style={styles.analysisRow}>
                <Text style={styles.analysisLabel}>Border Detection:</Text>
                <Text style={[
                  styles.analysisValue,
                  documentBounds.confidence > 0.8 && styles.analysisValueGood,
                  documentBounds.confidence < 0.6 && styles.analysisValuePoor,
                ]}>
                  {(documentBounds.confidence * 100).toFixed(1)}% confidence
                </Text>
              </View>
            </View>
          )}

          {/* Enhancement Summary */}
          {isComplete && appliedEnhancements.length > 0 && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Applied Enhancements</Text>
              <Text style={styles.summaryText}>
                {appliedEnhancements.join(' • ')}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  stepsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  stepIconCompleted: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  stepIconCurrent: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  stepTextCompleted: {
    color: '#10b981',
    fontWeight: '600',
  },
  stepTextCurrent: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  analysisContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analysisLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  analysisValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  analysisValueGood: {
    color: '#10b981',
  },
  analysisValuePoor: {
    color: '#ef4444',
  },
  summaryContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 12,
    color: '#0284c7',
    lineHeight: 18,
  },
});