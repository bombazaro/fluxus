import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTema } from '@/src/theme';
import {
  Botao,
  CabecalhoTela,
  CampoData,
  CampoMoeda,
  CampoTexto,
  Cartao,
  GrupoOpcoes,
  TituloSecao,
} from '@/src/components/ui';
import { AnelProgresso } from '@/src/components/graficos/AnelProgresso';
import { reservaRepo } from '@/src/db/repositorios/reservaRepo';
import { calcularReserva, valorDaMeta } from '@/src/domain/calcularReserva';
import { adicionarMeses } from '@/src/domain/gerarLancamentos';
import { obterHojeIso, obterMesAtualIso } from '@/src/store/useMesStore';
import { ReservaAporte, ReservaMeta } from '@/src/types';
import {
  dataBrParaIso,
  formatarData,
  formatarMesAno,
  formatarMoeda,
} from '@/src/utils/formatadores';

type TipoMeta = 'fixo' | 'meses_gastos';
type Movimento = 'aporte' | 'retirada';

const OPCOES_MESES = [3, 6, 12];

export default function ReservaScreen() {
  const db = useSQLiteContext();
  const { colors, typography, spacing, radii } = useTema();
  // Vindo do Início com "Guardar na reserva": já abre o aporte com a sobra
  const params = useLocalSearchParams<{ aporte?: string }>();
  const aporteSugerido = Number(params.aporte);
  const temSugestao = Number.isInteger(aporteSugerido) && aporteSugerido > 0;

  const [meta, setMeta] = useState<ReservaMeta | null>(null);
  const [aportes, setAportes] = useState<ReservaAporte[]>([]);
  const [gastoMedio, setGastoMedio] = useState(0);

  // Editor da meta
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [tipoMeta, setTipoMeta] = useState<TipoMeta>('meses_gastos');
  const [valorMeta, setValorMeta] = useState(0);
  const [mesesMeta, setMesesMeta] = useState(6);

  // Formulário de aporte/retirada
  const [movimento, setMovimento] = useState<Movimento | null>(temSugestao ? 'aporte' : null);
  const [valorMov, setValorMov] = useState(temSugestao ? aporteSugerido : 0);
  // DD/MM/AAAA, como a pessoa digita
  const [dataMov, setDataMov] = useState(() => formatarData(obterHojeIso()));
  const [obsMov, setObsMov] = useState(temSugestao ? 'Sobra do mês' : '');

  const carregar = useCallback(async () => {
    const [m, a, g] = await Promise.all([
      reservaRepo.obterMeta(db),
      reservaRepo.listarAportes(db),
      reservaRepo.gastoMensalMedio(db, obterMesAtualIso()),
    ]);
    setMeta(m);
    setAportes(a);
    setGastoMedio(g);
    return calcularReserva(m, a, g, obterHojeIso());
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const situacao = useMemo(
    () => calcularReserva(meta, aportes, gastoMedio, obterHojeIso()),
    [meta, aportes, gastoMedio]
  );

  // Comemoração quando um aporte faz bater a meta
  const [escala] = useState(() => new Animated.Value(1));
  const comemorar = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.sequence([
      Animated.spring(escala, { toValue: 1.12, useNativeDriver: true }),
      Animated.spring(escala, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  };

  const abrirMovimento = (tipo: Movimento) => {
    setMovimento(tipo);
    setValorMov(0);
    setDataMov(formatarData(obterHojeIso()));
    setObsMov('');
  };

  const abrirEditorMeta = () => {
    setTipoMeta(meta?.tipo_meta ?? 'meses_gastos');
    setValorMeta(meta?.valor_meta_centavos ?? 0);
    setMesesMeta(meta?.meses_gastos ?? 6);
    setEditandoMeta(true);
  };

  const metaPrevista = valorDaMeta(
    { id: 0, valor_meta_centavos: valorMeta, tipo_meta: tipoMeta, meses_gastos: mesesMeta },
    gastoMedio
  );
  const metaValida = tipoMeta === 'fixo' ? valorMeta > 0 : gastoMedio > 0;

  const salvarMeta = async () => {
    if (!metaValida) return;
    await reservaRepo.definirMeta(db, tipoMeta === 'fixo' ? valorMeta : 0, tipoMeta, mesesMeta);
    setEditandoMeta(false);
    await carregar();
  };

  const dataMovIso = dataBrParaIso(dataMov);
  const movimentoValido = valorMov > 0 && dataMovIso !== null;
  const salvarMovimento = async () => {
    if (!movimento || !movimentoValido || !dataMovIso) return;
    if (movimento === 'retirada' && valorMov > situacao.guardadoCentavos) {
      Alert.alert('Valor maior que o guardado', `Você tem ${formatarMoeda(situacao.guardadoCentavos)} na reserva.`);
      return;
    }
    await reservaRepo.adicionarAporte(
      db,
      movimento === 'aporte' ? valorMov : -valorMov,
      dataMovIso,
      obsMov.trim() || null
    );
    setMovimento(null);
    const nova = await carregar();
    if (!situacao.metaBatida && nova.metaBatida) comemorar();
  };

  const excluirAporte = (a: ReservaAporte) => {
    Alert.alert(
      a.valor_centavos >= 0 ? 'Excluir aporte' : 'Excluir retirada',
      `${formatarMoeda(Math.abs(a.valor_centavos))} em ${formatarData(a.data)}. Excluir do histórico?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await reservaRepo.excluirAporte(db, a.id);
            await carregar();
          },
        },
      ]
    );
  };

  const textoAjuda = {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
    lineHeight: 18,
  };

  const temMeta = situacao.metaCentavos > 0;
  const mesChegada =
    situacao.mesesParaMeta && situacao.mesesParaMeta > 0
      ? formatarMesAno(adicionarMeses(obterMesAtualIso(), situacao.mesesParaMeta)).toLowerCase()
      : null;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <CabecalhoTela titulo="Reserva de emergência" />

      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing.xxl }}>
        <Cartao style={{ alignItems: 'center' }}>
          <Animated.View style={{ transform: [{ scale: escala }] }}>
            <AnelProgresso
              progresso={situacao.percentual}
              cor={situacao.metaBatida ? colors.success : colors.primary}>
              <Text
                accessibilityLabel={
                  temMeta
                    ? `${Math.round(situacao.percentual * 100)}% da meta`
                    : 'Sem meta definida'
                }
                style={{
                  color: colors.text,
                  fontFamily: typography.fontFamily.bold,
                  fontSize: typography.fontSize.hero,
                }}>
                {temMeta ? `${Math.round(situacao.percentual * 100)}%` : '—'}
              </Text>
              <Text style={[textoAjuda, { textAlign: 'center' }]}>
                {formatarMoeda(situacao.guardadoCentavos)}
                {temMeta ? `\nde ${formatarMoeda(situacao.metaCentavos)}` : '\nguardados'}
              </Text>
            </AnelProgresso>
          </Animated.View>

          {situacao.metaBatida ? (
            <Text
              style={{
                marginTop: spacing.base,
                color: colors.success,
                fontFamily: typography.fontFamily.bold,
                fontSize: typography.fontSize.body,
                textAlign: 'center',
              }}>
              🎉 Meta batida! Sua reserva cobre o que você planejou.
            </Text>
          ) : temMeta ? (
            <View style={{ marginTop: spacing.base, alignItems: 'center' }}>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: typography.fontFamily.semiBold,
                  fontSize: typography.fontSize.body,
                }}>
                Faltam {formatarMoeda(situacao.faltaCentavos)}
              </Text>
              <Text style={[textoAjuda, { textAlign: 'center', marginTop: 2 }]}>
                {situacao.ritmoMensalCentavos && mesChegada
                  ? `Guardando ${formatarMoeda(situacao.ritmoMensalCentavos)} por mês, você chega à meta em ${situacao.mesesParaMeta} ${situacao.mesesParaMeta === 1 ? 'mês' : 'meses'} (${mesChegada}).`
                  : 'Registre um aporte para ver quando você chega à meta.'}
              </Text>
            </View>
          ) : null}

          <View style={[styles.botoes, { marginTop: spacing.base, gap: spacing.sm }]}>
            <Botao
              titulo="Guardar"
              onPress={() => abrirMovimento('aporte')}
              iconeEsquerda={<Ionicons name="add" size={18} color="#FFFFFF" />}
              style={{ flex: 1 }}
            />
            <Botao
              titulo="Retirar"
              variante="secundario"
              onPress={() => abrirMovimento('retirada')}
              desativado={situacao.guardadoCentavos <= 0}
              style={{ flex: 1 }}
            />
          </View>
        </Cartao>

        <TituloSecao>Meta</TituloSecao>
        <Cartao>
          {editandoMeta ? (
            <>
              <GrupoOpcoes<TipoMeta>
                rotuloAcessivel="Tipo de meta"
                opcoes={[
                  { valor: 'meses_gastos', rotulo: 'Meses de gastos' },
                  { valor: 'fixo', rotulo: 'Valor fixo' },
                ]}
                valor={tipoMeta}
                onMudar={setTipoMeta}
              />
              {tipoMeta === 'fixo' ? (
                <CampoMoeda
                  rotulo="Quanto quer guardar"
                  valorCentavos={valorMeta}
                  onChangeCentavos={setValorMeta}
                  containerStyle={{ marginTop: spacing.base }}
                />
              ) : (
                <View style={{ marginTop: spacing.base }}>
                  <GrupoOpcoes<number>
                    rotuloAcessivel="Quantos meses de gastos"
                    opcoes={OPCOES_MESES.map((m) => ({ valor: m, rotulo: `${m} meses` }))}
                    valor={mesesMeta}
                    onMudar={setMesesMeta}
                  />
                  <Text style={[textoAjuda, { marginTop: spacing.sm }]}>
                    {gastoMedio > 0
                      ? `${mesesMeta} × ${formatarMoeda(gastoMedio)} (seu gasto médio por mês) = ${formatarMoeda(metaPrevista)}`
                      : 'Cadastre suas contas primeiro: a meta usa a média do que você gasta por mês.'}
                  </Text>
                </View>
              )}
              <View style={[styles.botoes, { marginTop: spacing.base, gap: spacing.sm }]}>
                <Botao
                  titulo="Cancelar"
                  variante="fantasma"
                  onPress={() => setEditandoMeta(false)}
                  style={{ flex: 1 }}
                />
                <Botao
                  titulo="Salvar meta"
                  onPress={salvarMeta}
                  desativado={!metaValida}
                  style={{ flex: 1 }}
                />
              </View>
            </>
          ) : (
            <View style={styles.linha}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: typography.fontFamily.semiBold,
                    fontSize: typography.fontSize.body,
                  }}>
                  {meta ? formatarMoeda(situacao.metaCentavos) : 'Nenhuma meta ainda'}
                </Text>
                <Text style={textoAjuda}>
                  {!meta
                    ? 'O recomendado é ter de 3 a 6 meses de gastos guardados.'
                    : meta.tipo_meta === 'meses_gastos'
                      ? `${meta.meses_gastos} meses do seu gasto médio (${formatarMoeda(gastoMedio)}/mês)`
                      : 'Valor fixo'}
                </Text>
              </View>
              <Botao
                titulo={meta ? 'Alterar' : 'Definir'}
                variante="secundario"
                tamanho="pequeno"
                onPress={abrirEditorMeta}
              />
            </View>
          )}
        </Cartao>

        <TituloSecao>Histórico</TituloSecao>
        {aportes.length === 0 ? (
          <Text style={textoAjuda}>Nenhum aporte ainda.</Text>
        ) : (
          <Cartao>
            {aportes.map((a, i) => {
              const entrada = a.valor_centavos >= 0;
              return (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  accessibilityHint="Toque e segure para excluir"
                  onLongPress={() => excluirAporte(a)}
                  style={[
                    styles.linha,
                    {
                      paddingVertical: spacing.sm,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.border,
                    },
                  ]}>
                  <Ionicons
                    name={entrada ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={24}
                    color={entrada ? colors.success : colors.danger}
                  />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontFamily: typography.fontFamily.medium,
                        fontSize: 14,
                      }}>
                      {a.observacao || (entrada ? 'Aporte' : 'Retirada')}
                    </Text>
                    <Text style={textoAjuda}>{formatarData(a.data)}</Text>
                  </View>
                  <Text
                    style={{
                      color: entrada ? colors.success : colors.danger,
                      fontFamily: typography.fontFamily.semiBold,
                      fontSize: 14,
                    }}>
                    {entrada ? '+' : '−'}
                    {formatarMoeda(Math.abs(a.valor_centavos))}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Excluir"
                    onPress={() => excluirAporte(a)}
                    hitSlop={8}
                    style={{ marginLeft: spacing.sm }}>
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </Pressable>
                </Pressable>
              );
            })}
          </Cartao>
        )}
      </ScrollView>

      <Modal
        visible={movimento !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMovimento(null)}>
        <View style={styles.modalOverlay}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.card,
              padding: spacing.base,
            }}>
            <View style={styles.linha}>
              <Text
                style={{
                  flex: 1,
                  color: colors.text,
                  fontFamily: typography.fontFamily.bold,
                  fontSize: 18,
                }}>
                {movimento === 'retirada' ? 'Retirar da reserva' : 'Guardar na reserva'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                onPress={() => setMovimento(null)}
                hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <CampoMoeda
              rotulo="Valor"
              valorCentavos={valorMov}
              onChangeCentavos={setValorMov}
              destaqueGrande
              containerStyle={{ marginTop: spacing.base }}
            />
            <CampoData
              rotulo="Data"
              valor={dataMov}
              onMudar={setDataMov}
              containerStyle={{ marginTop: spacing.base }}
            />
            <CampoTexto
              rotulo="Observação (opcional)"
              placeholder={movimento === 'retirada' ? 'Ex: conserto do carro' : 'Ex: 13º salário'}
              value={obsMov}
              onChangeText={setObsMov}
              containerStyle={{ marginTop: spacing.base }}
            />
            <Botao
              titulo={movimento === 'retirada' ? 'Retirar' : 'Guardar'}
              variante={movimento === 'retirada' ? 'perigo' : 'principal'}
              onPress={salvarMovimento}
              desativado={!movimentoValido}
              style={{ marginTop: spacing.base }}
            />
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
  botoes: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
});
