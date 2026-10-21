import React, { useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useTema } from '@/src/theme';
import { useMesStore } from '@/src/store/useMesStore';
import { Fab, SeletorMes } from '@/src/components/ui';
import { AvisoErroCarregar } from '@/src/components/home/AvisoErroCarregar';
import { AvisoAperto } from '@/src/components/home/AvisoAperto';
import { CartaoSobra } from '@/src/components/home/CartaoSobra';
import { ResumoTotais } from '@/src/components/home/ResumoTotais';
import { CartaoMenorSaldo } from '@/src/components/home/CartaoMenorSaldo';
import { EntradasDoMes } from '@/src/components/home/EntradasDoMes';
import { ProximosVencimentos } from '@/src/components/home/ProximosVencimentos';
import { GastosPorCategoria } from '@/src/components/home/GastosPorCategoria';
import { avaliarAperto } from '@/src/domain/avaliarAperto';
import { calcularSaldoPorDia } from '@/src/domain/saldoPorDia';
import { totaisPorCategoria } from '@/src/domain/totaisPorCategoria';
import { adicionarMeses } from '@/src/domain/gerarLancamentos';
import { useConfigStore } from '@/src/store/useConfigStore';

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, spacing } = useTema();

  const {
    mesRef,
    lancamentos,
    rendas,
    resumo,
    saldoInicial,
    carregando,
    erro,
    trocarMes,
    irParaHoje,
    carregarMes,
    marcarPago,
    setOrdenarPorValor,
  } = useMesStore();

  useEffect(() => {
    carregarMes(db);
  }, [db, carregarMes]);

  // Próximos vencimentos (até 4 contas não pagas, ordenadas por vencimento)
  const proximosVencimentos = useMemo(() => {
    return lancamentos
      .filter((l) => l.pago === 0)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
      .slice(0, 4);
  }, [lancamentos]);

  const categoriasTotais = useMemo(() => totaisPorCategoria(lancamentos), [lancamentos]);

  const limiteAtencaoPercentual = useConfigStore((s) => s.config.limiteAtencaoPercentual);

  const saldoPorDia = useMemo(() => {
    return calcularSaldoPorDia(mesRef, lancamentos, rendas, saldoInicial);
  }, [mesRef, lancamentos, rendas, saldoInicial]);

  const aperto = useMemo(() => {
    return avaliarAperto({
      totalContasCentavos: resumo.totalContas,
      rendaTotalCentavos: resumo.rendaTotal,
      saldoInicialCentavos: saldoInicial,
      menorSaldo:
        rendas.length > 0 || saldoInicial > 0
          ? { valorCentavos: saldoPorDia.menorSaldoCentavos, dia: saldoPorDia.diaMenorSaldo }
          : undefined,
      limiteAtencaoPercentual,
    });
  }, [resumo, rendas.length, saldoInicial, saldoPorDia, limiteAtencaoPercentual]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <SeletorMes
        mesRef={mesRef}
        onTrocarMes={(delta) => trocarMes(delta, db)}
        onIrParaHoje={() => irParaHoje(db)}
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={() => carregarMes(db)}
            colors={[colors.primary]}
          />
        }>
        {erro ? <AvisoErroCarregar /> : null}

        <AvisoAperto
          aperto={aperto}
          onPress={() => {
            setOrdenarPorValor(true);
            router.push('/(tabs)/contas');
          }}
        />

        <CartaoSobra resumo={resumo} />

        <ResumoTotais resumo={resumo} />

        {rendas.length > 0 || saldoInicial > 0 ? (
          <CartaoMenorSaldo
            saldoPorDia={saldoPorDia}
            saldoInicialCentavos={saldoInicial}
            mesAnterior={adicionarMeses(mesRef, -1)}
          />
        ) : null}

        <EntradasDoMes
          rendas={rendas}
          rendaTotalCentavos={resumo.rendaTotal}
          onGerenciar={() => router.push('/rendas')}
        />

        <ProximosVencimentos
          lancamentos={proximosVencimentos}
          onVerTodas={() => router.push('/(tabs)/contas')}
          onAbrirConta={(contaId) => router.push(`/conta/${contaId}`)}
          onMarcarPago={(id) => marcarPago(db, id, true)}
        />

        <GastosPorCategoria
          totais={categoriasTotais}
          totalContasCentavos={resumo.totalContas}
        />
      </ScrollView>

      <Fab onPress={() => router.push('/conta/nova')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
