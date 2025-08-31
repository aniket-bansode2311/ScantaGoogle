import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Shield, ChevronRight } from 'lucide-react-native';
import { usePinSecurity } from '@/contexts/PinSecurityContext';

const PinSecuritySettings: React.FC = () => {
  const {
    isPinEnabled,
    startPinSetup,
    disablePin,
  } = usePinSecurity();

  const handleTogglePin = async (enabled: boolean) => {
    if (enabled) {
      startPinSetup();
    } else {
      Alert.alert(
        'Disable PIN Security',
        'Are you sure you want to disable PIN security? Your app will no longer be protected.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              try {
                await disablePin();
              } catch (error) {
                console.error('Error disabling PIN:', error);
                Alert.alert(
                  'Error',
                  'Failed to disable PIN security. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            },
          },
        ]
      );
    }
  };

  const handleChangePIN = () => {
    Alert.alert(
      'Change PIN',
      'To change your PIN, you will need to disable PIN security and set it up again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            startPinSetup();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <View style={styles.iconContainer}>
            <Shield size={20} color="#0066CC" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.settingTitle}>PIN Security</Text>
            <Text style={styles.settingSubtitle}>
              {isPinEnabled 
                ? 'Protect your app with a PIN' 
                : 'Enable PIN protection for your app'
              }
            </Text>
          </View>
        </View>
        <Switch
          value={isPinEnabled}
          onValueChange={handleTogglePin}
          trackColor={{ false: '#E5E7EB', true: '#0066CC' }}
          thumbColor={isPinEnabled ? '#FFFFFF' : '#FFFFFF'}
          ios_backgroundColor="#E5E7EB"
        />
      </View>

      {isPinEnabled && (
        <TouchableOpacity style={styles.settingItem} onPress={handleChangePIN}>
          <View style={styles.settingLeft}>
            <View style={styles.iconContainer}>
              <Shield size={20} color="#6B7280" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingTitle}>Change PIN</Text>
              <Text style={styles.settingSubtitle}>
                Update your security PIN
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color="#C7C7CC" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 3,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});

export default PinSecuritySettings;