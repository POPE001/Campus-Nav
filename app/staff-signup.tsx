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
import { faculties, positions, facultyDepartments } from '@/constants/signupData';
import { profileService } from '@/lib/profileService';

const StaffSignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
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
    console.log('🚀 Staff Signup - Starting signup process...');
    
    // Validation
    if (!email || !password || !confirmPassword || !firstName || !lastName || !faculty || !department || !position) {
      console.log('❌ Validation failed - Missing fields:', {
        email: !!email,
        password: !!password,
        confirmPassword: !!confirmPassword,
        firstName: !!firstName,
        lastName: !!lastName,
        faculty: !!faculty,
        department: !!department,
        position: !!position
      });
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
      console.log('📝 Creating user with:', {
        email: email.toLowerCase().trim(),
        passwordLength: password.length,
        userData: {
          user_type: 'staff'
        }
      });

      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            user_type: 'staff'
          }
        }
      });

      console.log('📦 Supabase response data:', data);
      console.log('⚠️ Supabase response error:', error);

      if (error) {
        console.log('❌ Signup failed with error:', {
          message: error.message,
          status: error.status,
          details: error
        });
        
        Alert.alert(
          'Sign Up Failed', 
          `Error: ${error.message}\n\nDetails: ${JSON.stringify(error, null, 2)}`,
          [
            { text: 'Copy Error', onPress: () => console.log('Full Error Object:', error) },
            { text: 'OK' }
          ]
        );
      } else {
        console.log('✅ Signup successful!');
        console.log('👤 User created:', data.user?.id);
        console.log('📧 Confirmation sent:', data.user?.email_confirmed_at);
        
        // Create staff profile with collected data
        console.log('📝 Creating staff profile with data:', {
          userId: data.user?.id,
          firstName,
          lastName,
          faculty,
          department,
          position
        });

        try {
          const profileData = {
            id: data.user!.id,
            email: email.toLowerCase().trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            faculty: faculty,
            department: department,
            position: position,
            user_type: 'staff' as const,
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

          console.log('💾 Saving profile data:', profileData);
          const { data: profileResult, error: profileError } = await supabase
            .from('user_profiles')
            .insert([profileData])
            .select()
            .single();

          if (profileError) {
            throw profileError;
          }
          
          console.log('✅ Profile created successfully:', profileResult);
          Alert.alert(
            'Account Created Successfully!', 
            `Welcome ${firstName}! Your staff account has been created successfully.`,
            [{ text: 'Get Started', onPress: () => router.replace('/(tabs)') }]
          );
        } catch (profileError: any) {
          console.error('❌ Profile creation failed:', profileError);
          Alert.alert(
            'Account Created but Profile Incomplete', 
            'Your account was created but there was an issue setting up your profile. You can complete it later in settings.',
            [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
          );
        }
      }
    } catch (error: any) {
      console.log('💥 Unexpected error during signup:', error);
      console.log('Error type:', typeof error);
      console.log('Error constructor:', error.constructor.name);
      console.log('Error stack:', error.stack);
      
      Alert.alert(
        'Unexpected Error', 
        `Something went wrong: ${error.message || error.toString()}\n\nFull error: ${JSON.stringify(error, null, 2)}`,
        [
          { text: 'Copy Error', onPress: () => console.log('Full Error:', error) },
          { text: 'OK' }
        ]
      );
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
            <Text style={styles.title}>Create Staff Account</Text>
            <Text style={styles.subtitle}>Join the OAU faculty team</Text>
          </View>

          {/* Personal Information Card */}
          <View style={styles.formCard}>
            <BlurView intensity={10} style={styles.formBlur}>
              <View style={styles.formContent}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="person-outline" size={20} color="#667eea" />
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
                      placeholder="your.email@oauife.edu.ng"
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
                  <Ionicons name="school-outline" size={20} color="#667eea" />
                  <Text style={styles.sectionTitle}>Academic Information</Text>
                </View>

                {/* Faculty */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Faculty</Text>
                  <View style={styles.pickerContainer}>
                    <Ionicons name="library-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <Picker
                      selectedValue={faculty}
                      onValueChange={handleFacultyChange}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select your faculty" value="" />
                      {faculties.map((fac) => (
                        <Picker.Item key={fac} label={fac} value={fac} />
                      ))}
                    </Picker>
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

                {/* Position */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Position</Text>
                  <View style={styles.pickerContainer}>
                    <Ionicons name="business-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <Picker
                      selectedValue={position}
                      onValueChange={(itemValue) => setPosition(itemValue)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select your position" value="" />
                      {positions.map((pos) => (
                        <Picker.Item key={pos} label={pos} value={pos} />
                      ))}
                    </Picker>
                  </View>
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
                colors={loading ? ['#94a3b8', '#cbd5e1'] : ['#667eea', '#764ba2']}
                style={styles.createGradient}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <Ionicons name="hourglass" size={20} color="white" />
                    <Text style={styles.createButtonText}>Creating Account...</Text>
                  </View>
                ) : (
                  <Text style={styles.createButtonText}>Create Staff Account</Text>
                )}
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
    shadowColor: '#667eea',
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
    color: '#1e293b',
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    fontStyle: 'italic',
  },
  actionContainer: {
    marginTop: 12,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#667eea',
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
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#667eea',
    fontWeight: '700',
  },
});

export default StaffSignUp;