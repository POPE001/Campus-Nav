import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface DatabaseNotification {
  id: string;
  user_id: string;
  course_id?: string;
  notification_id: string; // Expo notification ID
  title: string;
  body: string;
  type: 'class_reminder' | 'exam_reminder' | 'deadline_reminder' | 'content_notification' | 'custom';
  status: 'scheduled' | 'delivered' | 'cancelled' | 'failed';
  scheduled_for: string; // ISO date string
  delivered_at?: string;
  data?: any; // JSON data
  created_at?: string;
  updated_at?: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  enabled: boolean;
  class_reminders_enabled: boolean;
  exam_reminders_enabled: boolean;
  deadline_reminders_enabled: boolean;
  default_reminder_minutes: number;
  quiet_hours_start?: string; // HH:MM format
  quiet_hours_end?: string;   // HH:MM format
  weekend_notifications: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Course {
  id: string;
  title: string;
  code: string;
  instructor: string;
  location: string;
  venue_id?: string;
  day: string;
  start_time: string;
  end_time: string;
  type: 'class' | 'exam' | 'deadline';
  reminder_enabled: boolean;
  reminder_minutes: number;
  exam_date?: string;
  deadline_date?: string;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const databaseNotificationService = {
  // Initialize notification permissions and settings
  async initialize(): Promise<boolean> {
    try {
      console.log('🔔 NOTIFICATION SERVICE - Initializing...');
      
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('🔔 NOTIFICATION SERVICE - Permission denied');
        return false;
      }

      // Ensure user has notification settings
      await this.ensureUserSettings();
      
      // Register push token for push notifications
      await this.registerPushToken();
      
      console.log('🔔 NOTIFICATION SERVICE - Initialized successfully');
      return true;
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Initialization error:', error);
      return false;
    }
  },

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('🔔 NOTIFICATION SERVICE - Permission not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'My OAU Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#667eea',
        });
      }

      return true;
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Permission error:', error);
      return false;
    }
  },

  // Ensure user has notification settings
  async ensureUserSettings(): Promise<NotificationSettings | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if settings exist
      let { data: settings, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Settings don't exist, create default ones
        const { data: newSettings, error: insertError } = await supabase
          .from('notification_settings')
          .insert([{
            user_id: user.id,
            enabled: true,
            class_reminders_enabled: true,
            exam_reminders_enabled: true,
            deadline_reminders_enabled: true,
            default_reminder_minutes: 15,
            weekend_notifications: false,
          }])
          .select()
          .single();

        if (insertError) {
          console.error('🔔 NOTIFICATION SERVICE - Error creating settings:', insertError);
          return null;
        }

        settings = newSettings;
        console.log('🔔 NOTIFICATION SERVICE - Created default settings');
      } else if (error) {
        console.error('🔔 NOTIFICATION SERVICE - Error getting settings:', error);
        return null;
      }

      return settings;
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Exception ensuring settings:', error);
      return null;
    }
  },

  // Get user notification settings
  async getSettings(): Promise<NotificationSettings | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('🔔 NOTIFICATION SERVICE - Error getting settings:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Exception getting settings:', error);
      return null;
    }
  },

  // Update notification settings
  async updateSettings(settings: Partial<NotificationSettings>): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('notification_settings')
        .update(settings)
        .eq('user_id', user.id);

      if (error) {
        console.error('🔔 NOTIFICATION SERVICE - Error updating settings:', error);
        return false;
      }

      console.log('🔔 NOTIFICATION SERVICE - Settings updated');
      return true;
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Exception updating settings:', error);
      return false;
    }
  },

  // Schedule a notification for a course
  async scheduleNotificationForCourse(course: Course): Promise<string[]> {
    try {
      console.log('🔔 NOTIFICATION SERVICE - Scheduling notification for:', course.title);

      if (!course.reminder_enabled) {
        console.log('🔔 NOTIFICATION SERVICE - Reminders disabled for course');
        return [];
      }

      const settings = await this.getSettings();
      if (!settings || !settings.enabled) {
        console.log('🔔 NOTIFICATION SERVICE - Notifications disabled in settings');
        return [];
      }

      // Check if this type of notification is enabled
      const typeEnabled = 
        (course.type === 'class' && settings.class_reminders_enabled) ||
        (course.type === 'exam' && settings.exam_reminders_enabled) ||
        (course.type === 'deadline' && settings.deadline_reminders_enabled);

      if (!typeEnabled) {
        console.log('🔔 NOTIFICATION SERVICE - This type of notification is disabled');
        return [];
      }

      const notificationIds: string[] = [];

      if (course.type === 'class') {
        const id = await this.scheduleClassReminder(course);
        if (id) notificationIds.push(id);
      } else if (course.type === 'exam' && course.exam_date) {
        const ids = await this.scheduleExamReminders(course);
        notificationIds.push(...ids);
      } else if (course.type === 'deadline' && course.deadline_date) {
        const ids = await this.scheduleDeadlineReminders(course);
        notificationIds.push(...ids);
      }

      console.log('🔔 NOTIFICATION SERVICE - Scheduled notifications:', notificationIds.length);
      return notificationIds;
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Error scheduling notifications:', error);
      return [];
    }
  },

  // Schedule weekly class reminder
  async scheduleClassReminder(course: Course): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Calculate next occurrence of this class
      const notificationTime = this.calculateNextClassTime(course.day, course.start_time, course.reminder_minutes);
      if (!notificationTime || notificationTime <= new Date()) {
        console.log('🔔 NOTIFICATION SERVICE - Invalid notification time for class');
        return null;
      }

      // Schedule the notification with Expo
      const expoNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `📚 Class Reminder`,
          body: `${course.code} - ${course.title} starts in ${course.reminder_minutes} minutes`,
          data: {
            courseId: course.id,
            courseCode: course.code,
            location: course.location,
            venueId: course.venue_id,
            type: 'class_reminder',
          },
          sound: true,
          priority: 'high',
        },
        trigger: null, // Immediate notification
      });

      // Save to database
      const dbNotification: Omit<DatabaseNotification, 'created_at' | 'updated_at'> = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        course_id: course.id,
        notification_id: expoNotificationId,
        title: '📚 Class Reminder',
        body: `${course.code} - ${course.title} starts in ${course.reminder_minutes} minutes`,
        type: 'class_reminder',
        status: 'scheduled',
        scheduled_for: notificationTime.toISOString(),
        data: {
          courseCode: course.code,
          location: course.location,
          venueId: course.venue_id,
        },
      };

      const { error } = await supabase
        .from('notifications')
        .insert([dbNotification]);

      if (error) {
        console.error('🔔 NOTIFICATION SERVICE - Error saving notification to DB:', error);
        // Cancel the expo notification if DB save failed
        await Notifications.cancelScheduledNotificationAsync(expoNotificationId);
        return null;
      }

      console.log('🔔 NOTIFICATION SERVICE - Class reminder scheduled for:', notificationTime.toISOString());
      return dbNotification.id;
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Error scheduling class reminder:', error);
      return null;
    }
  },

  // Schedule exam reminders (24h and 1h before)
  async scheduleExamReminders(course: Course): Promise<string[]> {
    try {
      if (!course.exam_date) return [];

      const examDate = new Date(course.exam_date + 'T' + course.start_time);
      const now = new Date();
      const notificationIds: string[] = [];

      // 24 hour reminder
      const dayBeforeTime = new Date(examDate.getTime() - 24 * 60 * 60 * 1000);
      if (dayBeforeTime > now) {
        const id = await this.scheduleSpecificNotification({
          title: '⚠️ Exam Tomorrow',
          body: `${course.code} exam is tomorrow at ${course.start_time}`,
          scheduledFor: dayBeforeTime,
          course: course,
          type: 'exam_reminder',
        });
        if (id) notificationIds.push(id);
      }

      // 1 hour reminder
      const hourBeforeTime = new Date(examDate.getTime() - course.reminder_minutes * 60 * 1000);
      if (hourBeforeTime > now) {
        const id = await this.scheduleSpecificNotification({
          title: '🎯 Exam Soon',
          body: `${course.code} exam starts in ${course.reminder_minutes} minutes`,
          scheduledFor: hourBeforeTime,
          course: course,
          type: 'exam_reminder',
        });
        if (id) notificationIds.push(id);
      }

      return notificationIds;
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Error scheduling exam reminders:', error);
      return [];
    }
  },

  // Schedule deadline reminders (24h and 2h before)
  async scheduleDeadlineReminders(course: Course): Promise<string[]> {
    try {
      if (!course.deadline_date) return [];

      const deadlineDate = new Date(course.deadline_date + 'T23:59:59');
      const now = new Date();
      const notificationIds: string[] = [];

      // 24 hour reminder
      const dayBeforeTime = new Date(deadlineDate.getTime() - 24 * 60 * 60 * 1000);
      if (dayBeforeTime > now) {
        const id = await this.scheduleSpecificNotification({
          title: '📝 Deadline Tomorrow',
          body: `${course.code} - ${course.title} is due tomorrow`,
          scheduledFor: dayBeforeTime,
          course: course,
          type: 'deadline_reminder',
        });
        if (id) notificationIds.push(id);
      }

      // 2 hour reminder
      const hoursBeforeTime = new Date(deadlineDate.getTime() - 2 * 60 * 60 * 1000);
      if (hoursBeforeTime > now) {
        const id = await this.scheduleSpecificNotification({
          title: '⏰ Deadline Soon',
          body: `${course.code} - ${course.title} is due in 2 hours`,
          scheduledFor: hoursBeforeTime,
          course: course,
          type: 'deadline_reminder',
        });
        if (id) notificationIds.push(id);
      }

      return notificationIds;
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Error scheduling deadline reminders:', error);
      return [];
    }
  },

  // Helper to schedule a specific notification
  async scheduleSpecificNotification(params: {
    title: string;
    body: string;
    scheduledFor: Date;
    course: Course;
    type: 'class_reminder' | 'exam_reminder' | 'deadline_reminder';
  }): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Schedule with Expo
      const expoNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: params.title,
          body: params.body,
          data: {
            courseId: params.course.id,
            courseCode: params.course.code,
            location: params.course.location,
            venueId: params.course.venue_id,
            type: params.type,
          },
          sound: true,
          priority: 'high',
        },
        trigger: null, // Immediate notification
      });

      // Save to database
      const dbNotification: Omit<DatabaseNotification, 'created_at' | 'updated_at'> = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        course_id: params.course.id,
        notification_id: expoNotificationId,
        title: params.title,
        body: params.body,
        type: params.type,
        status: 'scheduled',
        scheduled_for: params.scheduledFor.toISOString(),
        data: {
          courseCode: params.course.code,
          location: params.course.location,
          venueId: params.course.venue_id,
        },
      };

      const { error } = await supabase
        .from('notifications')
        .insert([dbNotification]);

      if (error) {
        console.error('🔔 NOTIFICATION SERVICE - Error saving notification:', error);
        await Notifications.cancelScheduledNotificationAsync(expoNotificationId);
        return null;
      }

      return dbNotification.id;
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Error scheduling specific notification:', error);
      return null;
    }
  },

  // Cancel all notifications for a course
  async cancelNotificationsForCourse(courseId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Get all scheduled notifications for this course
      const { data: notifications, error: selectError } = await supabase
        .from('notifications')
        .select('notification_id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('status', 'scheduled');

      if (selectError) {
        console.error('🔔 NOTIFICATION SERVICE - Error getting notifications to cancel:', selectError);
        return false;
      }

      // Cancel each notification with Expo
      for (const notification of notifications || []) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notification.notification_id);
        } catch (error) {
          console.error('🔔 NOTIFICATION SERVICE - Error cancelling expo notification:', error);
        }
      }

      // Update status in database
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('status', 'scheduled');

      if (updateError) {
        console.error('🔔 NOTIFICATION SERVICE - Error updating notification status:', updateError);
        return false;
      }

      console.log('🔔 NOTIFICATION SERVICE - Cancelled notifications for course:', courseId);
      return true;
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Error cancelling course notifications:', error);
      return false;
    }
  },

  // Get user's notifications
  async getUserNotifications(limit: number = 50): Promise<DatabaseNotification[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('🔔 NOTIFICATION SERVICE - Error getting notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Exception getting notifications:', error);
      return [];
    }
  },

  // Calculate next class time
  calculateNextClassTime(day: string, startTime: string, minutesBefore: number): Date | null {
    try {
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const targetDayIndex = daysOfWeek.indexOf(day);
      
      if (targetDayIndex === -1) return null;

      const now = new Date();
      const currentDayIndex = now.getDay();
      
      // Calculate days until next occurrence
      let daysUntil = targetDayIndex - currentDayIndex;
      if (daysUntil <= 0) {
        daysUntil += 7; // Next week
      }

      // Create the target date
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + daysUntil);
      
      // Set the time
      const [hours, minutes] = startTime.split(':').map(Number);
      targetDate.setHours(hours, minutes, 0, 0);
      
      // Subtract reminder minutes
      const notificationTime = new Date(targetDate.getTime() - minutesBefore * 60 * 1000);
      
      return notificationTime;
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Error calculating class time:', error);
      return null;
    }
  },

  // Send immediate push notification (for content posts)
  async sendImmediatePushNotification(params: {
    title: string;
    body: string;
    data?: any;
    userIds: string[];
  }): Promise<{ successCount: number; errorCount: number }> {
    try {
      console.log('🔔 NOTIFICATION SERVICE - Sending immediate push notifications to', params.userIds.length, 'users');
      
      let successCount = 0;
      let errorCount = 0;

      // Send notifications to each user
      for (const userId of params.userIds) {
        try {
          // Get user's push token
          const { data: pushTokenData } = await supabase
            .from('user_profiles')
            .select('push_token')
            .eq('id', userId)
            .single();

          if (!pushTokenData?.push_token) {
            console.log('🔔 NOTIFICATION SERVICE - No push token for user:', userId);
            errorCount++;
            continue;
          }

          // Send push notification via Expo
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: pushTokenData.push_token,
              title: params.title,
              body: params.body,
              data: params.data,
              sound: 'default',
              priority: 'high',
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.data?.[0]?.status === 'ok') {
              successCount++;
              console.log('✅ NOTIFICATION SERVICE - Push notification sent successfully to user:', userId);
              
              // Save to database for tracking
              const dbNotification: Omit<DatabaseNotification, 'created_at' | 'updated_at'> = {
                id: `content_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                user_id: userId,
                notification_id: result.data[0].id || '',
                title: params.title,
                body: params.body,
                type: 'content_notification',
                status: 'delivered',
                scheduled_for: new Date().toISOString(),
                delivered_at: new Date().toISOString(),
                data: params.data,
              };

              await supabase
                .from('notifications')
                .insert([dbNotification]);
            } else {
              console.error('❌ NOTIFICATION SERVICE - Push notification failed:', result.data?.[0]);
              errorCount++;
            }
          } else {
            console.error('❌ NOTIFICATION SERVICE - HTTP error sending push notification:', response.status);
            errorCount++;
          }
        } catch (userError) {
          console.error('❌ NOTIFICATION SERVICE - Error sending to user', userId, ':', userError);
          errorCount++;
        }
      }

      console.log('📊 NOTIFICATION SERVICE - Push notification summary:', { successCount, errorCount });
      return { successCount, errorCount };
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Error in sendImmediatePushNotification:', error);
      return { successCount: 0, errorCount: params.userIds.length };
    }
  },

  // Send content notifications when staff publish posts
  async sendContentNotifications(contentId: string): Promise<{ successCount: number; errorCount: number }> {
    try {
      console.log('📰 NOTIFICATION SERVICE - Sending content notifications for:', contentId);

      // Get content notifications from database (created by trigger)
      const { data: notifications, error } = await supabase
        .from('content_notifications')
        .select(`
          *,
          content:content_id (
            title,
            excerpt,
            type,
            priority
          )
        `)
        .eq('content_id', contentId)
        .is('read_at', null); // Only unread notifications

      if (error) {
        console.error('📰 NOTIFICATION SERVICE - Error fetching content notifications:', error);
        return { successCount: 0, errorCount: 0 };
      }

      if (!notifications || notifications.length === 0) {
        console.log('📰 NOTIFICATION SERVICE - No notifications to send');
        return { successCount: 0, errorCount: 0 };
      }

      // Group notifications by content to avoid duplicate API calls
      const contentData = notifications[0].content;
      const userIds = notifications.map(n => n.user_id);

      // Prepare notification content
      const pushTitle = notifications[0].title;
      const pushBody = notifications[0].message;
      const pushData = {
        type: 'content',
        contentId: contentId,
        contentType: contentData.type,
        priority: contentData.priority,
      };

      // Send push notifications
      return await this.sendImmediatePushNotification({
        title: pushTitle,
        body: pushBody,
        data: pushData,
        userIds: userIds,
      });
    } catch (error) {
      console.error('📰 NOTIFICATION SERVICE - Error in sendContentNotifications:', error);
      return { successCount: 0, errorCount: 0 };
    }
  },

  // Register push token for current user
  async registerPushToken(): Promise<boolean> {
    try {
      console.log('🔔 NOTIFICATION SERVICE - Registering push token...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('🔔 NOTIFICATION SERVICE - No authenticated user');
        return false;
      }

      // Get the push notification token
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('🔔 NOTIFICATION SERVICE - Push notifications not granted');
        return false;
      }

      // Try to get push token with proper error handling
      let token;
      try {
        token = await Notifications.getExpoPushTokenAsync({
          projectId: '3e122c4a-19fa-4207-8df5-072328c3b00a',
        });
      } catch (tokenError: any) {
        if (tokenError.message?.includes('Firebase')) {
          console.log('🔔 NOTIFICATION SERVICE - Firebase not configured for development build');
          console.log('💡 TIP: Use "npx expo start" and scan QR with Expo Go app for push notifications in development');
          return false;
        }
        throw tokenError;
      }

      if (!token?.data) {
        console.log('🔔 NOTIFICATION SERVICE - Failed to get push token');
        return false;
      }

      console.log('🔔 NOTIFICATION SERVICE - Got push token:', token.data);

      // Update user's push token in database
      const { error } = await supabase.rpc('update_user_push_token', {
        user_id_param: user.id,
        push_token_param: token.data,
      });

      if (error) {
        console.error('🔔 NOTIFICATION SERVICE - Error updating push token:', error);
        return false;
      }

      console.log('✅ NOTIFICATION SERVICE - Push token registered successfully');
      return true;
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Error registering push token:', error);
      return false;
    }
  },

  // Clear push token (when user logs out or revokes permissions)
  async clearPushToken(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.rpc('clear_user_push_token', {
        user_id_param: user.id,
      });

      if (error) {
        console.error('🔔 NOTIFICATION SERVICE - Error clearing push token:', error);
        return false;
      }

      console.log('✅ NOTIFICATION SERVICE - Push token cleared successfully');
      return true;
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Error clearing push token:', error);
      return false;
    }
  },

  // Cleanup old notifications
  async cleanupOldNotifications(): Promise<void> {
    try {
      const { error } = await supabase.rpc('cleanup_old_notifications');
      if (error) {
        console.error('🔔 NOTIFICATION SERVICE - Error cleaning up notifications:', error);
      } else {
        console.log('🔔 NOTIFICATION SERVICE - Old notifications cleaned up');
      }
    } catch (error) {
      console.error('🔔 NOTIFICATION SERVICE - Exception cleaning up notifications:', error);
    }
  },
};
