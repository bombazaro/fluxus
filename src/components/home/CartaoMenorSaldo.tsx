import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { Cartao } from '@/src/components/ui';
import { ResultadoSaldoPorDia } from '@/src/domain/saldoPorDia';

/** Linha do tempo do saldo resumida: o dia do mês em que o saldo fica mais baixo. */
export function CartaoMenorSaldo({ saldoPorDia }: { saldoPorDia: ResultadoSaldoPorDia }) {
  const { colors, typography, spacing } = useTema();
  const negativo = saldoPorDia.menorSaldoCentavos < 0;

  return (
    <Cartao style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: negativo ? colors.dangerLight : colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.sm,
          }}>
          <Ionicons
            name="calendar-outline"
            size={20}
            color={negativo ? colors.danger : colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontFamily: typography.fontFamily.semiBold,
              fontSize: 14,
            }}>
            Dia mais apertado: Dia {String(saldoPorDia.diaMenorSaldo).padStart(2, '0')}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: typography.fontFamily.regular,
              fontSize: 12,
              marginTop: 2,
            }}>
            {saldoPorDia.mensagemAperto}
          </Text>
        </View>
      </View>
    </Cartao>
  );
}
