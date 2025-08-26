import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import navigationService, { NavigationState, RouteStep } from '@/lib/navigationService';

interface NavigationHeaderProps {
  isVisible: boolean;
  onClose: () => void;
}

// Responsive logic moved inside component to avoid undefined errors

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  isVisible,
  onClose,
}) => {
  const { isDark, theme } = useTheme();
  const { fontSizes } = useFontSize();
  const insets = useSafeAreaInsets();
  
  // Track screen dimensions with proper initialization
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  // Responsive dimensions that update on orientation change
  const responsiveDimensions = useMemo(() => {
    const currentWidth = dimensions.width;
    const currentHeight = dimensions.height;
    const currentIsTablet = currentWidth >= 768;
    const currentIsLandscape = currentWidth > currentHeight;
    const currentScale = Math.min(currentWidth / 375, 1.2);
    
    return {
      width: currentWidth,
      height: currentHeight,
      isTablet: currentIsTablet,
      isLandscape: currentIsLandscape,
      scale: currentScale,
      // Responsive spacing
      padding: currentIsTablet ? 32 : 24,
      iconSize: Math.round(56 * currentScale),
      closeButtonSize: Math.round(44 * currentScale),
      // Responsive fonts
      distanceFont: Math.round(34 * currentScale),
      instructionFont: Math.round(22 * currentScale),
      timeFont: Math.round(16 * currentScale),
      thenFont: Math.round(12 * currentScale),
      nextStepFont: Math.round(15 * currentScale),
    };
  }, [dimensions]);
  
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null);
  const [slideAnimation] = useState(new Animated.Value(isVisible ? 1 : 0));
  
  useEffect(() => {
    // Subscribe to navigation state updates
    const unsubscribe = navigationService.subscribeToState((state) => {
      setNavigationState(state);
    });

    // Get initial state
    const initialState = navigationService.getNavigationState();
    setNavigationState(initialState);

    // Subscribe to orientation changes
    const dimensionSubscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => {
      unsubscribe();
      dimensionSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(slideAnimation, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  const handleClose = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Stop navigation service
    navigationService.forceStopNavigation();
    onClose();
  };



  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 1) return '< 1 min';
    return `${minutes} min`;
  };

  const getInstructionIcon = (maneuver?: string): string => {
    if (!maneuver) return 'arrow-up';
    
    switch (maneuver.toLowerCase()) {
      case 'turn-left':
      case 'left':
        return 'arrow-back';
      case 'turn-right':
      case 'right':
        return 'arrow-forward';
      case 'straight':
      case 'continue':
        return 'arrow-up';
      case 'slight-left':
        return 'trending-up';
      case 'slight-right':
        return 'trending-down';
      case 'sharp-left':
        return 'return-up-back';
      case 'sharp-right':
        return 'return-up-forward';
      case 'u-turn':
        return 'return-down-back';
      default:
        return 'arrow-up';
    }
  };

  const getCurrentInstruction = (): string => {
    if (!navigationState?.currentStep || !navigationState.currentStep.instruction) {
      return `Head towards ${navigationState?.destination?.name || 'destination'}`;
    }
    return navigationState.currentStep.instruction;
  };

  const getNextInstruction = (): string | null => {
    if (!navigationState?.currentRoute || !navigationState.currentStep) return null;
    
    const steps = navigationState.currentRoute.legs[0]?.steps || [];
    const currentIndex = navigationState.stepIndex;
    const nextStep = steps[currentIndex + 1];
    
    return nextStep?.instruction || null;
  };

  if (!isVisible) {
    return null;
  }

  // Create responsive styles first with safe area  
  const styles = createStyles(responsiveDimensions, insets.top);

  // Show loading state if navigation service is starting up
  if (!navigationState || navigationState.status === 'idle') {
    return (
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{
              translateY: slideAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-200, 0],
              })
            }],
            opacity: slideAnimation,
          }
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          <BlurView intensity={95} style={styles.blurView}>
            <LinearGradient
              colors={[theme.card + 'F8', theme.card + 'E8']}
              style={styles.gradient}
            >
              {/* Close Button */}
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  {
                    width: responsiveDimensions.closeButtonSize,
                    height: responsiveDimensions.closeButtonSize,
                    borderRadius: responsiveDimensions.closeButtonSize / 2,
                    top: responsiveDimensions.isTablet ? 20 : 16,
                    right: responsiveDimensions.padding,
                  }
                ]}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={Math.round(24 * responsiveDimensions.scale)} color="#666" />
              </TouchableOpacity>
              
              {/* Loading Content */}
              <View style={styles.mainContent}>
                <View style={[styles.distanceSection, { marginBottom: responsiveDimensions.isTablet ? 16 : 12 }]}>
                  <View style={[
                    styles.largeDirectionIcon,
                    {
                      width: responsiveDimensions.iconSize,
                      height: responsiveDimensions.iconSize,
                      borderRadius: responsiveDimensions.iconSize / 2,
                      backgroundColor: theme.primary,
                    }
                  ]}>
                    <Ionicons name="navigate" size={Math.round(28 * responsiveDimensions.scale)} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.largeDistanceText,
                      { 
                        color: theme.text,
                        fontSize: responsiveDimensions.distanceFont,
                      }
                    ]}>
                      Starting...
                    </Text>
                  </View>
                </View>
                
                <Text style={[
                  styles.instructionText, 
                  { 
                    color: theme.text,
                    fontSize: responsiveDimensions.instructionFont,
                  }
                ]}>
                  Preparing navigation
                </Text>
                <Text style={[
                  styles.timeText, 
                  { 
                    color: theme.textSecondary,
                    fontSize: responsiveDimensions.timeFont,
                  }
                ]}>
                  Please wait...
                </Text>
              </View>
            </LinearGradient>
          </BlurView>
        </SafeAreaView>
      </Animated.View>
    );
  }

  if (navigationState.status !== 'navigating' && navigationState.status !== 'calculating') {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{
            translateY: slideAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [-200, 0],
            })
          }],
          opacity: slideAnimation,
        }
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        <BlurView intensity={95} style={styles.blurView}>
          <LinearGradient
            colors={[theme.card + 'F8', theme.card + 'E8']}
            style={styles.gradient}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={[
                styles.closeButton,
                {
                  width: responsiveDimensions.closeButtonSize,
                  height: responsiveDimensions.closeButtonSize,
                  borderRadius: responsiveDimensions.closeButtonSize / 2,
                  top: responsiveDimensions.isTablet ? 20 : 16,
                  right: responsiveDimensions.padding,
                }
              ]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={Math.round(24 * responsiveDimensions.scale)} color="#666" />
            </TouchableOpacity>

            {/* Main Content */}
            <View style={[
              styles.mainContent,
              responsiveDimensions.isLandscape && styles.landscapeContent
            ]}>
              {/* Large Distance Display */}
              <View style={[
                styles.distanceSection,
                responsiveDimensions.isLandscape && styles.landscapeDistanceSection
              ]}>
                <View style={[
                  styles.largeDirectionIcon, 
                  { 
                    backgroundColor: '#1A73E8',
                    width: responsiveDimensions.iconSize,
                    height: responsiveDimensions.iconSize,
                    borderRadius: responsiveDimensions.iconSize / 2,
                  }
                ]}>
                  <Ionicons
                    name={getInstructionIcon(navigationState.currentStep?.maneuver)}
                    size={Math.round(32 * responsiveDimensions.scale)}
                    color="#ffffff"
                  />
                </View>
                <Text style={[
                  styles.largeDistanceText, 
                  { 
                    color: '#1A73E8',
                    fontSize: responsiveDimensions.distanceFont,
                  }
                ]}>
                  {formatDistance(navigationState.distanceRemaining)}
                </Text>
              </View>

              {/* Navigation Instruction */}
              <View style={[
                styles.instructionSection,
                responsiveDimensions.isLandscape && styles.landscapeInstructionSection
              ]}>
                <Text style={[
                  styles.instructionText, 
                  { 
                    color: theme.text,
                    fontSize: responsiveDimensions.instructionFont,
                  }
                ]} numberOfLines={responsiveDimensions.isLandscape ? 1 : 2}>
                  {getCurrentInstruction()}
                </Text>
                <Text style={[
                  styles.timeText, 
                  { 
                    color: theme.textSecondary,
                    fontSize: responsiveDimensions.timeFont,
                  }
                ]}>
                  {formatDuration(navigationState.timeRemaining)} to destination
                </Text>
              </View>

              {/* Next Step Preview - Hide in landscape on phones */}
              {getNextInstruction() && !(responsiveDimensions.isLandscape && !responsiveDimensions.isTablet) && (
                <View style={[
                  styles.nextStep,
                  { paddingHorizontal: Math.round(16 * responsiveDimensions.scale) }
                ]}>
                  <View style={styles.nextStepHeader}>
                    <Text style={[
                      styles.thenLabel, 
                      { 
                        color: '#8E8E93',
                        fontSize: responsiveDimensions.thenFont,
                      }
                    ]}>THEN</Text>
                    <Ionicons name="chevron-forward" size={Math.round(16 * responsiveDimensions.scale)} color="#8E8E93" />
                  </View>
                  <Text style={[
                    styles.nextStepText, 
                    { 
                      color: theme.text,
                      fontSize: responsiveDimensions.nextStepFont,
                    }
                  ]} numberOfLines={1}>
                    {getNextInstruction()}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </BlurView>
      </SafeAreaView>
    </Animated.View>
  );
};

const createStyles = (responsiveDimensions: any, safeAreaTop: number) => {
  const { isTablet, isLandscape } = responsiveDimensions;
  
  return StyleSheet.create({
  container: {
    position: 'absolute',
    top: safeAreaTop, // Use safe area top inset
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  blurView: {
    borderBottomLeftRadius: isTablet ? 32 : 24,
    borderBottomRightRadius: isTablet ? 32 : 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    // No extra margin needed since we use safe area
  },
  gradient: {
    paddingHorizontal: isTablet ? 32 : 24,
    paddingBottom: isTablet ? 36 : 28,
    paddingTop: isTablet ? 20 : 16, // Normal padding since safe area is handled by container
    minHeight: isLandscape ? (isTablet ? 120 : 100) : (isTablet ? 160 : 140),
  },
  closeButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    zIndex: 10,
  },
  mainContent: {
    flex: 1,
    paddingTop: isTablet ? 12 : 8,
  },
  landscapeContent: {
    flexDirection: isTablet ? 'column' : 'row',
    alignItems: isTablet ? 'flex-start' : 'center',
  },
  distanceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isTablet ? 24 : 20,
  },
  landscapeDistanceSection: {
    marginBottom: isTablet ? 24 : 0,
    marginRight: isTablet ? 0 : 24,
    flex: isTablet ? 0 : 0.4,
  },
  largeDirectionIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isTablet ? 20 : 16,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  largeDistanceText: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  instructionSection: {
    marginBottom: isTablet ? 20 : 16,
  },
  landscapeInstructionSection: {
    flex: isTablet ? 0 : 1,
    marginBottom: isTablet ? 20 : 0,
  },
  instructionText: {
    fontWeight: '600',
    lineHeight: isTablet ? 32 : 28,
    marginBottom: isTablet ? 8 : 6,
    letterSpacing: -0.2,
  },
  timeText: {
    fontWeight: '500',
    opacity: 0.7,
  },
  nextStep: {
    backgroundColor: 'rgba(142, 142, 147, 0.08)',
    borderRadius: isTablet ? 20 : 16,
    padding: isTablet ? 20 : 16,
    borderLeftWidth: isTablet ? 6 : 4,
    borderLeftColor: '#1A73E8',
  },
  nextStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isTablet ? 12 : 8,
  },
  thenLabel: {
    fontWeight: '700',
    letterSpacing: 1.2,
    marginRight: isTablet ? 6 : 4,
  },
  nextStepText: {
    fontWeight: '500',
    lineHeight: isTablet ? 24 : 20,
    opacity: 0.85,
  },
  actionButtons: {
    position: 'absolute',
    top: 12,
    right: 20,
  },
  });
};

export default NavigationHeader;
