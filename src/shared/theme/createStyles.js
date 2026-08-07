/**
 * Helper to create dynamic stylesheets that react to theme changes.
 *
 * In React Native, StyleSheet.create() bakes values at creation time and
 * does NOT update when the colors object changes at runtime.
 *
 * Use this helper for any component that needs theme-aware styles.
 *
 * USAGE:
 *   const styles = useThemeStyles((colors) => ({
 *     container: {
 *       backgroundColor: colors.surface,
 *     },
 *     text: {
 *       color: colors.ink,
 *     },
 *   }));
 *
 * This will automatically recreate the StyleSheet whenever the theme changes.
 */

import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';

/**
 * Hook that creates a StyleSheet from a factory function.
 * The factory receives the current theme colors and returns a style object.
 * The StyleSheet is automatically recreated when the theme changes.
 *
 * @param {Function} styleFactory - (colors, spacing, borderRadius) => style object
 * @param {Array} deps - Additional dependencies for useMemo
 * @returns {Object} StyleSheet created styles
 */
export function useThemeStyles(styleFactory, deps = []) {
  const { colors, spacing, borderRadius, isDark } = useTheme();

  return useMemo(() => {
    const rawStyles = styleFactory(colors, spacing, borderRadius);
    return StyleSheet.create(rawStyles);
  }, [colors, spacing, borderRadius, isDark, ...deps]);
}