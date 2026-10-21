import React from 'react';
import { StyleSheet, Switch, Text, View, ViewStyle } from 'react-native';
import { useTema } from '@/src/theme';

export interface LinhaSwitchProps {
  titulo: string;
  descricao?: string;
  valor: boolean;
  onMudar: (valor: boolean) => void;
  style?: ViewStyle;
}

/** Texto à esquerda e chave liga/desliga à direita. */
export function LinhaSwitch({ titulo, descricao, valor, onMudar, style }: LinhaSwitchProps) {
  const { colors, typography, spacing, layout } = useTema();

  return (
    <View style={[styles.linha, { minHeight: layout.minTouchTarget }, style]}>
      <View style={{ flex: 1, marginRight: spacing.sm }}>
        <Text
          style={{
            color: colors.text,
            fontFamily: typography.fontFamily.medium,
            fontSize: typography.fontSize.body,
          }}>
          {titulo}
        </Text>
        {descricao ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.caption,
              marginTop: 2,
            }}>
            {descricao}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={titulo}
        value={valor}
        onValueChange={onMudar}
        trackColor={{ false: colors.surfaceVariant, true: colors.primaryLight }}
        thumbColor={valor ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
