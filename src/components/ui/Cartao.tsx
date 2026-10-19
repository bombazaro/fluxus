import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useTema } from '@/src/theme';

export interface CartaoProps extends ViewProps {
  destaque?: boolean;
  semBorda?: boolean;
}

export function Cartao({ style, destaque, semBorda, children, ...rest }: CartaoProps) {
  const { colors, radii, spacing } = useTema();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: destaque ? colors.surfaceVariant : colors.surface,
          borderRadius: radii.card,
          borderColor: semBorda ? 'transparent' : colors.border,
          borderWidth: semBorda ? 0 : 1,
          padding: spacing.base,
          shadowColor: colors.cardShadow,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
});
