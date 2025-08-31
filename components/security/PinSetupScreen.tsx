import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import PinEntryScreen from './PinEntryScreen';

interface PinSetupScreenProps {
  onPinSet: (pin: string) => Promise<void>;
  onCancel: () => void;
}

const PinSetupScreen: React.FC<PinSetupScreenProps> = ({
  onPinSet,
  onCancel,
}) => {
  const [step, setStep] = useState<'initial' | 'confirm'>('initial');
  const [initialPin, setInitialPin] = useState<string>('');

  const handleInitialPinComplete = async (pin: string): Promise<boolean> => {
    setInitialPin(pin);
    setStep('confirm');
    return true;
  };

  const handleConfirmPinComplete = async (pin: string): Promise<boolean> => {
    if (pin === initialPin) {
      try {
        await onPinSet(pin);
        return true;
      } catch (error) {
        console.error('Error setting PIN:', error);
        Alert.alert(
          'Error',
          'Failed to set PIN. Please try again.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } else {
      Alert.alert(
        'PIN Mismatch',
        'The PINs you entered do not match. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              setStep('initial');
              setInitialPin('');
            },
          },
        ]
      );
      return false;
    }
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('initial');
      setInitialPin('');
    } else {
      onCancel();
    }
  };

  if (step === 'initial') {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onCancel}>
            <ArrowLeft size={24} color="#0066CC" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set Up PIN</Text>
          <View style={styles.placeholder} />
        </SafeAreaView>
        
        <PinEntryScreen
          title="Create Your PIN"
          subtitle="Choose a 4-digit PIN to secure your app"
          onPinComplete={handleInitialPinComplete}
          showCancel={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#0066CC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm PIN</Text>
        <View style={styles.placeholder} />
      </SafeAreaView>
      
      <PinEntryScreen
        title="Confirm Your PIN"
        subtitle="Enter your PIN again to confirm"
        onPinComplete={handleConfirmPinComplete}
        showCancel={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
});

export default PinSetupScreen;