import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { NavigationModal } from '@/components/NavigationModal';
import { setGlobalNavigationHandler } from '@/services/NavigationService';
import { SplashScreen as CustomSplashScreen } from '@/components/SplashScreen';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [navigationModalVisible, setNavigationModalVisible] = useState(false);
  const [navigationTargetVenueId, setNavigationTargetVenueId] = useState<string>('');
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const [appIsReady, setAppIsReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function prepare() {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        // Set up global navigation handler
        setGlobalNavigationHandler((venueId: string) => {
          setNavigationTargetVenueId(venueId);
          setNavigationModalVisible(true);
        });

        // Simulate loading time for a more natural feel
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const authScreens = ['user-type', 'login', 'signup', 'student-signup', 'staff-signup', 'complete-profile'];
    const inTabsGroup = segments[0] === '(tabs)';
    const currentScreen = segments[0];

    console.log('🏗️ ROOT LAYOUT - Auth effect triggered:', { session: !!session, segments, inAuthGroup, inTabsGroup, currentScreen });

    // If user has a session and is in any auth-related screen, go to main app
    if (session && (inAuthGroup || authScreens.includes(currentScreen))) {
      console.log('🏗️ ROOT LAYOUT - Redirecting authenticated user from auth screen to tabs');
      router.replace('/(tabs)');
    } 
    // If no session and not in allowed screens or tabs, redirect to user selection
    else if (!session && !authScreens.includes(currentScreen) && !inTabsGroup) {
      console.log('🏗️ ROOT LAYOUT - Redirecting unauthenticated user to user-type');
      router.replace('/user-type');
    }
    // Allow navigation within tabs for both authenticated and unauthenticated users
  }, [session, segments]);

  const handleCloseNavigation = () => {
    setNavigationModalVisible(false);
    setNavigationTargetVenueId('');
  };

  const handleSplashAnimationComplete = () => {
    setShowCustomSplash(false);
  };

  // Show custom splash screen if app is not ready or splash is showing
  if (!appIsReady || showCustomSplash) {
    return (
      <CustomSplashScreen onAnimationComplete={handleSplashAnimationComplete} />
    );
  }

  return (
    <>
      {children}
      <NavigationModal
        visible={navigationModalVisible}
        targetVenueId={navigationTargetVenueId}
        onClose={handleCloseNavigation}
      />
    </>
  );
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="user-type" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="student-signup" options={{ headerShown: false }} />
        <Stack.Screen name="staff-signup" options={{ headerShown: false }} />
        <Stack.Screen name="complete-profile" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
