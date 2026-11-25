import React from 'react';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { IMAGES } from '../assets/images';

interface SchoolLogoBadgeProps {
  size?: number;
}

export const SchoolLogoBadge: React.FC<SchoolLogoBadgeProps> = ({ size = 42 }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.badgeWrapper, { width: size, height: size }]}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 42 42"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <linearGradient id="skandaLogoGrad" x1="0" y1="0" x2="42" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
            <filter id="skandaBadgeShadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#1E3A8A" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Sharp Royal Blue rounded-square badge (width: 42px, height: 42px, borderRadius: 10) */}
          <rect
            width="42"
            height="42"
            rx="10"
            fill="url(#skandaLogoGrad)"
            filter="url(#skandaBadgeShadow)"
          />
          {/* Subtle crisp inner border */}
          <rect
            x="0.75"
            y="0.75"
            width="40.5"
            height="40.5"
            rx="9.25"
            stroke="rgba(255, 255, 255, 0.22)"
            strokeWidth="1"
          />

          {/* Crisp white geometric shield/open-book emblem */}
          <path
            d="M9 31C13 29.5 17 29.8 21 31.5C25 29.8 29 29.5 33 31V13C29 11.5 25 11.8 21 13.5C17 11.8 13 11.5 9 13V31Z"
            stroke="#93C5FD"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="rgba(255, 255, 255, 0.08)"
          />
          <line
            x1="21"
            y1="13.5"
            x2="21"
            y2="31.5"
            stroke="#93C5FD"
            strokeWidth="1.2"
          />

          {/* Academic Crest Star */}
          <path
            d="M21 7.2L22.1 9.8L24.8 10.1L22.7 11.9L23.3 14.5L21 13.1L18.7 14.5L19.3 11.9L17.2 10.1L19.9 9.8L21 7.2Z"
            fill="#FBBF24"
            opacity="0.9"
          />

          {/* Bold 'S' Monogram (fontSize: 20, fontWeight: 800, color: '#FFFFFF') */}
          <text
            x="21"
            y="23.5"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#FFFFFF"
            fontSize="20"
            fontWeight="800"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            letterSpacing="-0.5"
            style={{ userSelect: 'none' }}
          >
            S
          </text>
        </svg>
      </View>
    );
  }

  return (
    <View style={[styles.badgeWrapper, { width: size, height: size }]}>
      <Image
        source={IMAGES.logo}
        defaultSource={IMAGES.fallback}
        style={{ width: size, height: size, borderRadius: 10 }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  badgeWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4ED8'
  }
});
