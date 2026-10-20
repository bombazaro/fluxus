import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PanResponder, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useTema } from '@/src/theme';
import { obterHojeIso, obterMesAtualIso, useMesStore } from '@/src/store/useMesStore';
import { MarcaDia, montarCalendario } from '@/src/domain/montarCalendario';
import { corDaMarca, GradeMensal, ROTULO_MARCA } from '@/src/components/calendario/GradeMensal';
import { ListaDoDia } from '@/src/components/calendario/ListaDoDia';
import { Cartao, SeletorMes } from '@/src/components/ui';

export default function CalendarioScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, typography, spacing } = useTema();

  const {
    mesRef,
    lancamentos,
    rendas,
    ultimoDesfeito,
    trocarMes,
    irParaHoje,
    carregarMes,
    marcarPago,
    desfazerUltimoPago,
    limparDesfazer,
  } = useMesStore();

  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);

  useEffect(() => {
    carregarMes(db);
  }, [db, carregarMes]);

  // Esconde o aviso de desfazer após 5 segundos
  useEffect(() => {
    if (!ultimoDesfeito) return;
    const timer = setTimeout(limparDesfazer, 5000);
    return () => clearTimeout(timer);
  }, [ultimoDesfeito, limparDesfazer]);

  const hojeIso = obterHojeIso();

  const semanas = useMemo(
    () => montarCalendario(mesRef, lancamentos, rendas, hojeIso),
    [mesRef, lancamentos, rendas, hojeIso]
  );

  const diaAberto = useMemo(
    () => semanas.flat().find((d) => d?.dia === diaSelecionado) ?? null,
    [semanas, diaSelecionado]
  );

  const lancamentosDoDia = useMemo(
    () =>
      diaAberto
        ? lancamentos.filter((l) => l.vencimento === diaAberto.dataIso)
        : [],
    [lancamentos, diaAberto]
  );

  const rendasDoDia = useMemo(() => {
    if (!diaAberto) return [];
    const ultimoDia = semanas.flat().reduce((max, d) => Math.max(max, d?.dia ?? 0), 0);
    return rendas.filter((r) => Math.min(r.dia_recebimento, ultimoDia) === diaAberto.dia);
  }, [rendas, semanas, diaAberto]);

  const mudarMes = useCallback(
    (delta: number) => {
      setDiaSelecionado(null);
      trocarMes(delta, db);
    },
    [trocarMes, db]
  );

  const voltarParaHoje = () => {
    setDiaSelecionado(null);
    irParaHoje(db);
  };

  // Deslizar a grade para o lado troca de mês (direita: anterior, esquerda: próximo)
  const gestoTrocaMes = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (g.dx > 60) mudarMes(-1);
          else if (g.dx < -60) mudarMes(1);
        },
      }),
    [mudarMes]
  );

  const estaNoMesAtual = mesRef === obterMesAtualIso();

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <SeletorMes
        mesRef={mesRef}
        onTrocarMes={mudarMes}
        onIrParaHoje={voltarParaHoje}
        mostrarBotaoHoje={!estaNoMesAtual}
      />

      <ScrollView contentContainerStyle={{ padding: spacing.base }}>
        <Cartao {...gestoTrocaMes.panHandlers}>
          <GradeMensal
            semanas={semanas}
            diaSelecionado={diaSelecionado}
            onSelecionarDia={setDiaSelecionado}
          />

          {/* Legenda das cores */}
          <View style={[styles.legenda, { marginTop: spacing.md, gap: spacing.md }]}>
            {(Object.keys(ROTULO_MARCA) as MarcaDia[]).map((marca) => (
              <View key={marca} style={styles.legendaItem}>
                <View style={[styles.ponto, { backgroundColor: corDaMarca(marca, colors) }]} />
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily.regular,
                    fontSize: typography.fontSize.caption,
                    marginLeft: spacing.xs,
                  }}>
                  {ROTULO_MARCA[marca]}
                </Text>
              </View>
            ))}
          </View>
        </Cartao>
      </ScrollView>

      <ListaDoDia
        dataIso={diaAberto?.dataIso ?? null}
        lancamentos={lancamentosDoDia}
        rendas={rendasDoDia}
        totalContasCentavos={diaAberto?.totalContasCentavos ?? 0}
        podeDesfazer={!!ultimoDesfeito}
        onFechar={() => setDiaSelecionado(null)}
        onAbrirConta={(contaId) => {
          setDiaSelecionado(null);
          router.push(`/conta/${contaId}`);
        }}
        onTogglePago={(l) => marcarPago(db, l.id, l.pago === 0)}
        onDesfazer={() => desfazerUltimoPago(db)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  legenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ponto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
