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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { getVenueById } from '@/constants/Venues';
import { CourseModal } from './CourseModal';
import { CourseDetailModal } from './CourseDetailModal';

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
  '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

const COURSE_COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe',
  '#43e97b', '#38f9d7', '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
];

const Timetable = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [userType, setUserType] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
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
    loadSampleData();
  }, []);

  const checkUserType = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const userMetadata = session.user.user_metadata;
      setUserType(userMetadata?.user_type || 'student');
    }
  };

  const loadSampleData = () => {
    // Sample course data with enhanced features
    const sampleCourses: Course[] = [
      {
        id: '1',
        title: 'Computer Science 101',
        code: 'CSC 101',
        instructor: 'Dr. Smith',
        location: 'Computer Laboratory 1',
        venueId: 'science',
        day: 'Monday',
        startTime: '9:00',
        endTime: '11:00',
        color: COURSE_COLORS[0],
        type: 'class',
        description: 'Introduction to programming concepts',
        reminderEnabled: true,
        reminderMinutes: 15,
      },
      {
        id: '2',
        title: 'Mathematics Midterm',
        code: 'MTH 201',
        instructor: 'Prof. Johnson',
        location: 'Science Amphitheatre',
        venueId: 'science',
        day: 'Tuesday',
        startTime: '10:00',
        endTime: '12:00',
        color: COURSE_COLORS[1],
        type: 'exam',
        description: 'Calculus and algebra midterm examination',
        reminderEnabled: true,
        reminderMinutes: 30,
        examDate: '2024-02-15',
      },
      {
        id: '3',
        title: 'Physics Lab',
        code: 'PHY 301',
        instructor: 'Dr. Brown',
        location: 'Physics Laboratory 1',
        venueId: 'science',
        day: 'Wednesday',
        startTime: '14:00',
        endTime: '16:00',
        color: COURSE_COLORS[2],
        type: 'class',
        description: 'Experimental physics and data analysis',
        reminderEnabled: true,
        reminderMinutes: 10,
      },
      {
        id: '4',
        title: 'Research Proposal',
        code: 'ENG 102',
        instructor: 'Dr. Wilson',
        location: 'Faculty of Arts',
        venueId: 'arts',
        day: 'Thursday',
        startTime: '11:00',
        endTime: '12:00',
        color: COURSE_COLORS[3],
        type: 'deadline',
        description: 'Submit final research proposal',
        reminderEnabled: true,
        reminderMinutes: 60,
        deadlineDate: '2024-02-20',
      },
      {
        id: '5',
        title: 'Chemistry Lab',
        code: 'CHM 201',
        instructor: 'Prof. Davis',
        location: 'Chemistry Laboratory 1',
        venueId: 'science',
        day: 'Friday',
        startTime: '9:00',
        endTime: '11:00',
        color: COURSE_COLORS[4],
        type: 'class',
        description: 'Organic chemistry practical session',
        reminderEnabled: true,
        reminderMinutes: 20,
      },
    ];
    setCourses(sampleCourses);
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
    
    return (
      <TouchableOpacity
        key={`${course.id}-${course.day}-${course.startTime}`}
        style={[
          styles.courseCard,
          { 
            backgroundColor: course.color,
            height: duration * 60 - 4, // 60px per hour minus margin
          }
        ]}
        onPress={() => openDetailModal(course)}
      >
        <View style={styles.courseHeader}>
          <Text style={styles.courseTitle} numberOfLines={1}>
            {getTypeIcon(course.type)} {course.code}
          </Text>
          {course.reminderEnabled && (
            <Ionicons name="notifications" size={10} color="rgba(255, 255, 255, 0.8)" />
          )}
        </View>
        <Text style={styles.courseSubtitle} numberOfLines={1}>
          {course.title}
        </Text>
        <Text style={styles.courseInfo} numberOfLines={1}>
          📍 {course.location}
        </Text>

        <Text style={styles.courseInfo} numberOfLines={1}>
          👨‍🏫 {course.instructor}
        </Text>
        <Text style={styles.courseTime}>
          {course.startTime} - {course.endTime}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>
          {userType === 'staff' ? 'Teaching Schedule' : 'My Timetable'}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openModal()}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.timetableContainer}>
          {/* Header row with days */}
          <View style={styles.headerRow}>
            <View style={styles.timeColumn}>
              <Text style={styles.timeHeaderText}>Time</Text>
            </View>
            {DAYS.map(day => (
              <View key={day} style={styles.dayColumn}>
                <Text style={styles.dayHeaderText}>{day.substring(0, 3)}</Text>
              </View>
            ))}
          </View>

          {/* Time slots and courses */}
          {TIME_SLOTS.map(time => (
            <View key={time} style={styles.timeRow}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeText}>{time}</Text>
              </View>
              {DAYS.map(day => {
                const course = getCourseForTimeSlot(day, time);
                const duration = course ? getCourseDuration(course, time) : 0;
                
                return (
                  <View key={`${day}-${time}`} style={styles.dayColumn}>
                    {course && duration > 0 ? (
                      renderCourseCard(course, duration)
                    ) : (
                      <View style={styles.emptySlot} />
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Enhanced Course Modal */}
      <CourseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={(courseData) => {
          if (editingCourse) {
            setCourses(courses.map(c => c.id === editingCourse.id ? courseData : c));
          } else {
            setCourses([...courses, courseData]);
          }
          setModalVisible(false);
        }}
        onDelete={(courseId) => {
          setCourses(courses.filter(c => c.id !== courseId));
          setModalVisible(false);
        }}
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
        onDelete={deleteCourse}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  timetableContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  timeRow: {
    flexDirection: 'row',
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  timeColumn: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  dayColumn: {
    flex: 1,
    minHeight: 60,
    borderRightWidth: 1,
    borderRightColor: '#f1f3f5',
    padding: 2,
  },
  timeHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
    paddingVertical: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  emptySlot: {
    flex: 1,
    minHeight: 56,
  },
  courseCard: {
    borderRadius: 8,
    padding: 8,
    margin: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  courseTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  courseSubtitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  courseInfo: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 1,
  },
  mapLink: {
    marginVertical: 1,
  },
  mapLinkText: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  courseTime: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginTop: 2,
  },

});

export default Timetable;
