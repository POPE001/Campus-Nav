import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { courseService, Course as DatabaseCourse } from '@/lib/courseService';
import { databaseNotificationService } from '@/lib/notificationService';
import { getVenueById } from '@/constants/Venues';
import { CourseModal } from './CourseModal';
import { CourseDetailModal } from './CourseDetailModal';
import { ContentCreationModal } from './ContentCreationModal';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import { useScreenStyles } from '@/hooks/useScreenStyles';
import { ScreenContainer } from './ScreenContainer';
import { ScreenHeader } from './ScreenHeader';

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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

const COURSE_COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe',
  '#43e97b', '#38f9d7', '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
];

const { width, height } = Dimensions.get('window');

const Timetable = () => {
  // Theme and responsive hooks
  const { theme, isDark } = useTheme();
  const { fontSizes } = useFontSize();
  const screenStyles = useScreenStyles();

  // Fallback values in case hooks return undefined
  const safeFontSizes = fontSizes || {
    small: 12,
    medium: 14,
    large: 18,
    caption: 10,
  };
  
  const safeScreenStyles = screenStyles || {
    spacing: {
      xs: 4,
      small: 8,
      medium: 16,
      large: 24,
      xlarge: 32,
      xxlarge: 48,
    },
    borderRadius: {
      small: 4,
      medium: 8,
      large: 12,
    },
  };

  const [courses, setCourses] = useState<Course[]>([]);
  const [userType, setUserType] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [contentModalVisible, setContentModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    instructor: '',
    location: '',
    venueId: '',
    day: 'Monday',
    startTime: '8:00',
    endTime: '9:00',
    type: 'class' as 'class' | 'exam' | 'deadline',
    description: '',
    reminderEnabled: true,
    reminderMinutes: 15,
    examDate: '',
    deadlineDate: '',
  });

  useEffect(() => {
    checkUserType();
    loadCourses();
    initializeNotifications();
    
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const initializeNotifications = async () => {
    try {
      console.log('📚 TIMETABLE - Initializing notification service...');
      await databaseNotificationService.initialize();
      console.log('📚 TIMETABLE - Notification service initialized');
    } catch (error) {
      console.error('📚 TIMETABLE - Error initializing notifications:', error);
    }
  };

  const checkUserType = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const userMetadata = session.user.user_metadata;
      const detectedUserType = userMetadata?.user_type || 'student';
      console.log('📚 TIMETABLE - User metadata:', userMetadata);
      console.log('📚 TIMETABLE - Detected user type:', detectedUserType);
      console.log('📚 TIMETABLE - Should show megaphone button:', detectedUserType === 'staff');
      setUserType(detectedUserType);
    }
  };

  // Convert database course to UI course format
  const convertDatabaseCourse = (dbCourse: DatabaseCourse): Course => ({
    id: dbCourse.id,
    title: dbCourse.title,
    code: dbCourse.code,
    instructor: dbCourse.instructor,
    location: dbCourse.location,
    venueId: dbCourse.venue_id,
    day: dbCourse.day,
    startTime: dbCourse.start_time,
    endTime: dbCourse.end_time,
    color: dbCourse.color,
    type: dbCourse.type,
    description: dbCourse.description,
    reminderEnabled: dbCourse.reminder_enabled,
    reminderMinutes: dbCourse.reminder_minutes,
    examDate: dbCourse.exam_date,
    deadlineDate: dbCourse.deadline_date,
  });

  const loadCourses = async () => {
    try {
      console.log('📚 TIMETABLE - Loading courses from database...');
      setLoading(true);

      const { data, error } = await courseService.getCourses();
      
      if (error) {
        console.error('📚 TIMETABLE - Error loading courses:', error);
        
        // If no courses exist, initialize with sample data
        if (error.message?.includes('No rows') || data === null || data.length === 0) {
          console.log('📚 TIMETABLE - No courses found, initializing sample data...');
          await courseService.initializeSampleData();
          
          // Try loading again
          const { data: retryData, error: retryError } = await courseService.getCourses();
          if (retryError) {
            Alert.alert('Error', 'Failed to load courses. Please try again.');
            setCourses([]);
          } else {
            const uiCourses = (retryData || []).map(convertDatabaseCourse);
            setCourses(uiCourses);
            console.log('📚 TIMETABLE - Loaded courses after initialization:', uiCourses.length);
          }
        } else {
          Alert.alert('Error', 'Failed to load courses. Please try again.');
          setCourses([]);
        }
      } else {
        const uiCourses = (data || []).map(convertDatabaseCourse);
        setCourses(uiCourses);
        console.log('📚 TIMETABLE - Loaded courses:', uiCourses.length);
      }
    } catch (error) {
      console.error('📚 TIMETABLE - Exception loading courses:', error);
      Alert.alert('Error', 'Failed to load courses. Please check your connection.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Convert UI course to database format
  const convertToDatabaseCourse = (uiCourse: Course): Omit<DatabaseCourse, 'user_id' | 'created_at' | 'updated_at'> => ({
    id: uiCourse.id,
    title: uiCourse.title,
    code: uiCourse.code,
    instructor: uiCourse.instructor,
    location: uiCourse.location,
    venue_id: uiCourse.venueId,
    day: uiCourse.day,
    start_time: uiCourse.startTime,
    end_time: uiCourse.endTime,
    color: uiCourse.color,
    type: uiCourse.type,
    description: uiCourse.description,
    reminder_enabled: uiCourse.reminderEnabled,
    reminder_minutes: uiCourse.reminderMinutes,
    exam_date: uiCourse.examDate,
    deadline_date: uiCourse.deadlineDate,
  });

  const handleSaveCourse = async (courseData: Course) => {
    try {
      setLoading(true);
      console.log('📚 TIMETABLE - Saving course:', courseData.title);

      if (editingCourse) {
        // Update existing course
        const dbCourseData = convertToDatabaseCourse(courseData);
        const { data, error } = await courseService.updateCourse(editingCourse.id, dbCourseData);
        
        if (error) {
          console.error('📚 TIMETABLE - Error updating course:', error);
          Alert.alert('Error', 'Failed to update course. Please try again.');
        } else {
          // Update local state
          setCourses(courses.map(c => c.id === editingCourse.id ? courseData : c));
          setModalVisible(false);
          setEditingCourse(null);
          console.log('📚 TIMETABLE - Course updated successfully');
        }
      } else {
        // Create new course
        const dbCourseData = convertToDatabaseCourse(courseData);
        const { data, error } = await courseService.createCourse(dbCourseData);
        
        if (error) {
          console.error('📚 TIMETABLE - Error creating course:', error);
          Alert.alert('Error', 'Failed to create course. Please try again.');
        } else {
          // Add to local state
          const newCourse = convertDatabaseCourse(data!);
          setCourses([...courses, newCourse]);
          setModalVisible(false);
          console.log('📚 TIMETABLE - Course created successfully');
        }
      }
    } catch (error) {
      console.error('📚 TIMETABLE - Exception saving course:', error);
      Alert.alert('Error', 'Failed to save course. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      setLoading(true);
      console.log('📚 TIMETABLE - Deleting course:', courseId);

      const { error } = await courseService.deleteCourse(courseId);
      
      if (error) {
        console.error('📚 TIMETABLE - Error deleting course:', error);
        Alert.alert('Error', 'Failed to delete course. Please try again.');
      } else {
        // Remove from local state
        setCourses(courses.filter(c => c.id !== courseId));
        setModalVisible(false);
        setDetailModalVisible(false);
        setEditingCourse(null);
        setSelectedCourse(null);
        console.log('📚 TIMETABLE - Course deleted successfully');
      }
    } catch (error) {
      console.error('📚 TIMETABLE - Exception deleting course:', error);
      Alert.alert('Error', 'Failed to delete course. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      const venue = course.venueId ? getVenueById(course.venueId) : null;
      setFormData({
        title: course.title,
        code: course.code,
        instructor: course.instructor,
        location: course.location,
        venueId: course.venueId || '',
        day: course.day,
        startTime: course.startTime,
        endTime: course.endTime,
        type: course.type,
        description: course.description || '',
        reminderEnabled: course.reminderEnabled,
        reminderMinutes: course.reminderMinutes,
        examDate: course.examDate || '',
        deadlineDate: course.deadlineDate || '',
      });
    } else {
      setEditingCourse(null);
      setFormData({
        title: '',
        code: '',
        instructor: '',
        location: '',
        venueId: '',
        day: 'Monday',
        startTime: '8:00',
        endTime: '9:00',
        type: 'class',
        description: '',
        reminderEnabled: true,
        reminderMinutes: 15,
        examDate: '',
        deadlineDate: '',
      });
    }
    setModalVisible(true);
  };

  const openDetailModal = (course: Course) => {
    setSelectedCourse(course);
    setDetailModalVisible(true);
  };

  const handleEditFromDetail = (course: Course) => {
    setDetailModalVisible(false);
    openModal(course);
  };

  const deleteCourse = (courseId: string) => {
    setCourses(courses.filter(course => course.id !== courseId));
  };

  const getVenueMapLink = (venueId: string) => {
    const venue = getVenueById(venueId);
    if (!venue) return null;
    
    // This would integrate with your map component
    return {
      latitude: venue.coordinates.latitude,
      longitude: venue.coordinates.longitude,
      name: venue.name,
    };
  };





  const getCourseForTimeSlot = (day: string, time: string) => {
    return courses.find(course => {
      if (course.day !== day) return false;
      
      const courseStart = parseInt(course.startTime.split(':')[0]);
      const courseEnd = parseInt(course.endTime.split(':')[0]);
      const slotTime = parseInt(time.split(':')[0]);
      
      return slotTime >= courseStart && slotTime < courseEnd;
    });
  };

  const getCourseDuration = (course: Course, time: string) => {
    const courseStart = parseInt(course.startTime.split(':')[0]);
    const courseEnd = parseInt(course.endTime.split(':')[0]);
    const slotTime = parseInt(time.split(':')[0]);
    
    if (slotTime === courseStart) {
      return courseEnd - courseStart;
    }
    return 0; // Don't render duplicate slots
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'exam': return '📝';
      case 'deadline': return '⏰';
      default: return '📚';
    }
  };

  const renderCourseCard = (course: Course, duration: number) => {
    const venue = course.venueId ? getVenueById(course.venueId) : null;
    const cardHeight = Math.max(duration * (safeScreenStyles.spacing.xxlarge + 16) - 8, 80);
    
    return (
      <TouchableOpacity
        key={`${course.id}-${course.day}-${course.startTime}`}
        style={[
          styles.courseCard,
          { 
            backgroundColor: course.color,
            height: cardHeight,
            minHeight: 80,
            borderRadius: safeScreenStyles.borderRadius.medium,
            shadowColor: isDark ? course.color : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.4 : 0.2,
            shadowRadius: 6,
            elevation: 4,
          }
        ]}
        onPress={() => openDetailModal(course)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[course.color + 'E0', course.color]}
          style={[StyleSheet.absoluteFill, { borderRadius: safeScreenStyles.borderRadius.medium }]}
        >
          <View style={[styles.courseCardContent, { padding: safeScreenStyles.spacing.small }]}>
            <View style={styles.courseHeader}>
              <View style={styles.courseHeaderLeft}>
                <Text style={[styles.courseTypeIcon, { fontSize: safeFontSizes.small }]}>
                  {getTypeIcon(course.type)}
                </Text>
                <Text style={[styles.courseTitle, { 
                  fontSize: safeFontSizes.small,
                  fontWeight: '700',
                }]} numberOfLines={1}>
                  {course.code}
                </Text>
              </View>
              <View style={styles.courseHeaderRight}>
                {course.reminderEnabled && (
                  <View style={[styles.reminderBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                    <Ionicons name="notifications" size={12} color="rgba(255, 255, 255, 0.9)" />
                  </View>
                )}
              </View>
            </View>
            
            <Text style={[styles.courseSubtitle, { 
              fontSize: safeFontSizes.caption,
              fontWeight: '600',
              marginBottom: safeScreenStyles.spacing.xs,
            }]} numberOfLines={cardHeight > 100 ? 2 : 1}>
              {course.title}
            </Text>
            
            {cardHeight > 100 && (
              <>
                <View style={styles.courseInfoRow}>
                  <Ionicons name="location-outline" size={10} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={[styles.courseInfo, { 
                    fontSize: safeFontSizes.caption - 1,
                    marginLeft: 4,
                  }]} numberOfLines={1}>
                    {course.location}
                  </Text>
                </View>
                
                <View style={styles.courseInfoRow}>
                  <Ionicons name="person-outline" size={10} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={[styles.courseInfo, { 
                    fontSize: safeFontSizes.caption - 1,
                    marginLeft: 4,
                  }]} numberOfLines={1}>
                    {course.instructor}
                  </Text>
                </View>
              </>
            )}
            
            <View style={styles.courseTimeContainer}>
              <Ionicons name="time-outline" size={10} color="rgba(255, 255, 255, 0.8)" />
              <Text style={[styles.courseTime, { 
                fontSize: safeFontSizes.caption - 1,
                fontWeight: '600',
                marginLeft: 4,
              }]}>
                {course.startTime} - {course.endTime}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Dynamic styles based on theme and screen size
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      padding: safeScreenStyles.spacing.medium,
    },
    timetableContainer: {
      backgroundColor: theme.surface,
      borderRadius: safeScreenStyles.borderRadius.large,
      overflow: 'hidden',
      shadowColor: isDark ? '#000' : '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    headerRow: {
      flexDirection: 'row',
      backgroundColor: theme.border + '40',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    timeRow: {
      flexDirection: 'row',
      minHeight: safeScreenStyles.spacing.xxlarge + 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border + '60',
    },
    timeColumn: {
      width: safeScreenStyles.spacing.xxlarge + 8,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRightWidth: 1,
      borderRightColor: theme.border,
    },
    dayColumn: {
      flex: 1,
      minHeight: safeScreenStyles.spacing.xxlarge + 16,
      borderRightWidth: 1,
      borderRightColor: theme.border + '60',
      padding: 2,
    },
  });

  return (
    <ScreenContainer>
      <ScreenHeader
        title={userType === 'staff' ? 'Teaching Schedule' : 'My Timetable'}
        subtitle={`${courses.length} ${courses.length === 1 ? 'course' : 'courses'} this week`}
        colors={isDark ? ['#667eea', '#764ba2'] : ['#667eea', '#764ba2']}
        rightComponent={
          <View style={styles.headerButtons}>
            {console.log('📚 TIMETABLE - Rendering header, userType:', userType, 'isStaff:', userType === 'staff')}
            {userType === 'staff' && (
              <TouchableOpacity
                style={[styles.actionButton, { 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderColor: 'rgba(255, 206, 84, 0.5)',
                }]}
                onPress={() => setContentModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="megaphone" size={18} color="white" />
                <Text style={[styles.buttonLabel, { fontSize: safeFontSizes.caption }]}>
                  Create Post
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, { 
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                borderColor: 'rgba(255, 255, 255, 0.4)',
              }]}
              onPress={() => openModal()}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={[styles.buttonLabel, { fontSize: safeFontSizes.caption }]}>
                Add Class
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {loading && (
        <Animated.View style={[styles.loadingOverlay, { backgroundColor: theme.background + 'F0' }]}>
          <View style={[styles.loadingContent, { backgroundColor: theme.surface }]}>
            <Animated.View style={{ transform: [{ rotate: '360deg' }] }}>
              <Ionicons name="time" size={32} color={theme.primary} />
            </Animated.View>
            <Text style={[styles.loadingText, { color: theme.text, fontSize: safeFontSizes.large }]}>
              Loading your timetable...
            </Text>
            <Text style={[styles.loadingSubtext, { color: theme.textSecondary, fontSize: safeFontSizes.small }]}>
              Fetching courses and schedule
            </Text>
          </View>
        </Animated.View>
      )}

      <Animated.View 
        style={[
          dynamicStyles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={dynamicStyles.timetableContainer}>
            {/* Header row with days */}
            <View style={dynamicStyles.headerRow}>
              <View style={dynamicStyles.timeColumn}>
                <Text style={[styles.timeHeaderText, { color: theme.text, fontSize: safeFontSizes.small }]}>
                  Time
                </Text>
              </View>
              {DAYS.map(day => (
                <View key={day} style={dynamicStyles.dayColumn}>
                  <Text style={[styles.dayHeaderText, { 
                    color: theme.text, 
                    fontSize: safeFontSizes.medium,
                    fontWeight: '700',
                  }]}>
                    {day.substring(0, 3)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Time slots and courses */}
            {TIME_SLOTS.map((time, index) => (
              <Animated.View 
                key={time} 
                style={[
                  dynamicStyles.timeRow,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateX: slideAnim.interpolate({
                        inputRange: [0, 50],
                        outputRange: [0, index % 2 === 0 ? -20 : 20],
                      })
                    }]
                  }
                ]}
              >
                <View style={dynamicStyles.timeColumn}>
                  <Text style={[styles.timeText, { 
                    color: theme.textSecondary, 
                    fontSize: safeFontSizes.small,
                    fontWeight: '600',
                  }]}>
                    {time}
                  </Text>
                </View>
                {DAYS.map(day => {
                  const course = getCourseForTimeSlot(day, time);
                  const duration = course ? getCourseDuration(course, time) : 0;
                  
                  return (
                    <View key={`${day}-${time}`} style={dynamicStyles.dayColumn}>
                      {course && duration > 0 ? (
                        renderCourseCard(course, duration)
                      ) : (
                        <View style={[styles.emptySlot, { backgroundColor: 'transparent' }]} />
                      )}
                    </View>
                  );
                })}
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Floating Action Button */}
      <Animated.View 
        style={[
          styles.fabContainer,
          {
            transform: [{ scale: fadeAnim }],
          }
        ]}
      >
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => openModal()}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
        <Text style={[styles.fabLabel, { color: theme.text, fontSize: safeFontSizes.caption }]}>
          Add Schedule
        </Text>
      </Animated.View>

      {/* Enhanced Course Modal */}
      <CourseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveCourse}
        onDelete={handleDeleteCourse}
        editingCourse={editingCourse}
        userType={userType}
        formData={formData}
        setFormData={setFormData}
      />

      {/* Course Detail Modal */}
      <CourseDetailModal
        visible={detailModalVisible}
        course={selectedCourse}
        onClose={() => setDetailModalVisible(false)}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteCourse}
      />

      {/* Content Creation Modal */}
      {userType === 'staff' && (
        <ContentCreationModal
          visible={contentModalVisible}
          onClose={() => setContentModalVisible(false)}
          onSuccess={() => {
            // Optionally refresh or show success message
            console.log('Content creation successful');
          }}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  // Header styles
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  actionButton: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 80,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonLabel: {
    color: 'white',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  // Legacy styles for backwards compatibility
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 24,
    padding: 12,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contentButton: {
    paddingHorizontal: 16,
  },

  // Time table header styles
  timeHeaderText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  dayHeaderText: {
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 16,
  },
  timeText: {
    fontWeight: '600',
    textAlign: 'center',
  },

  // Course card styles
  emptySlot: {
    flex: 1,
    minHeight: 56,
  },
  courseCard: {
    margin: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  courseCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  courseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  courseHeaderRight: {
    alignItems: 'flex-end',
  },
  courseTypeIcon: {
    marginRight: 6,
  },
  courseTitle: {
    color: 'white',
    flex: 1,
  },
  reminderBadge: {
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseSubtitle: {
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 16,
  },
  courseInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  courseInfo: {
    color: 'rgba(255, 255, 255, 0.85)',
    flex: 1,
  },
  courseTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 4,
  },
  courseTime: {
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Floating Action Button styles
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 6,
  },
  fabLabel: {
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },

  // Loading styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    minWidth: 200,
  },
  loadingText: {
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default Timetable;
