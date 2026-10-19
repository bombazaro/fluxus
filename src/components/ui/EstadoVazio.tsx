import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { Botao } from './Botao';

export interface EstadoVazioProps {
  icone?: keyof typeof Ionicons.glyphMap;
  titulo: string;
  subtitulo?: string;
  textoBotao?: string;
  onPressBotao?: () => void;
  style?: ViewStyle;
}

export function EstadoVazio({
  icone = 'file-tray-outline',
  titulo,
  subtitulo,
  textoBotao,
  onPressBotao,
  style,
}: EstadoVazioProps) {
  const { colors, spacing, typography } = useTema();

  return (
    <View style={[styles.container, { padding: spacing.xl }, style]}>
      <View
        style={[
          styles.iconeWrapper,
          {
            backgroundColor: colors.surfaceVariant,
            marginBottom: spacing.base,
          },
        ]}>
        <Ionicons name={icone} size={48} color={colors.textSecondary} />
      </View>
      <Text
        style={[
          styles.titulo,
          {
            color: colors.text,
            fontFamily: typography.fontFamily.semiBold,
            fontSize: typography.fontSize.subtitle,
            marginBottom: spacing.xs,
          },
        ]}>
        {titulo}
      </Text>
      {subtitulo ? (
        <Text
          style={[
            styles.subtitulo,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.body,
              marginBottom: textoBotao ? spacing.lg : 0,
            },
          ]}>
          {subtitulo}
        </Text>
      ) : null}
      {textoBotao && onPressBotao ? (
        <Botao titulo={textoBotao} onPress={onPressBotao} variante="principal" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    textAlign: 'center',
  },
  subtitulo: {
    textAlign: 'center',
  },
});
