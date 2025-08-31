import React, { useRef } from 'react';
import { Alert } from 'react-native';
import { usePinSecurity } from '@/contexts/PinSecurityContext';
import PinEntry from './PinEntry';
import PinSetup from './PinSetup';

interface PinGuardProps {
  children: React.ReactNode;
}

export default function PinGuard({ children }: PinGuardProps) {
  const {
    isPinRequired,
    isSettingUp,
    verifyPin,
    enablePin,
    cancelPinSetup,
  } = usePinSecurity();
  
  const pinEntryRef = useRef<any>(null);

  const handlePinComplete = async (pin: string) => {
    try {
      const isValid = await verifyPin(pin);
      
      if (!isValid) {
        // The PinEntry component will handle the error display
        return;
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      Alert.alert(
        'Verification Error',
        'Failed to verify PIN. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePinSetup = async (pin: string) => {
    try {
      await enablePin(pin);
      Alert.alert(
        'PIN Security Enabled',
        'Your app is now protected with a PIN. You will be asked to enter it when you open the app.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('PIN setup error:', error);
      throw error; // Re-throw to let PinSetup handle it
    }
  };

  const handleMaxAttemptsReached = () => {
    Alert.alert(
      'Too Many Failed Attempts',
      'You have exceeded the maximum number of PIN attempts. Please restart the app to try again.',
      [
        {
          text: 'OK',
          onPress: () => {
            // In a real app, you might want to implement a timeout or other security measures
          },
        },
      ]
    );
  };

  // Show PIN setup screen
  if (isSettingUp) {
    return (
      <PinSetup
        onPinSet={handlePinSetup}
        onCancel={cancelPinSetup}
      />
    );
  }

  // Show PIN entry screen
  if (isPinRequired) {
    return (
      <PinEntry
        ref={pinEntryRef}
        title="Enter PIN"
        subtitle="Enter your PIN to access the app"
        onPinComplete={handlePinComplete}
        maxAttempts={5}
        onMaxAttemptsReached={handleMaxAttemptsReached}
      />
    );
  }

  // PIN is not required or has been verified
  return <>{children}</>;
}