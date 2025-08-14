import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';

const CompleteProfile = () => {
  const [level, setLevel] = useState('');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { userType } = useLocalSearchParams();

  const levels = ['100', '200', '300', '400', '500', 'Graduate'];
  
  const faculties = [
    'Faculty of Arts',
    'Faculty of Law',
    'Faculty of Science',
    'Faculty of Engineering and Technology',
    'Faculty of Social Sciences',
    'Faculty of Education',
    'Faculty of Environmental Design and Management',
    'Faculty of Administration',
    'Faculty of Agriculture',
    'Faculty of Basic Medical Sciences',
    'Faculty of Clinical Sciences',
    'Faculty of Dentistry',
    'Faculty of Pharmacy',
    'College of Health Sciences',
    ...(userType === 'staff' ? ['Administrative Unit', 'IT Services', 'Security Services', 'Student Affairs', 'Registry'] : [])
  ];

  const positions = [
    'Professor',
    'Associate Professor',
    'Senior Lecturer',
    'Lecturer I',
    'Lecturer II',
    'Assistant Lecturer',
    'Graduate Assistant',
    'Administrative Officer',
    'IT Officer',
    'Security Officer',
    'Student Affairs Officer',
    'Registry Officer',
    'Other'
  ];

  const handleCompleteProfile = async () => {
    if (userType === 'student') {
      if (!level || !faculty || !department) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
    } else if (userType === 'staff') {
      if (!faculty || !department || !position) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }
    }

    setLoading(true);
    
    try {
      const { data: user, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user.user) {
        Alert.alert('Error', 'User not found');
        setLoading(false);
        return;
      }

      const updateData: any = {
        user_type: userType,
        faculty: faculty,
        department: department,
      };

      if (userType === 'student') {
        updateData.level = level;
      } else if (userType === 'staff') {
        updateData.position = position;
      }

      const { error } = await supabase.auth.updateUser({
        data: updateData
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Profile completed successfully!');
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete profile');
    }
    
    setLoading(false);
  };

  return (
    <LinearGradient
      colors={userType === 'student' ? ['#667eea', '#764ba2'] : ['#764ba2', '#667eea']}
      style={styles.gradient}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              {userType === 'student' 
                ? 'Tell us about your academic details' 
                : 'Tell us about your position at OAU'
              }
            </Text>
            
            {userType === 'student' && (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={level}
                  onValueChange={setLevel}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Level" value="" />
                  {levels.map((lvl) => (
                    <Picker.Item key={lvl} label={`${lvl} Level`} value={lvl} />
                  ))}
                </Picker>
              </View>
            )}

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={faculty}
                onValueChange={setFaculty}
                style={styles.picker}
              >
                <Picker.Item label={userType === 'staff' ? "Select Faculty/Unit" : "Select Faculty"} value="" />
                {faculties.map((fac) => (
                  <Picker.Item key={fac} label={fac} value={fac} />
                ))}
              </Picker>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Department"
                placeholderTextColor="#8E8E93"
                value={department}
                onChangeText={setDepartment}
                autoCapitalize="words"
              />
            </View>

            {userType === 'staff' && (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={position}
                  onValueChange={setPosition}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Position" value="" />
                  {positions.map((pos) => (
                    <Picker.Item key={pos} label={pos} value={pos} />
                  ))}
                </Picker>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleCompleteProfile}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Completing Profile...' : 'Complete Profile'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 30,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    height: 50,
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  pickerContainer: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 16,
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: '#667eea',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CompleteProfile;
