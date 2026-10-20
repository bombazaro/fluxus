import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTema } from '@/src/theme';
import { Cartao } from '@/src/components/ui';
import { RendaDoMes } from '@/src/types';
import { formatarMoeda } from '@/src/utils/formatadores';

export interface EntradasDoMesProps {
  rendas: RendaDoMes[];
  rendaTotalCentavos: number;
  onGerenciar: () => void;
}

/** Lista das rendas que entram no mês, com o dia e se já foram recebidas. */
export function EntradasDoMes({ rendas, rendaTotalCentavos, onGerenciar }: EntradasDoMesProps) {
  const { colors, typography, spacing } = useTema();

  return (
    <Cartao style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: rendas.length > 0 ? spacing.sm : 0,
        }}>
        <Text
          style={{
            color: colors.text,
            fontFamily: typography.fontFamily.semiBold,
            fontSize: 14,
          }}>
          Entradas do Mês ({formatarMoeda(rendaTotalCentavos)})
        </Text>
        <Pressable accessibilityRole="button" onPress={onGerenciar} hitSlop={12}>
          <Text
            style={{
              color: colors.primary,
              fontFamily: typography.fontFamily.medium,
              fontSize: 12,
            }}>
            Gerenciar
          </Text>
        </Pressable>
      </View>
      {rendas.length === 0 ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: typography.fontFamily.regular,
            fontSize: 13,
          }}>
          Nenhuma renda cadastrada. Toque em gerenciar para cadastrar seu salário ou rendas.
        </Text>
      ) : (
        rendas.map((r) => (
          <View
            key={r.id}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 4,
            }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.regular,
                fontSize: 13,
              }}>
              {r.nome} (Dia {r.dia_recebimento}){r.recebida ? ' • Recebida' : ''}
            </Text>
            <Text
              style={{
                color: colors.success,
                fontFamily: typography.fontFamily.semiBold,
                fontSize: 13,
              }}>
              {formatarMoeda(r.valor_centavos)}
            </Text>
          </View>
        ))
      )}
    </Cartao>
  );
}
