import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getVenueById } from '@/constants/Venues';
import { navigateToVenue, getEstimatedWalkingTime, getDistanceToVenue } from '@/services/NavigationService';
import { smartSearchService } from '@/lib/smartSearchService';

const { width } = Dimensions.get('window');

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

interface CourseDetailModalProps {
  visible: boolean;
  course: Course | null;
  onClose: () => void;
  onEdit: (course: Course) => void;
  onDelete: (courseId: string) => void;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  visible,
  course,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!course) return null;

  // Get venue from static database if available
  const staticVenue = course.venueId ? getVenueById(course.venueId) : null;
  
  // Check if we have any venue information (static DB, custom location, or Google Places)
  const hasVenueInfo = staticVenue || (course.location && course.location.trim() !== '');
  
  // Create display venue object for any type of venue
  const displayVenue = staticVenue || (course.location ? {
    id: course.venueId || 'custom-location',
    name: course.location,
    category: 'Campus Location',
    building: course.location.includes('Engineering') ? 'Engineering Complex' : 
              course.location.includes('Science') ? 'Science Complex' :
              course.location.includes('Arts') ? 'Arts Building' : 'Campus',
    description: staticVenue ? staticVenue.description : `Class venue: ${course.location}`,
    coordinates: {
      latitude: 7.5629, // OAU campus center (fallback)
      longitude: 4.5200
    }
  } : null);

  console.log('🏛️ COURSE DETAIL - Venue Info:', {
    courseTitle: course.title,
    staticVenue: staticVenue?.name || 'Not in static DB',
    courseLocation: course.location || 'No location',
    hasVenueInfo,
    displayVenueName: displayVenue?.name || 'No display venue'
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'class': return '📚';
      case 'exam': return '📝';
      case 'deadline': return '⏰';
      default: return '📚';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'class': return 'Class';
      case 'exam': return 'Examination';
      case 'deadline': return 'Deadline';
      default: return 'Class';
    }
  };

  const handleNavigateToVenue = async () => {
    try {
      console.log('🗺️ COURSE DETAIL NAV - Starting navigation process');
      
      // Close the modal first to avoid navigation conflicts
      onClose();
      
      // Small delay to let modal close, then navigate
      setTimeout(() => {
        (async () => {
          try {
            if (staticVenue) {
              // Static database venue - use in-app navigation
              console.log('🗺️ COURSE DETAIL NAV - Using static venue with in-app navigation:', staticVenue.name);
              await navigateToVenue({ venue: staticVenue, preferCampusMap: true });
            } else if (course.location && course.location.trim() !== '') {
              // Custom or Google Places venue - try to find coordinates
              console.log('🗺️ COURSE DETAIL NAV - Searching for venue:', course.location);
              const searchResult = await smartSearchService.searchCampus(course.location, {
                maxResults: 1,
              });
              
              if (searchResult.results.length > 0) {
                // Found venue using smart search - convert to Venue format
                const foundVenue = searchResult.results[0];
                const venueForNav = {
                  id: foundVenue.id,
                  name: foundVenue.name,
                  building: foundVenue.building || foundVenue.address || 'Campus',
                  type: foundVenue.type,
                  category: foundVenue.category,
                  coordinates: foundVenue.coordinates,
                  description: foundVenue.description,
                  keywords: foundVenue.keywords || [],
                };
                console.log('🗺️ COURSE DETAIL NAV - Found via search, using in-app navigation:', venueForNav.name);
                await navigateToVenue({ venue: venueForNav, preferCampusMap: true });
              } else {
                // Fallback to campus center
                const fallbackVenue = {
                  id: 'custom-location',
                  name: course.location,
                  building: course.location,
                  type: 'facilities' as const,
                  category: 'Campus',
                  coordinates: {
                    latitude: 7.5629, // OAU campus center
                    longitude: 4.5200
                  },
                  description: `Class venue: ${course.location}`,
                  keywords: [course.location.toLowerCase()],
                };
                console.log('🗺️ COURSE DETAIL NAV - Using campus center fallback with in-app navigation');
                await navigateToVenue({ venue: fallbackVenue, preferCampusMap: true });
              }
            } else {
              Alert.alert('Navigation', 'No venue information available for this course.');
            }
          } catch (innerError) {
            console.error('🗺️ COURSE DETAIL NAV - Inner error:', innerError);
            Alert.alert('Navigation Error', 'Unable to get directions at this time.');
          }
        })();
      }, 300); // Wait 300ms for modal to close
    } catch (error) {
      console.error('🗺️ COURSE DETAIL NAV - Outer error:', error);
      Alert.alert('Navigation Error', 'Unable to get directions at this time.');
    }
  };

  const handleEditCourse = () => {
    onEdit(course);
    onClose();
  };

  const handleDeleteCourse = () => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete "${course.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(course.id);
            onClose();
          },
        },
      ]
    );
  };

  const getDuration = () => {
    const start = new Date(`2000-01-01 ${course.startTime}`);
    const end = new Date(`2000-01-01 ${course.endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours === 1 ? '1 hour' : `${diffHours} hours`;
  };

  const getNextOccurrence = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const currentDay = days[today.getDay()];
    const targetDayIndex = days.indexOf(course.day);
    
    if (targetDayIndex === -1) return 'Invalid day';
    
    const daysUntil = (targetDayIndex - today.getDay() + 7) % 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + (daysUntil === 0 ? 7 : daysUntil));
    
    return nextDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Calculate distance and walking time to venue (use static venue if available, otherwise skip distance calc for now)
  const distance = staticVenue ? getDistanceToVenue(staticVenue) : null;
  const walkingTime = distance ? getEstimatedWalkingTime(distance) : null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <LinearGradient
            colors={[course.color, course.color + '80']}
            style={styles.modalHeader}
          >
            <View style={styles.headerTop}>
              <View style={styles.courseTypeContainer}>
                <Text style={styles.courseTypeIcon}>{getTypeIcon(course.type)}</Text>
                <Text style={styles.courseTypeText}>{getTypeLabel(course.type)}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.headerContent}>
              <Text style={styles.courseCode}>{course.code}</Text>
              <Text style={styles.courseTitle}>{course.title}</Text>
              <Text style={styles.courseInstructor}>👨‍🏫 {course.instructor}</Text>
            </View>
          </LinearGradient>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Time & Schedule Info */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>📅 Schedule</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Day</Text>
                  <Text style={styles.infoValue}>{course.day}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Time</Text>
                  <Text style={styles.infoValue}>{course.startTime} - {course.endTime}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Duration</Text>
                  <Text style={styles.infoValue}>{getDuration()}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Next Class</Text>
                  <Text style={styles.infoValue}>{getNextOccurrence()}</Text>
                </View>
              </View>
            </View>

            {/* Venue Information */}
            {hasVenueInfo && displayVenue && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>📍 Venue Details</Text>
                <View style={styles.venueCard}>
                  <View style={styles.venueHeader}>
                    <View style={styles.venueInfo}>
                      <Text style={styles.venueName}>{displayVenue.name}</Text>
                      <View style={styles.venueMetaRow}>
                        <Text style={styles.venueCategory}>{displayVenue.category} • {displayVenue.building}</Text>
                        {!staticVenue && course.location && (
                          <View style={styles.venueTypeIndicator}>
                            <Ionicons name="location" size={12} color="#007AFF" />
                            <Text style={styles.venueTypeText}>
                              {course.venueId && course.venueId !== '' ? 'Google' : 'Custom'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.venueDescription}>{displayVenue.description}</Text>
                    </View>
                    {distance && (
                      <View style={styles.distanceInfo}>
                        <Text style={styles.distanceText}>{distance}m</Text>
                        <Text style={styles.walkingTime}>{walkingTime} walk</Text>
                      </View>
                    )}
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.navigateButton}
                    onPress={handleNavigateToVenue}
                  >
                    <Ionicons name="navigate" size={20} color="white" />
                    <Text style={styles.navigateButtonText}>Get Directions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionSection}>
              <TouchableOpacity style={styles.editButton} onPress={handleEditCourse}>
                <Ionicons name="create" size={20} color="white" />
                <Text style={styles.editButtonText}>Edit Course</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteCourse}>
                <Ionicons name="trash" size={20} color="#dc3545" />
                <Text style={styles.deleteButtonText}>Delete Course</Text>
              </TouchableOpacity>
            </View>

            {/* Reminders */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>🔔 Reminders</Text>
              <View style={styles.reminderCard}>
                <View style={styles.reminderInfo}>
                  <Ionicons 
                    name={course.reminderEnabled ? "notifications" : "notifications-off"} 
                    size={20} 
                    color={course.reminderEnabled ? "#28a745" : "#6c757d"} 
                  />
                  <Text style={styles.reminderText}>
                    {course.reminderEnabled 
                      ? `Reminder set for ${course.reminderMinutes} minutes before class`
                      : 'No reminders set'
                    }
                  </Text>
                </View>
              </View>
            </View>

            {/* Description (if available) */}
            {course.description && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>📝 Description</Text>
                <Text style={styles.descriptionText}>{course.description}</Text>
              </View>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    minHeight: '85%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 20,
  },
  modalHeader: {
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  courseTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  courseTypeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  courseTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  courseCode: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  courseInstructor: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  infoItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  venueCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  venueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  venueInfo: {
    flex: 1,
    marginRight: 12,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  venueMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  venueCategory: {
    fontSize: 12,
    color: '#7f8c8d',
    flex: 1,
  },
  venueTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  venueTypeText: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 2,
  },
  venueDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  distanceInfo: {
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
  walkingTime: {
    fontSize: 10,
    color: '#7f8c8d',
    marginTop: 2,
  },
  navigateButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  navigateButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  reminderCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderText: {
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 12,
    flex: 1,
  },
  descriptionText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 16,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#e9ecef',
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 14,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  deleteButtonText: {
    color: '#dc3545',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
});
