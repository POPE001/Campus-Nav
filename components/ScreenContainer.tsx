import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: any;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({ children, style }) => {
  const { isDark, theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }, style]}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={theme.background} 
      />
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
