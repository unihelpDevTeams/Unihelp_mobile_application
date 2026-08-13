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
  blue: '#0e5be9',
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
  brand: '#818CF8',
  brandDark: '#6366F1',
  brandText: '#A5B4FC',
  brandLight: '#202148',
  brandBorder: '#3F3D8F',
  brandGlow: 'rgba(129, 140, 248, 0.28)',
  onBrand: '#FFFFFF',

  // Neutrals
  ink: '#F4F7FB',
  inkLight: '#D8E0EC',
  inkMuted: '#B4C0D0',
  grey: '#A7B3C4',
  greyLight: '#7B8797',
  border: '#2A3546',
  borderLight: '#243044',
  surface: '#151B26',
  canvas: '#0F141D',
  canvasLight: '#192130',
  skeleton: '#202A3A',
  skeletonLine: '#2B374A',

  blue: '#60A5FA',
  blueLight: '#102A45',
  green: '#34D399',
  greenLight: '#073B31',
  orange: '#FB923C',
  orangeLight: '#3D230F',
  purple: '#A78BFA',
  purpleLight: '#2F2148',
  amber: '#FBBF24',
  amberLight: '#3A2A0B',
  teal: '#2DD4BF',
  tealLight: '#113D3A',
  red: '#F87171',
  redLight: '#3A1218',
  redBorder: '#7F2D36',
  rose: '#FB7185',

  // Premium
  gold: '#FBBF24',
  goldLight: '#3A2A0B',

  // Overlay
  overlay: 'rgba(8, 13, 22, 0.78)',
  whiteTransparent: 'rgba(21, 27, 38, 0.92)',
  brandTransparent: 'rgba(129, 140, 248, 0.16)',

  // Semantic aliases
  background: '#0F141D',
  surfacePrimary: '#151B26',
  surfaceSecondary: '#192130',

  textPrimary: '#F4F7FB',
  textSecondary: '#B4C0D0',
  textTertiary: '#7B8797',

  borderDefault: '#2A3546',
  divider: '#243044',

  inputBackground: '#111823',
  placeholder: '#7B8797',

  icon: '#A7B3C4',

  shadow: '#050914',

  notification: '#818CF8',

  success: '#34D399',
  warning: '#FB923C',
  error: '#F87171',
  info: '#38BDF8',

  card: '#151B26',

  statusBar: 'light',

  tabBarBackground: '#151B26',
  tabBarBorder: '#2A3546',
  tabBarActive: '#A5B4FC',
  tabBarInactive: '#7B8797',

  headerBackground: '#151B26',
  headerText: '#F4F7FB',

  modalBackground: '#202939',
  bottomSheetBackground: '#202939',

  toastBackground: '#202939',
  toastText: '#F4F7FB',

  skeletonBackground: '#202A3A',
  skeletonHighlight: '#2B374A',

  disabledBackground: '#202A3A',
  disabledText: '#6F7B8C',

  focusRing: '#818CF8',

  danger: '#F87171',
  dangerLight: '#3A1218',
  dangerBorder: '#7F2D36',

  // Additional required semantic tokens
  inputBorder: '#334155',
  inputPlaceholder: '#7B8797',
  iconSecondary: '#7B8797',
  cardElevated: '#202939',
  tabBar: '#151B26',
  header: '#151B26',
  modal: '#202939',
  toast: '#202939',
  fab: '#818CF8',
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
  brand: ['#818CF8', '#6D5DF6'],
  auth: ['#0F141D', '#171B2F', '#202148'],
};
