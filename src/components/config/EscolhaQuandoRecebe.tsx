import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';

const OPCOES: { usarSobra: boolean; titulo: string; texto: string }[] = [
  {
    usarSobra: false,
    titulo: 'Antes das contas vencerem',
    texto: 'Ex.: o salário cai dia 5 e as contas vencem depois. Cada mês se paga sozinho.',
  },
  {
    usarSobra: true,
    titulo: 'Depois de algumas contas vencerem',
    texto:
      'Ex.: o salário cai dia 30 e paga as contas do dia 10 do mês seguinte. O que sobra de um ' +
      'mês entra como saldo no começo do outro.',
  },
];

export interface EscolhaQuandoRecebeProps {
  /** true = começar o mês com a sobra do mês anterior. */
  usarSobra: boolean;
  onMudar: (usarSobra: boolean) => void;
}

/**
 * Pergunta se o salário cai antes ou depois das contas, que é o que decide se
 * o mês deve começar com a sobra do mês anterior.
 */
export function EscolhaQuandoRecebe({ usarSobra, onMudar }: EscolhaQuandoRecebeProps) {
  const { colors, typography, spacing, radii } = useTema();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Quando seu salário cai">
      {OPCOES.map((o) => {
        const marcada = o.usarSobra === usarSobra;
        return (
          <Pressable
            key={o.titulo}
            accessibilityRole="radio"
            accessibilityState={{ selected: marcada }}
            onPress={() => onMudar(o.usarSobra)}
            style={[
              styles.opcao,
              {
                borderColor: marcada ? colors.primary : colors.border,
                backgroundColor: marcada ? colors.primaryLight : colors.surface,
                borderRadius: radii.card,
                padding: spacing.md,
                marginTop: o.usarSobra ? spacing.sm : 0,
              },
            ]}>
            <Ionicons
              name={marcada ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={marcada ? colors.primary : colors.textSecondary}
            />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: typography.fontFamily.semiBold,
                  fontSize: typography.fontSize.body,
                }}>
                {o.titulo}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily.regular,
                  fontSize: typography.fontSize.caption,
                  lineHeight: 18,
                  marginTop: 2,
                }}>
                {o.texto}
              </Text>
            </View>
          </Pressable>
        );
      })}

      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.fontSize.caption,
          lineHeight: 18,
          marginTop: spacing.sm,
        }}>
        A sobra é a renda menos as contas cadastradas. Gastos que você não cadastra (mercado, lazer)
        não entram, então ela pode ser maior que o dinheiro que sobrou de verdade.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  opcao: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },
});
