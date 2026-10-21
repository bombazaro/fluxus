import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';

export interface CabecalhoTelaProps {
  titulo: string;
  /** Algo à direita do título (ex.: botão de ação). */
  direita?: React.ReactNode;
}

/** Barra do topo das telas empilhadas: voltar + título. */
export function CabecalhoTela({ titulo, direita }: CabecalhoTelaProps) {
  const router = useRouter();
  const { colors, typography, spacing } = useTema();

  return (
    <View
      style={[
        styles.header,
        {
          borderBottomColor: colors.border,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.md,
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={() => router.back()}
        hitSlop={12}
        style={styles.btnVoltar}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Pressable>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={{
          flex: 1,
          color: colors.text,
          fontFamily: typography.fontFamily.bold,
          fontSize: typography.fontSize.subtitle,
          marginLeft: spacing.sm,
        }}>
        {titulo}
      </Text>
      {direita}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  btnVoltar: {
    padding: 4,
  },
});
