import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Settings, Zap } from 'lucide-react-native';

interface OptimizationOverlayProps {
  visible: boolean;
  progress: string;
}

export default function OptimizationOverlay({ visible, progress }: OptimizationOverlayProps) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (visible) {
      const animation = Animated.loop(
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
      );
      animation.start();
      
      return () => {
        animation.stop();
        pulseAnim.setValue(1);
      };
    }
  }, [visible, pulseAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Animated.View 
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: pulseAnim }]
              }
            ]}
          >
            <View style={styles.iconBackground}>
              <Settings size={32} color="#0066CC" />
            </View>
            <View style={styles.zapIcon}>
              <Zap size={16} color="#FFD700" />
            </View>
          </Animated.View>
          
          <Text style={styles.title}>Optimizing Image</Text>
          <Text style={styles.subtitle}>
            {progress || 'Preparing image for better OCR accuracy...'}
          </Text>
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
          </View>
          
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <View style={styles.benefitDot} />
              <Text style={styles.benefitText}>Reducing file size by up to 70%</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={styles.benefitDot} />
              <Text style={styles.benefitText}>Enhancing text clarity</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={styles.benefitDot} />
              <Text style={styles.benefitText}>Faster AI processing</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  zapIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  loadingContainer: {
    marginBottom: 24,
  },
  benefitsList: {
    alignSelf: 'stretch',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0066CC',
    marginRight: 12,
  },
  benefitText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
});