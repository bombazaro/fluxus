import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import {
  Botao,
  CampoMoeda,
  CampoTexto,
  Cartao,
  Etiqueta,
} from '@/src/components/ui';
import { Categoria, Conta, Lancamento } from '@/src/types';
import { contasRepo } from '@/src/db/repositorios/contasRepo';
import { categoriasRepo } from '@/src/db/repositorios/categoriasRepo';
import { lancamentosRepo } from '@/src/db/repositorios/lancamentosRepo';
import { useMesStore } from '@/src/store/useMesStore';
import { formatarData, formatarMesAno, formatarMoeda } from '@/src/utils/formatadores';
import { calcularMediaLancamentos, SugestaoValor } from '@/src/domain/sugerirValor';

export default function DetalheContaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const contaId = parseInt(id || '0', 10);
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, typography, spacing, radii } = useTema();

  const mesRef = useMesStore((s) => s.mesRef);
  const carregarMes = useMesStore((s) => s.carregarMes);

  const [conta, setConta] = useState<Conta | null>(null);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [lancamentoDoMes, setLancamentoDoMes] = useState<Lancamento | null>(null);
  const [historico, setHistorico] = useState<Lancamento[]>([]);
  const [sugestaoMedia, setSugestaoMedia] = useState<SugestaoValor | null>(null);

  // Estados de edição
  const [editando, setEditando] = useState(false);
  const [nomeEditado, setNomeEditado] = useState('');
  const [valorEditadoCentavos, setValorEditadoCentavos] = useState(0);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregarDetalhes() {
      if (!contaId) return;

      const c = await contasRepo.buscarPorId(db, contaId);
      if (c) {
        setConta(c);
        setNomeEditado(c.nome);
        setValorEditadoCentavos(c.valor_centavos);

        const cat = await categoriasRepo.buscarPorId(db, c.categoria_id);
        setCategoria(cat);

        const lMes = await lancamentosRepo.buscarPorContaEMes(db, contaId, mesRef);
        setLancamentoDoMes(lMes);

        const hist = await lancamentosRepo.listarPorConta(db, contaId);
        setHistorico(hist);

        if (c.tipo === 'variavel') {
          const pagos = await lancamentosRepo.listarPagosDaConta(db, contaId, 3);
          setSugestaoMedia({
            valorSugeridoCentavos: calcularMediaLancamentos(pagos, 3),
            mesesConsiderados: pagos.length,
          });
        }
      }
    }
    carregarDetalhes();
  }, [contaId, mesRef, db]);

  if (!conta) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.textSecondary }}>Carregando dados da conta...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSalvarEdicao = async () => {
    if (!nomeEditado.trim() || valorEditadoCentavos <= 0) {
      Alert.alert('Atenção', 'Informe um nome e valor válidos.');
      return;
    }

    setSalvando(true);
    try {
      if (conta.tipo === 'fixa' || conta.tipo === 'variavel') {
        // Pergunta o escopo da alteração de valor
        Alert.alert(
          'Escopo da alteração',
          'Deseja aplicar o novo valor apenas ao mês atual ou também aos próximos?',
          [
            {
              text: 'Apenas neste mês',
              onPress: async () => {
                if (lancamentoDoMes) {
                  await lancamentosRepo.atualizarValor(db, lancamentoDoMes.id, valorEditadoCentavos);
                }
                await contasRepo.atualizar(db, conta.id, { nome: nomeEditado.trim() });
                await carregarMes(db);
                setEditando(false);
                setSalvando(false);
              },
            },
            {
              text: 'Neste e nos próximos',
              onPress: async () => {
                if (lancamentoDoMes) {
                  await lancamentosRepo.atualizarValor(db, lancamentoDoMes.id, valorEditadoCentavos);
                }
                await lancamentosRepo.atualizarValorNaoPagosAPartirDe(
                  db,
                  conta.id,
                  mesRef,
                  valorEditadoCentavos
                );
                await contasRepo.atualizar(db, conta.id, {
                  nome: nomeEditado.trim(),
                  valor_centavos: valorEditadoCentavos,
                });
                await carregarMes(db);
                setEditando(false);
                setSalvando(false);
              },
            },
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => setSalvando(false),
            },
          ]
        );
      } else {
        await contasRepo.atualizar(db, conta.id, {
          nome: nomeEditado.trim(),
          valor_centavos: valorEditadoCentavos,
        });
        if (lancamentoDoMes) {
          await lancamentosRepo.atualizarValor(db, lancamentoDoMes.id, valorEditadoCentavos);
        }
        await carregarMes(db);
        setEditando(false);
        setSalvando(false);
      }
    } catch (err) {
      console.error('Erro ao editar conta:', err);
      setSalvando(false);
    }
  };

  const handleAplicarSugestao = async () => {
    if (!sugestaoMedia?.valorSugeridoCentavos || !lancamentoDoMes) return;
    try {
      await lancamentosRepo.atualizarValor(
        db,
        lancamentoDoMes.id,
        sugestaoMedia.valorSugeridoCentavos
      );
      setLancamentoDoMes({
        ...lancamentoDoMes,
        valor_centavos: sugestaoMedia.valorSugeridoCentavos,
      });
      await carregarMes(db);
      Alert.alert(
        'Valor aplicado',
        `Lançamento de ${formatarMesAno(mesRef)} atualizado para ${formatarMoeda(
          sugestaoMedia.valorSugeridoCentavos
        )}.`
      );
    } catch (err) {
      console.error('Erro ao aplicar sugestão:', err);
    }
  };

  const handleDesativar = async () => {
    const novoStatus = conta.ativa === 1 ? 0 : 1;
    const acaoTexto = novoStatus === 0 ? 'desativar' : 'reativar';

    Alert.alert(
      `${novoStatus === 0 ? 'Desativar' : 'Reativar'} conta`,
      `Tem certeza que deseja ${acaoTexto} esta conta?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            await contasRepo.atualizar(db, conta.id, { ativa: novoStatus });
            setConta({ ...conta, ativa: novoStatus });
            await carregarMes(db);
          },
        },
      ]
    );
  };

  const handleExcluir = async () => {
    Alert.alert(
      'Excluir Conta',
      'Como deseja excluir esta conta?',
      [
        {
          text: 'Apenas deste mês',
          onPress: async () => {
            if (lancamentoDoMes) {
              await lancamentosRepo.excluirSoDesteMes(db, lancamentoDoMes);
              await carregarMes(db);
              router.back();
            }
          },
        },
        {
          text: 'Este e os próximos',
          style: 'destructive',
          onPress: async () => {
            await contasRepo.encerrarAPartirDe(db, conta.id, mesRef);
            await carregarMes(db);
            router.back();
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header com voltar */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.md,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.btnVoltar}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.text, fontFamily: typography.fontFamily.bold },
          ]}>
          Detalhes da Conta
        </Text>
        <Pressable
          onPress={() => setEditando(!editando)}
          hitSlop={12}
          style={styles.btnEditar}>
          <Ionicons
            name={editando ? 'close' : 'create-outline'}
            size={22}
            color={colors.primary}
          />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { padding: spacing.base, paddingBottom: 60 },
          ]}
          keyboardShouldPersistTaps="handled">
          {/* Card Principal */}
          <Cartao style={{ marginBottom: spacing.base }}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.categoriaIcone,
                  { backgroundColor: (categoria?.cor || colors.primary) + '20' },
                ]}>
                <Ionicons
                  name={(categoria?.icone || 'receipt') as any}
                  size={24}
                  color={categoria?.cor || colors.primary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text
                  style={[
                    styles.contaNome,
                    { color: colors.text, fontFamily: typography.fontFamily.bold },
                  ]}>
                  {conta.nome}
                </Text>
                <Text
                  style={[
                    styles.categoriaNome,
                    {
                      color: colors.textSecondary,
                      fontFamily: typography.fontFamily.regular,
                      fontSize: typography.fontSize.caption,
                    },
                  ]}>
                  {categoria?.nome || 'Geral'} • Tipo: {conta.tipo.toUpperCase()}
                </Text>
              </View>
              <Etiqueta
                texto={conta.ativa === 1 ? 'Ativa' : 'Inativa'}
                tipo={conta.ativa === 1 ? 'sucesso' : 'neutro'}
              />
            </View>

            {editando ? (
              <View style={{ marginTop: spacing.base }}>
                <CampoTexto
                  rotulo="Nome da conta"
                  value={nomeEditado}
                  onChangeText={setNomeEditado}
                  containerStyle={{ marginBottom: spacing.md }}
                />
                <CampoMoeda
                  rotulo="Valor cadastrado"
                  valorCentavos={valorEditadoCentavos}
                  onChangeCentavos={setValorEditadoCentavos}
                  containerStyle={{ marginBottom: spacing.md }}
                />
                <Botao
                  titulo={salvando ? 'Salvando...' : 'Salvar Alterações'}
                  onPress={handleSalvarEdicao}
                  carregando={salvando}
                />
              </View>
            ) : (
              <View style={[styles.cardValores, { marginTop: spacing.base }]}>
                <View>
                  <Text
                    style={[
                      styles.rotuloInfo,
                      { color: colors.textSecondary, fontFamily: typography.fontFamily.regular },
                    ]}>
                    Valor Padrão:
                  </Text>
                  <Text
                    style={[
                      styles.valorDestaque,
                      { color: colors.text, fontFamily: typography.fontFamily.bold },
                    ]}>
                    {formatarMoeda(conta.valor_centavos)}
                  </Text>
                </View>
                {conta.dia_vencimento ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.rotuloInfo,
                        { color: colors.textSecondary, fontFamily: typography.fontFamily.regular },
                      ]}>
                      Dia Vencimento:
                    </Text>
                    <Text
                      style={[
                        styles.valorDestaque,
                        { color: colors.text, fontFamily: typography.fontFamily.bold },
                      ]}>
                      Todo dia {conta.dia_vencimento}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </Cartao>

          {/* Sugestão de Média para Conta Variável */}
          {conta.tipo === 'variavel' && sugestaoMedia?.valorSugeridoCentavos ? (
            <Cartao
              style={[
                styles.sugestaoCard,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                  marginBottom: spacing.base,
                },
              ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="bulb-outline" size={24} color={colors.primaryDark} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text
                    style={[
                      styles.sugestaoTitulo,
                      {
                        color: colors.primaryDark,
                        fontFamily: typography.fontFamily.bold,
                      },
                    ]}>
                    Sugestão de Valor: {formatarMoeda(sugestaoMedia.valorSugeridoCentavos)}
                  </Text>
                  <Text
                    style={[
                      styles.sugestaoSub,
                      {
                        color: colors.primaryDark,
                        fontFamily: typography.fontFamily.regular,
                        fontSize: typography.fontSize.tiny,
                      },
                    ]}>
                    Média dos últimos {sugestaoMedia.mesesConsiderados} meses pagos
                  </Text>
                </View>
              </View>
              {lancamentoDoMes && lancamentoDoMes.pago === 0 ? (
                <View style={{ marginTop: spacing.md }}>
                  <Botao
                    titulo={`Usar no mês de ${formatarMesAno(mesRef)}`}
                    onPress={handleAplicarSugestao}
                    tamanho="pequeno"
                    variante="principal"
                  />
                </View>
              ) : null}
            </Cartao>
          ) : null}

          {/* Histórico de lançamentos */}
          <Text
            style={[
              styles.secaoTitulo,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.semiBold,
                marginBottom: spacing.sm,
              },
            ]}>
            HISTÓRICO DE LANÇAMENTOS ({historico.length})
          </Text>

          {historico.map((item) => (
            <View
              key={item.id}
              style={[
                styles.histItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.button,
                  padding: spacing.md,
                  marginBottom: spacing.xs,
                },
              ]}>
              <View>
                <Text
                  style={[
                    styles.histMes,
                    { color: colors.text, fontFamily: typography.fontFamily.semiBold },
                  ]}>
                  {formatarMesAno(item.mes_ref)}
                </Text>
                <Text
                  style={[
                    styles.histVenc,
                    {
                      color: colors.textSecondary,
                      fontFamily: typography.fontFamily.regular,
                      fontSize: typography.fontSize.tiny,
                    },
                  ]}>
                  Vencimento: {formatarData(item.vencimento)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={[
                    styles.histValor,
                    {
                      color: item.pago === 1 ? colors.success : colors.text,
                      fontFamily: typography.fontFamily.bold,
                    },
                  ]}>
                  {formatarMoeda(item.valor_centavos)}
                </Text>
                <Etiqueta
                  texto={item.pago === 1 ? 'Pago' : 'Pendente'}
                  tipo={item.pago === 1 ? 'sucesso' : 'alerta'}
                />
              </View>
            </View>
          ))}

          {/* Ações: Desativar e Excluir */}
          <View style={[styles.acoesContainer, { marginTop: spacing.xl, gap: spacing.md }]}>
            <Botao
              titulo={conta.ativa === 1 ? 'Desativar Conta' : 'Reativar Conta'}
              onPress={handleDesativar}
              variante="secundario"
            />
            <Botao
              titulo="Excluir Conta"
              onPress={handleExcluir}
              variante="perigo"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnVoltar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
  },
  btnEditar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {},
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoriaIcone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contaNome: {
    fontSize: 18,
  },
  categoriaNome: {
    marginTop: 2,
  },
  cardValores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rotuloInfo: {
    fontSize: 12,
  },
  valorDestaque: {
    fontSize: 16,
    marginTop: 2,
  },
  sugestaoCard: {
    borderWidth: 1.5,
  },
  sugestaoTitulo: {
    fontSize: 15,
  },
  sugestaoSub: {
    marginTop: 2,
  },
  secaoTitulo: {
    fontSize: 12,
    letterSpacing: 1,
  },
  histItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  histMes: {
    fontSize: 14,
  },
  histVenc: {
    marginTop: 2,
  },
  histValor: {
    fontSize: 14,
    marginBottom: 4,
  },
  acoesContainer: {},
});
