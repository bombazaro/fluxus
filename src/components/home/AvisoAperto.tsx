import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { ResultadoAperto } from '@/src/domain/avaliarAperto';

export interface AvisoApertoProps {
  aperto: ResultadoAperto;
  onPress: () => void;
}

/** Faixa amarela (atenção) ou vermelha (aperto/crítico). Não aparece no nível normal. */
export function AvisoAperto({ aperto, onPress }: AvisoApertoProps) {
  const { colors, typography, spacing, radii } = useTema();

  if (aperto.nivel === 'normal') return null;

  const grave = aperto.nivel === 'aperto' || aperto.nivel === 'critico';
  const cor = grave ? colors.danger : colors.warning;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${aperto.mensagem}. Ver contas`}
      onPress={onPress}
      style={[
        styles.apertoBanner,
        {
          backgroundColor: grave ? colors.dangerLight : colors.warningLight,
          borderColor: cor,
          borderRadius: radii.card,
          padding: spacing.md,
          marginBottom: spacing.base,
        },
      ]}>
      <Ionicons name="alert-circle" size={22} color={cor} />
      <Text
        style={[
          styles.apertoTexto,
          {
            color: cor,
            fontFamily: typography.fontFamily.semiBold,
            marginLeft: spacing.sm,
            flex: 1,
          },
        ]}>
        {aperto.mensagem}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={cor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  apertoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  apertoTexto: {
    fontSize: 14,
  },
});
