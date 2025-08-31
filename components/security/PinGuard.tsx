import React from 'react';
import { usePinSecurity } from '@/contexts/PinSecurityContext';
import PinEntryScreen from './PinEntryScreen';
import PinSetupScreen from './PinSetupScreen';

interface PinGuardProps {
  children: React.ReactNode;
}

const PinGuard: React.FC<PinGuardProps> = ({ children }) => {
  const {
    isPinRequired,
    isSettingUp,
    verifyPin,
    enablePin,
    cancelPinSetup,
  } = usePinSecurity();

  const handlePinVerification = async (pin: string): Promise<boolean> => {
    return await verifyPin(pin);
  };

  const handlePinSetup = async (pin: string): Promise<void> => {
    await enablePin(pin);
  };

  const handleCancelSetup = () => {
    cancelPinSetup();
  };

  if (isSettingUp) {
    return (
      <PinSetupScreen
        onPinSet={handlePinSetup}
        onCancel={handleCancelSetup}
      />
    );
  }

  if (isPinRequired) {
    return (
      <PinEntryScreen
        title="Enter PIN"
        subtitle="Enter your PIN to access the app"
        onPinComplete={handlePinVerification}
        showCancel={false}
      />
    );
  }

  return <>{children}</>;
};

export default PinGuard;