import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTema } from '@/src/theme';
import { LARGURA_MAXIMA } from '@/src/domain/tamanhoDaTela';
import { useTamanhoDaTela } from '@/src/hooks/useTamanhoDaTela';

/** No celular não faz nada; na web centraliza o app numa coluna que cresce com a janela. */
export function ColunaWeb({ children }: { children: React.ReactNode }) {
  const { colors } = useTema();
  const tamanho = useTamanhoDaTela();
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={[styles.fundo, { backgroundColor: colors.surfaceVariant }]}>
      <View
        style={[
          styles.coluna,
          {
            backgroundColor: colors.background,
            maxWidth: LARGURA_MAXIMA[tamanho] ?? undefined,
          },
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, alignItems: 'center' },
  coluna: { flex: 1, width: '100%' },
});
