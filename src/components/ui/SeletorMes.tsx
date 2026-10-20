import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { formatarMesAno } from '@/src/utils/formatadores';

export interface SeletorMesProps {
  mesRef: string;
  onTrocarMes: (delta: number) => void;
  onIrParaHoje: () => void;
  /** Mostra o botão "Hoje" ao lado do mês (quando não é o mês atual). */
  mostrarBotaoHoje?: boolean;
}

/** Barra do topo com as setas < Maio 2026 >. Tocar no mês volta para o mês atual. */
export function SeletorMes({
  mesRef,
  onTrocarMes,
  onIrParaHoje,
  mostrarBotaoHoje = false,
}: SeletorMesProps) {
  const { colors, typography, spacing } = useTema();

  return (
    <View
      style={[
        styles.mesBarra,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.sm,
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mês anterior"
        onPress={() => onTrocarMes(-1)}
        hitSlop={12}
        style={styles.navBtn}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>

      <View style={styles.mesCentro}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${formatarMesAno(mesRef)}. Toque para voltar ao mês atual`}
          onPress={onIrParaHoje}
          style={styles.mesTitulo}>
          <Text
            style={[styles.mesTexto, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
            {formatarMesAno(mesRef)}
          </Text>
        </Pressable>

        {mostrarBotaoHoje ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar para o mês atual"
            onPress={onIrParaHoje}
            hitSlop={12}
            style={[
              styles.botaoHoje,
              {
                marginLeft: spacing.sm,
                borderColor: colors.primary,
                paddingHorizontal: spacing.sm,
              },
            ]}>
            <Text
              style={{
                color: colors.primary,
                fontFamily: typography.fontFamily.semiBold,
                fontSize: typography.fontSize.caption,
              }}>
              Hoje
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Próximo mês"
        onPress={() => onTrocarMes(1)}
        hitSlop={12}
        style={styles.navBtn}>
        <Ionicons name="chevron-forward" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  mesBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    padding: 8,
  },
  mesCentro: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mesTitulo: {
    paddingVertical: 4,
  },
  mesTexto: {
    fontSize: 18,
  },
  botaoHoje: {
    borderWidth: 1,
    borderRadius: 9999,
    paddingVertical: 2,
  },
});
