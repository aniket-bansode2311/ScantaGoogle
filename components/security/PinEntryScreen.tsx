import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Delete } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface PinEntryScreenProps {
  title: string;
  subtitle?: string;
  onPinComplete: (pin: string) => Promise<boolean>;
  onCancel?: () => void;
  showCancel?: boolean;
  maxAttempts?: number;
}

const PinEntryScreen: React.FC<PinEntryScreenProps> = ({
  title,
  subtitle,
  onPinComplete,
  onCancel,
  showCancel = false,
  maxAttempts = 5,
}) => {
  const [pin, setPin] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const triggerHapticFeedback = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const triggerErrorFeedback = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Vibration.vibrate(200);
    }
  }, []);

  const shakeError = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnimation]);

  const handleNumberPress = useCallback((number: string) => {
    if (pin.length < 4 && !isProcessing) {
      triggerHapticFeedback();
      setPin(prev => prev + number);
    }
  }, [pin.length, isProcessing, triggerHapticFeedback]);

  const handleDelete = useCallback(() => {
    if (pin.length > 0 && !isProcessing) {
      triggerHapticFeedback();
      setPin(prev => prev.slice(0, -1));
    }
  }, [pin.length, isProcessing, triggerHapticFeedback]);

  const handlePinComplete = useCallback(async (completedPin: string) => {
    setIsProcessing(true);
    
    try {
      const isValid = await onPinComplete(completedPin);
      
      if (isValid) {
        triggerHapticFeedback();
        setPin('');
        setAttempts(0);
      } else {
        triggerErrorFeedback();
        shakeError();
        setPin('');
        setAttempts(prev => prev + 1);
        
        if (attempts + 1 >= maxAttempts) {
          Alert.alert(
            'Too Many Attempts',
            'You have exceeded the maximum number of PIN attempts. Please try again later.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      triggerErrorFeedback();
      shakeError();
      setPin('');
    } finally {
      setIsProcessing(false);
    }
  }, [onPinComplete, attempts, maxAttempts, shakeError, triggerHapticFeedback, triggerErrorFeedback]);

  useEffect(() => {
    if (pin.length === 4) {
      handlePinComplete(pin);
    }
  }, [pin, handlePinComplete]);

  const renderPinDots = () => {
    return (
      <Animated.View 
        style={[
          styles.pinDotsContainer,
          { transform: [{ translateX: shakeAnimation }] }
        ]}
      >
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              pin.length > index && styles.pinDotFilled,
            ]}
          />
        ))}
      </Animated.View>
    );
  };

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'delete'],
    ];

    return (
      <View style={styles.numberPad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map((item, itemIndex) => {
              if (item === '') {
                return <View key={itemIndex} style={styles.numberButton} />;
              }
              
              if (item === 'delete') {
                return (
                  <TouchableOpacity
                    key={itemIndex}
                    style={styles.numberButton}
                    onPress={handleDelete}
                    disabled={isProcessing}
                  >
                    <Delete size={24} color="#666666" />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.numberButton}
                  onPress={() => handleNumberPress(item)}
                  disabled={isProcessing}
                >
                  <Text style={styles.numberText}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Shield size={32} color="#0066CC" />
          </View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          
          {attempts > 0 && (
            <Text style={styles.errorText}>
              Incorrect PIN. {maxAttempts - attempts} attempts remaining.
            </Text>
          )}
        </View>

        {renderPinDots()}
        {renderNumberPad()}

        {showCancel && onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isProcessing}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  pinDotFilled: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  numberPad: {
    alignItems: 'center',
  },
  numberRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  numberButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  numberText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 16,
  },
  cancelText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
  },
});

export default PinEntryScreen;