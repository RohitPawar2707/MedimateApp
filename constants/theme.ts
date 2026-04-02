/**
 * Premium Medimate Theme
 * Optimized for professional medical aesthetics with "Wahhh" factor.
 */

import { Platform } from 'react-native';

const primaryColor = '#3B6CF6'; // Primary Blue
const secondaryColor = '#0EA5A0'; // Accent Teal
const successColor = '#16A34A'; // Success Green
const warningColor = '#F59E0B'; // Warning Amber
const errorColor = '#DC2626'; // Error Red

export const Colors = {
  light: {
    text: '#1E293B',
    textDim: '#64748B',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E2E8F0',
    input: '#F1F5F9',
    tint: primaryColor,
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: primaryColor,
    primary: primaryColor,
    secondary: secondaryColor,
    success: successColor,
    warning: warningColor,
    error: errorColor,
    glass: 'rgba(255, 255, 255, 0.8)',
    cardShadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
      elevation: 5,
    }
  },
  dark: {
    text: '#F8FAFC',
    textDim: '#94A3B8',
    background: '#0F172A', // Slate 900
    surface: '#1E293B', // Slate 800
    card: '#1F2937', // User requested #1F2937
    border: '#334155',
    input: '#0F172A',
    tint: '#5B89F8', // Lighter blue for dark mode
    icon: '#94A3B8',
    tabIconDefault: '#475569',
    tabIconSelected: '#5B89F8',
    primary: '#5B89F8',
    secondary: '#2DD4BF', // User requested #2DD4BF
    success: '#22C55E', // User requested #22C55E
    warning: '#FBBF24', // User requested #FBBF24
    error: '#EF4444', // User requested #EF4444
    glass: 'rgba(30, 41, 59, 0.8)',
    cardShadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 15 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    }
  },
};

export const Gaps = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 8,
  md: 16, // User requested 16px
  lg: 20,
  xl: 32,
  full: 999,
};
