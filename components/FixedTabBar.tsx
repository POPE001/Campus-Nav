import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import { supabase } from '@/lib/supabase';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

interface TabItemProps {
  label: string;
  iconName: string;
  iconNameFocused: string;
  isFocused: boolean;
  onPress: () => void;
  theme: any;
  fontSizes: any;
}

function TabItem({ 
  label, 
  iconName, 
  iconNameFocused, 
  isFocused, 
  onPress, 
  theme, 
  fontSizes
}: TabItemProps) {
  const scaleAnimation = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isFocused) {
      Animated.spring(scaleAnimation, {
        toValue: 1.1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(scaleAnimation, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [isFocused]);

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isFocused ? theme.primary : 'transparent',
            transform: [{ scale: scaleAnimation }],
          }
        ]}
      >
        <Ionicons
          name={isFocused ? iconNameFocused as any : iconName as any}
          size={isTablet ? 26 : 24}
          color={isFocused ? '#ffffff' : theme.textSecondary}
        />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          {
            color: isFocused ? theme.primary : theme.textSecondary,
            fontSize: fontSizes.caption,
            fontWeight: isFocused ? '700' : '500',
          },
        ]}
      >
        {label}
      </Text>
      
      {/* Active indicator dot */}
      {isFocused && (
        <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />
      )}
    </TouchableOpacity>
  );
}

export function FixedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { isDark, theme } = useTheme();
  const { fontSizes } = useFontSize();
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userType: null as string | null,
    isLoading: true,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const userMetadata = session.user.user_metadata;
          const detectedUserType = userMetadata?.user_type || 'visitor';
          
          setAuthState({
            isAuthenticated: true,
            userType: detectedUserType,
            isLoading: false,
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            userType: 'visitor',
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('FixedTabBar - Error checking auth:', error);
        setAuthState({
          isAuthenticated: false,
          userType: 'visitor',
          isLoading: false,
        });
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userMetadata = session.user.user_metadata;
        const detectedUserType = userMetadata?.user_type || 'visitor';
        
        setAuthState({
          isAuthenticated: true,
          userType: detectedUserType,
          isLoading: false,
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          userType: 'visitor',
          isLoading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const visibleTabs = useMemo(() => {
    const allTabs = [
      { key: 'index', label: 'Map', iconName: 'map-outline', iconNameFocused: 'map', route: 'index' },
      { key: 'campus-news', label: 'Campus News', iconName: 'newspaper-outline', iconNameFocused: 'newspaper', route: 'campus-news' },
      { key: 'schedule', label: 'Schedule', iconName: 'calendar-outline', iconNameFocused: 'calendar', route: 'schedule' },
      { key: 'notifications', label: 'Updates', iconName: 'notifications-outline', iconNameFocused: 'notifications', route: 'notifications' },
      { key: 'profile', label: 'Profile', iconName: 'person-outline', iconNameFocused: 'person', route: 'profile' },
      { key: 'settings', label: 'Settings', iconName: 'settings-outline', iconNameFocused: 'settings', route: 'settings' },
    ];

    if (authState.isAuthenticated && authState.userType !== 'visitor') {
      // Authenticated users see: Map, Schedule, Notifications, Profile, Settings
      return [allTabs[0], allTabs[2], allTabs[3], allTabs[4], allTabs[5]];
    } else {
      // Visitors see: Map, Campus News, Profile (for sign-in)
      return [allTabs[0], allTabs[1], allTabs[4]];
    }
  }, [authState.isAuthenticated, authState.userType]);

  if (authState.isLoading) {
    return null;
  }

  console.log('🔧 FIXED TAB BAR - Rendering visible tabs:', visibleTabs.length);

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <LinearGradient
        colors={isDark 
          ? ['rgba(44, 44, 46, 0.95)', 'rgba(28, 28, 30, 0.98)']
          : ['rgba(255, 255, 255, 0.95)', 'rgba(242, 242, 247, 0.98)']
        }
        style={styles.gradient}
      >
        <View style={styles.tabBarContent}>
          {visibleTabs.map((tab) => {
            const routeIndex = state.routes.findIndex(route => route.name === tab.route);
            const isFocused = state.index === routeIndex;
            
            const onPress = () => {
              if (routeIndex >= 0 && !isFocused) {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: state.routes[routeIndex].key,
                  canPreventDefault: true,
                });

                if (!event.defaultPrevented) {
                  navigation.navigate({
                    name: state.routes[routeIndex].name,
                    merge: true,
                  });
                }
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
                theme={theme}
                fontSizes={fontSizes}
              />
            );
          })}
        </View>
        
        {/* Decorative Elements */}
        <View style={[styles.decorativeBar, { backgroundColor: theme.primary }]} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  gradient: {
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 16,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  iconContainer: {
    width: isTablet ? 50 : 44,
    height: isTablet ? 50 : 44,
    borderRadius: isTablet ? 25 : 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tabLabel: {
    textAlign: 'center',
    fontSize: isTablet ? 12 : 11,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  decorativeBar: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 8,
    opacity: 0.6,
  },
});
