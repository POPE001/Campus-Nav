import { supabase } from './supabase';
import { databaseNotificationService } from './notificationService';

export interface Content {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  type: 'article' | 'blog' | 'event' | 'announcement';
  status: 'draft' | 'published' | 'archived';
  
  // Author information
  author_id: string;
  author_name: string;
  author_role?: string;
  
  // Event-specific fields
  event_date?: string;
  event_location?: string;
  event_end_date?: string;
  
  // Media
  image_url?: string;
  attachment_url?: string;
  
  // Metadata
  tags?: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // Timestamps
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface ContentTargeting {
  id: string;
  content_id: string;
  target_type: 'everyone' | 'students' | 'staff' | 'faculty' | 'department' | 'level' | 'custom';
  faculty?: string;
  department?: string;
  level?: string;
  user_type?: string;
  custom_users?: string[]; // Array of user IDs
}

export interface CreateContentData {
  title: string;
  content: string;
  excerpt?: string;
  type: 'article' | 'blog' | 'event' | 'announcement';
  
  // Event-specific fields
  event_date?: string;
  event_location?: string;
  event_end_date?: string;
  
  // Media
  image_url?: string;
  attachment_url?: string;
  
  // Metadata
  tags?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  
  // Targeting
  targeting: Omit<ContentTargeting, 'id' | 'content_id'>[];
}

export interface ContentNotification {
  id: string;
  content_id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: 'content' | 'event' | 'urgent';
  sent_at: string;
  read_at?: string;
  clicked_at?: string;
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed';
}

export const contentService = {
  // Get published content for current user (or visitor)
  async getContent(filters?: {
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Content[] | null; error: any }> {
    try {
      console.log('📰 CONTENT SERVICE - Getting content with filters:', filters);
      
      const { data: { user } } = await supabase.auth.getUser();
      const isAuthenticated = !!user;
      
      console.log('📰 CONTENT SERVICE - User authentication status:', {
        authenticated: isAuthenticated,
        userId: user?.id || 'anonymous',
        email: user?.email || 'visitor'
      });

      let query = supabase
        .from('content')
        .select(`
          *,
          content_targeting (
            target_type,
            faculty,
            department,
            level,
            user_type,
            custom_users
          )
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      console.log('📰 CONTENT SERVICE - Query built successfully');

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('📰 CONTENT SERVICE - Error getting content:', error);
        return { data: null, error };
      }

      console.log('📰 CONTENT SERVICE - Raw content from DB:', data?.length || 0);
      
      // Debug: Log detailed content structure to see if targeting rules are included
      if (data && data.length > 0) {
        console.log('📰 CONTENT SERVICE - Sample content structure:');
        data.slice(0, 2).forEach((content, index) => {
          console.log(`   ${index + 1}. "${content.title}"`);
          console.log(`      - targeting rules: ${content.content_targeting?.length || 0}`);
          console.log(`      - targeting data:`, content.content_targeting);
        });
      }
      if (isAuthenticated) {
        console.log('📰 CONTENT SERVICE - Authenticated user info:', {
          user_id: user.id,
          email: user.email,
          raw_user_meta_data: user.raw_user_meta_data,
          user_metadata: user.user_metadata
        });
      } else {
        console.log('📰 CONTENT SERVICE - Visitor access (unauthenticated)');
      }

      // Filter content based on targeting rules
      // TODO: This could be optimized with a database function
      const filteredContent = data?.filter(content => {
        console.log(`📰 FILTERING content "${content.title}" with ${content.content_targeting?.length || 0} targeting rules`);
        
        if (!isAuthenticated) {
          // For visitors, only show content targeted for "everyone"
          const hasEveryoneTargeting = content.content_targeting?.some((targeting: any) => 
            targeting.target_type === 'everyone'
          );
          console.log(`📰 VISITOR ACCESS - Content "${content.title}" has "everyone" targeting: ${hasEveryoneTargeting}`);
          console.log(`📰 FINAL DECISION for "${content.title}": ${hasEveryoneTargeting ? 'SHOW' : 'HIDE'} (visitor)`);
          return hasEveryoneTargeting;
        }
        
        // For authenticated users, use normal targeting logic
        const shouldShow = content.content_targeting?.some((targeting: any) => {
          const matches = this.userMatchesTargeting(user, targeting);
          console.log(`📰 Targeting rule result: ${matches}`);
          return matches;
        });
        
        console.log(`📰 FINAL DECISION for "${content.title}": ${shouldShow ? 'SHOW' : 'HIDE'}`);
        return shouldShow;
      }) || [];

      console.log('📰 CONTENT SERVICE - Filtered content count:', filteredContent.length);
      console.log('📰 CONTENT SERVICE - Showing content titles:', filteredContent.map(c => c.title));
      return { data: filteredContent, error: null };
    } catch (error) {
      console.error('📰 CONTENT SERVICE - Exception getting content:', error);
      return { data: null, error };
    }
  },

  // Get content by ID (with interaction tracking)
  async getContentById(id: string): Promise<{ data: Content | null; error: any }> {
    try {
      console.log('📰 CONTENT SERVICE - Getting content by ID:', id);

      const { data, error } = await supabase
        .from('content')
        .select(`
          *,
          content_targeting (*)
        `)
        .eq('id', id)
        .eq('status', 'published')
        .single();

      if (error) {
        console.error('📰 CONTENT SERVICE - Error getting content by ID:', error);
        return { data: null, error };
      }

      // Track view interaction
      await this.trackInteraction(id, 'view');

      return { data, error: null };
    } catch (error) {
      console.error('📰 CONTENT SERVICE - Exception getting content by ID:', error);
      return { data: null, error };
    }
  },

  // Create new content (staff only)
  async createContent(contentData: CreateContentData): Promise<{ data: Content | null; error: any }> {
    try {
      console.log('📰 CONTENT SERVICE - Creating content:', contentData.title);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Check if user is staff - FIX: Use raw_user_meta_data where Supabase stores the metadata
      const userMetadata = user.raw_user_meta_data || user.user_metadata || {};
      console.log('📰 CONTENT SERVICE - User metadata for staff check:', userMetadata);
      
      if (userMetadata?.user_type !== 'staff') {
        console.error('📰 CONTENT SERVICE - User is not staff:', userMetadata?.user_type);
        return { data: null, error: new Error('Only staff can create content') };
      }
      
      console.log('✅ CONTENT SERVICE - Staff validation passed');

      // Create content
      const { targeting, ...contentFields } = contentData;
      
      const { data: content, error: contentError } = await supabase
        .from('content')
        .insert([
          {
            ...contentFields,
            author_id: user.id,
            author_name: `${userMetadata?.first_name || ''} ${userMetadata?.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Staff',
            author_role: userMetadata?.position || userMetadata?.department || 'Staff',
            status: 'draft', // Always start as draft
          }
        ])
        .select()
        .single();

      if (contentError) {
        console.error('📰 CONTENT SERVICE - Error creating content:', contentError);
        return { data: null, error: contentError };
      }

      // Create targeting rules
      console.log('📰 CONTENT SERVICE - Creating targeting rules:', targeting);
      
      if (targeting && targeting.length > 0) {
        const targetingData = targeting.map(target => ({
          content_id: content.id,
          ...target
        }));

        console.log('📰 CONTENT SERVICE - Targeting data to insert:', targetingData);

        const { data: targetingResult, error: targetingError } = await supabase
          .from('content_targeting')
          .insert(targetingData)
          .select();

        if (targetingError) {
          console.error('❌ CONTENT SERVICE - Error creating targeting:', targetingError);
          console.error('❌ CONTENT SERVICE - Targeting error details:', {
            message: targetingError.message,
            code: targetingError.code,
            details: targetingError.details,
            hint: targetingError.hint
          });
          // Don't fail the whole operation, but log the error
        } else {
          console.log('✅ CONTENT SERVICE - Targeting rules created successfully:', targetingResult);
        }
      } else {
        console.log('⚠️ CONTENT SERVICE - No targeting rules provided');
      }

      console.log('📰 CONTENT SERVICE - Created content:', content.id);
      return { data: content, error: null };
    } catch (error) {
      console.error('📰 CONTENT SERVICE - Exception creating content:', error);
      return { data: null, error };
    }
  },

  // Publish content (triggers notifications)
  async publishContent(id: string): Promise<{ error: any }> {
    try {
      console.log('📰 CONTENT SERVICE - Publishing content:', id);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('📰 CONTENT SERVICE - User not authenticated');
        return { error: new Error('User not authenticated') };
      }

      console.log('📰 CONTENT SERVICE - User authenticated:', user.id);
      console.log('📰 CONTENT SERVICE - Attempting to update content table...');

      const { error } = await supabase
        .from('content')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('author_id', user.id); // Ensure user can only publish their own content

      if (error) {
        console.error('📰 CONTENT SERVICE - Error publishing content:', error);
        console.error('📰 CONTENT SERVICE - Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return { error };
      }

      console.log('📰 CONTENT SERVICE - Published content successfully:', id);
      
      // Send push notifications to targeted users
      console.log('📰 CONTENT SERVICE - Triggering push notifications...');
      try {
        // Wait a moment for the database trigger to create in-app notifications
        setTimeout(async () => {
          const result = await databaseNotificationService.sendContentNotifications(id);
          console.log('📰 CONTENT SERVICE - Push notification result:', result);
        }, 1000); // 1 second delay to ensure trigger has completed
      } catch (notificationError) {
        console.error('📰 CONTENT SERVICE - Error sending push notifications:', notificationError);
        // Don't fail the publish operation if notifications fail
      }

      return { error: null };
    } catch (error) {
      console.error('📰 CONTENT SERVICE - Exception publishing content:', error);
      return { error };
    }
  },

  // Get user's own content (staff only)
  async getMyContent(): Promise<{ data: Content[] | null; error: any }> {
    try {
      console.log('📰 CONTENT SERVICE - Getting my content...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('content')
        .select(`
          *,
          content_targeting (*)
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('📰 CONTENT SERVICE - Error getting my content:', error);
        return { data: null, error };
      }

      console.log('📰 CONTENT SERVICE - Got my content:', data.length);
      return { data, error: null };
    } catch (error) {
      console.error('📰 CONTENT SERVICE - Exception getting my content:', error);
      return { data: null, error };
    }
  },

  // Get content notifications for user
  async getContentNotifications(): Promise<{ data: ContentNotification[] | null; error: any }> {
    try {
      console.log('📰 CONTENT SERVICE - Getting content notifications...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('content_notifications')
        .select(`
          *,
          content (
            id,
            title,
            type,
            author_name
          )
        `)
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('📰 CONTENT SERVICE - Error getting notifications:', error);
        return { data: null, error };
      }

      console.log('📰 CONTENT SERVICE - Got notifications:', data.length);
      return { data, error: null };
    } catch (error) {
      console.error('📰 CONTENT SERVICE - Exception getting notifications:', error);
      return { data: null, error };
    }
  },

  // Mark notification as read
  async markNotificationRead(notificationId: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: new Error('User not authenticated') };
      }

      const { error } = await supabase
        .from('content_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      return { error };
    } catch (error) {
      console.error('📰 CONTENT SERVICE - Exception marking notification read:', error);
      return { error };
    }
  },

  // Track content interaction
  async trackInteraction(contentId: string, type: 'view' | 'like' | 'share' | 'comment'): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null; // Allow anonymous interactions

      const { error } = await supabase
        .from('content_interactions')
        .insert([
          {
            content_id: contentId,
            user_id: userId,
            interaction_type: type
          }
        ]);

      // Ignore duplicate errors (user already interacted)
      if (error && !error.message?.includes('duplicate')) {
        console.error('📰 CONTENT SERVICE - Error tracking interaction:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('📰 CONTENT SERVICE - Exception tracking interaction:', error);
      return { error };
    }
  },

  // Helper function to check if user matches targeting
  userMatchesTargeting(user: any, targeting: any): boolean {
    // FIX: Use raw_user_meta_data where Supabase actually stores the metadata
    const userMetadata = user.raw_user_meta_data || user.user_metadata || {};
    
    console.log('🎯 TARGETING CHECK:', {
      targeting_type: targeting.target_type,
      user_type: userMetadata?.user_type,
      user_faculty: userMetadata?.faculty,
      targeting_faculty: targeting.faculty,
      full_metadata: userMetadata
    });
    
    switch (targeting.target_type) {
      case 'everyone':
        console.log('✅ TARGETING: Everyone - allowing access');
        return true;
        
      case 'students':
        const isStudent = userMetadata?.user_type === 'student';
        console.log(`🎓 TARGETING: Students only - user is student: ${isStudent}`);
        return isStudent;
        
      case 'staff':
        const isStaff = userMetadata?.user_type === 'staff';
        console.log(`👨‍🏫 TARGETING: Staff only - user is staff: ${isStaff}`);
        return isStaff;
        
      case 'faculty':
        const matchesFaculty = userMetadata?.faculty === targeting.faculty;
        console.log(`🏛️ TARGETING: Faculty ${targeting.faculty} - user matches: ${matchesFaculty}`);
        return matchesFaculty;
        
      case 'department':
        const matchesDepartment = userMetadata?.department === targeting.department;
        console.log(`📚 TARGETING: Department ${targeting.department} - user matches: ${matchesDepartment}`);
        return matchesDepartment;
        
      case 'level':
        const matchesLevel = userMetadata?.level === targeting.level;
        console.log(`📈 TARGETING: Level ${targeting.level} - user matches: ${matchesLevel}`);
        return matchesLevel;
        
      case 'custom':
        const isInCustomList = targeting.custom_users?.includes(user.id);
        console.log(`👥 TARGETING: Custom users - user included: ${isInCustomList}`);
        return isInCustomList;
        
      default:
        console.log('❌ TARGETING: Unknown target type, denying access');
        return false;
    }
  }
};
