/**
 * EnhancedTabBar - Professional, elegant, and responsive bottom navigation
 * 
 * Features:
 * - ✨ Glass morphism effects with blur backgrounds (iOS) and gradient backgrounds (Android)
 * - 🎨 Smooth spring animations and micro-interactions
 * - 📱 Fully responsive design for phones and tablets
 * - 🌓 Dark/Light mode support with dynamic theming
 * - 🎯 Haptic feedback for premium user experience (iOS)
 * - 🎭 Floating animation effect for visual elegance
 * - 🔴 Active indicator dots and gradient backgrounds for focused tabs
 * - 💫 Professional shadows and depth effects
 * - 🎪 Decorative background elements for visual interest
 * - 📐 Adaptive sizing based on screen dimensions
 */

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
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import { supabase } from '@/lib/supabase';
import { TabBarBackground } from './TabBarBackground';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isSmallScreen = screenWidth < 380;

interface TabItemProps {
  label: string;
  iconName: string;
  iconNameFocused: string;
  isFocused: boolean;
  onPress: () => void;
  theme: any;
  fontSizes: any;
  animatedValue: Animated.Value;
  index: number;
  totalTabs: number;
}

function TabItem({ 
  label, 
  iconName, 
  iconNameFocused, 
  isFocused, 
  onPress, 
  theme, 
  fontSizes,
  animatedValue,
  index,
  totalTabs 
}: TabItemProps) {
  const scaleValue = new Animated.Value(isFocused ? 1 : 0.8);
  const translateY = new Animated.Value(isFocused ? -2 : 0);
  const glowOpacity = new Animated.Value(isFocused ? 1 : 0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: isFocused ? 1 : 0.8,
        useNativeDriver: true,
        tension: 120,
        friction: 7,
      }),
      Animated.spring(translateY, {
        toValue: isFocused ? -2 : 0,
        useNativeDriver: true,
        tension: 120,
        friction: 7,
      }),
      Animated.timing(glowOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  const handlePress = () => {
    // Haptic feedback for iOS
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const iconSize = isTablet ? 28 : isSmallScreen ? 22 : 24;
  const containerSize = isTablet ? 56 : isSmallScreen ? 44 : 50;

  return (
    <TouchableOpacity
      style={[styles.tabItem, { flex: 1 }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.tabItemContent,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Glow Effect Background */}
        <Animated.View
          style={[
            styles.glowBackground,
            {
              opacity: glowOpacity,
              width: containerSize + 8,
              height: containerSize + 8,
            },
          ]}
        >
          <LinearGradient
            colors={[
              `${theme.primary}40`,
              `${theme.primary}20`,
              'transparent',
            ]}
            style={styles.glowGradient}
          />
        </Animated.View>

        {/* Icon Container with Gradient Background */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              width: containerSize,
              height: containerSize,
              borderRadius: containerSize / 2,
              transform: [{ scale: scaleValue }],
            },
          ]}
        >
          {isFocused ? (
            <LinearGradient
              colors={[theme.primary, `${theme.primary}CC`]}
              style={[
                styles.focusedBackground,
                {
                  width: containerSize,
                  height: containerSize,
                  borderRadius: containerSize / 2,
                },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={iconNameFocused as any}
                  size={iconSize}
                  color="#ffffff"
                />
              </View>
            </LinearGradient>
          ) : (
            <View style={[styles.unfocusedBackground, { backgroundColor: 'transparent' }]}>
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={iconName as any}
                  size={iconSize}
                  color={theme.textSecondary}
                />
              </View>
            </View>
          )}

          {/* Active Indicator Dot */}
          {isFocused && (
            <Animated.View
              style={[
                styles.activeDot,
                {
                  opacity: glowOpacity,
                  backgroundColor: '#ffffff',
                },
              ]}
            />
          )}
        </Animated.View>

        {/* Label */}
        <Animated.View style={{ opacity: isFocused ? 1 : 0.7 }}>
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
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function EnhancedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { isDark, theme } = useTheme();
  const { fontSizes } = useFontSize();
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    userType: null as string | null,
    isLoading: true,
  });

  const slideAnimation = new Animated.Value(0);
  const floatAnimation = new Animated.Value(0);

  useEffect(() => {
    // Animate tab bar entrance
    Animated.spring(slideAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();

    // Subtle floating animation
    const createFloatAnimation = () => {
      Animated.sequence([
        Animated.timing(floatAnimation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimation, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]).start(() => createFloatAnimation());
    };

    // Start floating animation after initial entrance
    setTimeout(() => createFloatAnimation(), 1000);

    // Check authentication status
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
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
        console.error('EnhancedTabBar - Error checking auth:', error);
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

  // Define visible tabs based on authentication
  const visibleTabs = useMemo(() => {
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
        label: 'Updates',
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

    const shouldShowExtraTabs = authState.isAuthenticated && authState.userType !== 'visitor';
    return shouldShowExtraTabs ? allTabs : [allTabs[0]];
  }, [authState.isAuthenticated, authState.userType]);

  if (authState.isLoading) {
    return null;
  }

  // Debug: Simple visible version
  console.log('🔍 TAB BAR - Rendering with screen dimensions:', { screenWidth, screenHeight });
  console.log('🔍 TAB BAR - Tab bar dimensions:', { tabBarWidth: screenWidth - 40, tabBarHeight: 72 });

  const tabBarWidth = isTablet ? Math.min(600, screenWidth - 64) : screenWidth - 40;
  const tabBarHeight = isTablet ? 80 : isSmallScreen ? 68 : 72;

  return (
    <TabBarBackground>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              {
                translateY: slideAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
              {
                translateY: floatAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -2],
                }),
              },
            ],
          },
        ]}
      >
      <View style={[styles.tabBarWrapper, { alignItems: 'center' }]}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 80 : 95}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.tabBar,
              {
                width: tabBarWidth,
                height: tabBarHeight,
                backgroundColor: isDark ? 'rgba(28, 28, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              },
            ]}
          >
            <View style={styles.tabBarContent}>
              {visibleTabs.map((tab, index) => {
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
                    animatedValue={slideAnimation}
                    index={index}
                    totalTabs={visibleTabs.length}
                  />
                );
              })}
            </View>
          </BlurView>
        ) : (
          <LinearGradient
            colors={
              isDark
                ? ['rgba(28, 28, 30, 0.95)', 'rgba(28, 28, 30, 0.9)']
                : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']
            }
            style={[
              styles.tabBar,
              {
                width: tabBarWidth,
                height: tabBarHeight,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              },
            ]}
          >
            <View style={styles.tabBarContent}>
              {visibleTabs.map((tab, index) => {
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
                    animatedValue={slideAnimation}
                    index={index}
                    totalTabs={visibleTabs.length}
                  />
                );
              })}
            </View>
          </LinearGradient>
        )}

        {/* Subtle Bottom Indicator */}
        <View style={[styles.bottomIndicator, { backgroundColor: theme.border }]} />
      </View>
    </Animated.View>
    </TabBarBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
    zIndex: 1000,
  },
  tabBarWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
  },
  tabBar: {
    borderRadius: isTablet ? 28 : 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: isTablet ? 16 : 12,
    },
    shadowOpacity: 0.2,
    shadowRadius: isTablet ? 24 : 20,
    elevation: 20,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
    paddingVertical: isTablet ? 16 : isSmallScreen ? 8 : 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  focusedBackground: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  unfocusedBackground: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBackground: {
    position: 'absolute',
    borderRadius: 100,
    top: -4,
  },
  glowGradient: {
    flex: 1,
    borderRadius: 100,
  },
  activeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#ffffff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  tabLabel: {
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  bottomIndicator: {
    height: 3,
    width: isTablet ? 80 : 60,
    borderRadius: 2,
    marginTop: 8,
    opacity: 0.3,
  },
});
