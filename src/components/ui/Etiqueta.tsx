import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTema } from '@/src/theme';

export type EtiquetaTipo = 'sucesso' | 'alerta' | 'perigo' | 'neutro' | 'info';

export interface EtiquetaProps {
  texto: string;
  tipo?: EtiquetaTipo;
  icone?: React.ReactNode;
  style?: ViewStyle;
}

export function Etiqueta({ texto, tipo = 'neutro', icone, style }: EtiquetaProps) {
  const { colors, radii, spacing, typography } = useTema();

  let bg = colors.surfaceVariant;
  let fg = colors.textSecondary;

  if (tipo === 'sucesso') {
    bg = colors.successLight;
    fg = colors.success;
  } else if (tipo === 'alerta') {
    bg = colors.warningLight;
    fg = colors.warning;
  } else if (tipo === 'perigo') {
    bg = colors.dangerLight;
    fg = colors.danger;
  } else if (tipo === 'info') {
    bg = colors.primaryLight;
    fg = colors.primary;
  }

  return (
    <View
      style={[
        styles.etiqueta,
        {
          backgroundColor: bg,
          borderRadius: radii.full,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
        },
        style,
      ]}>
      {icone ? <View style={{ marginRight: 4 }}>{icone}</View> : null}
      <Text
        style={[
          styles.texto,
          {
            color: fg,
            fontFamily: typography.fontFamily.semiBold,
            fontSize: typography.fontSize.tiny,
          },
        ]}>
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  texto: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
