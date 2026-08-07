import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import {
  lightColors,
  darkColors,
  spacing,
  borderRadius,
  shadows,
  layout,
  typography,
  gradients,
  darkGradients,
  setThemeColors as setLegacyThemeColors,
} from './index';

const THEME_STORAGE_KEY = '@unihelp_theme_preference';

// ─── Global theme store ───
let currentIsDark = false;
const currentColors = { ...lightColors };
const listeners = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export function setThemeColors(isDark) {
  currentIsDark = isDark;
  const src = isDark ? darkColors : lightColors;
  Object.keys(currentColors).forEach(key => {
    delete currentColors[key];
  });
  Object.keys(src).forEach(key => {
    currentColors[key] = src[key];
  });
  setLegacyThemeColors(isDark);
  SystemUI.setBackgroundColorAsync(src.background).catch(() => {});
  notifyListeners();
}

export function subscribeToTheme(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getIsDark() {
  return currentIsDark;
}

export function getColors() {
  return currentColors;
}

export function ThemeGate({ children }) {
  // Forces re-render on every theme change by subscribing to a counter state
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const unsubscribe = subscribeToTheme(() => forceUpdate(c => c + 1));
    return unsubscribe;
  }, []);
  return <>{children}</>;
}

// ─── Context ───
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDarkState] = useState(false);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const isDarkRef = useRef(false);

  // Load saved theme preference on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved !== null) {
          const savedIsDark = saved === 'dark';
          isDarkRef.current = savedIsDark;
          setIsDarkState(savedIsDark);
          setThemeColors(savedIsDark);
        } else {
          // Default to system preference, fallback to light
          const systemDark = systemScheme === 'dark';
          isDarkRef.current = systemDark;
          setIsDarkState(systemDark);
          setThemeColors(systemDark);
        }
      } catch {
        // Fallback to system
        const systemDark = systemScheme === 'dark';
        isDarkRef.current = systemDark;
        setIsDarkState(systemDark);
        setThemeColors(systemDark);
      }
      setThemeLoaded(true);
    })();
  }, []);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    const newIsDark = !isDarkRef.current;
    isDarkRef.current = newIsDark;
    setIsDarkState(newIsDark);
    setThemeColors(newIsDark);
    // Persist preference
    AsyncStorage.setItem(THEME_STORAGE_KEY, newIsDark ? 'dark' : 'light').catch(() => {});
  }, []);

  // Set specific theme (light/dark)
  const setTheme = useCallback((theme) => {
    const newIsDark = theme === 'dark';
    if (newIsDark === isDarkRef.current) return;
    isDarkRef.current = newIsDark;
    setIsDarkState(newIsDark);
    setThemeColors(newIsDark);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newIsDark ? 'dark' : 'light').catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      isDark,
      themeLoaded,
      toggleTheme,
      setTheme,
      colors: currentColors,
      spacing,
      borderRadius,
      shadows,
      layout,
      typography,
      gradients: isDark ? { ...gradients, ...darkGradients } : gradients,
    }),
    [isDark, themeLoaded, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      isDark: false,
      themeLoaded: true,
      toggleTheme: () => {},
      setTheme: () => {},
      colors: lightColors,
      spacing,
      borderRadius,
      shadows,
      layout,
      typography,
      gradients,
    };
  }
  return ctx;
}

export { lightColors, darkColors };
