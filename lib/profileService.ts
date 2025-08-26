import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  user_type: 'student' | 'staff';
  
  // Academic Information
  student_id?: string;
  staff_id?: string;
  department?: string;
  faculty?: string;
  level?: string;
  cgpa?: number;
  
  // Contact Information
  phone_number?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  address?: string;
  
  // Profile Settings
  profile_picture_url?: string;
  bio?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  nationality?: string;
  state_of_origin?: string;
  
  // Account Status
  is_active: boolean;
  is_verified: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  profile_completed: boolean;
  
  // Privacy Settings
  show_phone: boolean;
  show_email: boolean;
  show_department: boolean;
  public_profile: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  profile_completed_at?: string;
}

export interface UserStatistics {
  courses_scheduled: number;
  active_courses: number;
  upcoming_events: number;
  total_reminders: number;
  login_streak: number;
  profile_completion: number;
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: 'login' | 'logout' | 'course_added' | 'course_updated' | 'course_deleted' | 
                 'notification_scheduled' | 'notification_cancelled' | 'venue_searched' | 
                 'map_navigation' | 'profile_updated' | 'settings_changed';
  activity_data?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  
  // App Preferences
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'yo' | 'ig' | 'ha';
  timezone: string;
  
  // Map Preferences
  default_map_view: 'campus' | 'satellite' | 'hybrid';
  show_all_venues: boolean;
  auto_center_map: boolean;
  
  // Timetable Preferences
  week_start_day: number;
  default_view: 'day' | 'week' | 'month';
  show_time_conflicts: boolean;
  
  // Privacy Preferences
  analytics_consent: boolean;
  crash_reporting_consent: boolean;
  marketing_consent: boolean;
  
  created_at: string;
  updated_at: string;
}

export const profileService = {
  // Get current user's profile
  async getProfile(): Promise<{ data: UserProfile | null; error: any }> {
    try {
      console.log('👤 PROFILE SERVICE - Getting user profile...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('👤 PROFILE SERVICE - User not authenticated');
        return { data: null, error: new Error('User not authenticated') };
      }

      console.log('👤 PROFILE SERVICE - Authenticated user ID:', user.id);
      console.log('👤 PROFILE SERVICE - Querying user_profiles table...');

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('👤 PROFILE SERVICE - Error getting profile:', error);
        console.error('👤 PROFILE SERVICE - Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return { data: null, error };
      }

      console.log('👤 PROFILE SERVICE - Raw profile data:', data);
      console.log('👤 PROFILE SERVICE - Got profile for:', data?.first_name || 'Unknown', data?.last_name || '');
      return { data, error: null };
    } catch (error) {
      console.error('👤 PROFILE SERVICE - Exception getting profile:', error);
      return { data: null, error };
    }
  },

  // Update user profile
  async updateProfile(profileData: Partial<UserProfile>): Promise<{ data: UserProfile | null; error: any }> {
    try {
      console.log('👤 PROFILE SERVICE - Updating profile...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Calculate if profile is completed
      const isCompleted = !!(
        profileData.full_name && 
        profileData.department && 
        profileData.faculty && 
        (profileData.user_type === 'staff' || profileData.level)
      );

      const updateData = {
        ...profileData,
        profile_completed: isCompleted,
        profile_completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('👤 PROFILE SERVICE - Error updating profile:', error);
        return { data: null, error };
      }

      // Log profile update activity
      await this.logActivity('profile_updated', {
        fields_updated: Object.keys(profileData),
        profile_completed: isCompleted,
      });

      console.log('👤 PROFILE SERVICE - Profile updated successfully');
      return { data, error: null };
    } catch (error) {
      console.error('👤 PROFILE SERVICE - Exception updating profile:', error);
      return { data: null, error };
    }
  },

  // Get user statistics
  async getStatistics(): Promise<{ data: UserStatistics | null; error: any }> {
    try {
      console.log('👤 PROFILE SERVICE - Getting user statistics...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .rpc('get_user_statistics', { user_uuid: user.id });

      if (error) {
        console.error('👤 PROFILE SERVICE - Error getting statistics:', error);
        return { data: null, error };
      }

      // The RPC returns an array, get the first (and only) result
      const stats = data && data.length > 0 ? data[0] : {
        courses_scheduled: 0,
        active_courses: 0,
        upcoming_events: 0,
        total_reminders: 0,
        login_streak: 0,
        profile_completion: 0,
      };

      console.log('👤 PROFILE SERVICE - Got statistics:', stats);
      return { data: stats, error: null };
    } catch (error) {
      console.error('👤 PROFILE SERVICE - Exception getting statistics:', error);
      
      // Return default stats on error
      const defaultStats: UserStatistics = {
        courses_scheduled: 0,
        active_courses: 0,
        upcoming_events: 0,
        total_reminders: 0,
        login_streak: 1,
        profile_completion: 50,
      };
      
      return { data: defaultStats, error };
    }
  },

  // Get user preferences
  async getPreferences(): Promise<{ data: UserPreferences | null; error: any }> {
    try {
      console.log('👤 PROFILE SERVICE - Getting user preferences...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('👤 PROFILE SERVICE - Error getting preferences:', error);
        return { data: null, error };
      }

      console.log('👤 PROFILE SERVICE - Got preferences');
      return { data, error: null };
    } catch (error) {
      console.error('👤 PROFILE SERVICE - Exception getting preferences:', error);
      return { data: null, error };
    }
  },

  // Update user preferences
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<{ data: UserPreferences | null; error: any }> {
    try {
      console.log('👤 PROFILE SERVICE - Updating preferences...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .update({
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('👤 PROFILE SERVICE - Error updating preferences:', error);
        return { data: null, error };
      }

      // Log settings change activity
      await this.logActivity('settings_changed', {
        settings_updated: Object.keys(preferences),
      });

      console.log('👤 PROFILE SERVICE - Preferences updated successfully');
      return { data, error: null };
    } catch (error) {
      console.error('👤 PROFILE SERVICE - Exception updating preferences:', error);
      return { data: null, error };
    }
  },

  // Log user activity
  async logActivity(
    activityType: UserActivity['activity_type'], 
    activityData?: any,
    options?: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<{ data: UserActivity | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('user_activity')
        .insert([{
          user_id: user.id,
          activity_type: activityType,
          activity_data: activityData,
          ip_address: options?.ipAddress,
          user_agent: options?.userAgent,
        }])
        .select()
        .single();

      if (error) {
        console.error('👤 PROFILE SERVICE - Error logging activity:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('👤 PROFILE SERVICE - Exception logging activity:', error);
      return { data: null, error };
    }
  },

  // Get user activity history
  async getActivityHistory(limit: number = 50): Promise<{ data: UserActivity[] | null; error: any }> {
    try {
      console.log('👤 PROFILE SERVICE - Getting activity history...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('👤 PROFILE SERVICE - Error getting activity history:', error);
        return { data: null, error };
      }

      console.log('👤 PROFILE SERVICE - Got activity history:', data?.length || 0, 'activities');
      return { data, error: null };
    } catch (error) {
      console.error('👤 PROFILE SERVICE - Exception getting activity history:', error);
      return { data: null, error };
    }
  },

  // Initialize profile for new user (called after signup)
  async initializeProfile(userData: {
    email: string;
    fullName?: string;
    userType: 'student' | 'staff';
    department?: string;
    faculty?: string;
    level?: string;
  }): Promise<{ data: UserProfile | null; error: any }> {
    try {
      console.log('👤 PROFILE SERVICE - Initializing profile for new user...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        console.log('👤 PROFILE SERVICE - Profile already exists, updating...');
        return this.updateProfile(userData as Partial<UserProfile>);
      }

      // Create new profile
      const profileData: Partial<UserProfile> = {
        id: user.id,
        email: userData.email,
        full_name: userData.fullName,
        user_type: userData.userType,
        department: userData.department,
        faculty: userData.faculty,
        level: userData.level,
        is_active: true,
        is_verified: false,
        email_verified: user.email_confirmed_at != null,
        phone_verified: false,
        profile_completed: false,
        show_phone: false,
        show_email: true,
        show_department: true,
        public_profile: false,
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) {
        console.error('👤 PROFILE SERVICE - Error creating profile:', error);
        return { data: null, error };
      }

      // Log initial login activity
      await this.logActivity('login', {
        event: 'first_login',
        user_type: userData.userType,
      });

      console.log('👤 PROFILE SERVICE - Profile initialized successfully');
      return { data, error: null };
    } catch (error) {
      console.error('👤 PROFILE SERVICE - Exception initializing profile:', error);
      return { data: null, error };
    }
  },

  // Search public profiles (for directory/contact features)
  async searchProfiles(query: string, userType?: 'student' | 'staff'): Promise<{ data: UserProfile[] | null; error: any }> {
    try {
      console.log('👤 PROFILE SERVICE - Searching profiles:', query);
      
      let queryBuilder = supabase
        .from('user_profiles')
        .select('id, full_name, user_type, department, faculty, level, bio, profile_picture_url')
        .eq('public_profile', true)
        .eq('is_active', true)
        .ilike('full_name', `%${query}%`);

      if (userType) {
        queryBuilder = queryBuilder.eq('user_type', userType);
      }

      const { data, error } = await queryBuilder
        .order('full_name', { ascending: true })
        .limit(20);

      if (error) {
        console.error('👤 PROFILE SERVICE - Error searching profiles:', error);
        return { data: null, error };
      }

      console.log('👤 PROFILE SERVICE - Found profiles:', data?.length || 0);
      return { data, error: null };
    } catch (error) {
      console.error('👤 PROFILE SERVICE - Exception searching profiles:', error);
      return { data: null, error };
    }
  },

  // Get profile completion suggestions
  getProfileCompletionSuggestions(profile: UserProfile): string[] {
    const suggestions: string[] = [];
    
    if (!profile.full_name) suggestions.push('Add your full name');
    if (!profile.department) suggestions.push('Select your department');
    if (!profile.faculty) suggestions.push('Select your faculty');
    if (profile.user_type === 'student' && !profile.level) suggestions.push('Add your current level');
    if (!profile.phone_number) suggestions.push('Add your phone number');
    if (!profile.bio) suggestions.push('Write a short bio');
    if (!profile.profile_picture_url) suggestions.push('Upload a profile picture');
    if (!profile.date_of_birth) suggestions.push('Add your date of birth');
    
    return suggestions;
  },

  // Calculate profile completion percentage
  calculateProfileCompletion(profile: UserProfile): number {
    const requiredFields = ['full_name', 'department', 'faculty'];
    const optionalFields = ['phone_number', 'bio', 'profile_picture_url', 'date_of_birth'];
    
    if (profile.user_type === 'student') {
      requiredFields.push('level');
    }
    
    const totalFields = requiredFields.length + optionalFields.length;
    let completedFields = 0;
    
    // Check required fields
    for (const field of requiredFields) {
      if (profile[field as keyof UserProfile]) {
        completedFields++;
      }
    }
    
    // Check optional fields
    for (const field of optionalFields) {
      if (profile[field as keyof UserProfile]) {
        completedFields++;
      }
    }
    
    return Math.round((completedFields / totalFields) * 100);
  },
};
