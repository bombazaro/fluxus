import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { Cartao } from '@/src/components/ui';
import { ComparacaoMeses } from '@/src/domain/compararMeses';
import { formatarMesAno, formatarMoeda } from '@/src/utils/formatadores';

export interface CartaoComparacaoProps {
  comparacao: ComparacaoMeses;
  mesAnterior: string;
  onPress: () => void;
}

/** "Você gastou 12% a mais que em setembro", com seta vermelha (subiu) ou verde (caiu). */
export function CartaoComparacao({ comparacao, mesAnterior, onPress }: CartaoComparacaoProps) {
  const { colors, typography, spacing } = useTema();

  if (comparacao.percentual === null) return null;

  const nomeMes = formatarMesAno(mesAnterior).split(' ')[0].toLowerCase();
  const pct = Math.round(Math.abs(comparacao.percentual) * 100);
  const subiu = comparacao.diferenca > 0;
  const igual = pct === 0;
  const cor = igual ? colors.textSecondary : subiu ? colors.danger : colors.success;

  const frase = igual
    ? `Você gastou o mesmo que em ${nomeMes}`
    : `Você gastou ${pct}% a ${subiu ? 'mais' : 'menos'} que em ${nomeMes}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${frase}. Ver comparação por categoria`}
      onPress={onPress}>
      <Cartao style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: igual
                ? colors.surfaceVariant
                : subiu
                  ? colors.dangerLight
                  : colors.successLight,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.sm,
            }}>
            <Ionicons
              name={igual ? 'remove' : subiu ? 'arrow-up' : 'arrow-down'}
              size={20}
              color={cor}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.text,
                fontFamily: typography.fontFamily.semiBold,
                fontSize: 14,
              }}>
              {frase}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.regular,
                fontSize: 12,
                marginTop: 2,
              }}>
              {comparacao.maiorAlta
                ? `${comparacao.maiorAlta.nome} foi o que mais subiu: +${formatarMoeda(
                    comparacao.maiorAlta.diferenca
                  )}`
                : `${formatarMoeda(comparacao.totalAnterior)} → ${formatarMoeda(comparacao.totalAtual)}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Cartao>
    </Pressable>
  );
}
