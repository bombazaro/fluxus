import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/src/theme';
import { formatarMesAnoAbrev, formatarMoeda, formatarMoedaCurta } from '@/src/utils/formatadores';

export interface SerieSobra {
  mesRef: string;
  sobraCentavos: number;
}

export interface GraficoSobraMesesProps {
  meses: SerieSobra[];
  /** Segunda série desenhada em contorno atrás da primeira (ex.: "sem a compra"). */
  comparacao?: SerieSobra[];
  altura?: number;
}

/**
 * Barras verticais com a sobra de cada mês: acima da linha do zero em verde,
 * abaixo em vermelho. Com `comparacao`, cada mês mostra as duas barras lado a lado.
 */
export function GraficoSobraMeses({ meses, comparacao, altura = 160 }: GraficoSobraMesesProps) {
  const { colors, typography, spacing } = useTema();

  const todos = [...meses, ...(comparacao ?? [])].map((m) => m.sobraCentavos);
  const maxPositivo = Math.max(0, ...todos);
  const maxNegativo = Math.max(0, ...todos.map((v) => -v));
  const escala = Math.max(1, maxPositivo + maxNegativo);
  const alturaPositiva = (maxPositivo / escala) * altura;
  const alturaNegativa = (maxNegativo / escala) * altura;

  const barra = (valor: number, cor: string, contorno: boolean) => {
    const h = (Math.abs(valor) / escala) * altura;
    return (
      <View style={{ flex: 1, maxWidth: 28, marginHorizontal: 1 }}>
        <View style={{ height: alturaPositiva, justifyContent: 'flex-end' }}>
          {valor > 0 ? (
            <View
              style={[
                styles.barra,
                { height: h, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
                contorno
                  ? { borderWidth: 1.5, borderColor: colors.textMuted, borderBottomWidth: 0 }
                  : { backgroundColor: cor },
              ]}
            />
          ) : null}
        </View>
        <View style={{ height: alturaNegativa }}>
          {valor < 0 ? (
            <View
              style={[
                styles.barra,
                { height: h, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
                contorno
                  ? { borderWidth: 1.5, borderColor: colors.textMuted, borderTopWidth: 0 }
                  : { backgroundColor: cor },
              ]}
            />
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View>
      <View style={styles.colunas}>
        {meses.map((m, i) => {
          const cor = m.sobraCentavos < 0 ? colors.danger : colors.success;
          const base = comparacao?.[i];
          return (
            <View
              key={m.mesRef}
              accessible
              accessibilityLabel={`${formatarMesAnoAbrev(m.mesRef)}: sobra de ${formatarMoeda(
                m.sobraCentavos
              )}${base ? `, sem a compra ${formatarMoeda(base.sobraCentavos)}` : ''}`}
              style={styles.coluna}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  color: cor,
                  fontFamily: typography.fontFamily.semiBold,
                  fontSize: 11,
                  marginBottom: 4,
                }}>
                {formatarMoedaCurta(m.sobraCentavos)}
              </Text>
              <View style={styles.par}>
                {/* Linha do zero */}
                <View
                  style={[styles.zero, { top: alturaPositiva, backgroundColor: colors.border }]}
                />
                {base ? barra(base.sobraCentavos, colors.textMuted, true) : null}
                {barra(m.sobraCentavos, cor, false)}
              </View>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily.medium,
                  fontSize: 11,
                  marginTop: spacing.xs,
                }}>
                {formatarMesAnoAbrev(m.mesRef).split('/')[0]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  colunas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coluna: {
    flex: 1,
    alignItems: 'center',
  },
  par: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  barra: {
    width: '100%',
  },
  zero: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
});
