import Timetable from '@/components/Timetable';
import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ScheduleScreen() {
  useEffect(() => {
    console.log('📅 SCHEDULE SCREEN - Component mounted/rendered');
  }, []);

  console.log('📅 SCHEDULE SCREEN - Render called');
  
  return (
    <Timetable />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});
