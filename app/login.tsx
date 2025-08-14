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
  Dimensions,
  StatusBar,
  Animated
} from 'react-native';
import type { TextInput as TextInputType } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const router = useRouter();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const passwordInputRef = useRef<TextInputType>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous loading animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please fill in all fields to continue.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        Alert.alert('Sign In Failed', error.message);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
    setLoading(false);
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <KeyboardAvoidingView 
          behavior="padding"
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            scrollEventThrottle={16}
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Header Section */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <View style={styles.logoCircle}>
                    <Ionicons name="map" size={height < 700 ? 32 : 40} color="white" />
                  </View>
                </View>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to continue your campus journey</Text>
              </View>
              
              {/* Form Section */}
              <View style={styles.formContainer}>
                <View style={styles.form}>
                  {/* Email Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <View style={[
                      styles.inputContainer,
                      focusedInput === 'email' && styles.inputContainerFocused
                    ]}>
                      <Ionicons 
                        name="mail-outline" 
                        size={20} 
                        color={focusedInput === 'email' ? '#667eea' : 'rgba(255,255,255,0.7)'} 
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your email"
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        textContentType="emailAddress"
                        returnKeyType="next"
                        onFocus={() => setTimeout(() => setFocusedInput('email'), 0)}
                        onBlur={() => setTimeout(() => setFocusedInput(null), 0)}
                      />
                    </View>
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons 
                        name="lock-closed-outline" 
                        size={20} 
                        color="rgba(255,255,255,0.7)" 
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your password"
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        returnKeyType="done"
                        onSubmitEditing={handleLogin}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          console.log('Eye icon pressed');
                          setShowPassword(!showPassword);
                        }}
                        style={styles.eyeIcon}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={showPassword ? "eye-outline" : "eye-off-outline"} 
                          size={20} 
                          color="rgba(255,255,255,0.7)" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Forgot Password */}
                  <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>

                  {/* Login Button */}
                  <TouchableOpacity 
                    style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={loading ? ['#e0e0e0', '#f5f5f5'] : ['#ffffff', '#f8f9fa']}
                      style={styles.loginButtonGradient}
                    >
                      {loading ? (
                        <View style={styles.loadingContainer}>
                          <Animated.View
                            style={[
                              styles.loadingIcon,
                              {
                                transform: [{ rotate: spin }],
                              },
                            ]}
                          >
                            <Ionicons name="refresh" size={20} color="#667eea" />
                          </Animated.View>
                          <Text style={styles.loginButtonTextLoading}>Signing In...</Text>
                        </View>
                      ) : (
                        <View style={styles.buttonContent}>
                          <Ionicons name="log-in-outline" size={20} color="#667eea" />
                          <Text style={styles.loginButtonText}>Sign In</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  {/* Sign Up Link */}
                  <TouchableOpacity 
                    style={styles.signupLink}
                    onPress={() => router.push('/signup')}
                  >
                    <Text style={styles.signupText}>
                      Don't have an account? 
                      <Text style={styles.signupBold}> Create Account</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Decorative Elements */}
              <View style={styles.decorativeContainer}>
                <View style={styles.decorativeDot1} />
                <View style={styles.decorativeDot2} />
                <View style={styles.decorativeDot3} />
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: height,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingVertical: height < 700 ? 20 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: height < 700 ? 30 : 40,
  },
  logoContainer: {
    marginBottom: height < 700 ? 20 : 30,
  },
  logoCircle: {
    width: height < 700 ? 80 : 100,
    height: height < 700 ? 80 : 100,
    borderRadius: height < 700 ? 40 : 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: height < 700 ? 28 : 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: height < 700 ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '400',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: height < 700 ? 25 : 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: height < 700 ? 16 : 20,
  },
  inputLabel: {
    fontSize: height < 700 ? 13 : 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    height: height < 700 ? 50 : 56,
  },
  inputContainerFocused: {
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#fff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: height < 700 ? 15 : 16,
    color: 'white',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: height < 700 ? 25 : 30,
  },
  forgotPasswordText: {
    fontSize: height < 700 ? 13 : 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  loginButton: {
    marginBottom: height < 700 ? 25 : 30,
    borderRadius: 12,
    overflow: 'hidden',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    paddingVertical: height < 700 ? 16 : 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: height < 700 ? 16 : 18,
    fontWeight: 'bold',
    color: '#667eea',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIcon: {
    marginRight: 8,
  },
  loginButtonTextLoading: {
    fontSize: height < 700 ? 16 : 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
  signupLink: {
    alignItems: 'center',
  },
  signupText: {
    fontSize: height < 700 ? 15 : 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  signupBold: {
    fontWeight: 'bold',
    color: 'white',
    textDecorationLine: 'underline',
  },
  decorativeContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  decorativeDot1: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    top: '15%',
    left: '10%',
  },
  decorativeDot2: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    top: '25%',
    right: '15%',
  },
  decorativeDot3: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    bottom: '20%',
    left: '20%',
  },
});

export default Login;