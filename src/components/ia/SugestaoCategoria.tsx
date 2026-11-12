import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';

export interface SugestaoCategoriaProps {
  nomeDaCategoria: string;
  onUsar: () => void;
}

/** Sugestão da IA: só mostra e oferece; quem troca a categoria é a pessoa, ao tocar em "Usar". */
export function SugestaoCategoria({ nomeDaCategoria, onUsar }: SugestaoCategoriaProps) {
  const { colors, radii, spacing, typography } = useTema();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginTop: spacing.sm,
        paddingVertical: spacing.xs,
        paddingLeft: spacing.md,
        paddingRight: spacing.xs,
        borderRadius: radii.full,
        backgroundColor: colors.primaryLight,
      }}>
      <Ionicons name="sparkles" size={14} color={colors.primary} />
      <Text
        style={{
          marginLeft: spacing.xs,
          color: colors.primary,
          fontFamily: typography.fontFamily.medium,
          fontSize: typography.fontSize.caption,
        }}>
        Sugestão: {nomeDaCategoria}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Usar a categoria ${nomeDaCategoria}`}
        onPress={onUsar}
        hitSlop={8}
        style={{
          marginLeft: spacing.sm,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: radii.full,
          backgroundColor: colors.primary,
        }}>
        <Text
          style={{
            color: '#FFFFFF',
            fontFamily: typography.fontFamily.semiBold,
            fontSize: typography.fontSize.caption,
          }}>
          Usar
        </Text>
      </Pressable>
    </View>
  );
}
