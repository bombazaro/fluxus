import React, { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useTema } from '@/src/theme';
import { obterHojeIso, useMesStore } from '@/src/store/useMesStore';
import { Fab, SeletorMes } from '@/src/components/ui';
import { AvisoErroCarregar } from '@/src/components/home/AvisoErroCarregar';
import { AvisoAperto } from '@/src/components/home/AvisoAperto';
import { CartaoSobra } from '@/src/components/home/CartaoSobra';
import { ResumoTotais } from '@/src/components/home/ResumoTotais';
import { CartaoMenorSaldo } from '@/src/components/home/CartaoMenorSaldo';
import { EntradasDoMes } from '@/src/components/home/EntradasDoMes';
import { ProximosVencimentos } from '@/src/components/home/ProximosVencimentos';
import { GastosPorCategoria } from '@/src/components/home/GastosPorCategoria';
import { CartaoComparacao } from '@/src/components/home/CartaoComparacao';
import { compararMeses } from '@/src/domain/compararMeses';
import { saudacao } from '@/src/domain/saudacao';
import { avaliarAperto } from '@/src/domain/avaliarAperto';
import { calcularSaldoPorDia } from '@/src/domain/saldoPorDia';
import { totaisPorCategoria } from '@/src/domain/totaisPorCategoria';
import { adicionarMeses } from '@/src/domain/gerarLancamentos';
import { useConfigStore } from '@/src/store/useConfigStore';
import { ModalValorRecebido } from '@/src/components/rendas/ModalValorRecebido';
import { rendasRepo } from '@/src/db/repositorios/rendasRepo';
import { RendaDoMes } from '@/src/types';

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, spacing, typography } = useTema();
  const nome = useConfigStore((s) => s.config.nome);

  const {
    mesRef,
    lancamentos,
    rendas,
    resumo,
    saldoInicial,
    lancamentosAnterior,
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

  // Renda variável pergunta quanto caiu; fixa e pontual marcam com o valor cadastrado
  const [rendaRecebendo, setRendaRecebendo] = useState<RendaDoMes | null>(null);

  const marcarRecebida = async (renda: RendaDoMes) => {
    if (renda.tipo === 'variavel') {
      setRendaRecebendo(renda);
      return;
    }
    await rendasRepo.marcarRecebida(db, renda.id, mesRef, renda.valor_centavos);
    await carregarMes(db);
  };

  const desmarcarRecebida = (renda: RendaDoMes) => {
    Alert.alert(`Desmarcar ${renda.nome}?`, 'Ela volta a contar como ainda não recebida.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desmarcar',
        onPress: async () => {
          await rendasRepo.desmarcarRecebida(db, renda.id, mesRef);
          await carregarMes(db);
        },
      },
    ]);
  };

  // Próximos vencimentos (até 4 contas não pagas, ordenadas por vencimento)
  const proximosVencimentos = useMemo(() => {
    return lancamentos
      .filter((l) => l.pago === 0)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
      .slice(0, 4);
  }, [lancamentos]);

  const contarSoMinhaParte = useConfigStore((s) => s.config.contarSoMinhaParte);
  const categoriasTotais = useMemo(
    () => totaisPorCategoria(lancamentos, contarSoMinhaParte),
    [lancamentos, contarSoMinhaParte]
  );
  const comparacao = useMemo(
    () => compararMeses(lancamentos, lancamentosAnterior, contarSoMinhaParte),
    [lancamentos, lancamentosAnterior, contarSoMinhaParte]
  );

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
        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontFamily: typography.fontFamily.bold,
            fontSize: typography.fontSize.subtitle,
            marginBottom: spacing.md,
          }}>
          {saudacao(new Date().getHours(), nome)}
        </Text>

        {erro ? <AvisoErroCarregar /> : null}

        <AvisoAperto
          aperto={aperto}
          onPress={() => {
            setOrdenarPorValor(true);
            router.push('/(tabs)/contas');
          }}
        />

        <CartaoSobra
          resumo={resumo}
          onGuardarNaReserva={() =>
            router.push({ pathname: '/reserva', params: { aporte: String(resumo.sobra) } })
          }
        />

        <EntradasDoMes
          rendas={rendas}
          rendaTotalCentavos={resumo.rendaTotal}
          mesRef={mesRef}
          hojeIso={obterHojeIso()}
          onGerenciar={() => router.push('/rendas')}
          onMarcarRecebida={marcarRecebida}
          onDesmarcarRecebida={desmarcarRecebida}
        />

        <ResumoTotais resumo={resumo} />

        {rendas.length > 0 || saldoInicial > 0 ? (
          <CartaoMenorSaldo
            saldoPorDia={saldoPorDia}
            saldoInicialCentavos={saldoInicial}
            mesAnterior={adicionarMeses(mesRef, -1)}
          />
        ) : null}

        <CartaoComparacao
          comparacao={comparacao}
          mesAnterior={adicionarMeses(mesRef, -1)}
          onPress={() => router.push('/comparacao')}
        />

        <ProximosVencimentos
          lancamentos={proximosVencimentos}
          onVerTodas={() => router.push('/(tabs)/contas')}
          onAbrirConta={(contaId) => router.push(`/conta/${contaId}`)}
          onMarcarPago={(id) => marcarPago(db, id, true)}
        />

        <GastosPorCategoria totais={categoriasTotais} totalContasCentavos={resumo.totalContas} />
      </ScrollView>

      <Fab onPress={() => router.push('/conta/nova')} />

      <ModalValorRecebido
        renda={rendaRecebendo}
        mesRef={mesRef}
        onConfirmar={async (valor) => {
          if (!rendaRecebendo) return;
          await rendasRepo.marcarRecebida(db, rendaRecebendo.id, mesRef, valor);
          setRendaRecebendo(null);
          await carregarMes(db);
        }}
        onFechar={() => setRendaRecebendo(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
