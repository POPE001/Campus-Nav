import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import { UserProfile, profileService } from '@/lib/profileService';
import Toast from 'react-native-toast-message';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
  initialSection?: 'personal' | 'academic' | 'contact';
}

export default function EditProfileModal({
  visible,
  onClose,
  profile,
  onProfileUpdate,
  initialSection = 'personal',
}: EditProfileModalProps) {
  const { theme } = useTheme();
  const { fontSizes } = useFontSize();
  const [activeSection, setActiveSection] = useState(initialSection);
  const [isLoading, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  // Helper function to parse names from full_name
  const parseNamesFromProfile = (profile: UserProfile | null) => {
    if (!profile) return { firstName: '', lastName: '' };
    
    let firstName = profile.first_name || '';
    let lastName = profile.last_name || '';
    
    // Parse full_name if individual names are missing
    if ((!firstName || !lastName) && profile.full_name) {
      const nameParts = profile.full_name.trim().split(' ');
      if (nameParts.length >= 2) {
        firstName = firstName || nameParts[0];
        lastName = lastName || nameParts.slice(1).join(' ');
      }
    }
    
    return { firstName, lastName };
  };

  const { firstName: initialFirstName, lastName: initialLastName } = parseNamesFromProfile(profile);

  const [formData, setFormData] = useState({
    // Personal Info
    first_name: initialFirstName,
    last_name: initialLastName,
    email: profile?.email || '',
    bio: profile?.bio || '',
    date_of_birth: profile?.date_of_birth || '',
    gender: profile?.gender || '',
    nationality: profile?.nationality || '',
    state_of_origin: profile?.state_of_origin || '',
    
    // Academic Info
    department: profile?.department || '',
    faculty: profile?.faculty || '',
    level: profile?.level || '',
    position: profile?.position || '',
    cgpa: profile?.cgpa?.toString() || '',
    student_id: profile?.student_id || '',
    staff_id: profile?.staff_id || '',
    
    // Contact Info
    phone_number: profile?.phone_number || '',
    emergency_contact: profile?.emergency_contact || '',
    emergency_phone: profile?.emergency_phone || '',
    address: profile?.address || '',
  });

  useEffect(() => {
    if (profile) {
      console.log('📝 EDIT PROFILE - Profile data received:', {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        full_name: profile.full_name,
      });
      
      // Parse full_name if individual names are missing
      let firstName = profile.first_name || '';
      let lastName = profile.last_name || '';
      
      if ((!firstName || !lastName) && profile.full_name) {
        const nameParts = profile.full_name.trim().split(' ');
        if (nameParts.length >= 2) {
          firstName = firstName || nameParts[0];
          lastName = lastName || nameParts.slice(1).join(' ');
          console.log('📝 EDIT PROFILE - Parsed names from full_name:', {
            original_full_name: profile.full_name,
            parsed_first_name: firstName,
            parsed_last_name: lastName,
          });
        }
      }
      
      setFormData({
        first_name: firstName,
        last_name: lastName,
        email: profile.email || '',
        bio: profile.bio || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        nationality: profile.nationality || '',
        state_of_origin: profile.state_of_origin || '',
        department: profile.department || '',
        faculty: profile.faculty || '',
        level: profile.level || '',
        position: profile.position || '',
        cgpa: profile.cgpa?.toString() || '',
        student_id: profile.student_id || '',
        staff_id: profile.staff_id || '',
        phone_number: profile.phone_number || '',
        emergency_contact: profile.emergency_contact || '',
        emergency_phone: profile.emergency_phone || '',
        address: profile.address || '',
      });
      
      console.log('📝 EDIT PROFILE - Form data set to:', {
        first_name: firstName,
        last_name: lastName,
        email: profile.email || '',
      });
    }
  }, [profile]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Personal Info validation
    if (activeSection === 'personal') {
      if (!formData.first_name.trim()) {
        newErrors.first_name = 'First name is required';
      }
      if (!formData.last_name.trim()) {
        newErrors.last_name = 'Last name is required';
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email format is invalid';
      }
    }

    // Academic Info validation
    if (activeSection === 'academic') {
      if (!formData.faculty.trim()) {
        newErrors.faculty = 'Faculty is required';
      }
      if (!formData.department.trim()) {
        newErrors.department = 'Department is required';
      }
      if (profile?.user_type === 'student' && !formData.level.trim()) {
        newErrors.level = 'Level is required for students';
      }
      if (profile?.user_type === 'staff' && !formData.position.trim()) {
        newErrors.position = 'Position is required for staff';
      }
      if (formData.cgpa && (isNaN(Number(formData.cgpa)) || Number(formData.cgpa) > 4.0 || Number(formData.cgpa) < 0)) {
        newErrors.cgpa = 'CGPA must be between 0.0 and 4.0';
      }
    }

    // Contact Info validation
    if (activeSection === 'contact') {
      if (formData.phone_number && !/^\+?[\d\s-()]+$/.test(formData.phone_number)) {
        newErrors.phone_number = 'Invalid phone number format';
      }
      if (formData.emergency_phone && !/^\+?[\d\s-()]+$/.test(formData.emergency_phone)) {
        newErrors.emergency_phone = 'Invalid emergency phone format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fix the errors below',
      });
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const updateData: Partial<UserProfile> = {};

      // Prepare update data based on active section
      if (activeSection === 'personal') {
        updateData.first_name = formData.first_name.trim();
        updateData.last_name = formData.last_name.trim();
        updateData.full_name = `${formData.first_name.trim()} ${formData.last_name.trim()}`;
        updateData.email = formData.email.trim();
        updateData.bio = formData.bio.trim() || null;
        updateData.date_of_birth = formData.date_of_birth || null;
        updateData.gender = formData.gender || null;
        updateData.nationality = formData.nationality.trim() || null;
        updateData.state_of_origin = formData.state_of_origin.trim() || null;
      } else if (activeSection === 'academic') {
        updateData.department = formData.department.trim();
        updateData.faculty = formData.faculty.trim();
        updateData.level = formData.level.trim() || null;
        updateData.position = formData.position.trim() || null;
        updateData.cgpa = formData.cgpa ? Number(formData.cgpa) : null;
        updateData.student_id = formData.student_id.trim() || null;
        updateData.staff_id = formData.staff_id.trim() || null;
      } else if (activeSection === 'contact') {
        updateData.phone_number = formData.phone_number.trim() || null;
        updateData.emergency_contact = formData.emergency_contact.trim() || null;
        updateData.emergency_phone = formData.emergency_phone.trim() || null;
        updateData.address = formData.address.trim() || null;
      }

      const { data, error } = await profileService.updateProfile(updateData);

      if (error) {
        throw error;
      }

      if (data) {
        onProfileUpdate(data);
        Toast.show({
          type: 'success',
          text1: 'Profile Updated',
          text2: `${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} information saved successfully`,
        });
        onClose();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Failed to save profile changes. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderInput = (
    field: string,
    label: string,
    placeholder?: string,
    multiline = false,
    keyboardType: any = 'default'
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.text, fontSize: fontSizes.medium }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
          {
            backgroundColor: theme.card,
            borderColor: errors[field] ? '#ff4757' : theme.border,
            color: theme.text,
            fontSize: fontSizes.body,
          },
        ]}
        value={(() => {
          const fieldValue = formData[field as keyof typeof formData];
          if (field === 'first_name' || field === 'last_name') {
            console.log(`📝 EDIT PROFILE - Rendering ${field}, value:`, fieldValue);
          }
          return fieldValue;
        })()}
        onChangeText={(value) => {
          console.log(`📝 EDIT PROFILE - Field ${field} changed to:`, value);
          updateFormData(field, value);
        }}
        placeholder={placeholder}
        placeholderTextColor="#666666"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
      />
      {errors[field] ? (
        <Text style={[styles.errorText, { fontSize: fontSizes.caption }]}>
          {errors[field]}
        </Text>
      ) : null}
    </View>
  );

  const renderPicker = (field: string, label: string, options: { label: string; value: string }[]) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.text, fontSize: fontSizes.medium }]}>
        {label}
      </Text>
      <View style={[styles.pickerContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Picker
          selectedValue={formData[field as keyof typeof formData]}
          onValueChange={(value) => updateFormData(field, value)}
          style={[styles.picker, { color: theme.text }]}
        >
          <Picker.Item label={`Select ${label}`} value="" />
          {options.map((option) => (
            <Picker.Item key={option.value} label={option.label} value={option.value} />
          ))}
        </Picker>
      </View>
      {errors[field] ? (
        <Text style={[styles.errorText, { fontSize: fontSizes.caption }]}>
          {errors[field]}
        </Text>
      ) : null}
    </View>
  );

  const renderPersonalSection = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {renderInput('first_name', 'First Name *', 'Enter your first name')}
      {renderInput('last_name', 'Last Name *', 'Enter your last name')}
      {renderInput('email', 'Email *', 'Enter your email address', false, 'email-address')}
      {renderInput('bio', 'Bio', 'Tell others about yourself...', true)}
      {renderInput('date_of_birth', 'Date of Birth', 'YYYY-MM-DD')}
      {renderPicker('gender', 'Gender', [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Other', value: 'other' },
        { label: 'Prefer not to say', value: 'prefer_not_to_say' },
      ])}
      {renderInput('nationality', 'Nationality', 'Enter your nationality')}
      {renderInput('state_of_origin', 'State of Origin', 'Enter your state of origin')}
    </ScrollView>
  );

  const renderAcademicSection = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {renderInput('faculty', 'Faculty *', 'Enter your faculty')}
      {renderInput('department', 'Department *', 'Enter your department')}
      
      {profile?.user_type === 'student' && (
        <>
          {renderPicker('level', 'Level *', [
            { label: '100 Level', value: '100' },
            { label: '200 Level', value: '200' },
            { label: '300 Level', value: '300' },
            { label: '400 Level', value: '400' },
            { label: '500 Level', value: '500' },
          ])}
          {renderInput('student_id', 'Student ID', 'Enter your student ID')}
          {renderInput('cgpa', 'CGPA', 'Enter your CGPA (0.0 - 4.0)', false, 'decimal-pad')}
        </>
      )}
      
      {profile?.user_type === 'staff' && (
        <>
          {renderInput('position', 'Position *', 'Enter your position/rank')}
          {renderInput('staff_id', 'Staff ID', 'Enter your staff ID')}
        </>
      )}
    </ScrollView>
  );

  const renderContactSection = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {renderInput('phone_number', 'Phone Number', 'Enter your phone number', false, 'phone-pad')}
      {renderInput('emergency_contact', 'Emergency Contact', 'Emergency contact name')}
      {renderInput('emergency_phone', 'Emergency Phone', 'Emergency contact phone', false, 'phone-pad')}
      {renderInput('address', 'Address', 'Enter your address', true)}
    </ScrollView>
  );

  const sections = [
    { id: 'personal', label: 'Personal', icon: 'person' },
    { id: 'academic', label: 'Academic', icon: 'school' },
    { id: 'contact', label: 'Contact', icon: 'call' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        {/* Header */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontSize: fontSizes.h3 }]}>
              Edit Profile
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading}
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={[styles.saveButtonText, { fontSize: fontSizes.medium }]}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Section Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          {sections.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={[
                styles.tab,
                activeSection === section.id && [styles.activeTab, { borderBottomColor: theme.primary }],
              ]}
              onPress={() => setActiveSection(section.id as any)}
            >
              <Ionicons
                name={section.icon as any}
                size={20}
                color={activeSection === section.id ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeSection === section.id ? theme.primary : theme.textSecondary,
                    fontSize: fontSizes.medium,
                  },
                ]}
              >
                {section.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.formContainer}>
            {activeSection === 'personal' && renderPersonalSection()}
            {activeSection === 'academic' && renderAcademicSection()}
            {activeSection === 'contact' && renderContactSection()}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
  },
  errorText: {
    color: '#ff4757',
    marginTop: 4,
    fontWeight: '500',
  },
});
