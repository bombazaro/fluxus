import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';

/** Aviso no topo do formulário preenchido pela IA: lembra de conferir e mostra o que está em dúvida. */
export function FaixaIa({ aviso }: { aviso?: string }) {
  const { colors, radii, spacing, typography } = useTema();
  return (
    <View
      accessibilityRole="summary"
      style={{
        flexDirection: 'row',
        padding: spacing.md,
        marginBottom: spacing.base,
        borderRadius: radii.card,
        backgroundColor: colors.primaryLight,
      }}>
      <Ionicons name="sparkles" size={18} color={colors.primary} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text
          style={{
            color: colors.primary,
            fontFamily: typography.fontFamily.semiBold,
            fontSize: typography.fontSize.caption,
          }}>
          Preenchido pela IA. Confira antes de salvar.
        </Text>
        {aviso ? (
          <Text
            style={{
              color: colors.text,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.caption,
              marginTop: 2,
            }}>
            {aviso}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
