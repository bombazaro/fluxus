import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { useTema } from '@/src/theme';
import { formatarMoeda, parseMoedaParaCentavos } from '@/src/utils/formatadores';

export interface CampoMoedaProps {
  rotulo?: string;
  valorCentavos: number;
  onChangeCentavos: (centavos: number) => void;
  erro?: string;
  ajuda?: string;
  desativado?: boolean;
  containerStyle?: ViewStyle;
  placeholder?: string;
  destaqueGrande?: boolean;
}

export function CampoMoeda({
  rotulo,
  valorCentavos,
  onChangeCentavos,
  erro,
  ajuda,
  desativado = false,
  containerStyle,
  destaqueGrande = false,
}: CampoMoedaProps) {
  const { colors, radii, spacing, typography, layout } = useTema();

  const handleChangeText = (texto: string) => {
    const novosCentavos = parseMoedaParaCentavos(texto);
    onChangeCentavos(novosCentavos);
  };

  const textoFormatado = formatarMoeda(valorCentavos || 0);
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
        keyboardType="numeric"
        editable={!desativado}
        value={textoFormatado}
        onChangeText={handleChangeText}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: temErro ? colors.danger : colors.border,
            borderRadius: radii.button,
            fontFamily: typography.fontFamily.bold,
            fontSize: destaqueGrande ? typography.fontSize.title : typography.fontSize.body,
            minHeight: layout.minTouchTarget,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.md,
            textAlign: destaqueGrande ? 'center' : 'left',
          },
        ]}
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
