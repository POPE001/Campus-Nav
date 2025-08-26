import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FontSizes {
  small: number;
  medium: number;
  large: number;
  xlarge: number;
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  body: number;
  caption: number;
  button: number;
}

interface FontSizeContextType {
  fontSize: number;
  fontSizes: FontSizes;
  setFontSize: (size: number) => void;
  getFontSizeLabel: () => string;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

interface FontSizeProviderProps {
  children: ReactNode;
}

export const FontSizeProvider: React.FC<FontSizeProviderProps> = ({ children }) => {
  const [fontSize, setFontSizeState] = useState(16); // Default medium size
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadFontSize();
  }, []);

  const loadFontSize = async () => {
    try {
      const savedFontSize = await AsyncStorage.getItem('fontSize');
      if (savedFontSize !== null) {
        setFontSizeState(parseInt(savedFontSize));
      }
    } catch (error) {
      console.error('Error loading font size:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveFontSize = async (size: number) => {
    try {
      await AsyncStorage.setItem('fontSize', size.toString());
    } catch (error) {
      console.error('Error saving font size:', error);
    }
  };

  const setFontSize = (size: number) => {
    setFontSizeState(size);
    saveFontSize(size);
  };

  const getFontSizeLabel = () => {
    switch (fontSize) {
      case 14:
        return 'Small';
      case 16:
        return 'Medium';
      case 18:
        return 'Large';
      case 20:
        return 'Extra Large';
      default:
        return 'Medium';
    }
  };

  // Calculate all font sizes based on the base font size
  const calculateFontSizes = (baseSize: number): FontSizes => {
    const ratio = baseSize / 16; // 16 is the default medium size
    
    return {
      small: Math.round(12 * ratio),
      medium: Math.round(14 * ratio),
      large: Math.round(16 * ratio),
      xlarge: Math.round(18 * ratio),
      h1: Math.round(28 * ratio),
      h2: Math.round(24 * ratio),
      h3: Math.round(20 * ratio),
      h4: Math.round(18 * ratio),
      body: Math.round(16 * ratio),
      caption: Math.round(12 * ratio),
      button: Math.round(16 * ratio),
    };
  };

  const fontSizes = calculateFontSizes(fontSize);

  // Provide context immediately, even during loading
  return (
    <FontSizeContext.Provider
      value={{
        fontSize,
        fontSizes,
        setFontSize,
        getFontSizeLabel,
      }}
    >
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = (): FontSizeContextType => {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
};

// Hook for easy access to font sizes
export const useFontSizes = (): FontSizes => {
  const { fontSizes } = useFontSize();
  return fontSizes;
};

// Hook for easy access to current font size
export const useCurrentFontSize = (): number => {
  const { fontSize } = useFontSize();
  return fontSize;
};
