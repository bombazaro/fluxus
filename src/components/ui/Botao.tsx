import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTema } from '@/src/theme';

export type BotaoVariante = 'principal' | 'secundario' | 'perigo' | 'fantasma';
export type BotaoTamanho = 'padrao' | 'pequeno';

export interface BotaoProps {
  titulo: string;
  onPress: () => void;
  variante?: BotaoVariante;
  tamanho?: BotaoTamanho;
  carregando?: boolean;
  desativado?: boolean;
  iconeEsquerda?: React.ReactNode;
  iconeDireita?: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Botao({
  titulo,
  onPress,
  variante = 'principal',
  tamanho = 'padrao',
  carregando = false,
  desativado = false,
  iconeEsquerda,
  iconeDireita,
  style,
  accessibilityLabel,
}: BotaoProps) {
  const { colors, radii, spacing, typography, layout } = useTema();

  const handlePress = () => {
    if (desativado || carregando) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const isSmall = tamanho === 'pequeno';

  let backgroundColor = colors.primary;
  let textColor = '#FFFFFF';
  let borderColor = 'transparent';

  if (variante === 'secundario') {
    backgroundColor = colors.surface;
    textColor = colors.text;
    borderColor = colors.border;
  } else if (variante === 'perigo') {
    backgroundColor = colors.danger;
    textColor = '#FFFFFF';
  } else if (variante === 'fantasma') {
    backgroundColor = 'transparent';
    textColor = colors.primary;
  }

  if (desativado) {
    backgroundColor = colors.surfaceVariant;
    textColor = colors.textMuted;
    borderColor = 'transparent';
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || titulo}
      accessibilityState={{ disabled: desativado, busy: carregando }}
      onPress={handlePress}
      disabled={desativado || carregando}
      style={({ pressed }) => [
        styles.botao,
        {
          backgroundColor,
          borderRadius: radii.button,
          borderColor,
          borderWidth: variante === 'secundario' ? 1 : 0,
          minHeight: isSmall ? 36 : layout.minTouchTarget,
          paddingVertical: isSmall ? spacing.xs : spacing.md,
          paddingHorizontal: isSmall ? spacing.md : spacing.xl,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}>
      {carregando ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {iconeEsquerda}
          <Text
            style={[
              styles.texto,
              {
                color: textColor,
                fontFamily: typography.fontFamily.semiBold,
                fontSize: isSmall ? typography.fontSize.caption : typography.fontSize.body,
                marginLeft: iconeEsquerda ? spacing.sm : 0,
                marginRight: iconeDireita ? spacing.sm : 0,
              },
            ]}>
            {titulo}
          </Text>
          {iconeDireita}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    textAlign: 'center',
  },
});
