import { Platform } from 'react-native';

// ============================================================
// COLORS - Light Mode
// ============================================================
export const lightColors = {
  // Brand
  brand: '#4F46E5',
  brandDark: '#3730A3',
  brandText: '#4338CA',
  brandLight: '#EEF2FF',
  brandBorder: '#E0E7FF',
  brandGlow: '#C7D2FE',
  onBrand: '#FFFFFF',

  // Neutrals
  ink: '#0F172A',
  inkLight: '#334155',
  inkMuted: '#475569',
  grey: '#64748B',
  greyLight: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#EEF0F6',
  surface: '#FFFFFF',
  canvas: '#F6F8FC',
  canvasLight: '#F8FAFC',
  skeleton: '#F1F5F9',
  skeletonLine: '#E2E8F0',

  // Accent tones
  blue: '#0EA5E9',
  blueLight: '#F0F9FF',
  green: '#10B981',
  greenLight: '#ECFDF5',
  orange: '#F97316',
  orangeLight: '#FFF7ED',
  purple: '#9333EA',
  purpleLight: '#F5F3FF',
  amber: '#B45309',
  amberLight: '#FFFBEB',
  teal: '#0F766E',
  tealLight: '#CCFBF1',
  red: '#DC2626',
  redLight: '#FEF2F2',
  redBorder: '#FECACA',
  rose: '#B91C1C',

  // Premium
  gold: '#B45309',
  goldLight: '#FEF3C7',

  // Overlay
  overlay: 'rgba(15, 23, 42, 0.5)',
  whiteTransparent: 'rgba(255,255,255,0.9)',
  brandTransparent: '#FFFFFF12',

  // Semantic aliases (point to same values for clarity)
  background: '#F6F8FC',
  surfacePrimary: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  borderDefault: '#E2E8F0',
  divider: '#E2E8F0',
  inputBackground: '#F8FAFC',
  placeholder: '#94A3B8',
  icon: '#64748B',
  shadow: '#0F172A',
  notification: '#4F46E5',
  success: '#10B981',
  warning: '#F97316',
  error: '#DC2626',
  info: '#0EA5E9',
  card: '#FFFFFF',
  statusBar: 'dark',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabBarActive: '#4F46E5',
  tabBarInactive: '#64748B',
  headerBackground: '#FFFFFF',
  headerText: '#0F172A',
  modalBackground: '#FFFFFF',
  bottomSheetBackground: '#FFFFFF',
  toastBackground: '#0F172A',
  toastText: '#FFFFFF',
  skeletonBackground: '#F1F5F9',
  skeletonHighlight: '#E2E8F0',
  disabledBackground: '#F1F5F9',
  disabledText: '#94A3B8',
  focusRing: '#4F46E5',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  dangerBorder: '#FECACA',

  // Additional required semantic tokens (mirrors darkColors so switching
  // themes never leaves a stale/undefined value behind)
  inputBorder: '#CBD5E1',
  inputPlaceholder: '#94A3B8',
  iconSecondary: '#94A3B8',
  cardElevated: '#FFFFFF',
  tabBar: '#FFFFFF',
  header: '#FFFFFF',
  modal: '#FFFFFF',
  toast: '#0F172A',
  fab: '#4F46E5',
};

// ============================================================
// COLORS - Dark Mode
// ============================================================
export const darkColors = {
  // Brand
  brand: '#6366F1',
  brandDark: '#818CF8',
  brandText: '#C7D2FE',
  brandLight: '#312E81',
  brandBorder: '#4338CA',
  brandGlow: '#6366F1',
  onBrand: '#FFFFFF',

  // Neutrals
  ink: '#F8FAFC',
  inkLight: '#E2E8F0',
  inkMuted: '#CBD5E1',
  grey: '#94A3B8',
  greyLight: '#64748B',
  border: '#334155',
  borderLight: '#1E293B',
  surface: '#111827',
  canvas: '#0F172A',
  canvasLight: '#1E293B',
  skeleton: '#1E293B',
  skeletonLine: '#334155',

  // Accent tones
  blue: '#38BDF8',
  blueLight: '#082F49',

  green: '#34D399',
  greenLight: '#052E2B',

  orange: '#FB923C',
  orangeLight: '#431407',

  purple: '#A78BFA',
  purpleLight: '#2E1065',

  amber: '#FBBF24',
  amberLight: '#451A03',

  teal: '#2DD4BF',
  tealLight: '#042F2E',

  red: '#F87171',
  redLight: '#450A0A',
  redBorder: '#7F1D1D',

  rose: '#FB7185',

  // Premium
  gold: '#FBBF24',
  goldLight: '#3F2A00',

  // Overlay
  overlay: 'rgba(0,0,0,0.65)',
  whiteTransparent: 'rgba(17,24,39,0.92)',
  brandTransparent: '#6366F122',

  // Semantic aliases
  background: '#0F172A',
  surfacePrimary: '#111827',
  surfaceSecondary: '#1E293B',

  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',

  borderDefault: '#334155',
  divider: '#334155',

  inputBackground: '#1E293B',
  placeholder: '#64748B',

  icon: '#CBD5E1',

  shadow: '#000000',

  notification: '#6366F1',

  success: '#34D399',
  warning: '#FB923C',
  error: '#F87171',
  info: '#38BDF8',

  card: '#111827',

  statusBar: 'light',

  tabBarBackground: '#111827',
  tabBarBorder: '#334155',
  tabBarActive: '#818CF8',
  tabBarInactive: '#64748B',

  headerBackground: '#111827',
  headerText: '#F8FAFC',

  modalBackground: '#111827',
  bottomSheetBackground: '#111827',

  toastBackground: '#F8FAFC',
  toastText: '#111827',

  skeletonBackground: '#1E293B',
  skeletonHighlight: '#334155',

  disabledBackground: '#1E293B',
  disabledText: '#64748B',

  focusRing: '#818CF8',

  danger: '#F87171',
  dangerLight: '#450A0A',
  dangerBorder: '#7F1D1D',

  // Additional required semantic tokens
  inputBorder: '#475569',
  inputPlaceholder: '#64748B',
  iconSecondary: '#64748B',
  cardElevated: '#1E293B',
  tabBar: '#111827',
  header: '#111827',
  modal: '#1E293B',
  toast: '#F8FAFC',
  fab: '#6366F1',
};

// ============================================================
// REACTIVE COLORS - Module-level state for theme switching
// ============================================================
export const colors = { ...lightColors };

let currentThemeListeners = [];
export function onThemeChange(listener) {
  currentThemeListeners.push(listener);
  return () => {
    currentThemeListeners = currentThemeListeners.filter(l => l !== listener);
  };
}

export function setThemeColors(isDark) {
  const newColors = isDark ? darkColors : lightColors;
  Object.assign(colors, newColors);
  currentThemeListeners.forEach(l => l(isDark));
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

// ============================================================
// TYPOGRAPHY
// ============================================================
export const typography = {
  xs: { fontSize: 11 },
  sm: { fontSize: 12 },
  md: { fontSize: 13 },
  lg: { fontSize: 14 },
  xl: { fontSize: 15 },
  '2xl': { fontSize: 17 },
  '3xl': { fontSize: 19 },
  '4xl': { fontSize: 20 },
  '5xl': { fontSize: 24 },
  '6xl': { fontSize: 30 },
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  extrabold: { fontWeight: '800' },
  black: { fontWeight: '900' },
};

// ============================================================
// BORDER RADIUS
// ============================================================
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  '2xl': 18,
  '3xl': 20,
  '4xl': 22,
  '5xl': 26,
  '6xl': 28,
  full: 999,
};

// ============================================================
// SHADOWS (Platform-aware)
// ============================================================
// Note: shadowColor is intentionally a fixed constant rather than reading
// the mutable `colors` singleton. Default parameters evaluate once, at
// module load time, so `color = colors.ink` would silently freeze every
// shadow to whatever `colors.ink` happened to be at import time (always
// the light-mode value) and never update again after a theme switch.
const createShadow = (elevation, opacity = 0.06, radius = 10, offsetY = 4, color = '#0F172A') => ({
  ...Platform.select({
    ios: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
    },
    android: { elevation },
    default: {},
  }),
});

export const shadows = {
  none: {},
  sm: createShadow(1, 0.04, 6, 2),
  md: createShadow(2, 0.06, 10, 4),
  lg: createShadow(3, 0.08, 12, 6),
  xl: createShadow(4, 0.12, 16, 8),
  brand: {
    ...Platform.select({
      ios: {
        shadowColor: '#4338CA',
        shadowOpacity: 0.25,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  brandLight: {
    ...Platform.select({
      ios: {
        shadowColor: '#4338CA',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  card: createShadow(2, 0.05, 8, 3),
  fab: {
    ...Platform.select({
      ios: {
        shadowColor: '#4338CA',
        shadowOpacity: 0.28,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  menu: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.12,
        shadowRadius: 24,
        shadowOffset: { width: -4, height: 0 },
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
};

// ============================================================
// LAYOUT
// ============================================================
export const layout = {
  screenPadding: 18,
  sectionGap: 8,
  cardGap: 10,
  headerHeight: 58,
  tabBarHeight: Platform.OS === 'ios' ? 84 : 70,
  fabSize: 56,
  avatarSize: 88,
  iconButtonSize: 38,
};

// ============================================================
// GRADIENTS
// ============================================================
export const gradients = {
  brand: ['#4F46E5', '#7C3AED'],
  auth: ['#F6F7FF', '#EEF2FF', '#F8FAFC'],
};

export const darkGradients = {
  brand: ['#818CF8', '#6D28D9'],
  auth: ['#0F172A', '#1E1B4B', '#020617'],
};