import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permission not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Campus Nav Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#667eea',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  static async scheduleClassReminder(course: Course): Promise<string | null> {
    try {
      if (!course.reminderEnabled) return null;

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      // Calculate notification time
      const notificationTime = this.calculateNotificationTime(
        course.day,
        course.startTime,
        course.reminderMinutes
      );

      if (!notificationTime || notificationTime <= new Date()) {
        console.log('Invalid notification time for course:', course.title);
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `📚 ${course.type === 'class' ? 'Class' : course.type === 'exam' ? 'Exam' : 'Deadline'} Reminder`,
          body: `${course.code} - ${course.title} ${course.type === 'class' ? 'starts' : course.type === 'exam' ? 'begins' : 'is due'} in ${course.reminderMinutes} minutes`,
          data: {
            courseId: course.id,
            courseCode: course.code,
            location: course.location,
            venueId: course.venueId,
            type: course.type,
          },
          sound: true,
          priority: Notifications.AndroidImportance.HIGH,
        },
        trigger: notificationTime,
      });

      console.log(`Scheduled reminder for ${course.title} at ${notificationTime.toISOString()}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  static async scheduleExamReminder(course: Course): Promise<string[]> {
    try {
      if (!course.reminderEnabled || !course.examDate) return [];

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return [];

      const examDate = new Date(course.examDate);
      const now = new Date();
      
      if (examDate <= now) return [];

      const notificationIds: string[] = [];

      // Schedule multiple reminders for exams
      const reminderIntervals = [
        { days: 7, label: '1 week' },
        { days: 3, label: '3 days' },
        { days: 1, label: '1 day' },
        { hours: 2, label: '2 hours' },
        { minutes: course.reminderMinutes, label: `${course.reminderMinutes} minutes` },
      ];

      for (const interval of reminderIntervals) {
        let reminderTime: Date;
        
        if (interval.days) {
          reminderTime = new Date(examDate.getTime() - (interval.days * 24 * 60 * 60 * 1000));
        } else if (interval.hours) {
          reminderTime = new Date(examDate.getTime() - (interval.hours * 60 * 60 * 1000));
        } else {
          reminderTime = new Date(examDate.getTime() - (interval.minutes! * 60 * 1000));
        }

        if (reminderTime > now) {
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `📝 Exam Alert - ${interval.label} to go!`,
              body: `${course.code} - ${course.title} exam on ${examDate.toLocaleDateString()} at ${course.startTime}`,
              data: {
                courseId: course.id,
                courseCode: course.code,
                location: course.location,
                venueId: course.venueId,
                type: 'exam',
                examDate: course.examDate,
              },
              sound: true,
              priority: Notifications.AndroidImportance.HIGH,
            },
            trigger: reminderTime,
          });
          
          notificationIds.push(notificationId);
          console.log(`Scheduled exam reminder for ${course.title} - ${interval.label} before`);
        }
      }

      return notificationIds;
    } catch (error) {
      console.error('Error scheduling exam reminders:', error);
      return [];
    }
  }

  static async scheduleDeadlineReminder(course: Course): Promise<string[]> {
    try {
      if (!course.reminderEnabled || !course.deadlineDate) return [];

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return [];

      const deadlineDate = new Date(course.deadlineDate);
      const now = new Date();
      
      if (deadlineDate <= now) return [];

      const notificationIds: string[] = [];

      // Schedule multiple reminders for deadlines
      const reminderIntervals = [
        { days: 3, label: '3 days' },
        { days: 1, label: '1 day' },
        { hours: 6, label: '6 hours' },
        { hours: 1, label: '1 hour' },
        { minutes: course.reminderMinutes, label: `${course.reminderMinutes} minutes` },
      ];

      for (const interval of reminderIntervals) {
        let reminderTime: Date;
        
        if (interval.days) {
          reminderTime = new Date(deadlineDate.getTime() - (interval.days * 24 * 60 * 60 * 1000));
        } else if (interval.hours) {
          reminderTime = new Date(deadlineDate.getTime() - (interval.hours * 60 * 60 * 1000));
        } else {
          reminderTime = new Date(deadlineDate.getTime() - (interval.minutes! * 60 * 1000));
        }

        if (reminderTime > now) {
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏰ Deadline Alert - ${interval.label} remaining!`,
              body: `${course.code} - ${course.title} deadline: ${deadlineDate.toLocaleDateString()}`,
              data: {
                courseId: course.id,
                courseCode: course.code,
                location: course.location,
                venueId: course.venueId,
                type: 'deadline',
                deadlineDate: course.deadlineDate,
              },
              sound: true,
              priority: Notifications.AndroidImportance.HIGH,
            },
            trigger: reminderTime,
          });
          
          notificationIds.push(notificationId);
          console.log(`Scheduled deadline reminder for ${course.title} - ${interval.label} before`);
        }
      }

      return notificationIds;
    } catch (error) {
      console.error('Error scheduling deadline reminders:', error);
      return [];
    }
  }

  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  static async cancelAllCourseNotifications(courseId: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.courseId === courseId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      
      console.log(`Cancelled all notifications for course: ${courseId}`);
    } catch (error) {
      console.error('Error cancelling course notifications:', error);
    }
  }

  static async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  private static calculateNotificationTime(day: string, startTime: string, minutesBefore: number): Date | null {
    try {
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const targetDayIndex = daysOfWeek.indexOf(day);
      
      if (targetDayIndex === -1) return null;

      const now = new Date();
      const currentDayIndex = now.getDay();
      
      // Calculate days until target day
      let daysUntilTarget = targetDayIndex - currentDayIndex;
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7; // Next week
      }

      // Parse start time
      const [hours, minutes] = startTime.split(':').map(Number);
      
      // Create target date
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + daysUntilTarget);
      targetDate.setHours(hours, minutes, 0, 0);
      
      // Subtract reminder minutes
      const notificationTime = new Date(targetDate.getTime() - (minutesBefore * 60 * 1000));
      
      return notificationTime;
    } catch (error) {
      console.error('Error calculating notification time:', error);
      return null;
    }
  }

  static async scheduleAllReminders(course: Course): Promise<string[]> {
    const notificationIds: string[] = [];

    try {
      if (course.type === 'class') {
        const id = await this.scheduleClassReminder(course);
        if (id) notificationIds.push(id);
      } else if (course.type === 'exam') {
        const ids = await this.scheduleExamReminder(course);
        notificationIds.push(...ids);
      } else if (course.type === 'deadline') {
        const ids = await this.scheduleDeadlineReminder(course);
        notificationIds.push(...ids);
      }
    } catch (error) {
      console.error('Error scheduling all reminders:', error);
    }

    return notificationIds;
  }
}

// Export helper functions for use in components
export const scheduleNotificationsForCourse = async (course: Course): Promise<string[]> => {
  return await NotificationService.scheduleAllReminders(course);
};

export const cancelNotificationsForCourse = async (courseId: string): Promise<void> => {
  await NotificationService.cancelAllCourseNotifications(courseId);
};

export const requestNotificationPermissions = async (): Promise<boolean> => {
  return await NotificationService.requestPermissions();
};
