import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { Cartao } from '@/src/components/ui';
import { aguardandoConfirmacao } from '@/src/domain/rendasDoMes';
import { RendaDoMes } from '@/src/types';
import { formatarMoeda } from '@/src/utils/formatadores';

export interface EntradasDoMesProps {
  rendas: RendaDoMes[];
  rendaTotalCentavos: number;
  mesRef: string;
  hojeIso: string;
  onGerenciar: () => void;
  onMarcarRecebida: (renda: RendaDoMes) => void;
  onDesmarcarRecebida: (renda: RendaDoMes) => void;
}

/**
 * Rendas do mês com um botão "Recebi" em cada uma. A renda que já devia ter
 * caído e não foi marcada fica destacada.
 */
export function EntradasDoMes({
  rendas,
  rendaTotalCentavos,
  mesRef,
  hojeIso,
  onGerenciar,
  onMarcarRecebida,
  onDesmarcarRecebida,
}: EntradasDoMesProps) {
  const { colors, typography, spacing, radii } = useTema();

  return (
    <Cartao style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xs,
        }}>
        <Text
          style={{
            color: colors.text,
            fontFamily: typography.fontFamily.semiBold,
            fontSize: 14,
          }}>
          Entradas do mês ({formatarMoeda(rendaTotalCentavos)})
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gerenciar rendas"
          onPress={onGerenciar}
          hitSlop={12}>
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
          Nenhuma renda cadastrada. Toque em Gerenciar para cadastrar seu salário ou rendas.
        </Text>
      ) : (
        rendas.map((r, i) => {
          const atrasada = aguardandoConfirmacao(r, mesRef, hojeIso);
          return (
            <View
              key={r.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.sm,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.text,
                    fontFamily: typography.fontFamily.medium,
                    fontSize: 14,
                  }}>
                  {r.nome}
                </Text>
                <Text
                  style={{
                    color: r.recebida
                      ? colors.success
                      : atrasada
                        ? colors.warning
                        : colors.textSecondary,
                    fontFamily: typography.fontFamily.regular,
                    fontSize: 12,
                    marginTop: 2,
                  }}>
                  {r.recebida
                    ? `Recebida · ${formatarMoeda(r.valor_centavos)}`
                    : atrasada
                      ? `Era para cair no dia ${r.dia_recebimento}. Já caiu?`
                      : `Cai no dia ${r.dia_recebimento} · ${formatarMoeda(r.valor_centavos)}`}
                </Text>
              </View>

              {r.recebida ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${r.nome} recebida. Toque para desmarcar`}
                  onPress={() => onDesmarcarRecebida(r)}
                  hitSlop={8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.md,
                    paddingVertical: 6,
                    borderRadius: radii.full,
                    backgroundColor: colors.successLight,
                  }}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text
                    style={{
                      color: colors.success,
                      fontFamily: typography.fontFamily.semiBold,
                      fontSize: 13,
                      marginLeft: 4,
                    }}>
                    Recebida
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Marcar ${r.nome} como recebida`}
                  onPress={() => onMarcarRecebida(r)}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.md,
                    paddingVertical: 6,
                    borderRadius: radii.full,
                    backgroundColor: atrasada ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    opacity: pressed ? 0.8 : 1,
                  })}>
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={atrasada ? '#FFFFFF' : colors.primary}
                  />
                  <Text
                    style={{
                      color: atrasada ? '#FFFFFF' : colors.primary,
                      fontFamily: typography.fontFamily.semiBold,
                      fontSize: 13,
                      marginLeft: 4,
                    }}>
                    Recebi
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}
    </Cartao>
  );
}
