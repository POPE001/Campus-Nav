import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFontSize } from '@/contexts/FontSizeContext';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  colors?: string[];
  children?: React.ReactNode;
  rightComponent?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ 
  title, 
  subtitle, 
  colors = ['#007AFF', '#0056CC'],
  children,
  rightComponent
}) => {
  // Safe fallback for font sizes
  let fontSizes = {
    h1: 28,
    body: 16,
    h2: 24,
    h3: 20,
    large: 18,
    medium: 14,
    small: 12,
    caption: 10,
  };

  try {
    const fontContext = useFontSize();
    fontSizes = fontContext.fontSizes || fontSizes;
  } catch (error) {
    console.warn('Font size context not available in ScreenHeader, using fallback');
  }

  const styles = getStyles(fontSizes);

  return (
    <LinearGradient colors={colors} style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
        {rightComponent && (
          <View style={styles.headerRight}>
            {rightComponent}
          </View>
        )}
      </View>
      {children}
    </LinearGradient>
  );
};

const getStyles = (fontSizes: any) => StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  headerRight: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  headerTitle: {
    fontSize: fontSizes.h1,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: fontSizes.body,
    color: '#ffffff',
    opacity: 0.9,
  },
});
