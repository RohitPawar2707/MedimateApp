/**
 * Premium Medimate Theme
 * Optimized for professional medical aesthetics with "Wahhh" factor.
 */

import { Platform } from 'react-native';

const primaryColor = '#4F46E5'; // Deep Indigo
const secondaryColor = '#06B6D4'; // Modern Cyan
const accentColor = '#10B981'; // Success Green
const warningColor = '#F59E0B'; // Alert Amber
const errorColor = '#EF4444'; // Soft Red

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
    success: accentColor,
    warning: warningColor,
    error: errorColor,
    glass: 'rgba(255, 255, 255, 0.8)',
    cardShadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
      elevation: 10,
    }
  },
  dark: {
    text: '#F8FAFC',
    textDim: '#94A3B8',
    background: '#0F172A', // Slate 900
    surface: '#1E293B', // Slate 800
    card: '#1E293B',
    border: '#334155',
    input: '#0F172A',
    tint: secondaryColor,
    icon: '#94A3B8',
    tabIconDefault: '#475569',
    tabIconSelected: secondaryColor,
    primary: primaryColor,
    secondary: secondaryColor,
    success: accentColor,
    warning: warningColor,
    error: errorColor,
    glass: 'rgba(30, 41, 59, 0.8)',
    cardShadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 15 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 20,
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
  md: 12,
  lg: 20,
  xl: 32,
  full: 999,
};
