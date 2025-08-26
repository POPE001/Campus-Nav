import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
  Dimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface TabItemProps {
  label: string;
  iconName: string;
  iconNameFocused: string;
  isFocused: boolean;
  onPress: () => void;
  color: string;
  theme: any;
}

function TabItem({ label, iconName, iconNameFocused, isFocused, onPress, color, theme }: TabItemProps) {
  return (
    <TouchableOpacity
      style={[styles.tabItem, isFocused && styles.tabItemFocused]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, isFocused && styles.iconContainerFocused]}>
        <Ionicons
          name={isFocused ? iconNameFocused as any : iconName as any}
          size={isFocused ? 26 : 24}
          color={isFocused ? '#ffffff' : color}
        />
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: isFocused ? theme.primary : color },
          isFocused && styles.tabLabelFocused,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { isDark, theme } = useTheme();
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userType: null as string | null,
    isLoading: true,
  });

  useEffect(() => {
    // Check authentication status and user type
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('CustomTabBar - Session check:', { session, error });
        
        if (session?.user) {
          console.log('CustomTabBar - User found:', session.user);
          
          // Get user type from user metadata
          const userMetadata = session.user.user_metadata;
          const detectedUserType = userMetadata?.user_type || 'visitor';
          
          console.log('CustomTabBar - User metadata:', userMetadata);
          console.log('CustomTabBar - User type determined:', detectedUserType);
          console.log('CustomTabBar - Setting authenticated state:', true);
          
          // Set all states together in one update
          setAuthState({
            isAuthenticated: true,
            userType: detectedUserType,
            isLoading: false,
          });
        } else {
          console.log('CustomTabBar - No user session found');
          setAuthState({
            isAuthenticated: false,
            userType: 'visitor',
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('CustomTabBar - Error checking auth:', error);
        setAuthState({
          isAuthenticated: false,
          userType: 'visitor',
          isLoading: false,
        });
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('CustomTabBar - Auth state change:', _event, session?.user?.email);
      
      if (session?.user) {
        // Get user type from user metadata
        const userMetadata = session.user.user_metadata;
        const detectedUserType = userMetadata?.user_type || 'visitor';
        
        console.log('CustomTabBar - Auth change - User metadata:', userMetadata);
        console.log('CustomTabBar - Auth change - User type:', detectedUserType);
        
        // Set all states together in one update
        setAuthState({
          isAuthenticated: true,
          userType: detectedUserType,
          isLoading: false,
        });
      } else {
        console.log('CustomTabBar - Auth change - No user');
        setAuthState({
          isAuthenticated: false,
          userType: 'visitor',
          isLoading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Define tabs based on user authentication and type - memoized to reduce re-renders
  const visibleTabs = useMemo(() => {
    console.log('CustomTabBar - getVisibleTabs called with:', authState);
    
    // All tabs that exist in the layout
    const allTabs = [
      {
        key: 'index',
        label: 'Map',
        iconName: 'map-outline',
        iconNameFocused: 'map',
        route: 'index',
      },
      {
        key: 'schedule',
        label: 'Schedule',
        iconName: 'calendar-outline',
        iconNameFocused: 'calendar',
        route: 'schedule',
      },
      {
        key: 'notifications',
        label: 'Notifications',
        iconName: 'notifications-outline',
        iconNameFocused: 'notifications',
        route: 'notifications',
      },
      {
        key: 'profile',
        label: 'Profile',
        iconName: 'person-outline',
        iconNameFocused: 'person',
        route: 'profile',
      },
      {
        key: 'settings',
        label: 'Settings',
        iconName: 'settings-outline',
        iconNameFocused: 'settings',
        route: 'settings',
      },
    ];

    // Only show Schedule, Notifications, Profile, and Settings for authenticated users (students and staff)
    const shouldShowExtraTabs = authState.isAuthenticated && authState.userType !== 'visitor';
    console.log('CustomTabBar - Should show extra tabs:', shouldShowExtraTabs, authState);
    
    if (shouldShowExtraTabs) {
      console.log('CustomTabBar - Adding Schedule, Notifications, Profile, and Settings tabs');
      console.log('CustomTabBar - Final tabs:', allTabs);
      return allTabs; // Show all tabs (Map, Schedule, Notifications, Profile, Settings)
    } else {
      console.log('CustomTabBar - Not adding extra tabs - not authenticated or visitor');
      const baseTabs = [allTabs[0]]; // Only show Map tab
      console.log('CustomTabBar - Final tabs:', baseTabs);
      return baseTabs;
    }
  }, [authState.isAuthenticated, authState.userType]); // Only recalculate when auth state changes

  // Don't render tab bar until authentication check is complete
  if (authState.isLoading) {
    return null;
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={100}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.tabBar, { backgroundColor: 'transparent' }]}
        >
          <View style={styles.tabBarContent}>
            {visibleTabs.map((tab, index) => {
              // Find the actual route index in state.routes
              const routeIndex = state.routes.findIndex(route => route.name === tab.route);
              const isFocused = state.index === routeIndex;
              
              const onPress = () => {
                console.log('CustomTabBar - Tab pressed:', tab.route, 'routeIndex:', routeIndex);
                console.log('CustomTabBar - Current state index:', state.index, 'isFocused:', isFocused);
                console.log('CustomTabBar - All routes:', state.routes.map(r => r.name));
                
                if (routeIndex >= 0 && !isFocused) {
                  try {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: state.routes[routeIndex].key,
                      canPreventDefault: true,
                    });

                    if (!event.defaultPrevented) {
                      console.log('CustomTabBar - Attempting navigation to:', state.routes[routeIndex].name);
                      
                      // Force navigation using the route name directly
                      navigation.navigate({
                        name: state.routes[routeIndex].name,
                        merge: true,
                      });
                      
                      console.log('CustomTabBar - Navigation called successfully');
                    } else {
                      console.log('CustomTabBar - Navigation prevented by event');
                    }
                  } catch (error) {
                    console.error('CustomTabBar - Navigation error:', error);
                  }
                } else if (isFocused) {
                  console.log('CustomTabBar - Tab already focused, no navigation needed');
                } else {
                  console.log('CustomTabBar - Route not found in state.routes for:', tab.route);
                }
              };

              return (
                <TabItem
                  key={tab.key}
                  label={tab.label}
                  iconName={tab.iconName}
                  iconNameFocused={tab.iconNameFocused}
                  isFocused={isFocused}
                  onPress={onPress}
                  color={theme.textSecondary}
                  theme={theme}
                />
              );
            })}
          </View>
        </BlurView>
      ) : (
        <View style={[styles.tabBar, { backgroundColor: theme.card }]}>
          <View style={styles.tabBarContent}>
            {visibleTabs.map((tab, index) => {
              // Find the actual route index in state.routes
              const routeIndex = state.routes.findIndex(route => route.name === tab.route);
              const isFocused = state.index === routeIndex;
              
              const onPress = () => {
                console.log('CustomTabBar - Tab pressed:', tab.route, 'routeIndex:', routeIndex);
                console.log('CustomTabBar - Current state index:', state.index, 'isFocused:', isFocused);
                console.log('CustomTabBar - All routes:', state.routes.map(r => r.name));
                
                if (routeIndex >= 0 && !isFocused) {
                  try {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: state.routes[routeIndex].key,
                      canPreventDefault: true,
                    });

                    if (!event.defaultPrevented) {
                      console.log('CustomTabBar - Attempting navigation to:', state.routes[routeIndex].name);
                      
                      // Force navigation using the route name directly
                      navigation.navigate({
                        name: state.routes[routeIndex].name,
                        merge: true,
                      });
                      
                      console.log('CustomTabBar - Navigation called successfully');
                    } else {
                      console.log('CustomTabBar - Navigation prevented by event');
                    }
                  } catch (error) {
                    console.error('CustomTabBar - Navigation error:', error);
                  }
                } else if (isFocused) {
                  console.log('CustomTabBar - Tab already focused, no navigation needed');
                } else {
                  console.log('CustomTabBar - Route not found in state.routes for:', tab.route);
                }
              };

              return (
                <TabItem
                  key={tab.key}
                  label={tab.label}
                  iconName={tab.iconName}
                  iconNameFocused={tab.iconNameFocused}
                  isFocused={isFocused}
                  onPress={onPress}
                  color={theme.textSecondary}
                  theme={theme}
                />
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBar: {
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'ios' ? 34 : 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: Platform.OS === 'ios' ? 0.5 : 0,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabItemFocused: {
    transform: [{ scale: 1.05 }],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconContainerFocused: {
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelFocused: {
    fontWeight: '700',
  },
});
