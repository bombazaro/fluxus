import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTema } from '@/src/theme';

export interface BarraProgressoProps {
  progresso: number; // 0 a 1 (ou maior se ultrapassar 100%)
  altura?: number;
  corFixa?: string;
  style?: ViewStyle;
}

export function BarraProgresso({
  progresso,
  altura = 8,
  corFixa,
  style,
}: BarraProgressoProps) {
  const { colors, radii } = useTema();

  const progressoNormalizado = Math.max(0, progresso);
  const percentualLargura = `${Math.min(100, Math.round(progressoNormalizado * 100))}%` as const;

  let corPreenchimento = corFixa;
  if (!corPreenchimento) {
    if (progressoNormalizado > 1) {
      corPreenchimento = colors.danger;
    } else if (progressoNormalizado >= 0.8) {
      corPreenchimento = colors.warning;
    } else {
      corPreenchimento = colors.success;
    }
  }

  return (
    <View
      style={[
        styles.trilho,
        {
          height: altura,
          backgroundColor: colors.surfaceVariant,
          borderRadius: radii.full,
        },
        style,
      ]}>
      <View
        style={[
          styles.preenchimento,
          {
            width: percentualLargura,
            height: altura,
            backgroundColor: corPreenchimento,
            borderRadius: radii.full,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: {
    width: '100%',
    overflow: 'hidden',
  },
  preenchimento: {},
});
