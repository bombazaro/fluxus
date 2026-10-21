import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTema } from '@/src/theme';

export interface GrupoOpcoesProps<T extends string | number> {
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onMudar: (valor: T) => void;
  /** Nome do grupo para o leitor de tela (ex.: "Tema"). */
  rotuloAcessivel: string;
  style?: ViewStyle;
}

/** Botões lado a lado em que só um fica marcado (ex.: Sistema | Claro | Escuro). */
export function GrupoOpcoes<T extends string | number>({
  opcoes,
  valor,
  onMudar,
  rotuloAcessivel,
  style,
}: GrupoOpcoesProps<T>) {
  const { colors, typography, radii, layout } = useTema();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={rotuloAcessivel}
      style={[
        styles.grupo,
        { backgroundColor: colors.surfaceVariant, borderRadius: radii.button },
        style,
      ]}>
      {opcoes.map((opcao) => {
        const ativa = opcao.valor === valor;
        return (
          <Pressable
            key={String(opcao.valor)}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativa }}
            accessibilityLabel={opcao.rotulo}
            onPress={() => onMudar(opcao.valor)}
            style={[
              styles.opcao,
              {
                minHeight: layout.minTouchTarget - 8,
                borderRadius: radii.sm,
                backgroundColor: ativa ? colors.surface : 'transparent',
              },
            ]}>
            <Text
              style={{
                color: ativa ? colors.primary : colors.textSecondary,
                fontFamily: ativa ? typography.fontFamily.semiBold : typography.fontFamily.medium,
                fontSize: typography.fontSize.caption,
              }}>
              {opcao.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  opcao: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});
