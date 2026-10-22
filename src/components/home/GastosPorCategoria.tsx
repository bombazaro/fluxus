import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/src/theme';
import { Cartao } from '@/src/components/ui';
import { TotalCategoria } from '@/src/domain/totaisPorCategoria';
import { formatarMoeda } from '@/src/utils/formatadores';

export interface GastosPorCategoriaProps {
  totais: TotalCategoria[];
  totalContasCentavos: number;
}

/** Lista de gastos por categoria com o percentual de cada uma no total do mês. */
export function GastosPorCategoria({ totais, totalContasCentavos }: GastosPorCategoriaProps) {
  const { colors, typography, spacing } = useTema();

  if (totais.length === 0) return null;

  return (
    <View style={{ marginTop: spacing.md }}>
      <Text
        style={[
          styles.secaoTitulo,
          {
            color: colors.textSecondary,
            fontFamily: typography.fontFamily.semiBold,
            marginBottom: spacing.sm,
          },
        ]}>
        GASTOS POR CATEGORIA
      </Text>
      <Cartao>
        {totais.map((item, idx) => {
          const percentual = totalContasCentavos > 0 ? item.totalCentavos / totalContasCentavos : 0;

          return (
            <View
              key={item.categoriaId}
              style={[
                styles.categoriaRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: idx < totais.length - 1 ? 1 : 0,
                  paddingVertical: spacing.sm,
                },
              ]}>
              <View style={styles.catInfoLeft}>
                <View style={[styles.catPonto, { backgroundColor: item.cor }]} />
                <Text
                  style={[
                    styles.catNome,
                    { color: colors.text, fontFamily: typography.fontFamily.medium },
                  ]}>
                  {item.nome}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={[
                    styles.catValor,
                    { color: colors.text, fontFamily: typography.fontFamily.bold },
                  ]}>
                  {formatarMoeda(item.totalCentavos)}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily.regular,
                    fontSize: typography.fontSize.tiny,
                  }}>
                  {Math.round(percentual * 100)}% do total
                </Text>
              </View>
            </View>
          );
        })}
      </Cartao>
    </View>
  );
}

const styles = StyleSheet.create({
  secaoTitulo: {
    fontSize: 12,
    letterSpacing: 1,
  },
  categoriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catPonto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  catNome: {
    fontSize: 14,
  },
  catValor: {
    fontSize: 14,
  },
});
