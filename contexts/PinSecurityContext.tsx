import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

interface PinSecurityContextType {
  isPinEnabled: boolean;
  isPinRequired: boolean;
  isSettingUp: boolean;
  enablePin: (pin: string) => Promise<void>;
  disablePin: () => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  requirePin: () => void;
  clearPinRequirement: () => void;
  startPinSetup: () => void;
  cancelPinSetup: () => void;
}

const PIN_STORAGE_KEY = '@pin_security_enabled';
const PIN_HASH_KEY = '@pin_security_hash';
const BACKGROUND_TIME_KEY = '@app_background_time';
const PIN_TIMEOUT = 30000; // 30 seconds

// Simple hash function for PIN storage
const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

export const [PinSecurityProvider, usePinSecurity] = createContextHook((): PinSecurityContextType => {
  const [isPinEnabled, setIsPinEnabled] = useState<boolean>(false);
  const [isPinRequired, setIsPinRequired] = useState<boolean>(false);
  const [isSettingUp, setIsSettingUp] = useState<boolean>(false);

  // Load PIN settings on initialization
  useEffect(() => {
    const loadPinSettings = async () => {
      try {
        const pinEnabled = await AsyncStorage.getItem(PIN_STORAGE_KEY);
        if (pinEnabled === 'true') {
          setIsPinEnabled(true);
          setIsPinRequired(true); // Require PIN on app start if enabled
        }
      } catch (error) {
        console.error('Error loading PIN settings:', error);
      }
    };

    loadPinSettings();
  }, []);

  // Handle app state changes for PIN timeout
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (!isPinEnabled) return;

      if (nextAppState === 'background') {
        // Store the time when app goes to background
        await AsyncStorage.setItem(BACKGROUND_TIME_KEY, Date.now().toString());
      } else if (nextAppState === 'active') {
        // Check if PIN should be required when app becomes active
        try {
          const backgroundTimeStr = await AsyncStorage.getItem(BACKGROUND_TIME_KEY);
          if (backgroundTimeStr) {
            const backgroundTime = parseInt(backgroundTimeStr, 10);
            const currentTime = Date.now();
            const timeDiff = currentTime - backgroundTime;

            if (timeDiff > PIN_TIMEOUT) {
              setIsPinRequired(true);
            }
          }
        } catch (error) {
          console.error('Error checking background time:', error);
          // Err on the side of caution and require PIN
          setIsPinRequired(true);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isPinEnabled]);

  const enablePin = useCallback(async (pin: string) => {
    try {
      const hashedPin = hashPin(pin);
      await AsyncStorage.setItem(PIN_STORAGE_KEY, 'true');
      await AsyncStorage.setItem(PIN_HASH_KEY, hashedPin);
      setIsPinEnabled(true);
      setIsSettingUp(false);
      console.log('PIN security enabled');
    } catch (error) {
      console.error('Error enabling PIN:', error);
      throw new Error('Failed to enable PIN security');
    }
  }, []);

  const disablePin = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(PIN_STORAGE_KEY);
      await AsyncStorage.removeItem(PIN_HASH_KEY);
      await AsyncStorage.removeItem(BACKGROUND_TIME_KEY);
      setIsPinEnabled(false);
      setIsPinRequired(false);
      console.log('PIN security disabled');
    } catch (error) {
      console.error('Error disabling PIN:', error);
      throw new Error('Failed to disable PIN security');
    }
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const storedHash = await AsyncStorage.getItem(PIN_HASH_KEY);
      if (!storedHash) {
        return false;
      }

      const inputHash = hashPin(pin);
      const isValid = inputHash === storedHash;
      
      if (isValid) {
        setIsPinRequired(false);
        console.log('PIN verified successfully');
      }
      
      return isValid;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  }, []);

  const requirePin = useCallback(() => {
    if (isPinEnabled) {
      setIsPinRequired(true);
    }
  }, [isPinEnabled]);

  const clearPinRequirement = useCallback(() => {
    setIsPinRequired(false);
  }, []);

  const startPinSetup = useCallback(() => {
    setIsSettingUp(true);
  }, []);

  const cancelPinSetup = useCallback(() => {
    setIsSettingUp(false);
  }, []);

  return useMemo(() => ({
    isPinEnabled,
    isPinRequired,
    isSettingUp,
    enablePin,
    disablePin,
    verifyPin,
    requirePin,
    clearPinRequirement,
    startPinSetup,
    cancelPinSetup,
  }), [
    isPinEnabled,
    isPinRequired,
    isSettingUp,
    enablePin,
    disablePin,
    verifyPin,
    requirePin,
    clearPinRequirement,
    startPinSetup,
    cancelPinSetup,
  ]);
});