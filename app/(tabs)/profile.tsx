import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { VisitorPrompt } from '@/components/VisitorPrompt';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  userType: 'student' | 'staff';
  department: string;
  faculty: string;
  level?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

interface ProfileStats {
  coursesScheduled: number;
  upcomingEvents: number;
  totalReminders: number;
  loginStreak: number;
}

export default function ProfileScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileStats, setProfileStats] = useState<ProfileStats>({
    coursesScheduled: 0,
    upcomingEvents: 0,
    totalReminders: 0,
    loginStreak: 1,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  console.log('👤 PROFILE SCREEN - Render called');

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setIsAuthenticated(true);
      
      // Extract user profile from metadata
      const userMetadata = session.user.user_metadata;
      const profile: UserProfile = {
        id: session.user.id,
        email: session.user.email || userMetadata?.email || '',
        fullName: userMetadata?.full_name || '',
        firstName: userMetadata?.first_name || '',
        lastName: userMetadata?.last_name || '',
        userType: userMetadata?.user_type || 'student',
        department: userMetadata?.department || '',
        faculty: userMetadata?.faculty || '',
        level: userMetadata?.level || undefined,
        emailVerified: userMetadata?.email_verified || false,
        phoneVerified: userMetadata?.phone_verified || false,
        createdAt: session.user.created_at,
      };
      
      setUserProfile(profile);
      
      // Load profile statistics (mock data for now)
      setProfileStats({
        coursesScheduled: Math.floor(Math.random() * 15) + 5,
        upcomingEvents: Math.floor(Math.random() * 8) + 2,
        totalReminders: Math.floor(Math.random() * 25) + 10,
        loginStreak: Math.floor(Math.random() * 30) + 1,
      });
    } else {
      setIsAuthenticated(false);
      setUserProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    console.log('👤 PROFILE SCREEN - Component mounted/rendered');
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkAuth();
      } else {
        setIsAuthenticated(false);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await checkAuth();
    setRefreshing(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => supabase.auth.signOut()
        },
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing feature coming soon!');
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out Campus Nav - the ultimate university navigation app!`,
        title: 'Campus Nav',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleSupport = () => {
    const email = 'support@campus-nav.com';
    const subject = 'Campus Nav Support Request';
    const body = `Hi Campus Nav team,\n\nI need help with:\n\n[Please describe your issue here]\n\nUser Type: ${userProfile?.userType}\nDepartment: ${userProfile?.department}\n\nThanks!`;
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(mailtoUrl);
  };

  const handleAbout = () => {
    Alert.alert(
      'About Campus Nav',
      'Campus Nav v1.0.0\n\nYour comprehensive university navigation and scheduling companion.\n\nBuilt with ❤️ for OAU students and staff.',
      [{ text: 'OK' }]
    );
  };

  // Show visitor prompt for unauthenticated users
  if (!isAuthenticated || !userProfile) {
    return <VisitorPrompt />;
  }

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="person-circle" size={50} color="#667eea" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const getAvatarInitials = () => {
    return `${userProfile.firstName.charAt(0)}${userProfile.lastName.charAt(0)}`.toUpperCase();
  };

  const getMemberSince = () => {
    const date = new Date(userProfile.createdAt);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const getUserTypeIcon = () => {
    return userProfile.userType === 'student' ? '🎓' : '👨‍🏫';
  };

  const getUserTypeColor = () => {
    return userProfile.userType === 'student' ? ['#667eea', '#764ba2'] : ['#764ba2', '#667eea'];
  };

  // Show authenticated user profile
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <LinearGradient
        colors={getUserTypeColor()}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getAvatarInitials()}</Text>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userProfile.fullName}</Text>
            <Text style={styles.userTitle}>
              {getUserTypeIcon()} {userProfile.userType === 'student' ? 'Student' : 'Staff Member'}
            </Text>
            <Text style={styles.userDepartment}>
              {userProfile.department}
            </Text>
            {userProfile.level && (
              <Text style={styles.userLevel}>Level {userProfile.level}</Text>
            )}
          </View>
          
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Ionicons name="create-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Your Activity</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="calendar" size={24} color="#667eea" />
            <Text style={styles.statNumber}>{profileStats.coursesScheduled}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={24} color="#28a745" />
            <Text style={styles.statNumber}>{profileStats.upcomingEvents}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="notifications" size={24} color="#ffc107" />
            <Text style={styles.statNumber}>{profileStats.totalReminders}</Text>
            <Text style={styles.statLabel}>Reminders</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={24} color="#dc3545" />
            <Text style={styles.statNumber}>{profileStats.loginStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>
      </View>

      {/* Profile Details Section */}
      <View style={styles.detailsContainer}>
        <Text style={styles.sectionTitle}>Profile Details</Text>
        
        <View style={styles.detailItem}>
          <Ionicons name="mail" size={20} color="#667eea" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{userProfile.email}</Text>
          </View>
          {userProfile.emailVerified && (
            <Ionicons name="checkmark-circle" size={16} color="#28a745" />
          )}
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="school" size={20} color="#667eea" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Faculty</Text>
            <Text style={styles.detailValue}>{userProfile.faculty}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="library" size={20} color="#667eea" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Department</Text>
            <Text style={styles.detailValue}>{userProfile.department}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="calendar-clear" size={20} color="#667eea" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Member Since</Text>
            <Text style={styles.detailValue}>{getMemberSince()}</Text>
          </View>
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity style={styles.actionItem} onPress={handleShareProfile}>
          <Ionicons name="share-social" size={20} color="#667eea" />
          <Text style={styles.actionText}>Share App</Text>
          <Ionicons name="chevron-forward" size={16} color="#6c757d" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={handleSupport}>
          <Ionicons name="help-circle" size={20} color="#667eea" />
          <Text style={styles.actionText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={16} color="#6c757d" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={handleAbout}>
          <Ionicons name="information-circle" size={20} color="#667eea" />
          <Text style={styles.actionText}>About Campus Nav</Text>
          <Ionicons name="chevron-forward" size={16} color="#6c757d" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionItem, styles.signOutItem]} onPress={handleSignOut}>
          <Ionicons name="log-out" size={20} color="#dc3545" />
          <Text style={[styles.actionText, styles.signOutText]}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={16} color="#dc3545" />
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Campus Nav helps you navigate university life with ease
        </Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
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
});