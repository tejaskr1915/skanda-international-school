// Theme definition for Skanda International School
// Design System: Royal Blue & Crisp White
import { Platform } from 'react-native';

export const colors = {
  brandPrimary: '#1D4ED8', // Royal Blue
  brandPrimaryHover: '#1E40AF',
  brandDark: '#1E3A8A',    // Deep Navy
  brandLight: '#DBEAFE',   // Soft Sky Tint
  brandLightHover: '#BFDBFE',
  bgPage: '#F4F7FB',       // Cool Off-White app canvas
  bgSurface: '#FFFFFF',    // Pure White cards, header, inputs
  borderDefault: '#E2E8F0',// 1px crisp hairline borders
  borderFocused: '#1D4ED8',
  textPrimary: '#0F172A',  // Slate 900
  textSecondary: '#475569',// Slate 600
  textMuted: '#94A3B8',    // Slate 400
  textInverse: '#FFFFFF',  // Crisp White
  statusSuccess: '#16A34A',// Green 600
  statusSuccessBg: '#DCFCE7',
  statusWarning: '#D97706',// Amber 600
  statusWarningBg: '#FEF3C7',
  statusDanger: '#DC2626', // Red 600
  statusDangerBg: '#FEE2E2',
  statusInfo: '#0284C7',   // Sky 600
  statusInfoBg: '#E0F2FE'
};

export const typography = {
  fontFamilyHeading: 'System, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyBody: 'System, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 64
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999
};

export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: '0px 2px 8px rgba(15, 23, 42, 0.05)'
    } as any,
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2
    }
  }),
  hover: Platform.select({
    web: {
      boxShadow: '0px 4px 16px rgba(29, 78, 216, 0.12)'
    } as any,
    default: {
      shadowColor: '#1D4ED8',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4
    }
  }),
  modal: Platform.select({
    web: {
      boxShadow: '0px 10px 24px rgba(15, 23, 42, 0.18)'
    } as any,
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 10
    }
  })
};

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows
};

export default theme;
