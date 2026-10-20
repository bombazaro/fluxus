import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
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
import { useTema } from '@/src/theme';
import { useMesStore, FiltroSituacao, obterHojeIso } from '@/src/store/useMesStore';
import { ItemConta } from '@/src/components/contas/ItemConta';
import { CampoTexto, EstadoVazio, Fab, SeletorMes } from '@/src/components/ui';
import { classificarSituacao } from '@/src/domain/classificarSituacao';
import { Categoria, LancamentoComDetalhes, SituacaoConta } from '@/src/types';
import { categoriasRepo } from '@/src/db/repositorios/categoriasRepo';

export default function ContasScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, typography, spacing, radii } = useTema();

  const {
    mesRef,
    lancamentos,
    carregando,
    filtroSituacao,
    filtroCategoriaId,
    busca,
    ultimoDesfeito,
    trocarMes,
    irParaHoje,
    carregarMes,
    marcarPago,
    desfazerUltimoPago,
    limparDesfazer,
    setFiltroSituacao,
    setFiltroCategoriaId,
    setBusca,
  } = useMesStore();

  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    carregarMes(db);
    categoriasRepo.listarTodas(db).then(setCategorias);
  }, [db, carregarMes]);

  // Temporizador para esconder o aviso de desfazer após 5 segundos
  useEffect(() => {
    if (ultimoDesfeito) {
      const timer = setTimeout(() => {
        limparDesfazer();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [ultimoDesfeito, limparDesfazer]);

  const hojeIso = obterHojeIso();

  // Filtragem dos lançamentos
  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((l) => {
      // Filtro de busca
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        if (!l.conta_nome.toLowerCase().includes(termo)) {
          return false;
        }
      }

      // Filtro de categoria
      if (filtroCategoriaId !== null && l.categoria_id !== filtroCategoriaId) {
        return false;
      }

      // Filtro de situação
      if (filtroSituacao === 'pendentes' && l.pago === 1) return false;
      if (filtroSituacao === 'pagas' && l.pago === 0) return false;

      return true;
    });
  }, [lancamentos, busca, filtroCategoriaId, filtroSituacao]);

  // Agrupamento por situação
  const secoes = useMemo(() => {
    const atrasadas: LancamentoComDetalhes[] = [];
    const estaSemana: LancamentoComDetalhes[] = [];
    const maisAdiante: LancamentoComDetalhes[] = [];
    const pagas: LancamentoComDetalhes[] = [];

    for (const l of lancamentosFiltrados) {
      const sit = classificarSituacao(l.vencimento, l.pago, hojeIso);
      if (sit === 'paga') pagas.push(l);
      else if (sit === 'atrasada') atrasadas.push(l);
      else if (sit === 'esta_semana') estaSemana.push(l);
      else maisAdiante.push(l);
    }

    const resultado: { titulo: string; situacao: SituacaoConta; itens: LancamentoComDetalhes[] }[] = [];
    if (atrasadas.length > 0) {
      resultado.push({ titulo: 'Atrasadas', situacao: 'atrasada', itens: atrasadas });
    }
    if (estaSemana.length > 0) {
      resultado.push({ titulo: 'Esta semana', situacao: 'esta_semana', itens: estaSemana });
    }
    if (maisAdiante.length > 0) {
      resultado.push({ titulo: 'Mais adiante', situacao: 'mais_adiante', itens: maisAdiante });
    }
    if (pagas.length > 0) {
      resultado.push({ titulo: 'Pagas', situacao: 'paga', itens: pagas });
    }

    return resultado;
  }, [lancamentosFiltrados, hojeIso]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <SeletorMes
        mesRef={mesRef}
        onTrocarMes={(delta) => trocarMes(delta, db)}
        onIrParaHoje={() => irParaHoje(db)}
      />

      {/* Barra de busca e filtros */}
      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.sm }}>
        <CampoTexto
          placeholder="Buscar conta pelo nome..."
          value={busca}
          onChangeText={setBusca}
          containerStyle={{ marginBottom: spacing.xs }}
        />

        {/* Chips de filtro: Todas | Pendentes | Pagas */}
        <View style={styles.filtrosRow}>
          {(['todas', 'pendentes', 'pagas'] as FiltroSituacao[]).map((sit) => {
            const ativa = filtroSituacao === sit;
            const rotulos: Record<FiltroSituacao, string> = {
              todas: 'Todas',
              pendentes: 'Pendentes',
              pagas: 'Pagas',
            };
            return (
              <Pressable
                key={sit}
                onPress={() => setFiltroSituacao(sit)}
                style={[
                  styles.filtroPill,
                  {
                    backgroundColor: ativa ? colors.primary : colors.surface,
                    borderColor: ativa ? colors.primary : colors.border,
                    borderRadius: radii.full,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 6,
                  },
                ]}>
                <Text
                  style={{
                    color: ativa ? '#FFFFFF' : colors.textSecondary,
                    fontFamily: typography.fontFamily.medium,
                    fontSize: 13,
                  }}>
                  {rotulos[sit]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Chips de Categorias */}
        {categorias.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.categoriasScroll, { paddingVertical: spacing.xs }]}>
            <Pressable
              onPress={() => setFiltroCategoriaId(null)}
              style={[
                styles.categoriaFiltroChip,
                {
                  backgroundColor: filtroCategoriaId === null ? colors.surfaceVariant : 'transparent',
                  borderColor: filtroCategoriaId === null ? colors.text : colors.border,
                  borderRadius: radii.full,
                },
              ]}>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: typography.fontFamily.medium,
                  fontSize: 12,
                }}>
                Todas Categorias
              </Text>
            </Pressable>
            {categorias.map((cat) => {
              const ativo = filtroCategoriaId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setFiltroCategoriaId(ativo ? null : cat.id)}
                  style={[
                    styles.categoriaFiltroChip,
                    {
                      backgroundColor: ativo ? cat.cor : colors.surface,
                      borderColor: ativo ? cat.cor : colors.border,
                      borderRadius: radii.full,
                    },
                  ]}>
                  <Text
                    style={{
                      color: ativo ? '#FFFFFF' : colors.text,
                      fontFamily: typography.fontFamily.medium,
                      fontSize: 12,
                    }}>
                    {cat.nome}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {/* Lista de Contas */}
      {lancamentosFiltrados.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flex: 1, justifyContent: 'center' }}
          refreshControl={
            <RefreshControl
              refreshing={carregando}
              onRefresh={() => carregarMes(db)}
              colors={[colors.primary]}
            />
          }>
          <EstadoVazio
            icone="receipt-outline"
            titulo="Nenhuma conta encontrada"
            subtitulo={
              busca || filtroCategoriaId !== null || filtroSituacao !== 'todas'
                ? 'Tente mudar os filtros de busca'
                : 'Cadastre suas contas deste mês pelo botão "+"'
            }
            textoBotao={
              !busca && filtroCategoriaId === null && filtroSituacao === 'todas'
                ? 'Cadastrar primeira conta'
                : undefined
            }
            onPressBotao={() => router.push('/conta/nova')}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={secoes}
          keyExtractor={(item) => item.situacao}
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={carregando}
              onRefresh={() => carregarMes(db)}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item: secao }) => (
            <View style={styles.secaoBloco}>
              <View style={styles.secaoCabecalho}>
                <Text
                  style={[
                    styles.secaoTexto,
                    {
                      color:
                        secao.situacao === 'atrasada'
                          ? colors.danger
                          : secao.situacao === 'esta_semana'
                          ? colors.warning
                          : secao.situacao === 'paga'
                          ? colors.success
                          : colors.textSecondary,
                      fontFamily: typography.fontFamily.bold,
                    },
                  ]}>
                  {secao.titulo.toUpperCase()} ({secao.itens.length})
                </Text>
              </View>
              {secao.itens.map((lancamento) => (
                <ItemConta
                  key={lancamento.id}
                  lancamento={lancamento}
                  onPress={() => router.push(`/conta/${lancamento.conta_id}`)}
                  onTogglePago={() => marcarPago(db, lancamento.id, lancamento.pago === 0)}
                />
              ))}
            </View>
          )}
        />
      )}

      {/* Toast / Banner Desfazer (5 segundos) */}
      {ultimoDesfeito ? (
        <View
          style={[
            styles.desfazerBanner,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.button,
              bottom: spacing.xxl + 40,
              shadowColor: colors.cardShadow,
            },
          ]}>
          <Text
            style={[
              styles.desfazerTexto,
              { color: colors.text, fontFamily: typography.fontFamily.medium },
            ]}>
            Status de pagamento alterado.
          </Text>
          <Pressable onPress={() => desfazerUltimoPago(db)} style={styles.desfazerBtn}>
            <Text
              style={[
                styles.desfazerBtnTexto,
                { color: colors.primary, fontFamily: typography.fontFamily.bold },
              ]}>
              DESFAZER
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* FAB "+" */}
      <Fab onPress={() => router.push('/conta/nova')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtrosRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  filtroPill: {
    borderWidth: 1,
  },
  categoriasScroll: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  categoriaFiltroChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  secaoBloco: {
    marginBottom: 16,
  },
  secaoCabecalho: {
    marginBottom: 8,
  },
  secaoTexto: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  desfazerBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    elevation: 5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 90,
  },
  desfazerTexto: {
    fontSize: 14,
  },
  desfazerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  desfazerBtnTexto: {
    fontSize: 14,
  },
});
