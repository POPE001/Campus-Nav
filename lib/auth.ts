import { makeRedirectUri, startAsync, ResponseType } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

export const signInWithGoogle = async () => {
  try {
    // Create a redirect URI
    const redirectUri = makeRedirectUri({
      scheme: 'campusnav',
      path: '/auth/callback',
    });

    console.log('Login Redirect URI:', redirectUri);

    // Get the OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw error;
    }

    // Open the OAuth URL in browser
    if (data?.url) {
      console.log('Opening OAuth URL:', data.url);
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      console.log('OAuth result:', result);

      if (result.type === 'success') {
        // Extract tokens from URL
        const url = result.url;
        const urlParams = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
        
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set the session
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            throw sessionError;
          }

          return { data: sessionData, error: null };
        }
      }
    }

    return { data: null, error: new Error('OAuth flow was cancelled or failed') };
  } catch (error) {
    console.error('Google OAuth error:', error);
    return { data: null, error };
  }
};

export const signUpWithGoogle = async (userType: 'student' | 'staff') => {
  try {
    const redirectUri = makeRedirectUri({
      scheme: 'campusnav',
      path: `/complete-profile?userType=${userType}`,
    });

    console.log('Signup Redirect URI:', redirectUri);

    // Get the OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw error;
    }

    // Open the OAuth URL in browser
    if (data?.url) {
      console.log('Opening OAuth URL:', data.url);
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      console.log('OAuth result:', result);

      if (result.type === 'success') {
        // Extract tokens from URL
        const url = result.url;
        const urlParams = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
        
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set the session
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            throw sessionError;
          }

          // Store user type for profile completion
          if (sessionData.user) {
            await supabase.from('user_profiles').upsert({
              id: sessionData.user.id,
              user_type: userType,
              email: sessionData.user.email,
              full_name: sessionData.user.user_metadata?.full_name,
            });
          }

          return { data: sessionData, error: null, userType };
        }
      }
    }

    return { data: null, error: new Error('OAuth flow was cancelled or failed') };
  } catch (error) {
    console.error('Google OAuth signup error:', error);
    return { data: null, error };
  }
};
