import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const { access_token, refresh_token, type } = useLocalSearchParams();

  useEffect(() => {
    if (access_token && refresh_token) {
      // Set the session from the OAuth callback
      supabase.auth.setSession({
        access_token: access_token as string,
        refresh_token: refresh_token as string,
      }).then(({ data, error }) => {
        if (error) {
          console.error('Error setting session:', error);
          router.replace('/login');
        } else {
          console.log('Session set successfully:', data);
          // The AuthProvider will handle navigation based on the session
          router.replace('/(tabs)');
        }
      });
    } else {
      console.log('No tokens received, redirecting to login');
      router.replace('/login');
    }
  }, [access_token, refresh_token, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#667eea" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
