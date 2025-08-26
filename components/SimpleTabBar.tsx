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
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import { supabase } from '@/lib/supabase';

const { width: screenWidth } = Dimensions.get('window');

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
  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer,
        isFocused && { backgroundColor: theme.primary }
      ]}>
        <Ionicons
          name={isFocused ? iconNameFocused as any : iconName as any}
          size={24}
          color={isFocused ? '#ffffff' : theme.textSecondary}
        />
      </View>
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
    </TouchableOpacity>
  );
}

export function SimpleTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
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
        console.error('SimpleTabBar - Error checking auth:', error);
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
      { key: 'schedule', label: 'Schedule', iconName: 'calendar-outline', iconNameFocused: 'calendar', route: 'schedule' },
      { key: 'notifications', label: 'Updates', iconName: 'notifications-outline', iconNameFocused: 'notifications', route: 'notifications' },
      { key: 'profile', label: 'Profile', iconName: 'person-outline', iconNameFocused: 'person', route: 'profile' },
      { key: 'settings', label: 'Settings', iconName: 'settings-outline', iconNameFocused: 'settings', route: 'settings' },
    ];

    const shouldShowExtraTabs = authState.isAuthenticated && authState.userType !== 'visitor';
    return shouldShowExtraTabs ? allTabs : [allTabs[0]];
  }, [authState.isAuthenticated, authState.userType]);

  if (authState.isLoading) {
    return null;
  }

  console.log('🔍 SIMPLE TAB BAR - Rendering visible tabs:', visibleTabs.length);
  console.log('🔍 SIMPLE TAB BAR - Screen dimensions:', screenWidth);
  console.log('🔍 SIMPLE TAB BAR - Theme colors:', { card: theme.card, primary: theme.primary });

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderWidth: 2, borderColor: theme.primary }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 25 : 15,
    left: 20,
    right: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    textAlign: 'center',
    fontSize: 11,
  },
});
