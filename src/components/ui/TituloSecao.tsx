import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTema } from '@/src/theme';

/** Título pequeno em maiúsculas que separa as seções de uma tela. */
export function TituloSecao({ children, style }: { children: string; style?: TextStyle }) {
  const { colors, typography, spacing } = useTema();

  return (
    <Text
      accessibilityRole="header"
      style={[
        {
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.semiBold,
          fontSize: 12,
          letterSpacing: 1,
          marginTop: spacing.lg,
          marginBottom: spacing.xs,
        },
        style,
      ]}>
      {children.toUpperCase()}
    </Text>
  );
}
