import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  error: string;
  success: string;
  warning: string;
  card: string;
  notification: string;
}

const lightTheme: ThemeColors = {
  background: '#ffffff',
  surface: '#f8f9fa',
  primary: '#007AFF',
  secondary: '#0056CC',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
  accent: '#667eea',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  card: '#ffffff',
  notification: '#FF3B30',
};

const darkTheme: ThemeColors = {
  background: '#000000',
  surface: '#1c1c1e',
  primary: '#0A84FF',
  secondary: '#5E5CE6',
  text: '#ffffff',
  textSecondary: '#8E8E93',
  border: '#38383a',
  accent: '#5E5CE6',
  error: '#FF453A',
  success: '#30D158',
  warning: '#FF9F0A',
  card: '#1c1c1e',
  notification: '#FF453A',
};

interface ThemeContextType {
  isDark: boolean;
  theme: ThemeColors;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('darkMode');
      if (savedTheme !== null) {
        setIsDark(JSON.parse(savedTheme));
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveTheme = async (darkMode: boolean) => {
    try {
      await AsyncStorage.setItem('darkMode', JSON.stringify(darkMode));
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    saveTheme(newTheme);
  };

  const setTheme = (darkMode: boolean) => {
    setIsDark(darkMode);
    saveTheme(darkMode);
  };

  const theme = isDark ? darkTheme : lightTheme;

  // Provide context immediately, even during loading
  return (
    <ThemeContext.Provider
      value={{
        isDark,
        theme,
        toggleTheme,
        setTheme,
      }}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook for easy access to theme colors
export const useThemeColors = (): ThemeColors => {
  const { theme } = useTheme();
  return theme;
};

// Hook for easy access to isDark state
export const useIsDark = (): boolean => {
  const { isDark } = useTheme();
  return isDark;
};
