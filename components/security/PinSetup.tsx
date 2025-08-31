import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import PinEntry from './PinEntry';

interface PinSetupProps {
  onPinSet: (pin: string) => Promise<void>;
  onCancel: () => void;
}

enum SetupStep {
  CREATE = 'create',
  CONFIRM = 'confirm',
}

export default function PinSetup({ onPinSet, onCancel }: PinSetupProps) {
  const [step, setStep] = useState<SetupStep>(SetupStep.CREATE);
  const [firstPin, setFirstPin] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFirstPinComplete = (pin: string) => {
    setFirstPin(pin);
    setStep(SetupStep.CONFIRM);
  };

  const handleConfirmPinComplete = async (pin: string) => {
    if (pin !== firstPin) {
      Alert.alert(
        'PINs Don\'t Match',
        'The PINs you entered don\'t match. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              setStep(SetupStep.CREATE);
              setFirstPin('');
            },
          },
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      await onPinSet(pin);
    } catch {
      Alert.alert(
        'Setup Failed',
        'Failed to set up PIN security. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (step === SetupStep.CONFIRM) {
      setStep(SetupStep.CREATE);
      setFirstPin('');
    } else {
      onCancel();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.iconContainer}>
            <Check size={32} color="#34D399" />
          </View>
          <Text style={styles.loadingTitle}>Setting up PIN...</Text>
          <Text style={styles.loadingSubtitle}>
            Your PIN security is being configured
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <PinEntry
      title={step === SetupStep.CREATE ? 'Create PIN' : 'Confirm PIN'}
      subtitle={
        step === SetupStep.CREATE
          ? 'Enter a 4-digit PIN to secure your app'
          : 'Enter your PIN again to confirm'
      }
      onPinComplete={
        step === SetupStep.CREATE ? handleFirstPinComplete : handleConfirmPinComplete
      }
      onCancel={handleCancel}
      showCancel={true}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});