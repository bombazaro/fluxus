import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';

export function formatarHora(hora: number): string {
  return `${String(hora).padStart(2, '0')}:00`;
}

export interface SeletorHoraProps {
  /** Hora cheia, de 0 a 23. */
  hora: number;
  onMudar: (hora: number) => void;
}

/** Hora cheia com botões de menos e mais (dá a volta de 23h para 0h). */
export function SeletorHora({ hora, onMudar }: SeletorHoraProps) {
  const { colors, typography, spacing } = useTema();

  return (
    <View style={styles.linha}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Uma hora mais cedo"
        onPress={() => onMudar((hora + 23) % 24)}
        hitSlop={8}
        style={[styles.botao, { backgroundColor: colors.surfaceVariant }]}>
        <Ionicons name="remove" size={22} color={colors.text} />
      </Pressable>
      <Text
        accessibilityLabel={`Horário do lembrete: ${formatarHora(hora)}`}
        style={{
          color: colors.text,
          fontFamily: typography.fontFamily.bold,
          fontSize: typography.fontSize.title,
          marginHorizontal: spacing.lg,
        }}>
        {formatarHora(hora)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Uma hora mais tarde"
        onPress={() => onMudar((hora + 1) % 24)}
        hitSlop={8}
        style={[styles.botao, { backgroundColor: colors.surfaceVariant }]}>
        <Ionicons name="add" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botao: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
