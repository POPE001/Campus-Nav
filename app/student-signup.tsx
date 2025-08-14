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
  Animated,
  Dimensions
} from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const StudentSignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [level, setLevel] = useState('');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

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

    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const levels = ['100', '200', '300', '400', '500', 'Graduate'];
  
  const faculties = [
    'Faculty of Arts',
    'Faculty of Law',
    'Faculty of Science',
    'Faculty of Engineering and Technology',
    'Faculty of Social Sciences',
    'Faculty of Education',
    'Faculty of Environmental Design and Management',
    'Faculty of Agriculture',
    'Faculty of Basic Medical Sciences',
    'Faculty of Clinical Sciences',
    'Faculty of Dentistry',
    'Faculty of Pharmacy',
    'College of Health Sciences'
  ];

  const handleSignUp = async () => {
    // Validation
    if (!email || !password || !confirmPassword || !firstName || !lastName || !level || !faculty || !department) {
      Alert.alert('Missing Information', 'Please fill in all fields to continue.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Password validation
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
      password,
      options: {
        data: {
            user_type: 'student',
          first_name: firstName.trim(),
          last_name: lastName.trim(),
            level,
            faculty,
            department: department.trim(),
            profile_completed: true
        }
      }
    });

    if (error) {
        Alert.alert('Sign Up Failed', error.message);
    } else {
        Alert.alert(
          'Welcome to Campus Nav!', 
          'Your student account has been created successfully. Start exploring your campus!',
          [{ text: 'Get Started', onPress: () => router.replace('/(tabs)') }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
    setLoading(false);
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!firstName || !lastName || !email) {
        Alert.alert('Missing Information', 'Please fill in your personal details first.');
        return;
      }
      if (!email.includes('@')) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }
    }
    if (currentStep === 2) {
      if (!password || !confirmPassword) {
        Alert.alert('Missing Information', 'Please set up your password first.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepDot,
            step <= currentStep && styles.stepDotActive,
            step < currentStep && styles.stepDotCompleted
          ]}>
            {step < currentStep ? (
              <Ionicons name="checkmark" size={16} color="white" />
            ) : (
              <Text style={[styles.stepNumber, step <= currentStep && styles.stepNumberActive]}>
                {step}
              </Text>
            )}
          </View>
          {step < 3 && <View style={[styles.stepLine, step < currentStep && styles.stepLineActive]} />}
        </View>
      ))}
            </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepSubtitle}>Let's start with your basic details</Text>

      <View style={styles.inputRow}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.inputLabel}>First Name</Text>
          <View style={[
            styles.inputContainer,
            focusedInput === 'firstName' && styles.inputContainerFocused
          ]}>
            <Ionicons 
              name="person-outline" 
              size={20} 
              color={focusedInput === 'firstName' ? '#667eea' : 'rgba(255,255,255,0.7)'} 
              style={styles.inputIcon}
            />
                <TextInput
                  style={styles.input}
              placeholder="First name"
              placeholderTextColor="rgba(255,255,255,0.6)"
                  value={firstName}
                  onChangeText={setFirstName}
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="next"
              onFocus={() => setTimeout(() => setFocusedInput('firstName'), 0)}
              onBlur={() => setTimeout(() => setFocusedInput(null), 0)}
            />
          </View>
              </View>
              
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
          <Text style={styles.inputLabel}>Last Name</Text>
          <View style={[
            styles.inputContainer,
            focusedInput === 'lastName' && styles.inputContainerFocused
          ]}>
            <Ionicons 
              name="person-outline" 
              size={20} 
              color={focusedInput === 'lastName' ? '#667eea' : 'rgba(255,255,255,0.7)'} 
              style={styles.inputIcon}
            />
                <TextInput
                  style={styles.input}
              placeholder="Last name"
              placeholderTextColor="rgba(255,255,255,0.6)"
                  value={lastName}
                  onChangeText={setLastName}
              autoComplete="family-name"
              textContentType="familyName"
              returnKeyType="next"
              onFocus={() => setTimeout(() => setFocusedInput('lastName'), 0)}
              onBlur={() => setTimeout(() => setFocusedInput(null), 0)}
            />
          </View>
              </View>
            </View>

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
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Secure Your Account</Text>
      <Text style={styles.stepSubtitle}>Create a strong password</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Password</Text>
        <View style={[
          styles.inputContainer,
          focusedInput === 'password' && styles.inputContainerFocused
        ]}>
          <Ionicons 
            name="lock-closed-outline" 
            size={20} 
            color={focusedInput === 'password' ? '#667eea' : 'rgba(255,255,255,0.7)'} 
            style={styles.inputIcon}
          />
              <TextInput
                style={styles.input}
            placeholder="Create password"
            placeholderTextColor="rgba(255,255,255,0.6)"
                value={password}
                onChangeText={setPassword}
            secureTextEntry={!showPassword}
            onFocus={() => setFocusedInput('password')}
            onBlur={() => setFocusedInput(null)}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons 
              name={showPassword ? "eye-outline" : "eye-off-outline"} 
              size={20} 
              color="rgba(255,255,255,0.7)" 
            />
          </TouchableOpacity>
        </View>
            </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Confirm Password</Text>
        <View style={[
          styles.inputContainer,
          focusedInput === 'confirmPassword' && styles.inputContainerFocused
        ]}>
          <Ionicons 
            name="lock-closed-outline" 
            size={20} 
            color={focusedInput === 'confirmPassword' ? '#667eea' : 'rgba(255,255,255,0.7)'} 
            style={styles.inputIcon}
          />
              <TextInput
                style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor="rgba(255,255,255,0.6)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            onFocus={() => setFocusedInput('confirmPassword')}
            onBlur={() => setFocusedInput(null)}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons 
              name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
              size={20} 
              color="rgba(255,255,255,0.7)" 
            />
          </TouchableOpacity>
        </View>
            </View>

      <View style={styles.passwordRequirements}>
        <Text style={styles.requirementsTitle}>Password Requirements:</Text>
        <View style={styles.requirement}>
          <Ionicons 
            name={password.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
            size={16} 
            color={password.length >= 6 ? "#4ade80" : "rgba(255,255,255,0.5)"} 
          />
          <Text style={[styles.requirementText, password.length >= 6 && styles.requirementMet]}>
            At least 6 characters
          </Text>
        </View>
        <View style={styles.requirement}>
          <Ionicons 
            name={password === confirmPassword && password ? "checkmark-circle" : "ellipse-outline"} 
            size={16} 
            color={password === confirmPassword && password ? "#4ade80" : "rgba(255,255,255,0.5)"} 
          />
          <Text style={[styles.requirementText, password === confirmPassword && password && styles.requirementMet]}>
            Passwords match
          </Text>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Academic Information</Text>
      <Text style={styles.stepSubtitle}>Tell us about your studies at OAU</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Level</Text>
            <View style={styles.pickerContainer}>
          <Ionicons name="school-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
              <Picker
                selectedValue={level}
                onValueChange={setLevel}
                style={styles.picker}
            dropdownIconColor="rgba(255,255,255,0.7)"
              >
            <Picker.Item label="Select your level" value="" />
                {levels.map((lvl) => (
                  <Picker.Item key={lvl} label={`${lvl} Level`} value={lvl} />
                ))}
              </Picker>
        </View>
            </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Faculty</Text>
            <View style={styles.pickerContainer}>
          <Ionicons name="library-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
              <Picker
                selectedValue={faculty}
                onValueChange={setFaculty}
                style={styles.picker}
            dropdownIconColor="rgba(255,255,255,0.7)"
              >
            <Picker.Item label="Select your faculty" value="" />
                {faculties.map((fac) => (
                  <Picker.Item key={fac} label={fac} value={fac} />
                ))}
              </Picker>
        </View>
            </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Department</Text>
        <View style={[
          styles.inputContainer,
          focusedInput === 'department' && styles.inputContainerFocused
        ]}>
          <Ionicons 
            name="book-outline" 
            size={20} 
            color={focusedInput === 'department' ? '#667eea' : 'rgba(255,255,255,0.7)'} 
            style={styles.inputIcon}
          />
              <TextInput
                style={styles.input}
            placeholder="Enter your department"
            placeholderTextColor="rgba(255,255,255,0.6)"
                value={department}
                onChangeText={setDepartment}
            onFocus={() => setFocusedInput('department')}
            onBlur={() => setFocusedInput(null)}
              />
            </View>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep1();
    }
  };

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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
              {/* Header */}
              <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                  <Text style={styles.title}>Create Student Account</Text>
                  <Text style={styles.subtitle}>Join Campus Nav at OAU</Text>
                </View>
              </View>

              {/* Step Indicator */}
              {renderStepIndicator()}

              {/* Form Container */}
              <View style={styles.formContainer}>
                {renderStepContent()}

                {/* Navigation Buttons */}
                <View style={styles.buttonContainer}>
                  {currentStep > 1 && (
                    <TouchableOpacity
                      style={styles.prevButton}
                      onPress={prevStep}
                    >
                      <Ionicons name="arrow-back" size={20} color="#667eea" />
                      <Text style={styles.prevButtonText}>Previous</Text>
                    </TouchableOpacity>
                  )}

                  {currentStep < 3 ? (
                    <TouchableOpacity
                      style={styles.nextButton}
                      onPress={nextStep}
                    >
                      <LinearGradient
                        colors={['#ffffff', '#f8f9fa']}
                        style={styles.nextButtonGradient}
                      >
                        <Text style={styles.nextButtonText}>Next</Text>
                        <Ionicons name="arrow-forward" size={20} color="#667eea" />
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.signupButton, loading && styles.signupButtonDisabled]}
                      onPress={handleSignUp}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={loading ? ['#e0e0e0', '#f5f5f5'] : ['#ffffff', '#f8f9fa']}
                        style={styles.signupButtonGradient}
                      >
                        {loading ? (
                          <View style={styles.loadingContainer}>
                            <Animated.View
                              style={[
                                styles.loadingIcon,
                                { transform: [{ rotate: spin }] },
                              ]}
                            >
                              <Ionicons name="refresh" size={20} color="#667eea" />
                            </Animated.View>
                            <Text style={styles.signupButtonTextLoading}>Creating Account...</Text>
                          </View>
                        ) : (
                          <View style={styles.buttonContent}>
                            <Ionicons name="person-add" size={20} color="#667eea" />
                            <Text style={styles.signupButtonText}>Create Account</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Login Link */}
                <TouchableOpacity 
                  style={styles.loginLink}
                  onPress={() => router.push('/login')}
                >
                  <Text style={styles.loginText}>
                    Already have an account? 
                    <Text style={styles.loginBold}> Sign In</Text>
                  </Text>
            </TouchableOpacity>
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
    paddingTop: Platform.OS === 'ios' ? (height < 700 ? 40 : 60) : (height < 700 ? 20 : 40),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height < 700 ? 20 : 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: height < 700 ? 24 : 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: height < 700 ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height < 700 ? 20 : 30,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: height < 700 ? 28 : 32,
    height: height < 700 ? 28 : 32,
    borderRadius: height < 700 ? 14 : 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  stepDotActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'white',
  },
  stepDotCompleted: {
    backgroundColor: '#4ade80',
    borderColor: '#4ade80',
  },
  stepNumber: {
    fontSize: height < 700 ? 12 : 14,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  stepNumberActive: {
    color: 'white',
  },
  stepLine: {
    width: height < 700 ? 30 : 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: height < 700 ? 6 : 8,
  },
  stepLineActive: {
    backgroundColor: '#4ade80',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: height < 700 ? 20 : 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepContent: {
    marginBottom: height < 700 ? 20 : 30,
  },
  stepTitle: {
    fontSize: height < 700 ? 18 : 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: height < 700 ? 14 : 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: height < 700 ? 20 : 30,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: height < 700 ? 16 : 20,
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
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    height: height < 700 ? 50 : 56,
  },
  picker: {
    flex: 1,
    color: 'white',
    marginLeft: 8,
  },
  passwordRequirements: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 8,
  },
  requirementMet: {
    color: '#4ade80',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  nextButton: {
    flex: 1,
    marginLeft: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
    marginRight: 8,
  },
  signupButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupButtonText: {
    fontSize: 18,
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
  signupButtonTextLoading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  loginBold: {
    fontWeight: 'bold',
    color: 'white',
    textDecorationLine: 'underline',
  },
});

export default StudentSignUp;