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
  StatusBar,
  SafeAreaView,
  Image
} from 'react-native';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Background */}
      <LinearGradient
        colors={['#f8fafc', '#e7f3ff']}
        style={styles.background}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                style={styles.logo}
              >
                <Image 
                  source={require('../assets/images/oau_logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </LinearGradient>
            </View>
            <Text style={styles.title}> Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your campus journey</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
              style={styles.formGradient}
            >
              <View style={styles.formContent}>
                
                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>📧 Email Address</Text>
                  <View style={styles.inputContainer}>
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      style={styles.inputIconContainer}
                    >
                      <Ionicons name="mail" size={18} color="white" />
                    </LinearGradient>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email address"
                      placeholderTextColor="#94a3b8"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>🔒 Password</Text>
                  <View style={styles.inputContainer}>
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      style={styles.inputIconContainer}
                    >
                      <Ionicons name="lock-closed" size={18} color="white" />
                    </LinearGradient>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="#94a3b8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons 
                        name={showPassword ? "eye" : "eye-off"} 
                        size={20} 
                        color="#667eea" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>



                {/* Sign In Button */}
                <TouchableOpacity 
                  style={[styles.signInButton, loading && styles.signInButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={loading ? ['#94a3b8', '#cbd5e1'] : ['#667eea', '#764ba2']}
                    style={styles.signInGradient}
                  >
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <Ionicons name="hourglass" size={20} color="white" />
                        <Text style={styles.signInButtonText}>Signing In...</Text>
                      </View>
                    ) : (
                      <Text style={styles.signInButtonText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Create Account */}
                <TouchableOpacity 
                  style={styles.createAccountButton}
                  onPress={() => router.push('/user-type')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
                    style={styles.createAccountGradient}
                  >
                    <Text style={styles.createAccountText}>Create New Account</Text>
                  </LinearGradient>
                </TouchableOpacity>

              </View>
            </LinearGradient>
          </View>

          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/user-type');
              }
            }}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
              style={styles.backButtonGradient}
            >
              <Ionicons name="arrow-back" size={20} color="#667eea" />
              <Text style={styles.backButtonText}>Back to Options</Text>
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoImage: {
    width: 55,
    height: 55,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#667eea',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  formCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  formGradient: {
    borderRadius: 24,
  },
  formContent: {
    padding: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.2)',
    paddingHorizontal: 16,
    height: 60,
  },
  inputIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  eyeButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },

  signInButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
  },
  dividerText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    marginHorizontal: 16,
    letterSpacing: 0.5,
  },
  createAccountButton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  createAccountGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  createAccountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
    letterSpacing: 0.3,
  },
  backButton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  backButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.2,
  },
});

export default Login;