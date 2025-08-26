import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface TabBarBackgroundProps {
  children: React.ReactNode;
}

export function TabBarBackground({ children }: TabBarBackgroundProps) {
  const { isDark, theme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Floating Background Gradient */}
      <View style={styles.backgroundContainer}>
        <LinearGradient
          colors={
            isDark
              ? ['rgba(28, 28, 30, 0)', 'rgba(28, 28, 30, 0.4)', 'rgba(28, 28, 30, 0.8)']
              : ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.7)']
          }
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>

      {/* Decorative Elements */}
      {Platform.OS === 'ios' && (
        <>
          {/* Left Decorative Circle */}
          <View
            style={[
              styles.decorativeCircle,
              styles.leftCircle,
              {
                backgroundColor: `${theme.primary}10`,
              },
            ]}
          />
          
          {/* Right Decorative Circle */}
          <View
            style={[
              styles.decorativeCircle,
              styles.rightCircle,
              {
                backgroundColor: `${theme.primary}08`,
              },
            ]}
          />
        </>
      )}

      {/* Main Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  backgroundContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: isTablet ? 100 : 80,
    zIndex: -1,
  },
  backgroundGradient: {
    flex: 1,
    borderTopLeftRadius: isTablet ? 32 : 24,
    borderTopRightRadius: isTablet ? 32 : 24,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    zIndex: -1,
  },
  leftCircle: {
    width: isTablet ? 160 : 120,
    height: isTablet ? 160 : 120,
    bottom: isTablet ? -60 : -40,
    left: isTablet ? -40 : -30,
  },
  rightCircle: {
    width: isTablet ? 140 : 100,
    height: isTablet ? 140 : 100,
    bottom: isTablet ? -50 : -30,
    right: isTablet ? -30 : -20,
  },
});
