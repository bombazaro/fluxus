import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTema } from '@/src/theme';
import { CabecalhoTela, Cartao, EstadoVazio } from '@/src/components/ui';
import { BarrasComparacao } from '@/src/components/graficos/BarrasComparacao';
import { useMesStore } from '@/src/store/useMesStore';
import { useConfigStore } from '@/src/store/useConfigStore';
import { compararMeses } from '@/src/domain/compararMeses';
import { adicionarMeses } from '@/src/domain/gerarLancamentos';
import { formatarMesAno, formatarMoeda } from '@/src/utils/formatadores';

/** Gastos deste mês comparados com o anterior, no total e por categoria. */
export default function ComparacaoScreen() {
  const { colors, typography, spacing } = useTema();
  const mesRef = useMesStore((s) => s.mesRef);
  const lancamentos = useMesStore((s) => s.lancamentos);
  const lancamentosAnterior = useMesStore((s) => s.lancamentosAnterior);
  const contarSoMinhaParte = useConfigStore((s) => s.config.contarSoMinhaParte);

  const comparacao = useMemo(
    () => compararMeses(lancamentos, lancamentosAnterior, contarSoMinhaParte),
    [lancamentos, lancamentosAnterior, contarSoMinhaParte]
  );

  const mesAnterior = adicionarMeses(mesRef, -1);
  const nomeAtual = formatarMesAno(mesRef).split(' ')[0];
  const nomeAnterior = formatarMesAno(mesAnterior).split(' ')[0];
  const subiu = comparacao.diferenca > 0;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <CabecalhoTela titulo={`${nomeAnterior} × ${nomeAtual}`} />

      {comparacao.categorias.length === 0 ? (
        <EstadoVazio
          icone="bar-chart-outline"
          titulo="Nada para comparar"
          subtitulo="Cadastre contas para ver como os gastos mudam de um mês para o outro."
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing.xxl }}>
          <Cartao>
            <View style={styles.totais}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rotulo, { color: colors.textSecondary }]}>{nomeAnterior}</Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily.semiBold,
                    fontSize: typography.fontSize.subtitle,
                  }}>
                  {formatarMoeda(comparacao.totalAnterior)}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[styles.rotulo, { color: colors.textSecondary }]}>{nomeAtual}</Text>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: typography.fontFamily.bold,
                    fontSize: typography.fontSize.subtitle,
                  }}>
                  {formatarMoeda(comparacao.totalAtual)}
                </Text>
              </View>
            </View>
            {comparacao.percentual !== null ? (
              <Text
                style={{
                  marginTop: spacing.sm,
                  color: subiu ? colors.danger : colors.success,
                  fontFamily: typography.fontFamily.semiBold,
                  fontSize: 14,
                }}>
                {comparacao.diferenca === 0
                  ? 'Mesmo gasto do mês anterior'
                  : `${subiu ? '+' : '−'}${formatarMoeda(Math.abs(comparacao.diferenca))} (${Math.round(
                      Math.abs(comparacao.percentual) * 100
                    )}% a ${subiu ? 'mais' : 'menos'})`}
              </Text>
            ) : (
              <Text style={{ marginTop: spacing.sm, color: colors.textSecondary, fontSize: 13 }}>
                Sem gastos em {nomeAnterior.toLowerCase()} para comparar.
              </Text>
            )}
            {comparacao.maiorAlta ? (
              <Text
                style={{
                  marginTop: spacing.xs,
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily.regular,
                  fontSize: 13,
                }}>
                O que mais subiu: {comparacao.maiorAlta.nome} (+
                {formatarMoeda(comparacao.maiorAlta.diferenca)})
              </Text>
            ) : null}
          </Cartao>

          <Cartao style={{ marginTop: spacing.base }}>
            <BarrasComparacao
              categorias={comparacao.categorias}
              rotuloAnterior={nomeAnterior}
              rotuloAtual={nomeAtual}
              destaqueId={comparacao.maiorAlta?.categoriaId}
            />
          </Cartao>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  totais: {
    flexDirection: 'row',
  },
  rotulo: {
    fontSize: 12,
    marginBottom: 2,
  },
});
