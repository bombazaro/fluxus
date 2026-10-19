import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTema } from '@/src/theme';

export interface FabProps {
  onPress: () => void;
  icone?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function Fab({
  onPress,
  icone = 'add',
  accessibilityLabel = 'Cadastrar nova conta',
  style,
}: FabProps) {
  const { colors, spacing } = useTema();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: colors.primary,
          bottom: spacing.xl,
          right: spacing.xl,
          shadowColor: colors.cardShadow,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
        style,
      ]}>
      <Ionicons name={icone} size={28} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 99,
  },
});
