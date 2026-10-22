import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { adicionarMeses } from '@/src/domain/gerarLancamentos';
import { formatarMesAno } from '@/src/utils/formatadores';

export interface SeletorMesCompactoProps {
  mesRef: string;
  onMudar: (mesRef: string) => void;
  style?: ViewStyle;
}

/** Campo de formulário para escolher um mês: < Novembro 2026 >. */
export function SeletorMesCompacto({ mesRef, onMudar, style }: SeletorMesCompactoProps) {
  const { colors, typography, radii } = useTema();

  return (
    <View
      style={[
        styles.linha,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.button },
        style,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mês anterior"
        onPress={() => onMudar(adicionarMeses(mesRef, -1))}
        hitSlop={12}
        style={styles.seta}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Text
        style={{
          color: colors.text,
          fontFamily: typography.fontFamily.semiBold,
          fontSize: typography.fontSize.body,
        }}>
        {formatarMesAno(mesRef)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Próximo mês"
        onPress={() => onMudar(adicionarMeses(mesRef, 1))}
        hitSlop={12}
        style={styles.seta}>
        <Ionicons name="chevron-forward" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  seta: {
    padding: 10,
  },
});
