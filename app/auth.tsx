import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { ScanText, Shield, Mail, Lock } from 'lucide-react-native';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const { signIn, signUp } = useAuth();
  
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const toggleMode = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setIsLogin(!isLogin);
    setFullName(''); // Clear name when switching modes
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isLogin && !fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      console.log(`Attempting to ${isLogin ? 'sign in' : 'sign up'} with email:`, email);
      
      const { error } = isLogin 
        ? await signIn(email.trim().toLowerCase(), password)
        : await signUp(email.trim().toLowerCase(), password, fullName.trim());

      if (error) {
        console.log('Auth error:', error);
        let errorMessage = error.message || 'An error occurred';
        
        // Handle specific error cases with better messaging
        if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (errorMessage.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead or use a different email.';
        } else if (errorMessage.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link before signing in.';
        } else if (errorMessage.includes('signup_disabled')) {
          errorMessage = 'Account creation is temporarily disabled. Please try again later.';
        } else if (errorMessage.includes('invalid_credentials')) {
          errorMessage = 'The email or password you entered is incorrect.';
        } else if (errorMessage.includes('email_address_invalid')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (errorMessage.includes('weak_password')) {
          errorMessage = 'Password is too weak. Please choose a stronger password.';
        } else if (errorMessage.includes('Database error saving new user')) {
          errorMessage = 'Account created successfully! Please check your email for confirmation.';
          // Don't show as error since user was actually created
          Alert.alert('Success', errorMessage, [
            { text: 'OK', onPress: () => setIsLogin(true) }
          ]);
          setLoading(false);
          return;
        }
        
        Alert.alert('Authentication Error', errorMessage);
      } else {
        console.log('Auth successful, navigating to tabs');
        if (!isLogin) {
          Alert.alert(
            'Account Created!', 
            'Please check your email to verify your account before signing in.',
            [{ text: 'OK', onPress: () => setIsLogin(true) }]
          );
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (err) {
      console.error('Auth catch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    const emailValid = email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const passwordValid = password.length >= 6;
    const nameValid = isLogin || fullName.trim().length > 0;
    
    return emailValid && passwordValid && nameValid;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              style={[
                styles.content,
                {
                  transform: [{
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  }],
                  opacity: fadeAnim,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <ScanText size={48} color="#3b82f6" strokeWidth={1.5} />
                </View>
                <Text style={styles.title}>DocScan Pro</Text>
                <Animated.Text 
                  style={[styles.subtitle, { opacity: fadeAnim }]}
                >
                  {isLogin ? 'Welcome back! Sign in to continue' : 'Join us and start scanning documents'}
                </Animated.Text>
              </View>

              {/* Form */}
              <Animated.View style={[styles.form, { opacity: fadeAnim }]}>
                {/* Full Name Input (Only for signup) */}
                {!isLogin && (
                  <View style={styles.inputContainer}>
                    <View style={styles.inputIconContainer}>
                      <Shield 
                        size={20} 
                        color={nameFocused ? '#3b82f6' : '#9ca3af'} 
                        strokeWidth={1.5}
                      />
                    </View>
                    <TextInput
                      style={[
                        styles.input,
                        nameFocused && styles.inputFocused,
                        fullName && styles.inputFilled,
                      ]}
                      placeholder="Full name"
                      placeholderTextColor="#9ca3af"
                      value={fullName}
                      onChangeText={setFullName}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                      autoCapitalize="words"
                      autoCorrect={false}
                      testID="name-input"
                    />
                  </View>
                )}
                
                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconContainer}>
                    <Mail 
                      size={20} 
                      color={emailFocused ? '#3b82f6' : '#9ca3af'} 
                      strokeWidth={1.5}
                    />
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      emailFocused && styles.inputFocused,
                      email && styles.inputFilled,
                    ]}
                    placeholder="Email address"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="email-input"
                  />
                </View>
                
                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconContainer}>
                    <Lock 
                      size={20} 
                      color={passwordFocused ? '#3b82f6' : '#9ca3af'} 
                      strokeWidth={1.5}
                    />
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      passwordFocused && styles.inputFocused,
                      password && styles.inputFilled,
                    ]}
                    placeholder="Password (min. 6 characters)"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    secureTextEntry
                    autoCapitalize="none"
                    testID="password-input"
                  />
                </View>

                {/* Password strength indicator for signup */}
                {!isLogin && password.length > 0 && (
                  <View style={styles.passwordStrength}>
                    <View style={[
                      styles.strengthBar,
                      password.length >= 6 ? styles.strengthBarGood : styles.strengthBarWeak
                    ]} />
                    <Text style={[
                      styles.strengthText,
                      password.length >= 6 ? styles.strengthTextGood : styles.strengthTextWeak
                    ]}>
                      {password.length >= 6 ? 'Password strength: Good' : 'Password too short'}
                    </Text>
                  </View>
                )}

                {/* Auth Button */}
                <TouchableOpacity 
                  style={[
                    styles.button, 
                    loading && styles.buttonDisabled,
                    !isFormValid() && styles.buttonDisabled,
                  ]}
                  onPress={handleAuth}
                  disabled={loading || !isFormValid()}
                  testID="auth-button"
                >
                  <View style={styles.buttonContent}>
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <View style={styles.loadingDot} />
                        <View style={[styles.loadingDot, styles.loadingDot2]} />
                        <View style={[styles.loadingDot, styles.loadingDot3]} />
                      </View>
                    ) : (
                      <>
                        <Shield size={20} color="#ffffff" strokeWidth={1.5} />
                        <Text style={styles.buttonText}>
                          {isLogin ? 'Sign In' : 'Create Account'}
                        </Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Switch Mode */}
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                  </Text>
                  <TouchableOpacity 
                    style={styles.switchButton}
                    onPress={toggleMode}
                    testID="switch-mode-button"
                  >
                    <Text style={styles.switchText}>
                      {isLogin ? 'Sign Up' : 'Sign In'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Email confirmation notice for signup */}
                {!isLogin && (
                  <View style={styles.noticeContainer}>
                    <Text style={styles.noticeText}>
                      By creating an account, you'll receive an email confirmation. 
                      Please verify your email before signing in.
                    </Text>
                  </View>
                )}
              </Animated.View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Secure document scanning and management
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#64748b',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    position: 'relative',
  },
  inputIconContainer: {
    position: 'absolute',
    left: 16,
    top: 18,
    zIndex: 1,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 48,
    paddingVertical: 18,
    fontSize: 16,
    color: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputFocused: {
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputFilled: {
    borderColor: '#10b981',
  },
  passwordStrength: {
    marginTop: -12,
    marginBottom: 8,
  },
  strengthBar: {
    height: 3,
    borderRadius: 2,
    marginBottom: 4,
  },
  strengthBarWeak: {
    backgroundColor: '#ef4444',
    width: '30%',
  },
  strengthBarGood: {
    backgroundColor: '#10b981',
    width: '100%',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  strengthTextWeak: {
    color: '#ef4444',
  },
  strengthTextGood: {
    color: '#10b981',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    opacity: 0.4,
  },
  loadingDot2: {
    opacity: 0.7,
  },
  loadingDot3: {
    opacity: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  switchLabel: {
    color: '#64748b',
    fontSize: 14,
  },
  switchButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  switchText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  noticeContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  noticeText: {
    color: '#1e40af',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
});