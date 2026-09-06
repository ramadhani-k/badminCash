import { Platform } from 'react-native';

export const OliveTheme = {
  primary: '#71832A', // Main Olive Green
  primaryDark: '#505E1C',
  primaryLight: '#E3ECBA',
  background: '#F5F6EC',
  card: '#FFFFFF',
  cardSecondary: '#EEF2D8',
  text: '#273111',
  textMuted: '#67724C',
  border: '#D8E0B5',
  success: '#4A8B3B',
  badgeBg: '#DFF0D8',
};

export const Colors = {
  light: {
    text: '#273111',
    background: '#F5F6EC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E3ECBA',
    textSecondary: '#67724C',
  },
  dark: {
    text: '#F5F6EC',
    background: '#1A200B',
    backgroundElement: '#2B3314',
    backgroundSelected: '#404B1D',
    textSecondary: '#A3B082',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
