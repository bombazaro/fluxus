import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import {
  Botao,
  CampoMoeda,
  CampoTexto,
  Cartao,
  EstadoVazio,
  Etiqueta,
} from '@/src/components/ui';
import { Renda, RendaRecebida, TipoRenda } from '@/src/types';
import { rendasRepo } from '@/src/db/repositorios/rendasRepo';
import { useMesStore } from '@/src/store/useMesStore';
import { formatarMesAno, formatarMoeda } from '@/src/utils/formatadores';

const TIPOS_RENDA: { tipo: TipoRenda; label: string }[] = [
  { tipo: 'fixa', label: 'Fixa (Mensal)' },
  { tipo: 'variavel', label: 'Variável' },
  { tipo: 'pontual', label: 'Pontual (Bônus/13º)' },
];

export default function RendasScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, typography, spacing, radii } = useTema();

  const mesRef = useMesStore((s) => s.mesRef);
  const carregarMes = useMesStore((s) => s.carregarMes);

  const [rendas, setRendas] = useState<Renda[]>([]);
  const [recebidas, setRecebidas] = useState<RendaRecebida[]>([]);
  const [modalVisivel, setModalVisivel] = useState(false);

  // Form states
  const [rendaEditandoId, setRendaEditandoId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [valorCentavos, setValorCentavos] = useState(0);
  const [diaRecebimento, setDiaRecebimento] = useState('5');
  const [tipo, setTipo] = useState<TipoRenda>('fixa');
  const [salvando, setSalvando] = useState(false);

  const carregarRendas = useCallback(async () => {
    const [todas, rec] = await Promise.all([
      rendasRepo.listarTodas(db),
      rendasRepo.listarRecebidasDoMes(db, mesRef),
    ]);
    return { todas, rec };
  }, [db, mesRef]);

  const recarregar = useCallback(async () => {
    const { todas, rec } = await carregarRendas();
    setRendas(todas);
    setRecebidas(rec);
  }, [carregarRendas]);

  useEffect(() => {
    let ativo = true;
    carregarRendas().then(({ todas, rec }) => {
      if (!ativo) return;
      setRendas(todas);
      setRecebidas(rec);
    });
    return () => {
      ativo = false;
    };
  }, [carregarRendas]);

  const abrirModalNovo = () => {
    setRendaEditandoId(null);
    setNome('');
    setValorCentavos(0);
    setDiaRecebimento('5');
    setTipo('fixa');
    setModalVisivel(true);
  };

  const abrirModalEditar = (renda: Renda) => {
    setRendaEditandoId(renda.id);
    setNome(renda.nome);
    setValorCentavos(renda.valor_centavos);
    setDiaRecebimento(String(renda.dia_recebimento));
    setTipo(renda.tipo || 'fixa');
    setModalVisivel(true);
  };

  const handleSalvar = async () => {
    const diaNum = parseInt(diaRecebimento, 10);
    if (!nome.trim() || valorCentavos <= 0 || isNaN(diaNum) || diaNum < 1 || diaNum > 31) {
      Alert.alert('Atenção', 'Preencha o nome, valor e dia válido (1 a 31).');
      return;
    }

    setSalvando(true);
    try {
      if (rendaEditandoId) {
        await rendasRepo.atualizar(db, rendaEditandoId, {
          nome: nome.trim(),
          valor_centavos: valorCentavos,
          dia_recebimento: diaNum,
          tipo,
        });
      } else {
        await rendasRepo.criar(db, {
          nome: nome.trim(),
          valor_centavos: valorCentavos,
          dia_recebimento: diaNum,
          tipo,
          mes_ref: null,
          ativa: 1,
        });
      }
      await recarregar();
      await carregarMes(db);
      setModalVisivel(false);
    } catch (err) {
      console.error('Erro ao salvar renda:', err);
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleAtiva = async (renda: Renda) => {
    const novaAtiva = renda.ativa === 1 ? 0 : 1;
    await rendasRepo.atualizar(db, renda.id, { ativa: novaAtiva });
    await recarregar();
    await carregarMes(db);
  };

  const handleToggleRecebida = async (renda: Renda) => {
    const jaRecebida = recebidas.some((r) => r.renda_id === renda.id);
    if (jaRecebida) {
      await rendasRepo.desmarcarRecebida(db, renda.id, mesRef);
    } else {
      await rendasRepo.marcarRecebida(db, renda.id, mesRef, renda.valor_centavos);
    }
    await recarregar();
  };

  const handleExcluir = async (renda: Renda) => {
    Alert.alert(
      'Excluir Renda',
      `Tem certeza que deseja excluir "${renda.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await rendasRepo.excluir(db, renda.id);
            await recarregar();
            await carregarMes(db);
          },
        },
      ]
    );
  };

  const totalRendasAtivas = rendas
    .filter((r) => r.ativa === 1)
    .reduce((acc, r) => acc + r.valor_centavos, 0);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
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
          Minhas Rendas
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar renda"
          onPress={abrirModalNovo}
          hitSlop={12}
          style={styles.btnNovo}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: 60 }}>
        {/* Card resumo total */}
        <Cartao style={{ marginBottom: spacing.base }}>
          <Text
            style={[
              styles.totalLabel,
              { color: colors.textSecondary, fontFamily: typography.fontFamily.medium },
            ]}>
            Total de Rendas Ativas ({formatarMesAno(mesRef)})
          </Text>
          <Text
            style={[
              styles.totalValor,
              { color: colors.success, fontFamily: typography.fontFamily.bold },
            ]}>
            {formatarMoeda(totalRendasAtivas)}
          </Text>
        </Cartao>

        {rendas.length === 0 ? (
          <EstadoVazio
            icone="wallet-outline"
            titulo="Nenhuma renda cadastrada"
            subtitulo="Cadastre seu salário, rendas extras ou freelas para calcular sua sobra"
            textoBotao="Cadastrar primeira renda"
            onPressBotao={abrirModalNovo}
          />
        ) : (
          rendas.map((r) => {
            const jaRecebida = recebidas.some((rec) => rec.renda_id === r.id);

            return (
              <Cartao
                key={r.id}
                style={[
                  styles.rendaCard,
                  {
                    marginBottom: spacing.sm,
                    opacity: r.ativa === 1 ? 1 : 0.6,
                  },
                ]}>
                <View style={styles.rendaLinha}>
                  {/* Botão marcar recebida no mês */}
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={jaRecebida ? 'Recebida neste mês' : 'Marcar como recebida'}
                    accessibilityState={{ checked: jaRecebida }}
                    onPress={() => handleToggleRecebida(r)}
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: jaRecebida ? colors.success : 'transparent',
                        borderColor: jaRecebida ? colors.success : colors.border,
                        marginRight: spacing.md,
                      },
                    ]}>
                    {jaRecebida ? (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    ) : null}
                  </Pressable>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        style={[
                          styles.rendaNome,
                          { color: colors.text, fontFamily: typography.fontFamily.semiBold },
                        ]}>
                        {r.nome}
                      </Text>
                      <View style={{ marginLeft: 6 }}>
                        <Etiqueta
                          texto={r.tipo === 'variavel' ? 'Variável' : r.tipo === 'pontual' ? 'Pontual' : 'Fixa'}
                          tipo="info"
                        />
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.rendaDia,
                        {
                          color: colors.textSecondary,
                          fontFamily: typography.fontFamily.regular,
                          fontSize: typography.fontSize.caption,
                          marginTop: 2,
                        },
                      ]}>
                      Recebimento: todo dia {r.dia_recebimento} {jaRecebida ? '• Recebida!' : ''}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', marginRight: spacing.sm }}>
                    <Text
                      style={[
                        styles.rendaValor,
                        { color: colors.success, fontFamily: typography.fontFamily.bold },
                      ]}>
                      {formatarMoeda(r.valor_centavos)}
                    </Text>
                  </View>

                  {/* Switch Ativa/Inativa */}
                  <Switch
                    value={r.ativa === 1}
                    onValueChange={() => handleToggleAtiva(r)}
                    trackColor={{ false: colors.surfaceVariant, true: colors.primaryLight }}
                    thumbColor={r.ativa === 1 ? colors.primary : colors.textMuted}
                  />
                </View>

                {/* Ações editar / excluir */}
                <View
                  style={[
                    styles.rendaAcoes,
                    { borderTopColor: colors.border, borderTopWidth: 1, marginTop: spacing.sm, paddingTop: spacing.xs },
                  ]}>
                  <Pressable
                    onPress={() => abrirModalEditar(r)}
                    style={styles.acaoBtn}>
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                    <Text style={[styles.acaoTexto, { color: colors.primary }]}>Editar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleExcluir(r)}
                    style={styles.acaoBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    <Text style={[styles.acaoTexto, { color: colors.danger }]}>Excluir</Text>
                  </Pressable>
                </View>
              </Cartao>
            );
          })
        )}
      </ScrollView>

      {/* Modal de cadastro/edição de renda */}
      <Modal
        visible={modalVisivel}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisivel(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.card,
                padding: spacing.base,
              },
            ]}>
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitulo,
                  { color: colors.text, fontFamily: typography.fontFamily.bold },
                ]}>
                {rendaEditandoId ? 'Editar Renda' : 'Nova Renda'}
              </Text>
              <Pressable onPress={() => setModalVisivel(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <CampoTexto
              rotulo="Nome da renda *"
              placeholder="Ex: Salário, Freela, Pensão"
              value={nome}
              onChangeText={setNome}
              containerStyle={{ marginTop: spacing.base }}
            />

            <CampoMoeda
              rotulo="Valor mensal estimado *"
              valorCentavos={valorCentavos}
              onChangeCentavos={setValorCentavos}
              containerStyle={{ marginTop: spacing.base }}
            />

            <CampoTexto
              rotulo="Dia do recebimento (1 a 31) *"
              keyboardType="numeric"
              placeholder="5"
              value={diaRecebimento}
              onChangeText={setDiaRecebimento}
              containerStyle={{ marginTop: spacing.base }}
            />

            {/* Tipo de renda */}
            <Text
              style={[
                styles.tipoLabel,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily.medium,
                  fontSize: typography.fontSize.caption,
                  marginTop: spacing.base,
                  marginBottom: spacing.xs,
                },
              ]}>
              Tipo de Renda
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {TIPOS_RENDA.map((t) => {
                const ativo = tipo === t.tipo;
                return (
                  <Pressable
                    key={t.tipo}
                    onPress={() => setTipo(t.tipo)}
                    style={[
                      styles.tipoChip,
                      {
                        backgroundColor: ativo ? colors.primaryLight : colors.surfaceVariant,
                        borderColor: ativo ? colors.primary : 'transparent',
                        borderRadius: radii.button,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 6,
                        flex: 1,
                        alignItems: 'center',
                      },
                    ]}>
                    <Text
                      style={{
                        color: ativo ? colors.primaryDark : colors.textSecondary,
                        fontFamily: typography.fontFamily.medium,
                        fontSize: 11,
                      }}>
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
              <Botao
                titulo={salvando ? 'Salvando...' : 'Salvar Renda'}
                onPress={handleSalvar}
                carregando={salvando}
              />
              <Botao
                titulo="Cancelar"
                onPress={() => setModalVisivel(false)}
                variante="secundario"
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  btnNovo: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalLabel: {
    fontSize: 13,
  },
  totalValor: {
    fontSize: 24,
    marginTop: 4,
  },
  rendaCard: {},
  rendaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rendaNome: {
    fontSize: 16,
  },
  rendaDia: {},
  rendaValor: {
    fontSize: 16,
  },
  rendaAcoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  acaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  acaoTexto: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitulo: {
    fontSize: 18,
  },
  tipoLabel: {},
  tipoChip: {
    borderWidth: 1,
  },
});
