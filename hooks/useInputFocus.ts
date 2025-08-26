import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing input focus state with proper debouncing
 * Prevents cursor instability and improves performance in forms
 */
export const useInputFocus = () => {
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputFocus = useCallback((inputName: string) => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      setFocusedInput(inputName);
    }, 50);
  }, []);

  const handleInputBlur = useCallback(() => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      setFocusedInput(null);
    }, 100);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  return {
    focusedInput,
    handleInputFocus,
    handleInputBlur,
  };
};
