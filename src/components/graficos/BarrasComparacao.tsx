import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/src/theme';
import { ComparacaoCategoria } from '@/src/domain/compararMeses';
import { formatarMoeda } from '@/src/utils/formatadores';

export interface BarrasComparacaoProps {
  categorias: ComparacaoCategoria[];
  rotuloAnterior: string;
  rotuloAtual: string;
  /** Categoria com a borda destacada (a que mais subiu). */
  destaqueId?: number;
}

function textoVariacao(c: ComparacaoCategoria): string {
  if (c.diferenca === 0) return 'igual';
  if (c.percentual === null) return 'nova';
  const pct = Math.round(Math.abs(c.percentual) * 100);
  return `${c.diferenca > 0 ? '+' : '−'}${pct}%`;
}

/** Duas barras por categoria, lado a lado: mês anterior (cinza) e este mês (cor da categoria). */
export function BarrasComparacao({
  categorias,
  rotuloAnterior,
  rotuloAtual,
  destaqueId,
}: BarrasComparacaoProps) {
  const { colors, typography, spacing, radii } = useTema();
  const maior = Math.max(1, ...categorias.flatMap((c) => [c.atual, c.anterior]));

  return (
    <View>
      <View style={[styles.legenda, { marginBottom: spacing.md }]}>
        <View style={[styles.marcador, { backgroundColor: colors.textMuted }]} />
        <Text style={[styles.legendaTexto, { color: colors.textSecondary }]}>{rotuloAnterior}</Text>
        <View style={[styles.marcador, { backgroundColor: colors.primary, marginLeft: spacing.base }]} />
        <Text style={[styles.legendaTexto, { color: colors.textSecondary }]}>{rotuloAtual}</Text>
      </View>

      {categorias.map((c) => {
        const variacao = textoVariacao(c);
        const corVariacao =
          c.diferenca > 0 ? colors.danger : c.diferenca < 0 ? colors.success : colors.textMuted;
        return (
          <View
            key={c.categoriaId}
            accessible
            accessibilityLabel={`${c.nome}: ${rotuloAnterior} ${formatarMoeda(
              c.anterior
            )}, ${rotuloAtual} ${formatarMoeda(c.atual)}, ${variacao}`}
            style={[
              styles.item,
              {
                marginBottom: spacing.md,
                padding: c.categoriaId === destaqueId ? spacing.sm : 0,
                borderWidth: c.categoriaId === destaqueId ? 1 : 0,
                borderColor: colors.danger,
                borderRadius: radii.sm,
              },
            ]}>
            <View style={styles.cabecalho}>
              <Text
                style={{
                  flex: 1,
                  color: colors.text,
                  fontFamily: typography.fontFamily.semiBold,
                  fontSize: 14,
                }}>
                {c.nome}
              </Text>
              <Text style={{ color: corVariacao, fontFamily: typography.fontFamily.bold, fontSize: 13 }}>
                {variacao}
              </Text>
            </View>
            {[
              { valor: c.anterior, cor: colors.textMuted },
              { valor: c.atual, cor: c.cor },
            ].map((barra, i) => (
              <View key={i} style={[styles.linhaBarra, { marginTop: 4 }]}>
                <View style={[styles.trilho, { backgroundColor: colors.surfaceVariant }]}>
                  <View
                    style={{
                      width: `${(barra.valor / maior) * 100}%`,
                      height: '100%',
                      borderRadius: 4,
                      backgroundColor: barra.cor,
                    }}
                  />
                </View>
                <Text
                  style={{
                    width: 96,
                    textAlign: 'right',
                    color: i === 1 ? colors.text : colors.textSecondary,
                    fontFamily: typography.fontFamily.medium,
                    fontSize: 12,
                  }}>
                  {formatarMoeda(barra.valor)}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  legenda: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marcador: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 6,
  },
  legendaTexto: {
    fontSize: 12,
  },
  item: {},
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linhaBarra: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trilho: {
    flex: 1,
    height: 10,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
