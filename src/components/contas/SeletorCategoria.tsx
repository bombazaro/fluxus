import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { Categoria } from '@/src/types';

export interface SeletorCategoriaProps {
  categorias: Categoria[];
  categoriaId: number | null;
  onSelecionar: (id: number) => void;
}

/** Lista horizontal de chips coloridos para escolher a categoria da conta. */
export function SeletorCategoria({ categorias, categoriaId, onSelecionar }: SeletorCategoriaProps) {
  const { colors, typography, spacing, radii } = useTema();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsScroll}>
      {categorias.map((cat) => {
        const selecionada = categoriaId === cat.id;
        return (
          <Pressable
            key={cat.id}
            accessibilityRole="radio"
            accessibilityLabel={`Categoria ${cat.nome}`}
            accessibilityState={{ selected: selecionada }}
            onPress={() => onSelecionar(cat.id)}
            style={[
              styles.categoriaChip,
              {
                backgroundColor: selecionada ? cat.cor : colors.surface,
                borderColor: selecionada ? cat.cor : colors.border,
                borderRadius: radii.full,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
            ]}>
            <Ionicons
              name={cat.icone as keyof typeof Ionicons.glyphMap}
              size={16}
              color={selecionada ? '#FFFFFF' : cat.cor}
            />
            <Text
              style={[
                styles.chipTexto,
                {
                  color: selecionada ? '#FFFFFF' : colors.text,
                  fontFamily: typography.fontFamily.medium,
                  marginLeft: 6,
                },
              ]}>
              {cat.nome}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoriaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  chipTexto: {
    fontSize: 14,
  },
});
