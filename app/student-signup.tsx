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
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { levels, faculties, facultyDepartments } from '@/constants/signupData';

const StudentSignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [level, setLevel] = useState('');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  // Update available departments when faculty changes
  const handleFacultyChange = (selectedFaculty: string) => {
    setFaculty(selectedFaculty);
    setDepartment(''); // Reset department when faculty changes
    
    if (selectedFaculty && facultyDepartments[selectedFaculty]) {
      setAvailableDepartments(facultyDepartments[selectedFaculty]);
    } else {
      setAvailableDepartments([]);
    }
  };

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
            user_type: 'student'
          }
        }
      });

      if (error) {
        Alert.alert('Sign Up Failed', error.message);
      } else {
        console.log('✅ Student signup successful!');
        console.log('👤 User created:', data.user?.id);

        // Create student profile with collected data
        try {
          const profileData = {
            id: data.user!.id,
            email: email.toLowerCase().trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            faculty: faculty,
            department: department,
            level: level,
            user_type: 'student' as const,
            is_active: true,
            is_verified: false,
            email_verified: true,
            phone_verified: false,
            profile_completed: true,
            profile_completed_at: new Date().toISOString(),
            show_phone: false,
            show_email: true,
            show_department: true,
            public_profile: false
          };

          console.log('💾 Saving student profile data:', profileData);
          const { data: profileResult, error: profileError } = await supabase
            .from('user_profiles')
            .insert([profileData])
            .select()
            .single();

          if (profileError) {
            throw profileError;
          }

          console.log('✅ Student profile created successfully:', profileResult);
          Alert.alert(
            'Account Created Successfully!', 
            `Welcome ${firstName}! Your student account has been created successfully.`,
            [{ text: 'Get Started', onPress: () => router.replace('/(tabs)') }]
          );
        } catch (profileError: any) {
          console.error('❌ Student profile creation failed:', profileError);
          Alert.alert(
            'Account Created but Profile Incomplete', 
            'Your account was created but there was an issue setting up your profile. You can complete it later in settings.',
            [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
          );
        }
      }
    } catch (error: any) {
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
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/user-type');
                }
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#64748b" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Image 
                  source={require('../assets/images/oau_logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.title}>Create Student Account</Text>
            <Text style={styles.subtitle}>Join the OAU student community</Text>
          </View>

          {/* Personal Information Card */}
          <View style={styles.formCard}>
            <BlurView intensity={10} style={styles.formBlur}>
              <View style={styles.formContent}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person-outline" size={20} color="#3b82f6" />
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                </View>

                {/* Name Row */}
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>First Name</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="First name"
                        placeholderTextColor="#94a3b8"
                        value={firstName}
                        onChangeText={setFirstName}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Last Name</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="Last name"
                        placeholderTextColor="#94a3b8"
                        value={lastName}
                        onChangeText={setLastName}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>
                  </View>
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="your.email@student.oauife.edu.ng"
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

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Create a strong password"
                      placeholderTextColor="#94a3b8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      returnKeyType="next"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons 
                        name={showPassword ? "eye" : "eye-off"} 
                        size={20} 
                        color="#64748b" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm your password"
                      placeholderTextColor="#94a3b8"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      returnKeyType="next"
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons 
                        name={showConfirmPassword ? "eye" : "eye-off"} 
                        size={20} 
                        color="#64748b" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </BlurView>
          </View>

          {/* Academic Information Card */}
          <View style={styles.formCard}>
            <BlurView intensity={10} style={styles.formBlur}>
              <View style={styles.formContent}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="school-outline" size={20} color="#3b82f6" />
                  <Text style={styles.sectionTitle}>Academic Information</Text>
                </View>

                {/* Level and Faculty Row */}
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Level</Text>
                    <View style={styles.pickerContainer}>
                      <Ionicons name="trending-up-outline" size={20} color="#64748b" style={styles.inputIcon} />
                      <Picker
                        selectedValue={level}
                        onValueChange={(itemValue) => setLevel(itemValue)}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select level" value="" />
                        {levels.map((lvl) => (
                          <Picker.Item key={lvl} label={`${lvl} Level`} value={lvl} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                  
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Faculty</Text>
                    <View style={styles.pickerContainer}>
                      <Ionicons name="library-outline" size={20} color="#64748b" style={styles.inputIcon} />
                      <Picker
                        selectedValue={faculty}
                        onValueChange={handleFacultyChange}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select faculty" value="" />
                        {faculties.map((fac) => (
                          <Picker.Item key={fac} label={fac} value={fac} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>

                {/* Department */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Department</Text>
                  <View style={styles.pickerContainer}>
                    <Ionicons name="folder-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <Picker
                      selectedValue={department}
                      onValueChange={(itemValue) => setDepartment(itemValue)}
                      style={styles.picker}
                      enabled={availableDepartments.length > 0}
                    >
                      <Picker.Item 
                        label={faculty ? "Select department" : "Select faculty first"} 
                        value="" 
                      />
                      {availableDepartments.map((dept) => (
                        <Picker.Item key={dept} label={dept} value={dept} />
                      ))}
                    </Picker>
                  </View>
                  <Text style={[
                    styles.helperText,
                    { opacity: !faculty ? 1 : 0 } // Always reserve space, just hide/show
                  ]}>
                    Please select a faculty first to see available departments
                  </Text>
                </View>
              </View>
            </BlurView>
          </View>

          {/* Create Account Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#94a3b8', '#cbd5e1'] : ['#3b82f6', '#1d4ed8']}
                style={styles.createGradient}
              >
                <View style={styles.buttonContentContainer}>
                  {loading && (
                    <Ionicons name="hourglass" size={20} color="white" style={styles.buttonIcon} />
                  )}
                  <Text style={styles.createButtonText}>
                    {loading ? 'Creating Account...' : 'Create Student Account'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Sign In Link */}
            <TouchableOpacity 
              style={styles.signInLink}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.signInLinkText}>
                Already have an account? <Text style={styles.signInLinkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>

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
    minHeight: '100%', // Ensure stable layout
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: 45,
    height: 45,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '400',
  },
  formCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  formBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  formContent: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000', // Changed to black for better visibility
    fontWeight: '500',
  },
  eyeButton: {
    padding: 8,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingLeft: 16,
    height: 52,
  },
  picker: {
    flex: 1,
    color: '#000000', // Changed to black for better visibility
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 4,
  },
  actionContainer: {
    marginTop: 12,
    paddingTop: 8, // Add consistent spacing
    minHeight: 140, // Reserve space for both button and sign-in link
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    flex: 1,
  },
  buttonContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24, // Ensure consistent height
  },
  buttonIcon: {
    marginRight: 8,
  },
  signInLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  signInLinkText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  signInLinkBold: {
    color: '#3b82f6',
    fontWeight: '700',
  },
});

export default StudentSignUp;