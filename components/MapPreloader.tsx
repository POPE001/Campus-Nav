import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface MapPreloaderProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const MapPreloader: React.FC<MapPreloaderProps> = ({ isVisible, onComplete }) => {
  const { isDark, theme } = useTheme();
  
  const fadeAnimation = useRef(new Animated.Value(1)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const circleAnimation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Start loading animation
    Animated.loop(
      Animated.timing(circleAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    if (!isVisible) {
      // Hide preloader with smooth animation
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnimation, {
          toValue: 0.8,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete?.();
      });
    }
  }, [isVisible]);

  if (!isVisible && fadeAnimation._value === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnimation,
          transform: [{ scale: scaleAnimation }],
        }
      ]}
    >
      <LinearGradient
        colors={isDark 
          ? ['#1c1c1e', '#2c2c2e', '#3a3a3c']
          : ['#ffffff', '#f2f2f7', '#e5e5ea']
        }
        style={styles.gradient}
      >
        {/* Campus Map Logo/Icon */}
        <View style={[styles.logoContainer, { backgroundColor: theme.primary + '20' }]}>
          <Animated.View
            style={[
              styles.circle,
              {
                backgroundColor: theme.primary,
                transform: [{
                  scale: circleAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.8, 1.2, 0.8],
                  })
                }],
                opacity: circleAnimation.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.6, 1, 0.6],
                })
              }
            ]}
          />
          
          {/* Ripple Effect */}
          <Animated.View
            style={[
              styles.ripple,
              {
                borderColor: theme.primary,
                transform: [{
                  scale: circleAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 2],
                  })
                }],
                opacity: circleAnimation.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.8, 0.4, 0],
                })
              }
            ]}
          />
          
          <Animated.View
            style={[
              styles.ripple,
              styles.ripple2,
              {
                borderColor: theme.primary,
                transform: [{
                  scale: circleAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1.5],
                  })
                }],
                opacity: circleAnimation.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [0.6, 0.2, 0],
                })
              }
            ]}
          />
        </View>
        
        {/* Loading dots */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: theme.primary,
                  opacity: circleAnimation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: index === 0 ? [1, 0.3, 1] : 
                               index === 1 ? [0.3, 1, 0.3] : [1, 0.3, 1],
                  }),
                  transform: [{
                    scale: circleAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: index === 1 ? [1, 1.3, 1] : [1, 0.7, 1],
                    })
                  }]
                }
              ]}
            />
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    zIndex: 2,
  },
  ripple: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    zIndex: 1,
  },
  ripple2: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default MapPreloader;
