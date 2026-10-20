import React, { useEffect, useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { useMesStore } from '@/src/store/useMesStore';
import {
  BarraProgresso,
  Cartao,
  Fab,
} from '@/src/components/ui';
import { formatarMesAno, formatarMoeda } from '@/src/utils/formatadores';
import { ItemConta } from '@/src/components/contas/ItemConta';
import { avaliarAperto } from '@/src/domain/avaliarAperto';
import { calcularSaldoPorDia } from '@/src/domain/saldoPorDia';

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, typography, spacing, radii } = useTema();

  const {
    mesRef,
    lancamentos,
    rendas,
    resumo,
    carregando,
    trocarMes,
    irParaHoje,
    carregarMes,
    marcarPago,
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

  // Gastos por categoria para exibição visual
  const categoriasTotais = useMemo(() => {
    const mapa = new Map<
      number,
      { nome: string; cor: string; icone: string; totalCentavos: number }
    >();

    for (const l of lancamentos) {
      const valor =
        l.compartilhada === 1 && typeof l.minha_parte_centavos === 'number'
          ? l.minha_parte_centavos
          : l.valor_centavos;

      const existente = mapa.get(l.categoria_id);
      if (existente) {
        existente.totalCentavos += valor;
      } else {
        mapa.set(l.categoria_id, {
          nome: l.categoria_nome,
          cor: l.categoria_cor,
          icone: l.categoria_icone,
          totalCentavos: valor,
        });
      }
    }

    return Array.from(mapa.values()).sort(
      (a, b) => b.totalCentavos - a.totalCentavos
    );
  }, [lancamentos]);

  // Avaliação de aperto financeiro
  const aperto = useMemo(() => {
    return avaliarAperto(resumo.totalContas, resumo.rendaTotal);
  }, [resumo.totalContas, resumo.rendaTotal]);

  const saldoPorDia = useMemo(() => {
    return calcularSaldoPorDia(mesRef, lancamentos, rendas);
  }, [mesRef, lancamentos, rendas]);

  const percentualUsadoFormatado = Math.round(resumo.percentualUsado * 100);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. Seletor de mês */}
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
          onPress={() => trocarMes(-1, db)}
          hitSlop={12}
          style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        <Pressable onPress={() => irParaHoje(db)} style={styles.mesCentro}>
          <Text
            style={[
              styles.mesTexto,
              { color: colors.text, fontFamily: typography.fontFamily.bold },
            ]}>
            {formatarMesAno(mesRef)}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          onPress={() => trocarMes(1, db)}
          hitSlop={12}
          style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { padding: spacing.base, paddingBottom: 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={() => carregarMes(db)}
            colors={[colors.primary]}
          />
        }>
        {/* Aviso de aperto se existir */}
        {aperto.nivel !== 'normal' ? (
          <Pressable
            onPress={() => router.push('/(tabs)/contas')}
            style={[
              styles.apertoBanner,
              {
                backgroundColor:
                  aperto.nivel === 'aperto' || aperto.nivel === 'critico'
                    ? colors.dangerLight
                    : colors.warningLight,
                borderColor:
                  aperto.nivel === 'aperto' || aperto.nivel === 'critico'
                    ? colors.danger
                    : colors.warning,
                borderRadius: radii.card,
                padding: spacing.md,
                marginBottom: spacing.base,
              },
            ]}>
            <Ionicons
              name="alert-circle"
              size={22}
              color={
                aperto.nivel === 'aperto' || aperto.nivel === 'critico'
                  ? colors.danger
                  : colors.warning
              }
            />
            <Text
              style={[
                styles.apertoTexto,
                {
                  color:
                    aperto.nivel === 'aperto' || aperto.nivel === 'critico'
                      ? colors.danger
                      : colors.warning,
                  fontFamily: typography.fontFamily.semiBold,
                  marginLeft: spacing.sm,
                  flex: 1,
                },
              ]}>
              {aperto.mensagem}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                aperto.nivel === 'aperto' || aperto.nivel === 'critico'
                  ? colors.danger
                  : colors.warning
              }
            />
          </Pressable>
        ) : null}

        {/* 2. Cartão grande: Sobra do mês */}
        <Cartao style={{ marginBottom: spacing.base }}>
          <View style={styles.sobraHeader}>
            <View>
              <Text
                style={[
                  styles.sobraLabel,
                  { color: colors.textSecondary, fontFamily: typography.fontFamily.medium },
                ]}>
                Sobra estimada do mês
              </Text>
              <Text
                style={[
                  styles.sobraValor,
                  {
                    color: resumo.sobra >= 0 ? colors.success : colors.danger,
                    fontFamily: typography.fontFamily.bold,
                  },
                ]}>
                {formatarMoeda(resumo.sobra)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={[
                  styles.sobraAtualLabel,
                  { color: colors.textSecondary, fontFamily: typography.fontFamily.regular },
                ]}>
                Em mãos agora:
              </Text>
              <Text
                style={[
                  styles.sobraAtualValor,
                  { color: colors.text, fontFamily: typography.fontFamily.semiBold },
                ]}>
                {formatarMoeda(resumo.sobraAtual)}
              </Text>
            </View>
          </View>

          {/* Barra de progresso da renda usada */}
          <View style={{ marginTop: spacing.base }}>
            <View style={styles.progressoInfo}>
              <Text
                style={[
                  styles.progressoTexto,
                  { color: colors.textSecondary, fontFamily: typography.fontFamily.regular },
                ]}>
                Renda comprometida
              </Text>
              <Text
                style={[
                  styles.progressoTexto,
                  {
                    color:
                      resumo.percentualUsado > 1
                        ? colors.danger
                        : resumo.percentualUsado >= 0.8
                        ? colors.warning
                        : colors.success,
                    fontFamily: typography.fontFamily.bold,
                  },
                ]}>
                {percentualUsadoFormatado}%
              </Text>
            </View>
            <BarraProgresso progresso={resumo.percentualUsado} altura={10} />
          </View>
        </Cartao>

        {/* 3. Três cartões pequenos: Total do mês | Já pago | Falta pagar */}
        <View style={styles.trioCards}>
          {/* Total do mês */}
          <Cartao style={[styles.miniCard, { flex: 1, padding: spacing.md }]}>
            <Text
              style={[
                styles.miniLabel,
                { color: colors.textSecondary, fontFamily: typography.fontFamily.regular },
              ]}>
              Total mês
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.miniValor,
                { color: colors.text, fontFamily: typography.fontFamily.bold },
              ]}>
              {formatarMoeda(resumo.totalContas)}
            </Text>
          </Cartao>

          {/* Já pago */}
          <Cartao style={[styles.miniCard, { flex: 1, padding: spacing.md }]}>
            <Text
              style={[
                styles.miniLabel,
                { color: colors.textSecondary, fontFamily: typography.fontFamily.regular },
              ]}>
              Já pago
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.miniValor,
                { color: colors.success, fontFamily: typography.fontFamily.bold },
              ]}>
              {formatarMoeda(resumo.totalPago)}
            </Text>
          </Cartao>

          {/* Falta pagar */}
          <Cartao style={[styles.miniCard, { flex: 1, padding: spacing.md }]}>
            <Text
              style={[
                styles.miniLabel,
                { color: colors.textSecondary, fontFamily: typography.fontFamily.regular },
              ]}>
              Falta pagar
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.miniValor,
                {
                  color: resumo.faltaPagar > 0 ? colors.warning : colors.textSecondary,
                  fontFamily: typography.fontFamily.bold,
                },
              ]}>
              {formatarMoeda(resumo.faltaPagar)}
            </Text>
          </Cartao>
        </View>

        {/* 4. Linha do tempo / Menor saldo do mês */}
        {rendas.length > 0 ? (
          <Cartao style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor:
                    saldoPorDia.menorSaldoCentavos < 0
                      ? colors.dangerLight
                      : colors.primaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.sm,
                }}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={
                    saldoPorDia.menorSaldoCentavos < 0
                      ? colors.danger
                      : colors.primary
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: typography.fontFamily.semiBold,
                    fontSize: 14,
                  }}>
                  Dia mais apertado: Dia {String(saldoPorDia.diaMenorSaldo).padStart(2, '0')}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily.regular,
                    fontSize: 12,
                    marginTop: 2,
                  }}>
                  {saldoPorDia.mensagemAperto}
                </Text>
              </View>
            </View>
          </Cartao>
        ) : null}

        {/* Entradas do mês */}
        <Cartao style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: rendas.length > 0 ? spacing.sm : 0,
            }}>
            <Text
              style={{
                color: colors.text,
                fontFamily: typography.fontFamily.semiBold,
                fontSize: 14,
              }}>
              Entradas do Mês ({formatarMoeda(resumo.rendaTotal)})
            </Text>
            <Pressable onPress={() => router.push('/rendas')}>
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: typography.fontFamily.medium,
                  fontSize: 12,
                }}>
                Gerenciar
              </Text>
            </Pressable>
          </View>
          {rendas.length === 0 ? (
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.regular,
                fontSize: 13,
              }}>
              Nenhuma renda cadastrada. Toque em gerenciar para cadastrar seu salário ou rendas.
            </Text>
          ) : (
            rendas.map((r) => (
              <View
                key={r.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 4,
                }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily.regular,
                    fontSize: 13,
                  }}>
                  {r.nome} (Dia {r.dia_recebimento}){r.recebida ? ' • Recebida' : ''}
                </Text>
                <Text
                  style={{
                    color: colors.success,
                    fontFamily: typography.fontFamily.semiBold,
                    fontSize: 13,
                  }}>
                  {formatarMoeda(r.valor_centavos)}
                </Text>
              </View>
            ))
          )}
        </Cartao>

        {/* 5. Próximos vencimentos */}
        <View style={[styles.secaoHeader, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>
          <Text
            style={[
              styles.secaoTitulo,
              { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold },
            ]}>
            PRÓXIMOS VENCIMENTOS
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/contas')}>
            <Text
              style={[
                styles.verTodas,
                { color: colors.primary, fontFamily: typography.fontFamily.medium },
              ]}>
              Ver todas
            </Text>
          </Pressable>
        </View>

        {proximosVencimentos.length === 0 ? (
          <Cartao style={{ alignItems: 'center', padding: spacing.xl, marginBottom: spacing.base }}>
            <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
            <Text
              style={[
                styles.parabensTexto,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily.semiBold,
                  marginTop: spacing.xs,
                },
              ]}>
              Tudo pago neste mês!
            </Text>
            <Text
              style={[
                styles.parabensSub,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily.regular,
                  marginTop: 2,
                },
              ]}>
              Nenhum vencimento pendente no momento.
            </Text>
          </Cartao>
        ) : (
          <View style={{ marginBottom: spacing.base }}>
            {proximosVencimentos.map((item) => (
              <ItemConta
                key={item.id}
                lancamento={item}
                onPress={() => router.push(`/conta/${item.conta_id}`)}
                onTogglePago={() => marcarPago(db, item.id, true)}
              />
            ))}
          </View>
        )}

        {/* 6. Gráfico / Despesas por categoria */}
        {categoriasTotais.length > 0 ? (
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
              {categoriasTotais.map((item, idx) => {
                const percentual =
                  resumo.totalContas > 0
                    ? item.totalCentavos / resumo.totalContas
                    : 0;

                return (
                  <View
                    key={item.nome}
                    style={[
                      styles.categoriaRow,
                      {
                        borderBottomColor: colors.border,
                        borderBottomWidth: idx < categoriasTotais.length - 1 ? 1 : 0,
                        paddingVertical: spacing.sm,
                      },
                    ]}>
                    <View style={styles.catInfoLeft}>
                      <View
                        style={[
                          styles.catPonto,
                          { backgroundColor: item.cor },
                        ]}
                      />
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
                        style={[
                          styles.catPercentual,
                          {
                            color: colors.textSecondary,
                            fontFamily: typography.fontFamily.regular,
                            fontSize: typography.fontSize.tiny,
                          },
                        ]}>
                        {Math.round(percentual * 100)}% do total
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Cartao>
          </View>
        ) : null}
      </ScrollView>

      {/* FAB "+" */}
      <Fab onPress={() => router.push('/conta/nova')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mesBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    padding: 8,
  },
  mesCentro: {
    paddingVertical: 4,
  },
  mesTexto: {
    fontSize: 18,
  },
  scrollContent: {},
  apertoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  apertoTexto: {
    fontSize: 14,
  },
  sobraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sobraLabel: {
    fontSize: 14,
  },
  sobraValor: {
    fontSize: 28,
    marginTop: 4,
  },
  sobraAtualLabel: {
    fontSize: 12,
  },
  sobraAtualValor: {
    fontSize: 16,
    marginTop: 2,
  },
  progressoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressoTexto: {
    fontSize: 13,
  },
  trioCards: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  miniCard: {
    alignItems: 'center',
  },
  miniLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  miniValor: {
    fontSize: 14,
  },
  secaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secaoTitulo: {
    fontSize: 12,
    letterSpacing: 1,
  },
  verTodas: {
    fontSize: 13,
  },
  parabensTexto: {
    fontSize: 16,
  },
  parabensSub: {
    fontSize: 13,
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
  catPercentual: {},
});
