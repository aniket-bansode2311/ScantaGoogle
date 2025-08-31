import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, Delete } from 'lucide-react-native';

interface PinEntryProps {
  title: string;
  subtitle?: string;
  onPinComplete: (pin: string) => void;
  onCancel?: () => void;
  showCancel?: boolean;
  maxAttempts?: number;
  onMaxAttemptsReached?: () => void;
}

export interface PinEntryRef {
  showError: () => void;
}

const PIN_LENGTH = 4;

const PinEntry = forwardRef<PinEntryRef, PinEntryProps>(({
  title,
  subtitle,
  onPinComplete,
  onCancel,
  showCancel = false,
  maxAttempts = 5,
  onMaxAttemptsReached,
}: PinEntryProps, ref) => {
  const [pin, setPin] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);
  const [isError, setIsError] = useState<boolean>(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const handleNumberPress = (number: string) => {
    if (pin.length < PIN_LENGTH) {
      const newPin = pin + number;
      setPin(newPin);
      
      if (newPin.length === PIN_LENGTH) {
        // Small delay to show the last dot before processing
        setTimeout(() => {
          onPinComplete(newPin);
        }, 100);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const showError = () => {
    setIsError(true);
    setPin('');
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Vibration.vibrate(400);
    }
    
    // Shake animation
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsError(false);
    });
    
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    if (newAttempts >= maxAttempts && onMaxAttemptsReached) {
      onMaxAttemptsReached();
    }
  };

  useImperativeHandle(ref, () => ({
    showError,
  }));

  // Reset error state when PIN changes
  useEffect(() => {
    if (isError && pin.length === 0) {
      setIsError(false);
    }
  }, [pin, isError]);

  const renderPinDots = () => {
    return (
      <Animated.View 
        style={[
          styles.pinDotsContainer,
          { transform: [{ translateX: shakeAnimation }] }
        ]}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              pin.length > index && styles.pinDotFilled,
              isError && styles.pinDotError,
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
                    disabled={pin.length === 0}
                  >
                    <Delete 
                      size={24} 
                      color={pin.length === 0 ? '#C7C7CC' : '#000000'} 
                    />
                  </TouchableOpacity>
                );
              }
              
              return (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.numberButton}
                  onPress={() => handleNumberPress(item)}
                  disabled={pin.length >= PIN_LENGTH}
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
          
          {attempts > 0 && attempts < maxAttempts && (
            <Text style={styles.errorText}>
              Incorrect PIN. {maxAttempts - attempts} attempts remaining.
            </Text>
          )}
          
          {attempts >= maxAttempts && (
            <Text style={styles.errorText}>
              Too many failed attempts. Please try again later.
            </Text>
          )}
        </View>

        {renderPinDots()}
        {renderNumberPad()}

        {showCancel && onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
});

PinEntry.displayName = 'PinEntry';

export default PinEntry;

// Expose the showError method for external use
export const usePinEntryError = (pinEntryRef: React.RefObject<any>) => {
  return {
    showError: () => {
      if (pinEntryRef.current) {
        pinEntryRef.current.showError();
      }
    },
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    borderColor: '#E5E7EB',
  },
  pinDotFilled: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  pinDotError: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
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
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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