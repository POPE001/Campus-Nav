import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { contentService, CreateContentData } from '@/lib/contentService';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import { smartSearchService } from '@/lib/smartSearchService';
import { CampusLocation } from '@/lib/placesService';
import { faculties, facultyDepartments } from '@/constants/signupData';
import { Picker } from '@react-native-picker/picker';

interface ContentCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FACULTIES = [
  'Faculty of Agriculture',
  'Faculty of Engineering',
  'Faculty of Sciences', 
  'Faculty of Arts',
  'Faculty of Education',
  'Faculty of Medicine',
  'Faculty of Law',
  'Faculty of Business'
];

const LEVELS = ['100', '200', '300', '400', 'Graduate'];

export const ContentCreationModal: React.FC<ContentCreationModalProps> = ({
  visible,
  onClose,
  onSuccess
}) => {
  // Theme and font contexts with fallbacks
  let theme = {
    background: '#f8f9fa',
    surface: '#ffffff',
    card: '#ffffff',
    text: '#000000',
    textSecondary: '#666666',
    border: '#e0e0e0',
    primary: '#667eea',
  };
  let isDark = false;
  let fontSizes = {
    h1: 24,
    h2: 20,
    h3: 18,
    large: 16,
    medium: 14,
    small: 12,
    caption: 10,
  };

  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    isDark = themeContext.isDark;
  } catch (error) {
    console.warn('Theme context not available in ContentCreationModal, using fallback');
  }

  try {
    const fontContext = useFontSize();
    fontSizes = fontContext.fontSizes;
  } catch (error) {
    console.warn('Font size context not available in ContentCreationModal, using fallback');
  }

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    type: 'article' as 'article' | 'blog' | 'event' | 'announcement',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    
    // Event fields
    event_date: '',
    event_location: '',
    event_end_date: '',
    
    // Media
    image_url: '',
    attachment_url: '',
    
    // Tags
    tags: '',
    
    // Audience targeting - Fixed to single selection
    audienceType: 'everyone' as 'everyone' | 'students' | 'staff' | 'faculty' | 'level',
    selectedFaculties: [] as string[], // Changed to array for multiple selection
    selectedLevel: '',
    
    // Faculty/Department specific targeting
    target_faculty: '',
    target_department: '',
    targeting_enabled: false,
  });

  const [loading, setLoading] = useState(false);
  
  // Fluid venue search states
  const [venueSearch, setVenueSearch] = useState('');
  const [showVenueList, setShowVenueList] = useState(false);
  const [filteredVenues, setFilteredVenues] = useState<CampusLocation[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  
  // Faculty/Department targeting states
  const [availableTargetDepartments, setAvailableTargetDepartments] = useState<string[]>([]);

  // Debounced venue search effect for fluid experience
  useEffect(() => {
    const searchVenues = async () => {
      if (venueSearch && venueSearch.trim().length > 1) {
        setLoadingVenues(true);
        try {
          console.log('🏫 EVENT VENUE SEARCH - Query:', venueSearch);
          const searchResult = await smartSearchService.searchCampus(venueSearch, {
            maxResults: 8,
          });
          
          console.log('🏫 EVENT VENUE SEARCH - Found:', searchResult.results.length, 'venues');
          setFilteredVenues(searchResult.results);
        } catch (error) {
          console.error('🏫 EVENT VENUE SEARCH - Error:', error);
          setFilteredVenues([]);
        } finally {
          setLoadingVenues(false);
        }
      } else {
        setFilteredVenues([]);
        setLoadingVenues(false);
      }
    };

    // Debounce search for fluid typing experience
    const timeoutId = setTimeout(searchVenues, 200);
    return () => clearTimeout(timeoutId);
  }, [venueSearch]);

  // Handle target faculty change for department dropdown
  const handleTargetFacultyChange = (selectedFaculty: string) => {
    updateFormData('target_faculty', selectedFaculty);
    updateFormData('target_department', ''); // Reset department when faculty changes
    
    if (selectedFaculty && facultyDepartments[selectedFaculty]) {
      setAvailableTargetDepartments(facultyDepartments[selectedFaculty]);
    } else {
      setAvailableTargetDepartments([]);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      type: 'article',
      priority: 'normal',
      event_date: '',
      event_location: '',
      event_end_date: '',
      image_url: '',
      attachment_url: '',
      tags: '',
      audienceType: 'everyone',
      selectedFaculties: [],
      selectedLevel: '',
      target_faculty: '',
      target_department: '',
      targeting_enabled: false,
    });
    
    // Reset venue search states
    setVenueSearch('');
    setShowVenueList(false);
    setFilteredVenues([]);
    setLoadingVenues(false);
    
    // Reset targeting states
    setAvailableTargetDepartments([]);
  };

  const handleSubmit = async (publish: boolean = false) => {
    if (!formData.title.trim() || !formData.content.trim()) {
      Alert.alert('Error', 'Please fill in title and content');
      return;
    }

    setLoading(true);
    try {
      // Build targeting array based on selected audience type
      const targeting = [];
      
      // Check if advanced targeting is enabled
      if (formData.targeting_enabled && formData.target_faculty) {
        // Advanced targeting takes precedence
        if (formData.target_department) {
          // Specific department targeting
          targeting.push({
            target_type: 'department' as const,
            faculty: formData.target_faculty,
            department: formData.target_department
          });
        } else {
          // Faculty-wide targeting
          targeting.push({
            target_type: 'faculty' as const,
            faculty: formData.target_faculty
          });
        }
      } else {
        // Use basic audience targeting
        switch (formData.audienceType) {
          case 'everyone':
            targeting.push({ target_type: 'everyone' as const });
            break;
          case 'students':
            targeting.push({ target_type: 'students' as const });
            break;
          case 'staff':
            targeting.push({ target_type: 'staff' as const });
            break;
          case 'faculty':
            if (formData.selectedFaculties.length > 0) {
              // Create separate targeting entries for each selected faculty
              formData.selectedFaculties.forEach(faculty => {
                targeting.push({ 
                  target_type: 'faculty' as const, 
                  faculty: faculty 
                });
              });
            } else {
              Alert.alert('Error', 'Please select at least one faculty');
              return;
            }
          break;
        case 'level':
          if (formData.selectedLevel) {
            targeting.push({ 
              target_type: 'level' as const, 
              level: formData.selectedLevel 
            });
          } else {
            Alert.alert('Error', 'Please select a level');
            return;
          }
          break;
        default:
          targeting.push({ target_type: 'everyone' as const });
        }
      }

      const contentData: CreateContentData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        excerpt: formData.excerpt.trim() || undefined,
        type: formData.type,
        priority: formData.priority,
        event_date: formData.event_date || undefined,
        event_location: formData.event_location.trim() || undefined,
        event_end_date: formData.event_end_date || undefined,
        image_url: formData.image_url.trim() || undefined,
        attachment_url: formData.attachment_url.trim() || undefined,
        tags: formData.tags.trim() ? formData.tags.split(',').map(tag => tag.trim()) : undefined,
        targeting
      };

      // Create content
      const { data, error } = await contentService.createContent(contentData);
      
      if (error) {
        Alert.alert('Error', `Failed to create content: ${error.message}`);
        return;
      }

      // Publish immediately if requested
      if (publish && data) {
        const { error: publishError } = await contentService.publishContent(data.id);
        if (publishError) {
          Alert.alert('Content Created', 'Content was created but failed to publish. You can publish it later.');
        } else {
          Alert.alert('Success', 'Content created and published successfully! Users will receive notifications.');
        }
      } else {
        Alert.alert('Success', 'Content saved as draft. You can publish it later.');
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating content:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      fontSize: fontSizes.medium,
      backgroundColor: theme.surface,
      color: '#000000', // Changed to black for better visibility instead of theme.text
    },
  });

  // Venue selection helper
  const selectVenue = (venue: CampusLocation) => {
    setVenueSearch(venue.name);
    updateFormData('event_location', venue.name);
    setShowVenueList(false);
    console.log('🏫 EVENT VENUE SEARCH - Selected venue:', venue.name);
  };

  // Render venue search result item
  const renderVenueItem = ({ item }: { item: CampusLocation }) => (
    <View style={styles.venueItem}>
      <TouchableOpacity
        style={styles.venueButton}
        onPress={() => selectVenue(item)}
        activeOpacity={0.8}
      >
        <View style={styles.venueInfo}>
          <View style={styles.venueHeader}>
            <Text style={[styles.venueName, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.source === 'places_api' && (
              <View style={styles.googleBadge}>
                <Text style={styles.googleBadgeText}>Google</Text>
              </View>
            )}
          </View>
          <Text style={[styles.venueAddress, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.address || item.building || item.description || 'Campus location'}
          </Text>
          {item.rating && item.rating > 0 && (
            <View style={styles.venueRating}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={[styles.venueRatingText, { color: theme.textSecondary }]}>
                {item.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={dynamicStyles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { fontSize: fontSizes.h1 }]}>Create Content</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
          {/* Content Type */}
          <View style={dynamicStyles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontSize: fontSizes.h3 }]}>Content Type</Text>
            <View style={styles.typeSelector}>
              {(['article', 'blog', 'event', 'announcement'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    formData.type === type && styles.typeButtonSelected
                  ]}
                  onPress={() => updateFormData('type', type)}
                >
                  <Text style={[
                    styles.typeButtonText,
                    formData.type === type && styles.typeButtonTextSelected
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Basic Information */}
          <View style={dynamicStyles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontSize: fontSizes.h3 }]}>Basic Information</Text>
            
            <Text style={[styles.label, { color: theme.text, fontSize: fontSizes.medium }]}>Title *</Text>
            <TextInput
              style={[dynamicStyles.input, { color: '#000000' }]}
              value={formData.title}
              onChangeText={(text) => updateFormData('title', text)}
              placeholder="Enter title..."
              placeholderTextColor="#666666"
              maxLength={100}
            />

            <Text style={[styles.label, { color: theme.text, fontSize: fontSizes.medium }]}>Short Description</Text>
            <TextInput
              style={[dynamicStyles.input, { color: '#000000' }]}
              value={formData.excerpt}
              onChangeText={(text) => updateFormData('excerpt', text)}
              placeholder="Brief summary (optional)..."
              placeholderTextColor="#666666"
              maxLength={200}
            />

            <Text style={[styles.label, { color: theme.text, fontSize: fontSizes.medium }]}>Content *</Text>
            <TextInput
              style={[dynamicStyles.input, styles.contentInput, { color: '#000000' }]}
              value={formData.content}
              onChangeText={(text) => updateFormData('content', text)}
              placeholder="Write your content here..."
              placeholderTextColor="#666666"
              multiline
            />

            <Text style={[styles.label, { color: theme.text, fontSize: fontSizes.medium }]}>Tags</Text>
            <TextInput
              style={[dynamicStyles.input, { color: '#000000' }]}
              value={formData.tags}
              onChangeText={(text) => updateFormData('tags', text)}
              placeholder="Enter tags separated by commas..."
              placeholderTextColor="#666666"
            />
          </View>

          {/* Event-specific fields */}
          {formData.type === 'event' && (
            <View style={dynamicStyles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontSize: fontSizes.h3 }]}>Event Details</Text>
              
              <Text style={[styles.label, { color: theme.text, fontSize: fontSizes.medium }]}>Event Date</Text>
              <TextInput
                style={[dynamicStyles.input, { color: '#000000' }]}
                value={formData.event_date}
                onChangeText={(text) => updateFormData('event_date', text)}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor="#666666"
              />

              <Text style={[styles.label, { color: theme.text, fontSize: fontSizes.medium }]}>Location</Text>
              <View style={styles.venueInputContainer}>
                <TextInput
                  style={[dynamicStyles.input, styles.venueInput, { color: '#000000' }]}
                  value={venueSearch}
                  onChangeText={(text) => {
                    setVenueSearch(text);
                    updateFormData('event_location', text);
                    setShowVenueList(text.length > 0);
                  }}
                  placeholder="Search for event location..."
                  placeholderTextColor="#666666"
                  onFocus={() => {
                    if (venueSearch.length > 0) {
                      setShowVenueList(true);
                    }
                  }}
                />
                {venueSearch.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setVenueSearch('');
                      updateFormData('event_location', '');
                      setShowVenueList(false);
                    }}
                    style={styles.clearVenueButton}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Venue search results dropdown */}
              {showVenueList && (
                <View style={[styles.venueDropdown, { backgroundColor: theme.card }]}>
                  {/* Loading state */}
                  {loadingVenues && (
                    <View style={styles.venueLoadingContainer}>
                      <Text style={[styles.venueLoadingText, { color: theme.textSecondary }]}>
                        🔍 Searching venues...
                      </Text>
                    </View>
                  )}
                  
                  {/* Search results */}
                  {!loadingVenues && filteredVenues.length > 0 && (
                    <ScrollView 
                      style={styles.venueList}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled={true}
                    >
                      {filteredVenues.map((venue, index) => (
                        <View key={venue.id || `venue-${index}`}>
                          {renderVenueItem({ item: venue })}
                        </View>
                      ))}
                    </ScrollView>
                  )}
                  
                  {/* No results state */}
                  {!loadingVenues && filteredVenues.length === 0 && venueSearch.trim().length > 1 && (
                    <View style={styles.noVenueResultsContainer}>
                      <Ionicons name="location-outline" size={24} color={theme.textSecondary} />
                      <Text style={[styles.noVenueResultsText, { color: theme.textSecondary }]}>
                        No venues found for "{venueSearch}"
                      </Text>
                      <Text style={[styles.noVenueResultsSubtext, { color: theme.textSecondary }]}>
                        You can still use this as your event location
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={[styles.label, { color: theme.text, fontSize: fontSizes.medium }]}>End Date (Optional)</Text>
              <TextInput
                style={[dynamicStyles.input, { color: '#000000' }]}
                value={formData.event_end_date}
                onChangeText={(text) => updateFormData('event_end_date', text)}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor="#666666"
              />
            </View>
          )}

          {/* Priority */}
          <View style={dynamicStyles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontSize: fontSizes.h3 }]}>Priority</Text>
            <View style={styles.prioritySelector}>
              {(['low', 'normal', 'high', 'urgent'] as const).map(priority => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityButton,
                    formData.priority === priority && styles.priorityButtonSelected
                  ]}
                  onPress={() => updateFormData('priority', priority)}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    formData.priority === priority && styles.priorityButtonTextSelected
                  ]}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Audience Targeting - Fixed to single selection */}
          <View style={[styles.section, { backgroundColor: theme.surface, borderRadius: 12, padding: 16 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontSize: fontSizes.h3 }]}>
              Who should see this? 
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, fontSize: fontSizes.small }]}>
              Select one audience type for this content
            </Text>
            
            {/* Audience Type Selection */}
            <View style={styles.audienceOptions}>
              {[
                { 
                  type: 'everyone', 
                  title: 'Everyone', 
                  subtitle: 'All users (students, staff, visitors)',
                  icon: 'people',
                  color: '#667eea'
                },
                { 
                  type: 'students', 
                  title: 'Students Only', 
                  subtitle: 'All registered students',
                  icon: 'school',
                  color: '#3498db'
                },
                { 
                  type: 'staff', 
                  title: 'Staff Only', 
                  subtitle: 'Faculty and administrative staff',
                  icon: 'briefcase',
                  color: '#e74c3c'
                },
                { 
                  type: 'faculty', 
                  title: 'Specific Faculties', 
                  subtitle: 'Students and staff in selected faculties (multiple allowed)',
                  icon: 'library',
                  color: '#f39c12'
                },
                { 
                  type: 'level', 
                  title: 'Specific Level', 
                  subtitle: 'Students in a specific academic level',
                  icon: 'school',
                  color: '#27ae60'
                },
              ].map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[
                    styles.audienceOption,
                    { 
                      backgroundColor: formData.audienceType === option.type ? option.color + '15' : theme.card,
                      borderColor: formData.audienceType === option.type ? option.color : theme.border,
                    }
                  ]}
                  onPress={() => updateFormData('audienceType', option.type)}
                  activeOpacity={0.7}
                >
                  <View style={styles.audienceOptionLeft}>
                    <View style={[styles.audienceIcon, { backgroundColor: option.color + '20' }]}>
                      <Ionicons 
                        name={option.icon as any} 
                        size={20} 
                        color={option.color} 
                      />
                    </View>
                    <View style={styles.audienceContent}>
                      <Text style={[
                        styles.audienceTitle, 
                        { 
                          color: theme.text,
                          fontSize: fontSizes.medium,
                          fontWeight: formData.audienceType === option.type ? '700' : '600'
                        }
                      ]}>
                        {option.title}
                      </Text>
                      <Text style={[
                        styles.audienceSubtitle, 
                        { 
                          color: theme.textSecondary,
                          fontSize: fontSizes.small
                        }
                      ]}>
                        {option.subtitle}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.radioButton,
                    { borderColor: formData.audienceType === option.type ? option.color : theme.border }
                  ]}>
                    {formData.audienceType === option.type && (
                      <View style={[styles.radioButtonInner, { backgroundColor: option.color }]} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Faculty Selection - Multiple Selection */}
            {formData.audienceType === 'faculty' && (
              <View style={styles.subSelection}>
                <Text style={[styles.subSelectionTitle, { color: theme.text, fontSize: fontSizes.medium }]}>
                  Select Faculties (multiple allowed):
                </Text>
                <Text style={[styles.subSelectionSubtitle, { color: theme.textSecondary, fontSize: fontSizes.small }]}>
                  Tap to select/deselect faculties. You can choose multiple.
                </Text>
                <View style={styles.facultyGrid}>
                  {FACULTIES.map(faculty => {
                    const isSelected = formData.selectedFaculties.includes(faculty);
                    return (
                      <TouchableOpacity
                        key={faculty}
                        style={[
                          styles.multiSelectionChip,
                          { 
                            backgroundColor: isSelected ? '#f39c12' : theme.card,
                            borderColor: isSelected ? '#f39c12' : theme.border,
                          }
                        ]}
                        onPress={() => {
                          const newSelectedFaculties = isSelected
                            ? formData.selectedFaculties.filter(f => f !== faculty)
                            : [...formData.selectedFaculties, faculty];
                          updateFormData('selectedFaculties', newSelectedFaculties);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.chipContent}>
                          <View style={[
                            styles.checkbox,
                            { 
                              backgroundColor: isSelected ? '#f39c12' : 'transparent',
                              borderColor: isSelected ? '#f39c12' : theme.border,
                            }
                          ]}>
                            {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                          </View>
                          <Text style={[
                            styles.selectionChipText,
                            { 
                              color: isSelected ? 'white' : theme.text,
                              fontSize: fontSizes.small,
                              fontWeight: isSelected ? '600' : '500'
                            }
                          ]}>
                            {faculty.replace('Faculty of ', '')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {formData.selectedFaculties.length > 0 && (
                  <View style={styles.selectedSummary}>
                    <Text style={[styles.selectedSummaryText, { color: theme.text, fontSize: fontSizes.small }]}>
                      📋 Selected: {formData.selectedFaculties.length} faculty{formData.selectedFaculties.length !== 1 ? 'ies' : 'y'}
                    </Text>
                    <Text style={[styles.selectedList, { color: theme.textSecondary, fontSize: fontSizes.caption }]}>
                      {formData.selectedFaculties.map(f => f.replace('Faculty of ', '')).join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Level Selection */}
            {formData.audienceType === 'level' && (
              <View style={styles.subSelection}>
                <Text style={[styles.subSelectionTitle, { color: theme.text, fontSize: fontSizes.medium }]}>
                  Select Academic Level:
                </Text>
                <View style={styles.levelGrid}>
                  {LEVELS.map(level => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.selectionChip,
                        { 
                          backgroundColor: formData.selectedLevel === level ? '#27ae60' : theme.card,
                          borderColor: formData.selectedLevel === level ? '#27ae60' : theme.border,
                        }
                      ]}
                      onPress={() => updateFormData('selectedLevel', level)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.selectionChipText,
                        { 
                          color: formData.selectedLevel === level ? 'white' : theme.text,
                          fontSize: fontSizes.small,
                          fontWeight: formData.selectedLevel === level ? '600' : '500'
                        }
                      ]}>
                        {level} Level
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Faculty/Department Specific Targeting - For Staff Only */}
          <View style={[styles.section, { backgroundColor: theme.surface, borderRadius: 12, padding: 16 }]}>
            <View style={styles.targetingHeader}>
              <View style={styles.targetingTitleRow}>
                <Ionicons name="filter-outline" size={20} color="#9333ea" />
                <Text style={[styles.sectionTitle, { color: theme.text, fontSize: fontSizes.h3, marginLeft: 8 }]}>
                  Advanced Targeting
                </Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, fontSize: fontSizes.small }]}>
                Target specific faculty and department combinations (optional)
              </Text>
            </View>

            {/* Enable/Disable Toggle */}
            <TouchableOpacity
              style={[
                styles.targetingToggle,
                { 
                  backgroundColor: formData.targeting_enabled ? '#9333ea15' : theme.card,
                  borderColor: formData.targeting_enabled ? '#9333ea' : theme.border,
                }
              ]}
              onPress={() => updateFormData('targeting_enabled', !formData.targeting_enabled)}
              activeOpacity={0.7}
            >
              <View style={styles.targetingToggleContent}>
                <View style={styles.targetingToggleLeft}>
                  <View style={[styles.targetingIcon, { backgroundColor: '#9333ea20' }]}>
                    <Ionicons name="options-outline" size={18} color="#9333ea" />
                  </View>
                  <View>
                    <Text style={[
                      styles.targetingToggleTitle, 
                      { 
                        color: theme.text,
                        fontSize: fontSizes.medium,
                        fontWeight: '600'
                      }
                    ]}>
                      Enable Advanced Targeting
                    </Text>
                    <Text style={[
                      styles.targetingToggleSubtitle, 
                      { 
                        color: theme.textSecondary,
                        fontSize: fontSizes.small
                      }
                    ]}>
                      Show content only to specific faculty/department
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.toggle,
                  { 
                    backgroundColor: formData.targeting_enabled ? '#9333ea' : theme.border,
                  }
                ]}>
                  <View style={[
                    styles.toggleHandle,
                    { 
                      transform: [{ translateX: formData.targeting_enabled ? 18 : 2 }],
                      backgroundColor: 'white'
                    }
                  ]} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Faculty and Department Selection */}
            {formData.targeting_enabled && (
              <View style={styles.targetingFields}>
                {/* Target Faculty Selection */}
                <View style={styles.targetingFieldGroup}>
                  <Text style={[styles.targetingLabel, { color: theme.text, fontSize: fontSizes.medium }]}>
                    Target Faculty
                  </Text>
                  <View style={[styles.targetingPickerContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="library-outline" size={18} color="#64748b" style={styles.targetingPickerIcon} />
                    <Picker
                      selectedValue={formData.target_faculty}
                      onValueChange={handleTargetFacultyChange}
                      style={[styles.targetingPicker, { color: theme.text }]}
                    >
                      <Picker.Item label="Select target faculty" value="" />
                      {faculties.map((faculty) => (
                        <Picker.Item key={faculty} label={faculty} value={faculty} />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Target Department Selection */}
                <View style={styles.targetingFieldGroup}>
                  <Text style={[styles.targetingLabel, { color: theme.text, fontSize: fontSizes.medium }]}>
                    Target Department
                  </Text>
                  <View style={[
                    styles.targetingPickerContainer, 
                    { 
                      backgroundColor: theme.card, 
                      borderColor: theme.border,
                      opacity: availableTargetDepartments.length > 0 ? 1 : 0.6
                    }
                  ]}>
                    <Ionicons name="folder-outline" size={18} color="#64748b" style={styles.targetingPickerIcon} />
                    <Picker
                      selectedValue={formData.target_department}
                      onValueChange={(value) => updateFormData('target_department', value)}
                      style={[styles.targetingPicker, { color: theme.text }]}
                      enabled={availableTargetDepartments.length > 0}
                    >
                      <Picker.Item 
                        label={formData.target_faculty ? "Select target department" : "Select faculty first"} 
                        value="" 
                      />
                      {availableTargetDepartments.map((dept) => (
                        <Picker.Item key={dept} label={dept} value={dept} />
                      ))}
                    </Picker>
                  </View>
                  {!formData.target_faculty && (
                    <Text style={[styles.targetingHelperText, { color: theme.textSecondary, fontSize: fontSizes.caption }]}>
                      Please select a target faculty first to see available departments
                    </Text>
                  )}
                </View>

                {/* Targeting Summary */}
                {formData.target_faculty && (
                  <View style={[styles.targetingSummary, { backgroundColor: '#9333ea10', borderColor: '#9333ea30' }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#9333ea" />
                    <Text style={[styles.targetingSummaryText, { color: theme.text, fontSize: fontSizes.small }]}>
                      {formData.target_department 
                        ? `Targeting: ${formData.target_department}` 
                        : `Targeting: All ${formData.target_faculty} departments`
                      }
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actions, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.draftButton, 
              { 
                borderColor: theme.border, 
                backgroundColor: theme.card 
              }
            ]}
            onPress={() => handleSubmit(false)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={[styles.draftButtonText, { color: theme.textSecondary, fontSize: fontSizes.medium }]}>
              Save as Draft
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.publishButton]}
            onPress={() => handleSubmit(true)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.publishGradient}>
              <Text style={[styles.publishButtonText, { fontSize: fontSizes.medium }]}>
                {loading ? 'Publishing...' : 'Publish Now'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Header styles
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Content styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontWeight: '500',
    marginBottom: 16,
    opacity: 0.8,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  contentInput: {
    height: 120,
    textAlignVertical: 'top',
  },

  // Type and Priority selectors
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  typeButtonSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  typeButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  priorityButtonSelected: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  priorityButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  priorityButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },

  // New audience selection styles
  audienceOptions: {
    gap: 12,
    marginTop: 12,
  },
  audienceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  audienceOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  audienceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  audienceContent: {
    flex: 1,
  },
  audienceTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  audienceSubtitle: {
    fontWeight: '500',
    opacity: 0.7,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Sub-selection styles
  subSelection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
  },
  subSelectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  subSelectionSubtitle: {
    fontWeight: '500',
    marginBottom: 12,
    opacity: 0.7,
  },
  facultyGrid: {
    gap: 8,
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  multiSelectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  selectionChipText: {
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  selectedSummary: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#f39c12',
  },
  selectedSummaryText: {
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedList: {
    fontWeight: '500',
    lineHeight: 16,
  },

  // Action buttons
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  draftButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    padding: 16,
    alignItems: 'center',
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  publishButton: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  publishGradient: {
    padding: 16,
    alignItems: 'center',
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },

  // Fluid venue search styles
  venueInputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  venueInput: {
    flex: 1,
    paddingRight: 40, // Space for clear button
  },
  clearVenueButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  venueDropdown: {
    marginTop: 4,
    borderRadius: 12,
    maxHeight: 250,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1000,
  },
  venueList: {
    maxHeight: 200,
  },
  venueItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  venueButton: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  venueInfo: {
    flex: 1,
  },
  venueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  venueAddress: {
    fontSize: 14,
    marginBottom: 4,
  },
  venueRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  venueRatingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  googleBadge: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  googleBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  venueLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  venueLoadingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  noVenueResultsContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noVenueResultsText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  noVenueResultsSubtext: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Advanced targeting styles
  targetingHeader: {
    marginBottom: 16,
  },
  targetingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetingToggle: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  targetingToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetingToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  targetingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  targetingToggleTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  targetingToggleSubtitle: {
    fontWeight: '400',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleHandle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  targetingFields: {
    marginTop: 16,
    gap: 16,
  },
  targetingFieldGroup: {
    gap: 8,
  },
  targetingLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  targetingPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 12,
    height: 48,
  },
  targetingPickerIcon: {
    marginRight: 10,
  },
  targetingPicker: {
    flex: 1,
    fontSize: 16,
  },
  targetingHelperText: {
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 4,
  },
  targetingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  targetingSummaryText: {
    fontWeight: '500',
    flex: 1,
  },
});
