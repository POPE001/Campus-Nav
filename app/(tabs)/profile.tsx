import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Linking,
  RefreshControl,
  Platform,
  View,
  Text,
  SafeAreaView,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { profileService, UserProfile as DatabaseUserProfile, UserStatistics } from '@/lib/profileService';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { VisitorPrompt } from '@/components/VisitorPrompt';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import EditProfileModal from '@/components/EditProfileModal';
import ProfilePictureModal from '@/components/ProfilePictureModal';

// Use the database types
type UserProfile = DatabaseUserProfile;
type ProfileStats = UserStatistics;

export default function ProfileScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Theme and font size contexts
  const { isDark, theme } = useTheme();
  const { fontSizes } = useFontSize();
  const [profileStats, setProfileStats] = useState<ProfileStats>({
    courses_scheduled: 0,
    active_courses: 0,
    upcoming_events: 0,
    total_reminders: 0,
    login_streak: 1,
    profile_completion: 50,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true); // Track initial app load
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false);
  const [editSection, setEditSection] = useState<'personal' | 'academic' | 'contact'>('personal');

  // Animation references
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  console.log('👤 PROFILE SCREEN - Render called');

  // Start loading animations
  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Scale in animation  
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();

    // Continuous pulse animation
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('👤 PROFILE SCREEN - Loading profile data...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Auth state already set by quick check, just load profile
        console.log('👤 PROFILE SCREEN - Loading profile data for authenticated user');
        
        // Remove the toast since we now show a proper loading state
        
        // Load profile data
        await loadProfileData();
        
        // Log activity in background (don't await)
        profileService.logActivity('login', {
          session_id: session.access_token.substring(0, 20),
          login_method: 'existing_session',
        }).catch(error => console.log('Activity logging failed:', error));
        
      } else {
        console.log('👤 PROFILE SCREEN - No session found');
        setIsAuthenticated(false);
        setUserProfile(null);
        resetStats();
      }
    } catch (error) {
      console.error('👤 PROFILE SCREEN - Error checking auth:', error);
      Toast.show({
        type: 'error',
        text1: 'Profile Error',
        text2: 'Failed to load profile data',
        visibilityTime: 2000
      });
      setIsAuthenticated(false);
      setUserProfile(null);
      resetStats();
    } finally {
      setLoading(false);
    }
  };

  const loadProfileData = async () => {
    try {
      console.log('👤 PROFILE SCREEN - Loading profile data...');
      
      // Load profile and stats in parallel
      const [profileResult, statsResult] = await Promise.all([
        profileService.getProfile(),
        profileService.getStatistics(),
      ]);
      
      if (profileResult.error) {
        console.error('👤 PROFILE SCREEN - Error loading profile:', profileResult.error);
        // Try to initialize profile from auth metadata if it doesn't exist
        await initializeProfileFromAuth();
      } else {
        setUserProfile(profileResult.data);
        console.log('👤 PROFILE SCREEN - Profile loaded successfully:', {
          name: `${profileResult.data?.first_name || ''} ${profileResult.data?.last_name || ''}`.trim(),
          email: profileResult.data?.email,
          userType: profileResult.data?.user_type,
          faculty: profileResult.data?.faculty,
          department: profileResult.data?.department
        });
      }
      
      if (statsResult.error) {
        console.error('👤 PROFILE SCREEN - Error loading stats:', statsResult.error);
        // Keep default stats on error
      } else {
        setProfileStats(statsResult.data || getDefaultStats());
        console.log('👤 PROFILE SCREEN - Stats loaded:', statsResult.data);
      }
    } catch (error) {
      console.error('👤 PROFILE SCREEN - Exception loading profile data:', error);
    }
  };

  const initializeProfileFromAuth = async () => {
    try {
      console.log('👤 PROFILE SCREEN - Initializing profile from auth metadata...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      const userMetadata = session.user.user_metadata;
      const userData = {
        email: session.user.email || userMetadata?.email || '',
        fullName: userMetadata?.full_name || '',
        userType: (userMetadata?.user_type || 'student') as 'student' | 'staff',
        department: userMetadata?.department,
        faculty: userMetadata?.faculty,
        level: userMetadata?.level,
      };
      
      const { data, error } = await profileService.initializeProfile(userData);
      
      if (error) {
        console.error('👤 PROFILE SCREEN - Error initializing profile:', error);
      } else {
        setUserProfile(data);
        console.log('👤 PROFILE SCREEN - Profile initialized successfully');
      }
    } catch (error) {
      console.error('👤 PROFILE SCREEN - Exception initializing profile:', error);
    }
  };

  const getDefaultStats = (): ProfileStats => ({
    courses_scheduled: 0,
    active_courses: 0,
    upcoming_events: 0,
    total_reminders: 0,
    login_streak: 1,
    profile_completion: 50,
  });

  const resetStats = () => {
    setProfileStats(getDefaultStats());
  };

  useEffect(() => {
    console.log('👤 PROFILE SCREEN - Component mounted/rendered');
    
    // Quick auth check first - set auth state immediately
    const quickAuthCheck = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('👤 PROFILE SCREEN - Quick auth: User is authenticated');
          setIsAuthenticated(true);
          setInitialLoad(false); // Hide initial loading state
          
          // Load profile data in background
          checkAuth();
        } else {
          console.log('👤 PROFILE SCREEN - Quick auth: No user session');
          setIsAuthenticated(false);
          setLoading(false);
          setInitialLoad(false);
        }
      } catch (error) {
        console.error('👤 PROFILE SCREEN - Quick auth error:', error);
        setIsAuthenticated(false);
        setLoading(false);
        setInitialLoad(false);
      }
    };
    
    quickAuthCheck();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('👤 PROFILE SCREEN - Auth state changed:', !!session?.user);
      if (session?.user) {
        setIsAuthenticated(true);
        setInitialLoad(false);
        checkAuth();
      } else {
        setIsAuthenticated(false);
        setUserProfile(null);
        setLoading(false);
        setInitialLoad(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    
    try {
      if (isAuthenticated) {
        await loadProfileData();
      } else {
        await checkAuth();
      }
    } catch (error) {
      console.error('👤 PROFILE SCREEN - Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Navigation and interaction handlers

  const handleNotifications = () => {
    router.push('/(tabs)/notifications');
    Toast.show({
      type: 'info',
      text1: 'Opening Notifications',
      text2: 'Check your latest updates',
    });
  };

  const handleSettings = () => {
    router.push('/(tabs)/settings');
  };

  const handleProfilePicture = () => {
    setShowProfilePictureModal(true);
  };

  const handleViewAllActivity = () => {
    Alert.alert(
      'Activity Overview',
      `Detailed Activity Stats:\n\n• Courses Scheduled: ${profileStats.courses_scheduled}\n• Active Courses: ${profileStats.active_courses}\n• Upcoming Events: ${profileStats.upcoming_events}\n• Total Reminders: ${profileStats.total_reminders}\n• Login Streak: ${profileStats.login_streak} days\n• Profile Completion: ${profileStats.profile_completion}%`,
      [{ text: 'OK' }]
    );
  };

  const handleEditProfile = (section: 'personal' | 'academic' | 'contact' = 'personal') => {
    setEditSection(section);
    setShowEditModal(true);
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out My OAU - the ultimate university navigation app!`,
        title: 'My OAU',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    // Force a small delay to ensure UI updates
    setTimeout(() => {
      loadProfileData();
    }, 100);
    Toast.show({
      type: 'success',
      text1: 'Profile Updated',
      text2: 'Your profile has been updated successfully',
    });
  };

  // Show visitor prompt ONLY for unauthenticated users
  if (!isAuthenticated && !initialLoad) {
    return <VisitorPrompt />;
  }

  // Generate dynamic styles
  const styles = getStyles(theme, fontSizes, isDark);

  // Show initial loading state only on first app load
  if (initialLoad) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.loadingGradient}>
          <Animated.View 
            style={[
              styles.loadingContent,
              { 
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            {/* Campus Logo */}
            <Animated.View 
              style={[
                styles.logoContainer,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <View style={styles.logoCircle}>
                <Ionicons name="school" size={45} color="#667eea" />
              </View>
            </Animated.View>

            {/* Welcome Text */}
            <Text style={styles.welcomeText}>My OAU</Text>
            <Text style={styles.taglineText}>Your University Companion</Text>

            {/* Loading Animation */}
            <View style={styles.loadingIndicator}>
              <Animated.View 
                style={[
                  styles.profileIcon,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <Ionicons name="person-circle" size={50} color="rgba(255, 255, 255, 0.9)" />
              </Animated.View>
              <Text style={styles.loadingText}>Setting up your profile</Text>
              <Text style={styles.loadingSubtext}>Just a moment while we prepare everything...</Text>
            </View>

            {/* Loading Dots */}
            <View style={styles.dotsContainer}>
              <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
            </View>
          </Animated.View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const getAvatarInitials = () => {
    if (userProfile.first_name && userProfile.last_name) {
      return `${userProfile.first_name.charAt(0)}${userProfile.last_name.charAt(0)}`.toUpperCase();
    } else if (userProfile.full_name) {
      const names = userProfile.full_name.split(' ');
      return names.length > 1 
        ? `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase()
        : userProfile.full_name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getMemberSince = () => {
    const date = new Date(userProfile.created_at);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const getUserTypeIcon = () => {
    return userProfile.user_type === 'student' ? '🎓' : '👨‍🏫';
  };

  const getUserTypeColor = () => {
    return userProfile.user_type === 'student' ? ['#667eea', '#764ba2'] : ['#764ba2', '#667eea'];
  };

  const getPositionRank = (position: string) => {
    if (!position) return 'Staff';
    
    const pos = position.toLowerCase();
    if (pos.includes('professor')) return 'Prof';
    if (pos.includes('associate professor')) return 'Assoc Prof';
    if (pos.includes('senior lecturer')) return 'Sr Lecturer';
    if (pos.includes('lecturer')) return 'Lecturer';
    if (pos.includes('assistant lecturer')) return 'Asst Lecturer';
    if (pos.includes('graduate assistant')) return 'Grad Asst';
    if (pos.includes('dean')) return 'Dean';
    if (pos.includes('head') && pos.includes('department')) return 'HOD';
    if (pos.includes('director')) return 'Director';
    if (pos.includes('registrar')) return 'Registrar';
    return 'Staff';
  };

  const getYearsOfService = (createdAt: string) => {
    const joinDate = new Date(createdAt);
    const currentDate = new Date();
    const yearsDiff = currentDate.getFullYear() - joinDate.getFullYear();
    const monthsDiff = currentDate.getMonth() - joinDate.getMonth();
    
    // Adjust for partial years
    if (monthsDiff < 0 || (monthsDiff === 0 && currentDate.getDate() < joinDate.getDate())) {
      return Math.max(0, yearsDiff - 1);
    }
    return Math.max(0, yearsDiff);
  };

  const getServiceLevel = (years: number) => {
    if (years >= 20) return 'Veteran';
    if (years >= 10) return 'Senior';
    if (years >= 5) return 'Experienced';
    if (years >= 2) return 'Established';
    return 'New';
  };

  // Show loading while profile data is being fetched (but user is authenticated)
  if (isAuthenticated && !userProfile && !initialLoad) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.loadingGradient}>
          <Animated.View 
            style={[
              styles.loadingContent,
              { 
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            {/* Profile Loading Animation */}
            <Animated.View 
              style={[
                styles.profileLoadingContainer,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <View style={styles.profileLoadingCircle}>
                <Ionicons name="person" size={35} color="#667eea" />
              </View>
              <View style={styles.profileRing} />
            </Animated.View>

            {/* Loading Text */}
            <Text style={styles.profileLoadingTitle}>Loading Your Profile</Text>
            <Text style={styles.profileLoadingSubtext}>Retrieving your information and preferences</Text>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill,
                    { 
                      width: '70%',
                      opacity: pulseAnim 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>Almost there...</Text>
            </View>
          </Animated.View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Show authenticated user profile (only when we have profile data)
  if (!userProfile) {
    return <VisitorPrompt />; // Fallback if something went wrong
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
      {/* Enhanced Header Section */}
      <LinearGradient
        colors={getUserTypeColor()}
        style={styles.headerGradient}
      >
        {/* Header Top Bar */}
        <View style={styles.headerTopBar}>
          <View style={styles.headerLeftActions}>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleNotifications}>
              <Ionicons name="notifications-outline" size={20} color="rgba(255, 255, 255, 0.9)" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleEditProfile}>
              <Ionicons name="create-outline" size={20} color="rgba(255, 255, 255, 0.9)" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleSettings}>
              <Ionicons name="settings-outline" size={20} color="rgba(255, 255, 255, 0.9)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handleProfilePicture} activeOpacity={0.8}>
              {userProfile?.profile_picture_url ? (
                <Image
                  source={{ uri: userProfile.profile_picture_url }}
                  style={styles.avatarImage}
                  onError={(error) => {
                    console.log('📸 ERROR loading profile image:', userProfile.profile_picture_url);
                    console.log('📸 Image error details:', error.nativeEvent.error);
                    // Force fallback to initials by clearing the invalid URL
                    setUserProfile(prev => prev ? {...prev, profile_picture_url: null} : null);
                  }}
                />
              ) : (
                <Text style={styles.avatarText}>{getAvatarInitials()}</Text>
              )}
              <View style={styles.avatarBorder} />
              {/* Edit indicator */}
              <View style={styles.avatarEditIndicator}>
                <Ionicons name="camera" size={12} color="#ffffff" />
              </View>
            </TouchableOpacity>
            
            {/* Status Indicator */}
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>

          <View style={styles.userInfoSection}>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>
                {userProfile.first_name && userProfile.last_name 
                  ? `${userProfile.first_name} ${userProfile.last_name}`
                  : userProfile.full_name || 'Complete Your Profile'}
              </Text>
              {userProfile.email_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                </View>
              )}
            </View>
            
            <View style={styles.userMetaInfo}>
              <View style={styles.userTypeChip}>
                <Text style={styles.userTypeText}>
                  {getUserTypeIcon()} {userProfile.user_type === 'student' ? 'Student' : 'Staff Member'}
                </Text>
              </View>
            </View>

            <Text style={styles.userDepartment}>
              {userProfile.department || 'Department not set'} • {userProfile.faculty || 'Faculty not set'}
            </Text>
            
            {userProfile.level && (
              <Text style={styles.userLevel}>Level {userProfile.level}</Text>
            )}

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatNumber}>{profileStats.courses_scheduled}</Text>
                <Text style={styles.quickStatLabel}>
                  {userProfile.user_type === 'staff' ? 'Teaching' : 'Courses'}
                </Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatNumber}>
                  {userProfile.user_type === 'staff' 
                    ? getYearsOfService(userProfile.created_at) 
                    : profileStats.login_streak}
                </Text>
                <Text style={styles.quickStatLabel}>
                  {userProfile.user_type === 'staff' ? 'Years' : 'Day Streak'}
                </Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatNumber}>{profileStats.profile_completion}%</Text>
                <Text style={styles.quickStatLabel}>Complete</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Enhanced Activity Overview */}
      <View style={styles.modernSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activity Overview</Text>
          <TouchableOpacity style={styles.seeAllButton} onPress={handleViewAllActivity}>
            <Text style={styles.seeAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color="#667eea" />
          </TouchableOpacity>
        </View>

        {/* Profile Completion Card */}
        <View style={styles.completionCard}>
          <View style={styles.completionHeader}>
            <View style={styles.completionIcon}>
              <Ionicons name="person-circle" size={24} color="#667eea" />
            </View>
            <View style={styles.completionInfo}>
              <Text style={styles.completionTitle}>Profile Completion</Text>
              <Text style={styles.completionSubtitle}>
                {profileStats.profile_completion < 100 
                  ? 'Add more info to unlock features' 
                  : 'Your profile is complete!'}
              </Text>
            </View>
            <View style={styles.completionPercentage}>
              <Text style={styles.completionText}>{profileStats.profile_completion}%</Text>
            </View>
          </View>
          <View style={styles.modernProgressBar}>
            <View 
              style={[
                styles.modernProgressFill, 
                { 
                  width: `${profileStats.profile_completion}%`,
                  backgroundColor: profileStats.profile_completion < 100 ? '#ffc107' : '#28a745'
                }
              ]}
            />
          </View>
        </View>

        {/* Professional Stats Layout */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { marginLeft: 0 }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(102, 126, 234, 0.1)' }]}>
              <Ionicons name={userProfile.user_type === 'staff' ? 'school' : 'calendar'} size={20} color="#667eea" />
            </View>
            <Text style={styles.statValue}>{profileStats.courses_scheduled}</Text>
            <Text style={styles.statTitle}>
              {userProfile.user_type === 'staff' ? 'Teaching' : 'Courses'}
            </Text>
          </View>

          <View style={[styles.statCard, { marginRight: 0 }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(40, 167, 69, 0.1)' }]}>
              <Ionicons name="time" size={20} color="#28a745" />
            </View>
            <Text style={styles.statValue}>{profileStats.upcoming_events}</Text>
            <Text style={styles.statTitle}>
              {userProfile.user_type === 'staff' ? 'Meetings' : 'Events'}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { marginLeft: 0 }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(255, 193, 7, 0.1)' }]}>
              <Ionicons name="notifications" size={20} color="#ffc107" />
            </View>
            <Text style={styles.statValue}>{profileStats.total_reminders}</Text>
            <Text style={styles.statTitle}>Reminders</Text>
          </View>

          <View style={[styles.statCard, { marginRight: 0 }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(220, 53, 69, 0.1)' }]}>
              <Ionicons name={userProfile.user_type === 'staff' ? 'briefcase' : 'flame'} size={20} color="#dc3545" />
            </View>
            <Text style={styles.statValue}>
              {userProfile.user_type === 'staff' 
                ? getYearsOfService(userProfile.created_at) 
                : profileStats.login_streak}
            </Text>
            <Text style={styles.statTitle}>
              {userProfile.user_type === 'staff' ? 'Years Service' : 'Day Streak'}
            </Text>
          </View>
        </View>
      </View>

      {/* Enhanced Profile Details */}
      <View style={styles.modernSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
            <Ionicons name="create-outline" size={16} color="#667eea" />
            <Text style={styles.editProfileText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Professional Details Layout */}
        <View style={styles.detailsList}>
          {/* Email */}
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: 'rgba(102, 126, 234, 0.1)' }]}>
              <Ionicons name="mail" size={20} color="#667eea" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{userProfile.email}</Text>
            </View>
            <View style={styles.detailStatus}>
              {userProfile.email_verified ? (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                  <Text style={styles.badgeText}>Verified</Text>
                </View>
              ) : (
                <View style={styles.pendingBadge}>
                  <Ionicons name="alert-circle" size={16} color="#ffc107" />
                  <Text style={styles.badgeText}>Verify</Text>
                </View>
              )}
            </View>
          </View>

          {/* Faculty */}
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: 'rgba(40, 167, 69, 0.1)' }]}>
              <Ionicons name="school" size={20} color="#28a745" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Faculty</Text>
              <Text style={[styles.detailValue, !userProfile.faculty && styles.placeholderValue]}>
                {userProfile.faculty || 'Add your faculty'}
              </Text>
            </View>
            <View style={styles.detailStatus}>
              {userProfile.faculty ? (
                <Ionicons name="checkmark-circle" size={20} color="#28a745" />
              ) : (
                <Ionicons name="add-circle-outline" size={20} color="#adb5bd" />
              )}
            </View>
          </View>

          {/* Department */}
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: 'rgba(255, 193, 7, 0.1)' }]}>
              <Ionicons name="library" size={20} color="#ffc107" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={[styles.detailValue, !userProfile.department && styles.placeholderValue]}>
                {userProfile.department || 'Add your department'}
              </Text>
            </View>
            <View style={styles.detailStatus}>
              {userProfile.department ? (
                <Ionicons name="checkmark-circle" size={20} color="#28a745" />
              ) : (
                <Ionicons name="add-circle-outline" size={20} color="#adb5bd" />
              )}
            </View>
          </View>

          {/* Member Since */}
          <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: 'rgba(123, 75, 162, 0.1)' }]}>
              <Ionicons name="calendar-clear" size={20} color="#7b4fa2" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Member Since</Text>
              <Text style={styles.detailValue}>{getMemberSince()}</Text>
            </View>
            <View style={styles.memberBadge}>
              <Text style={styles.memberText}>Member</Text>
            </View>
          </View>

          {/* Academic Level (for students) */}
          {userProfile.level && userProfile.user_type === 'student' && (
            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: 'rgba(220, 53, 69, 0.1)' }]}>
                <Ionicons name="trophy" size={20} color="#dc3545" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Academic Level</Text>
                <Text style={styles.detailValue}>Year {userProfile.level}</Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>L{userProfile.level}</Text>
              </View>
            </View>
          )}

          {/* Position (for staff) */}
          {userProfile.user_type === 'staff' && (
            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: 'rgba(220, 53, 69, 0.1)' }]}>
                <Ionicons name="briefcase" size={20} color="#dc3545" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Position</Text>
                <Text style={[styles.detailValue, !userProfile.position && styles.placeholderValue]}>
                  {userProfile.position || 'Add your position'}
                </Text>
              </View>
              <View style={styles.detailStatus}>
                {userProfile.position ? (
                  <View style={styles.positionBadge}>
                    <Text style={styles.positionText}>{getPositionRank(userProfile.position)}</Text>
                  </View>
                ) : (
                  <Ionicons name="add-circle-outline" size={20} color="#adb5bd" />
                )}
              </View>
            </View>
          )}

          {/* Staff ID/Employee ID (for staff) - Commented out for now */}
          {/* {userProfile.user_type === 'staff' && (
            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: 'rgba(75, 85, 99, 0.1)' }]}>
                <Ionicons name="card" size={20} color="#4b5563" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Staff ID</Text>
                <Text style={[styles.detailValue, !userProfile.staff_id && styles.placeholderValue]}>
                  {userProfile.staff_id || 'Add your staff ID'}
                </Text>
              </View>
              <View style={styles.detailStatus}>
                {userProfile.staff_id ? (
                  <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                ) : (
                  <Ionicons name="add-circle-outline" size={20} color="#adb5bd" />
                )}
              </View>
            </View>
          )} */}

          {/* Years of Service (for staff) - Commented out for now */}
          {/* {userProfile.user_type === 'staff' && (
            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: 'rgba(139, 69, 19, 0.1)' }]}>
                <Ionicons name="time" size={20} color="#8b4513" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Years of Service</Text>
                <Text style={styles.detailValue}>
                  {getYearsOfService(userProfile.created_at)} years
                </Text>
              </View>
              <View style={styles.serviceBadge}>
                <Text style={styles.serviceText}>
                  {getServiceLevel(getYearsOfService(userProfile.created_at))}
                </Text>
              </View>
            </View>
          )} */}
        </View>
      </View>

      {/* Modern Actions Section */}
      <View style={styles.modernSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        {/* Professional Actions List */}
        <View style={styles.actionsList}>
          <TouchableOpacity style={styles.actionItem} onPress={handleShareProfile}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(102, 126, 234, 0.1)' }]}>
              <Ionicons name="share-social" size={20} color="#667eea" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Share App</Text>
              <Text style={styles.actionSubtitle}>Tell friends about My OAU</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#adb5bd" />
          </TouchableOpacity>




          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/settings')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(123, 75, 162, 0.1)' }]}>
              <Ionicons name="settings" size={20} color="#7b4fa2" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>App Settings</Text>
              <Text style={styles.actionSubtitle}>Preferences and account</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#adb5bd" />
          </TouchableOpacity>
        </View>
      </View>

      {/* My OAU Brand Section - Moved Up */}
      <View style={styles.brandSection}>
        <View style={styles.brandContent}>
          <View style={styles.brandHeader}>
            <View style={styles.brandIcon}>
              <Ionicons name="school" size={28} color="#667eea" />
            </View>
            <View style={styles.brandInfo}>
              <Text style={styles.brandTitle}>My OAU</Text>
              <Text style={styles.brandTagline}>Your University Companion</Text>
            </View>
          </View>
          
          <Text style={styles.brandDescription}>
            Navigate university life with ease. Get directions, manage your schedule, 
            and stay connected with campus activities.
          </Text>
          
          <View style={styles.brandFooter}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
            <Text style={styles.separatorText}>•</Text>
            <Text style={styles.universityText}>Made with ❤️ for OAU</Text>
          </View>
        </View>
      </View>

      {/* Spacer for bottom padding */}
      <View style={styles.bottomSpacer} />
      </ScrollView>
      <Toast />

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        profile={userProfile}
        onProfileUpdate={handleProfileUpdate}
        initialSection={editSection}
      />

      {/* Profile Picture Modal */}
      <ProfilePictureModal
        visible={showProfilePictureModal}
        onClose={() => setShowProfilePictureModal(false)}
        profile={userProfile}
        onProfileUpdate={handleProfileUpdate}
      />
    </SafeAreaView>
  );
}

const getStyles = (theme: any, fontSizes: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface,
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.surface,
  },
  loadingText: {
    marginTop: 16,
    fontSize: fontSizes.body,
    color: theme.textSecondary,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 2,
  },
  userDepartment: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  userLevel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statsContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    textAlign: 'center',
    fontWeight: '500',
  },
  detailsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 3,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '600',
  },
  actionsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
    fontWeight: '600',
  },
  signOutItem: {
    borderBottomWidth: 0,
  },
  signOutText: {
    color: '#e74c3c',
    fontWeight: '700',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#bdc3c7',
    fontWeight: '500',
  },
  completionContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  completionProgress: {
    width: '100%',
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  completionBar: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 4,
  },
  completionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  completionHint: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Enhanced Loading Screen Styles
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  taglineText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '500',
  },
  loadingIndicator: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileIcon: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  loadingSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginHorizontal: 4,
  },
  
  // Profile Loading Screen Styles
  profileLoadingContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileLoadingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  profileRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: 'rgba(255, 255, 255, 0.8)',
  },
  profileLoadingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  profileLoadingSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  progressContainer: {
    width: '80%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },

  // Enhanced Header Styles
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  quickActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 4,
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarBorder: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarEditIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28a745',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  userInfoSection: {
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verifiedBadge: {
    marginLeft: 8,
    backgroundColor: 'rgba(40, 167, 69, 0.2)',
    borderRadius: 10,
    padding: 4,
  },
  userMetaInfo: {
    marginBottom: 8,
  },
  userTypeChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  userTypeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  quickStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
  },

  // Modern Section Styles
  modernSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
    marginRight: 4,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editProfileText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
    marginLeft: 4,
  },

  // Completion Card Styles
  completionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  completionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  completionInfo: {
    flex: 1,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 2,
  },
  completionSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  completionPercentage: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modernProgressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  modernProgressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Professional Stats Layout
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginLeft: 6,
    marginRight: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Professional Details List
  detailsList: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '600',
  },
  placeholderValue: {
    color: '#adb5bd',
    fontWeight: '400',
    fontStyle: 'italic',
  },
  detailStatus: {
    alignItems: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    color: '#28a745',
  },
  memberBadge: {
    backgroundColor: 'rgba(123, 75, 162, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  memberText: {
    fontSize: 11,
    color: '#7b4fa2',
    fontWeight: '600',
  },
  levelBadge: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 11,
    color: '#dc3545',
    fontWeight: '600',
  },
  positionBadge: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  positionText: {
    fontSize: 11,
    color: '#dc3545',
    fontWeight: '600',
  },
  serviceBadge: {
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  serviceText: {
    fontSize: 11,
    color: '#8b4513',
    fontWeight: '600',
  },

  // Professional Actions List
  actionsList: {
    gap: 12,
    marginBottom: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 18,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7d7',
  },
  signOutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  signOutContent: {
    flex: 1,
  },
  signOutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
    marginBottom: 2,
  },
  signOutSubtitle: {
    fontSize: 14,
    color: '#dc3545',
    opacity: 0.8,
  },

  // My OAU Brand Section - Responsive & Theme-Aware
  brandSection: {
    backgroundColor: theme.card,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 20,
    shadowColor: isDark ? '#000' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  brandContent: {
    alignItems: 'center',
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  brandIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginBottom: 8,
  },
  brandInfo: {
    alignItems: 'center',
    flex: 1,
    minWidth: 200,
  },
  brandTitle: {
    fontSize: fontSizes.h3,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  brandTagline: {
    fontSize: fontSizes.medium,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  brandDescription: {
    fontSize: fontSizes.medium,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: fontSizes.medium * 1.5,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  brandFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  versionText: {
    fontSize: fontSizes.caption,
    color: theme.textSecondary,
    fontWeight: '500',
    opacity: 0.8,
  },
  separatorText: {
    fontSize: fontSizes.caption,
    color: theme.textSecondary,
    marginHorizontal: 8,
    opacity: 0.6,
  },
  universityText: {
    fontSize: fontSizes.caption,
    color: theme.primary,
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 20,
  },
});