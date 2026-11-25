import React from 'react';
import { Pressable, ViewStyle, StyleProp, Platform } from 'react-native';

interface AnimatedHoverCardProps {
  children: React.ReactNode | ((state: { hovered: boolean; pressed: boolean }) => React.ReactNode);
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  hoverStyle?: StyleProp<ViewStyle>;
  disableHoverScale?: boolean;
  className?: string;
  testID?: string;
  nativeID?: string;
  accessibilityLabel?: string;
}

export const AnimatedHoverCard: React.FC<AnimatedHoverCardProps> = ({
  children,
  onPress,
  style,
  hoverStyle,
  disableHoverScale = false,
  className,
  testID,
  nativeID,
  accessibilityLabel
}) => {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      nativeID={nativeID}
      accessibilityLabel={accessibilityLabel}
      style={({ hovered, pressed }: any) => [
        style,
        Platform.OS === 'web'
          ? ({
              transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: onPress ? 'pointer' : 'default',
              transform: pressed
                ? 'scale(0.99)'
                : hovered && !disableHoverScale
                ? 'translateY(-4px) scale(1.01)'
                : 'translateY(0px) scale(1)',
              ...(hovered
                ? {
                    borderColor: '#1D4ED8',
                    boxShadow: '0 12px 24px -6px rgba(29, 78, 216, 0.16)'
                  }
                : {})
            } as any)
          : undefined,
        hovered && hoverStyle
      ]}
      {...(Platform.OS === 'web' && className ? ({ className } as any) : {})}
    >
      {({ hovered, pressed }: any) =>
        typeof children === 'function' ? children({ hovered: !!hovered, pressed: !!pressed }) : children
      }
    </Pressable>
  );
};

interface AnimatedButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  hoverBgColor?: string;
  className?: string;
  testID?: string;
  nativeID?: string;
  accessibilityLabel?: string;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onPress,
  disabled = false,
  style,
  hoverBgColor = '#1E40AF',
  className,
  testID,
  nativeID,
  accessibilityLabel
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      nativeID={nativeID}
      accessibilityLabel={accessibilityLabel}
      style={({ hovered, pressed }: any) => [
        style,
        Platform.OS === 'web'
          ? ({
              transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transform: pressed && !disabled
                ? 'scale(0.98)'
                : hovered && !disabled
                ? 'translateY(-1px)'
                : 'none',
              ...(hovered && !disabled
                ? {
                    backgroundColor: hoverBgColor,
                    boxShadow: '0 8px 20px -4px rgba(29, 78, 216, 0.35)'
                  }
                : {})
            } as any)
          : undefined
      ]}
      {...(Platform.OS === 'web' && className ? ({ className } as any) : {})}
    >
      {children}
    </Pressable>
  );
};
