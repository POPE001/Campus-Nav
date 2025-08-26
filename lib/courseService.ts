import { supabase } from './supabase';
import { databaseNotificationService } from './notificationService';

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
  color: string;
  type: 'class' | 'exam' | 'deadline';
  description?: string;
  reminder_enabled: boolean;
  reminder_minutes: number;
  exam_date?: string;
  deadline_date?: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCourseData {
  title: string;
  code: string;
  instructor: string;
  location: string;
  venue_id?: string;
  day: string;
  start_time: string;
  end_time: string;
  color: string;
  type: 'class' | 'exam' | 'deadline';
  description?: string;
  reminder_enabled: boolean;
  reminder_minutes: number;
  exam_date?: string | null;
  deadline_date?: string | null;
}

export const courseService = {
  // Get all courses for the current user
  async getCourses(): Promise<{ data: Course[] | null; error: any }> {
    try {
      console.log('📚 COURSE SERVICE - Getting courses...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id)
        .order('day', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('📚 COURSE SERVICE - Error getting courses:', error);
        return { data: null, error };
      }

      console.log('📚 COURSE SERVICE - Got courses:', data?.length || 0);
      return { data, error: null };
    } catch (error) {
      console.error('📚 COURSE SERVICE - Exception getting courses:', error);
      return { data: null, error };
    }
  },

  // Create a new course
  async createCourse(courseData: CreateCourseData): Promise<{ data: Course | null; error: any }> {
    try {
      console.log('📚 COURSE SERVICE - Creating course:', courseData.title);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Clean up empty date strings to null
      const cleanedData = {
        ...courseData,
        exam_date: courseData.exam_date && courseData.exam_date.trim() !== '' ? courseData.exam_date : null,
        deadline_date: courseData.deadline_date && courseData.deadline_date.trim() !== '' ? courseData.deadline_date : null,
      };

      const { data, error } = await supabase
        .from('courses')
        .insert([
          {
            ...cleanedData,
            id: `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: user.id,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('📚 COURSE SERVICE - Error creating course:', error);
        return { data: null, error };
      }

      console.log('📚 COURSE SERVICE - Created course:', data.id);
      
      // Schedule notifications for the new course
      if (data.reminder_enabled) {
        console.log('📚 COURSE SERVICE - Scheduling notifications for course:', data.title);
        await databaseNotificationService.scheduleNotificationForCourse(data);
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('📚 COURSE SERVICE - Exception creating course:', error);
      return { data: null, error };
    }
  },

  // Update an existing course
  async updateCourse(id: string, courseData: Partial<CreateCourseData>): Promise<{ data: Course | null; error: any }> {
    try {
      console.log('📚 COURSE SERVICE - Updating course:', id);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Clean up empty date strings to null
      const cleanedData = {
        ...courseData,
        exam_date: courseData.exam_date && courseData.exam_date.trim() !== '' ? courseData.exam_date : null,
        deadline_date: courseData.deadline_date && courseData.deadline_date.trim() !== '' ? courseData.deadline_date : null,
      };

      const { data, error } = await supabase
        .from('courses')
        .update({
          ...cleanedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user can only update their own courses
        .select()
        .single();

      if (error) {
        console.error('📚 COURSE SERVICE - Error updating course:', error);
        return { data: null, error };
      }

      console.log('📚 COURSE SERVICE - Updated course:', data.id);
      
      // Cancel existing notifications and reschedule if needed
      console.log('📚 COURSE SERVICE - Updating notifications for course:', data.title);
      await databaseNotificationService.cancelNotificationsForCourse(data.id);
      
      if (data.reminder_enabled) {
        await databaseNotificationService.scheduleNotificationForCourse(data);
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('📚 COURSE SERVICE - Exception updating course:', error);
      return { data: null, error };
    }
  },

  // Delete a course
  async deleteCourse(id: string): Promise<{ error: any }> {
    try {
      console.log('📚 COURSE SERVICE - Deleting course:', id);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: new Error('User not authenticated') };
      }

      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user can only delete their own courses

      if (error) {
        console.error('📚 COURSE SERVICE - Error deleting course:', error);
        return { error };
      }

      console.log('📚 COURSE SERVICE - Deleted course:', id);
      
      // Cancel all notifications for the deleted course
      console.log('📚 COURSE SERVICE - Cancelling notifications for deleted course:', id);
      await databaseNotificationService.cancelNotificationsForCourse(id);
      
      return { error: null };
    } catch (error) {
      console.error('📚 COURSE SERVICE - Exception deleting course:', error);
      return { error };
    }
  },

  // Get courses by day
  async getCoursesByDay(day: string): Promise<{ data: Course[] | null; error: any }> {
    try {
      console.log('📚 COURSE SERVICE - Getting courses for day:', day);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id)
        .eq('day', day)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('📚 COURSE SERVICE - Error getting courses by day:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('📚 COURSE SERVICE - Exception getting courses by day:', error);
      return { data: null, error };
    }
  },

  // Initialize with sample data for new users
  async initializeSampleData(): Promise<{ error: any }> {
    try {
      console.log('📚 COURSE SERVICE - Initializing sample data...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: new Error('User not authenticated') };
      }

      // Check if user already has courses
      const { data: existingCourses } = await this.getCourses();
      if (existingCourses && existingCourses.length > 0) {
        console.log('📚 COURSE SERVICE - User already has courses, skipping sample data');
        return { error: null };
      }

      // Get user type to determine appropriate sample data
      const userMetadata = user.user_metadata;
      const userType = userMetadata?.user_type || 'student';
      
      console.log('📚 COURSE SERVICE - Creating sample data for user type:', userType);

      let sampleCourses: CreateCourseData[] = [];

      if (userType === 'staff') {
        // Staff teaching schedule
        sampleCourses = [
          {
            title: 'Introduction to Programming',
            code: 'CSC 101',
            instructor: user.email?.split('@')[0] || 'You',
            location: 'Computer Laboratory 1',
            venue_id: 'science',
            day: 'Monday',
            start_time: '09:00',
            end_time: '11:00',
            color: '#667eea',
            type: 'class',
            description: 'Teaching programming fundamentals to first-year students',
            reminder_enabled: true,
            reminder_minutes: 30,
          },
          {
            title: 'Advanced Mathematics',
            code: 'MTH 301',
            instructor: user.email?.split('@')[0] || 'You',
            location: 'Lecture Hall A',
            venue_id: 'science',
            day: 'Wednesday',
            start_time: '14:00',
            end_time: '16:00',
            color: '#764ba2',
            type: 'class',
            description: 'Advanced calculus and linear algebra',
            reminder_enabled: true,
            reminder_minutes: 30,
          },
          {
            title: 'Faculty Meeting',
            code: 'ADMIN',
            instructor: 'Dean Office',
            location: 'Conference Room',
            venue_id: 'admin',
            day: 'Friday',
            start_time: '10:00',
            end_time: '11:00',
            color: '#f093fb',
            type: 'class',
            description: 'Monthly faculty meeting',
            reminder_enabled: true,
            reminder_minutes: 15,
          }
        ];
      } else {
        // Student course schedule
        sampleCourses = [
          {
            title: 'Computer Science 101',
            code: 'CSC 101',
            instructor: 'Dr. Smith',
            location: 'Computer Laboratory 1',
            venue_id: 'science',
            day: 'Monday',
            start_time: '09:00',
            end_time: '11:00',
            color: '#667eea',
            type: 'class',
            description: 'Introduction to programming concepts',
            reminder_enabled: true,
            reminder_minutes: 15,
          },
          {
            title: 'Mathematics Midterm',
            code: 'MTH 201',
            instructor: 'Prof. Johnson',
            location: 'Science Amphitheatre',
            venue_id: 'science',
            day: 'Tuesday',
            start_time: '10:00',
            end_time: '12:00',
            color: '#764ba2',
            type: 'exam',
            description: 'Calculus and algebra midterm examination',
            reminder_enabled: true,
            reminder_minutes: 30,
            exam_date: '2024-12-15',
          },
          {
            title: 'Physics Lab',
            code: 'PHY 301',
            instructor: 'Dr. Brown',
            location: 'Physics Laboratory 1',
            venue_id: 'science',
            day: 'Wednesday',
            start_time: '14:00',
            end_time: '16:00',
            color: '#f093fb',
            type: 'class',
            description: 'Experimental physics and data analysis',
            reminder_enabled: true,
            reminder_minutes: 10,
          }
        ];
      }

      // Insert sample courses
      for (const course of sampleCourses) {
        await this.createCourse(course);
      }

      console.log('📚 COURSE SERVICE - Sample data initialized for', userType);
      return { error: null };
    } catch (error) {
      console.error('📚 COURSE SERVICE - Exception initializing sample data:', error);
      return { error };
    }
  }
};
