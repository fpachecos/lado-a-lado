import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Warm multi-tone gradient background that mirrors the web app's
 * radial gradient: peach top-left → warm cream center → golden bottom-right.
 */
export function GradientBackground({ children, style }: Props) {
  return (
    <LinearGradient
      colors={['#ffd4bf', '#fce8c4', '#f0c87a']}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </LinearGradient>
  );
}
