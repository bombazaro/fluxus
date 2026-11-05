import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTema } from '@/src/theme';
import { useTamanhoDaTela } from '@/src/hooks/useTamanhoDaTela';

export interface DuasColunasProps {
  esquerda: React.ReactNode;
  direita: React.ReactNode;
}

/** No desktop põe as duas partes lado a lado; no celular e no tablet empilha, esquerda primeiro. */
export function DuasColunas({ esquerda, direita }: DuasColunasProps) {
  const tamanho = useTamanhoDaTela();
  const { spacing } = useTema();
  if (tamanho !== 'largo') {
    return (
      <>
        {esquerda}
        {direita}
      </>
    );
  }
  return (
    <View style={styles.linha}>
      <View style={styles.esquerda}>{esquerda}</View>
      {/* Os cartões da direita trazem uma margem de cima: tira para alinhar com a esquerda */}
      <View style={[styles.direita, { marginTop: -spacing.md }]}>{direita}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  esquerda: { flex: 2 },
  direita: { flex: 3 },
});
