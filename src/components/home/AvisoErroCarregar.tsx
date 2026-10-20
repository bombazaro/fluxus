import React from 'react';
import { Text } from 'react-native';
import { useTema } from '@/src/theme';
import { Cartao } from '@/src/components/ui';

/** Faixa mostrada quando o carregamento do mês falha. */
export function AvisoErroCarregar() {
  const { colors, typography, spacing } = useTema();

  return (
    <Cartao
      style={{
        backgroundColor: colors.dangerLight,
        borderColor: colors.danger,
        marginBottom: spacing.base,
      }}>
      <Text
        style={{
          color: colors.text,
          fontFamily: typography.fontFamily.semiBold,
          fontSize: typography.fontSize.body,
        }}>
        Não foi possível carregar os dados deste mês.
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.fontSize.caption,
          marginTop: spacing.xs,
        }}>
        Seus dados continuam salvos. Puxe a tela para baixo para tentar de novo.
      </Text>
    </Cartao>
  );
}
