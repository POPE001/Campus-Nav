import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { OAU_VENUES, Venue, searchVenues, getVenueById } from '@/constants/Venues';
import { scheduleNotificationsForCourse, cancelNotificationsForCourse } from '@/services/NotificationService';
import { showNavigationOptions } from '@/services/NavigationService';

interface Course {
  id: string;
  title: string;
  code: string;
  instructor: string;
  location: string;
  venueId?: string;
  day: string;
  startTime: string;
  endTime: string;
  color: string;
  type: 'class' | 'exam' | 'deadline';
  description?: string;
  reminderEnabled: boolean;
  reminderMinutes: number;
  examDate?: string;
  deadlineDate?: string;
}

interface FormData {
  title: string;
  code: string;
  instructor: string;
  location: string;
  venueId: string;
  day: string;
  startTime: string;
  endTime: string;
  type: 'class' | 'exam' | 'deadline';
  description: string;
  reminderEnabled: boolean;
  reminderMinutes: number;
  examDate: string;
  deadlineDate: string;
}

interface CourseModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (courseData: Course) => void;
  onDelete?: (courseId: string) => void;
  editingCourse: Course | null;
  userType: string | null;
  formData: FormData;
  setFormData: (data: FormData) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

const REMINDER_OPTIONS = [
  { label: '5 minutes', value: 5 },
  { label: '10 minutes', value: 10 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
];

export const CourseModal: React.FC<CourseModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  editingCourse,
  userType,
  formData,
  setFormData,
}) => {
  const [venueSearch, setVenueSearch] = useState('');
  const [showVenueList, setShowVenueList] = useState(false);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'exam' | 'deadline'>('exam');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (venueSearch) {
      const venues = searchVenues(venueSearch);
      console.log('🏫 VENUE SEARCH - Query:', venueSearch);
      console.log('🏫 VENUE SEARCH - Results:', venues.map(v => ({ name: v.name, code: v.code, building: v.building })));
      setFilteredVenues(venues.slice(0, 10));
    } else {
      setFilteredVenues([]);
    }
  }, [venueSearch]);

  useEffect(() => {
    if (editingCourse && editingCourse.venueId) {
      const venue = getVenueById(editingCourse.venueId);
      setVenueSearch(venue ? venue.name : '');
    } else {
      setVenueSearch('');
    }
  }, [editingCourse]);

  const selectVenue = (venue: Venue) => {
    setFormData({ ...formData, venueId: venue.id, location: venue.name });
    setVenueSearch(venue.name);
    setShowVenueList(false);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.code || !formData.instructor) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    if (formData.type === 'exam' && !formData.examDate) {
      Alert.alert('Error', 'Please select an exam date');
      return;
    }

    if (formData.type === 'deadline' && !formData.deadlineDate) {
      Alert.alert('Error', 'Please select a deadline date');
      return;
    }

    const courseData: Course = {
      ...formData,
      id: editingCourse?.id || Date.now().toString(),
      color: editingCourse?.color || '#667eea',
    };

    // Cancel existing notifications for this course if editing
    if (editingCourse) {
      await cancelNotificationsForCourse(editingCourse.id);
    }

    // Schedule new notifications if enabled
    if (courseData.reminderEnabled) {
      try {
        const notificationIds = await scheduleNotificationsForCourse(courseData);
        console.log(`Scheduled ${notificationIds.length} notifications for ${courseData.title}`);
      } catch (error) {
        console.error('Error scheduling notifications:', error);
        Alert.alert(
          'Reminder Setup',
          'Event saved successfully, but reminders could not be set up. Please check notification permissions.',
          [{ text: 'OK' }]
        );
      }
    }

    onSave(courseData);
  };

  const handleDelete = () => {
    if (editingCourse && onDelete) {
      Alert.alert(
        'Delete Course',
        'Are you sure you want to delete this course?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              // Cancel all notifications for this course
              await cancelNotificationsForCourse(editingCourse.id);
              onDelete(editingCourse.id);
            }
          }
        ]
      );
    }
  };

  const openDatePicker = (type: 'exam' | 'deadline') => {
    setDatePickerType(type);
    const currentDate = type === 'exam' 
      ? (formData.examDate ? new Date(formData.examDate) : new Date())
      : (formData.deadlineDate ? new Date(formData.deadlineDate) : new Date());
    setSelectedDate(currentDate);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      if (datePickerType === 'exam') {
        setFormData({ ...formData, examDate: dateString });
      } else {
        setFormData({ ...formData, deadlineDate: dateString });
      }
      setSelectedDate(selectedDate);
    }
  };

  const renderVenueItem = ({ item }: { item: Venue }) => (
    <View style={styles.venueItem}>
      <TouchableOpacity
        style={styles.venueMainContent}
        onPress={() => selectVenue(item)}
      >
        <View style={styles.venueInfo}>
          <Text style={styles.venueName}>{item.name}</Text>
          <Text style={styles.venueDetails}>{item.category} • {item.building}</Text>
          <Text style={styles.venueDescription}>{item.description}</Text>
        </View>
        <Ionicons name="checkmark-circle-outline" size={20} color="#667eea" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.navigateButton}
        onPress={() => showNavigationOptions(item)}
      >
        <Ionicons name="navigate-outline" size={18} color="#667eea" />
        <Text style={styles.navigateText}>Navigate</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingCourse ? 'Edit Event' : 'Add Event'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
            {/* Event Type Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Event Type</Text>
              <View style={styles.typeButtons}>
                {[
                  { key: 'class', label: '📚 Class', icon: 'school' },
                  { key: 'exam', label: '📝 Exam', icon: 'document-text' },
                  { key: 'deadline', label: '⏰ Deadline', icon: 'time' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.typeButton,
                      formData.type === type.key && styles.selectedTypeButton
                    ]}
                    onPress={() => setFormData({ ...formData, type: type.key as 'class' | 'exam' | 'deadline' })}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      formData.type === type.key && styles.selectedTypeButtonText
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Basic Information */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData({...formData, title: text})}
                placeholder="e.g., Computer Science, Midterm Exam, Project Submission"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Course Code</Text>
              <TextInput
                style={styles.input}
                value={formData.code}
                onChangeText={(text) => setFormData({...formData, code: text})}
                placeholder="e.g., CSC 101, MTH 201"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {userType === 'staff' ? 'Class/Group' : 'Instructor/Lecturer'}
              </Text>
              <TextInput
                style={styles.input}
                value={formData.instructor}
                onChangeText={(text) => setFormData({...formData, instructor: text})}
                placeholder={userType === 'staff' ? 'e.g., CS 300 Level' : 'e.g., Dr. Smith'}
              />
            </View>

            {/* Venue Selection with Map Integration */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Venue</Text>
              <View style={styles.venueInputContainer}>
                <TextInput
                  style={[styles.input, styles.venueInput]}
                  value={venueSearch}
                  onChangeText={(text) => {
                    setVenueSearch(text);
                    setFormData({...formData, location: text});
                    setShowVenueList(text.length > 0);
                  }}
                  placeholder="Search for venue or enter custom location"
                />
                <TouchableOpacity
                  style={styles.venueSearchButton}
                  onPress={() => setShowVenueList(!showVenueList)}
                >
                  <Ionicons name="search" size={20} color="#667eea" />
                </TouchableOpacity>
              </View>

              {showVenueList && filteredVenues.length > 0 && (
                <View style={styles.venueList}>
                  <View style={styles.venueListContainer}>
                    {filteredVenues.map((venue) => (
                      <View key={venue.id}>
                        {renderVenueItem({ item: venue })}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Date/Time Configuration */}
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Day</Text>
                <View style={styles.dayButtons}>
                  {DAYS.map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayButton,
                        formData.day === day && styles.selectedDayButton
                      ]}
                      onPress={() => setFormData({...formData, day})}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        formData.day === day && styles.selectedDayButtonText
                      ]}>
                        {day.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Start Time</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.startTime}
                    onValueChange={(value) => setFormData({...formData, startTime: value})}
                    style={styles.picker}
                  >
                    {TIME_SLOTS.map(time => (
                      <Picker.Item key={time} label={time} value={time} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>End Time</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.endTime}
                    onValueChange={(value) => setFormData({...formData, endTime: value})}
                    style={styles.picker}
                  >
                    {TIME_SLOTS.map(time => (
                      <Picker.Item key={time} label={time} value={time} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            {/* Exam Date Selection */}
            {formData.type === 'exam' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Exam Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => openDatePicker('exam')}
                >
                  <Text style={styles.dateButtonText}>
                    {formData.examDate || 'Select exam date'}
                  </Text>
                  <Ionicons name="calendar" size={20} color="#667eea" />
                </TouchableOpacity>
              </View>
            )}

            {/* Deadline Date Selection */}
            {formData.type === 'deadline' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Deadline Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => openDatePicker('deadline')}
                >
                  <Text style={styles.dateButtonText}>
                    {formData.deadlineDate || 'Select deadline date'}
                  </Text>
                  <Ionicons name="calendar" size={20} color="#667eea" />
                </TouchableOpacity>
              </View>
            )}

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
                placeholder="Add notes or additional details..."
                multiline={true}
                numberOfLines={3}
              />
            </View>

            {/* Reminder Settings */}
            <View style={styles.inputGroup}>
              <View style={styles.reminderHeader}>
                <Text style={styles.inputLabel}>Reminder</Text>
                <Switch
                  value={formData.reminderEnabled}
                  onValueChange={(value) => setFormData({...formData, reminderEnabled: value})}
                  trackColor={{ false: '#e9ecef', true: '#667eea' }}
                  thumbColor={formData.reminderEnabled ? '#ffffff' : '#f4f3f4'}
                />
              </View>

              {formData.reminderEnabled && (
                <View style={styles.reminderOptions}>
                  <Text style={styles.reminderLabel}>Remind me</Text>
                  <View style={styles.reminderButtons}>
                    {REMINDER_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.reminderButton,
                          formData.reminderMinutes === option.value && styles.selectedReminderButton
                        ]}
                        onPress={() => setFormData({...formData, reminderMinutes: option.value})}
                      >
                        <Text style={[
                          styles.reminderButtonText,
                          formData.reminderMinutes === option.value && styles.selectedReminderButtonText
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.reminderDescription}>
                    before the {formData.type === 'deadline' ? 'deadline' : 'event'}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            {editingCourse && onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>
                {editingCourse ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '95%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#343a40',
  },
  closeButton: {
    padding: 4,
  },
  modalForm: {
    padding: 20,
    maxHeight: '75%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  selectedTypeButton: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  selectedTypeButtonText: {
    color: 'white',
  },
  venueInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  venueInput: {
    flex: 1,
    marginRight: 8,
  },
  venueSearchButton: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  venueList: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    maxHeight: 200,
  },
  venueListContainer: {
    maxHeight: 180,
  },
  venueItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  venueMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#343a40',
  },
  venueDetails: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  venueDescription: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 1,
    fontStyle: 'italic',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#667eea',
    alignSelf: 'flex-end',
  },
  navigateText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    marginLeft: 4,
  },
  row: {
    marginBottom: 16,
  },
  halfInput: {
    marginHorizontal: 4,
  },
  dayButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedDayButton: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  dayButtonText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  selectedDayButtonText: {
    color: 'white',
  },
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#495057',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderOptions: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  reminderLabel: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 12,
  },
  reminderButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  reminderButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedReminderButton: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  reminderButtonText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  selectedReminderButtonText: {
    color: 'white',
  },
  reminderDescription: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
  },
  deleteButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#dc3545',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#667eea',
    marginLeft: 'auto',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
