import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useTema } from '@/src/theme';

export interface CampoTextoProps extends TextInputProps {
  rotulo?: string;
  erro?: string;
  ajuda?: string;
  containerStyle?: ViewStyle;
}

export function CampoTexto({
  rotulo,
  erro,
  ajuda,
  containerStyle,
  style,
  ...rest
}: CampoTextoProps) {
  const { colors, radii, spacing, typography, layout } = useTema();

  const temErro = !!erro;

  return (
    <View style={[styles.container, containerStyle]}>
      {rotulo ? (
        <Text
          style={[
            styles.rotulo,
            {
              color: colors.text,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.fontSize.caption,
              marginBottom: spacing.xs,
            },
          ]}>
          {rotulo}
        </Text>
      ) : null}

      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: temErro ? colors.danger : colors.border,
            borderRadius: radii.button,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.fontSize.body,
            minHeight: layout.minTouchTarget,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.md,
          },
          style,
        ]}
        {...rest}
      />

      {temErro ? (
        <Text
          style={[
            styles.erro,
            {
              color: colors.danger,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.tiny,
              marginTop: spacing.xs,
            },
          ]}>
          {erro}
        </Text>
      ) : ajuda ? (
        <Text
          style={[
            styles.ajuda,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.tiny,
              marginTop: spacing.xs,
            },
          ]}>
          {ajuda}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  rotulo: {},
  input: {
    borderWidth: 1,
  },
  erro: {},
  ajuda: {},
});
