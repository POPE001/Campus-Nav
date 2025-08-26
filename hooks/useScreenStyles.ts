import { StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const isSmallScreen = width < 380;

export const useScreenStyles = () => {
  // Add error handling and fallbacks
  let isDark = false;
  let theme = {
    surface: '#f8f9fa',
    card: '#ffffff',
    textSecondary: '#8E8E93',
    text: '#000000',
    border: '#E5E5EA',
    primary: '#007AFF',
  };
  let fontSizes = {
    small: 12,
    medium: 14,
    large: 18,
    h3: 20,
    body: 16,
    caption: 10,
  };

  try {
    const themeContext = useTheme();
    isDark = themeContext.isDark;
    theme = themeContext.theme;
  } catch (error) {
    console.warn('Theme context not available, using fallback');
  }

  try {
    const fontContext = useFontSize();
    fontSizes = fontContext.fontSizes;
  } catch (error) {
    console.warn('Font size context not available, using fallback');
  }

  const commonStyles = StyleSheet.create({
    // Container styles
    container: {
      flex: 1,
      backgroundColor: theme.surface,
    },
    scrollView: {
      flex: 1,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Section styles - Responsive
    section: {
      marginTop: isSmallScreen ? 16 : 24,
    },
    sectionTitle: {
      fontSize: fontSizes.medium,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: isSmallScreen ? 6 : 8,
      marginHorizontal: isTablet ? 32 : (isSmallScreen ? 16 : 20),
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionContent: {
      backgroundColor: theme.card,
      marginHorizontal: isTablet ? 32 : (isSmallScreen ? 12 : 16),
      borderRadius: isTablet ? 16 : 12,
      shadowColor: isDark ? '#000' : '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 2,
      elevation: 2,
      maxWidth: isTablet ? 600 : undefined,
      alignSelf: isTablet ? 'center' : 'auto',
    },

    // Text styles
    bodyText: {
      fontSize: fontSizes.body,
      color: theme.text,
    },
    secondaryText: {
      fontSize: fontSizes.medium,
      color: theme.textSecondary,
    },
    captionText: {
      fontSize: fontSizes.caption,
      color: theme.textSecondary,
    },
    titleText: {
      fontSize: fontSizes.h3,
      fontWeight: 'bold',
      color: theme.text,
    },

    // Common UI elements - Responsive
    card: {
      backgroundColor: theme.card,
      borderRadius: isTablet ? 16 : 12,
      padding: isSmallScreen ? 12 : 16,
      marginHorizontal: isTablet ? 32 : (isSmallScreen ? 12 : 16),
      marginVertical: isSmallScreen ? 6 : 8,
      shadowColor: isDark ? '#000' : '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 2,
      elevation: 2,
      maxWidth: isTablet ? 600 : undefined,
      alignSelf: isTablet ? 'center' : 'auto',
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.border,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },

    // Footer styles
    footer: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 20,
    },
    footerText: {
      fontSize: fontSizes.medium,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    footerSubtext: {
      fontSize: fontSizes.caption,
      color: theme.textSecondary,
      opacity: 0.7,
      marginTop: 4,
    },

    // Font Size Selector specific styles - Responsive
    fontSizeWrapper: {
      paddingHorizontal: isSmallScreen ? 12 : 16,
      paddingBottom: isSmallScreen ? 12 : 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    fontSizeContainer: {
      flexDirection: isSmallScreen ? 'column' : 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      gap: isSmallScreen ? 8 : 0,
    },
    fontSizeOption: {
      flex: isSmallScreen ? 0 : 1,
      width: isSmallScreen ? '100%' : undefined,
      paddingVertical: isSmallScreen ? 12 : 8,
      paddingHorizontal: 12,
      marginHorizontal: isSmallScreen ? 0 : 4,
      borderRadius: 8,
      backgroundColor: isDark ? theme.surface : '#F2F2F7',
      alignItems: 'center',
    },
    fontSizeOptionActive: {
      backgroundColor: theme.primary,
    },
    fontSizeText: {
      fontWeight: '500',
      color: theme.text,
    },
    fontSizeTextActive: {
      color: '#ffffff',
    },
  });

  // Define spacing and border radius objects
  const spacing = {
    xs: isSmallScreen ? 2 : 4,
    small: isSmallScreen ? 6 : 8,
    medium: isSmallScreen ? 12 : 16,
    large: isSmallScreen ? 18 : 24,
    xlarge: isSmallScreen ? 24 : 32,
    xxlarge: isSmallScreen ? 36 : 48,
  };

  const borderRadius = {
    small: 4,
    medium: isSmallScreen ? 6 : 8,
    large: isSmallScreen ? 10 : 12,
    xlarge: isSmallScreen ? 14 : 16,
  };

  return {
    theme,
    isDark,
    fontSizes,
    styles: commonStyles,
    spacing,
    borderRadius,
    // Responsive data
    isTablet,
    isSmallScreen,
    screenWidth: width,
    screenHeight: height,
  };
};
