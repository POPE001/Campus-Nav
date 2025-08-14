import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Add a small delay to prevent useInsertionEffect warning
    const timer = setTimeout(() => {
      const animationSequence = Animated.sequence([
        // Logo appears and rotates
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(logoRotateAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        // Text slides up
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        // Hold for a moment
        Animated.delay(1000),
        // Fade out
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]);

      animationSequence.start(() => {
        onAnimationComplete();
      });
    }, 100); // Small delay to prevent scheduling conflicts

    return () => {
      clearTimeout(timer);
    };
  }, [fadeAnim, scaleAnim, slideAnim, logoRotateAnim, onAnimationComplete]);

  const logoRotate = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* App Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [{ rotate: logoRotate }],
              },
            ]}
          >
            <View style={styles.logoCircle}>
              <Ionicons name="map" size={80} color="white" />
            </View>
          </Animated.View>

          {/* App Name */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.appName}>Campus Nav</Text>
            <Text style={styles.tagline}>Navigate Your Campus</Text>
            <View style={styles.universityContainer}>
              <Text style={styles.universityText}>Obafemi Awolowo University</Text>
            </View>
          </Animated.View>

          {/* Decorative Elements */}
          <View style={styles.decorativeElements}>
            <Animated.View
              style={[
                styles.floatingDot,
                styles.dot1,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -20],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.floatingDot,
                styles.dot2,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateX: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 15],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.floatingDot,
                styles.dot3,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 25],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </Animated.View>

        {/* Loading Indicator */}
        <Animated.View
          style={[
            styles.loadingContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.loadingBar}>
            <Animated.View
              style={[
                styles.loadingFill,
                {
                  transform: [
                    {
                      scaleX: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
          <Text style={styles.loadingText}>Loading your campus experience...</Text>
        </Animated.View>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  universityContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  universityText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textAlign: 'center',
  },
  decorativeElements: {
    position: 'absolute',
    width: width,
    height: height,
    top: 0,
    left: 0,
  },
  floatingDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dot1: {
    top: height * 0.2,
    left: width * 0.15,
  },
  dot2: {
    top: height * 0.3,
    right: width * 0.2,
  },
  dot3: {
    bottom: height * 0.25,
    left: width * 0.25,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
    width: width * 0.8,
  },
  loadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loadingFill: {
    height: '100%',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
    transformOrigin: 'left',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
});

