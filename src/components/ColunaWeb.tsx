import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTema } from '@/src/theme';

/** Largura máxima do app no navegador: telas de celular esticadas ficam feias no desktop. */
export const LARGURA_MAXIMA_WEB = 480;

/** No celular não faz nada; na web centraliza o app numa coluna de largura limitada. */
export function ColunaWeb({ children }: { children: React.ReactNode }) {
  const { colors } = useTema();
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={[styles.fundo, { backgroundColor: colors.surfaceVariant }]}>
      <View style={[styles.coluna, { backgroundColor: colors.background }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: LARGURA_MAXIMA_WEB },
});
