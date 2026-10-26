import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import {
  Botao,
  CampoMoeda,
  CampoTexto,
  CampoData,
  Cartao,
  GrupoOpcoes,
  SeletorMesCompacto,
} from '@/src/components/ui';
import { Categoria, Pessoa, TipoConta } from '@/src/types';
import { categoriasRepo } from '@/src/db/repositorios/categoriasRepo';
import { contasRepo } from '@/src/db/repositorios/contasRepo';
import { lancamentosRepo } from '@/src/db/repositorios/lancamentosRepo';
import { pessoasRepo } from '@/src/db/repositorios/pessoasRepo';
import { divisoesRepo } from '@/src/db/repositorios/divisoesRepo';
import {
  ajustarDiaDoMes,
  gerarLancamentosParaConta,
  sugerirMesInicio,
} from '@/src/domain/gerarLancamentos';
import { useMesStore, obterHojeIso, obterMesAtualIso } from '@/src/store/useMesStore';
import { formatarData, formatarMoeda, dataBrParaIso } from '@/src/utils/formatadores';
import { ModoDivisao, montarDivisao, redistribuirDivisao } from '@/src/domain/dividirConta';
import { SeletorCategoria } from '@/src/components/contas/SeletorCategoria';

const TIPOS_CONTA: {
  tipo: TipoConta;
  titulo: string;
  descricao: string;
  icone: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    tipo: 'fixa',
    titulo: 'Fixa',
    descricao: 'Todo mês, mesmo valor (ex: Aluguel)',
    icone: 'repeat',
  },
  {
    tipo: 'variavel',
    titulo: 'Variável',
    descricao: 'Muda todo mês (ex: Luz, Água)',
    icone: 'trending-up',
  },
  {
    tipo: 'parcelada',
    titulo: 'Parcelada',
    descricao: 'Dividida em X vezes (ex: Celular 10x)',
    icone: 'calendar',
  },
  {
    tipo: 'unica',
    titulo: 'Única',
    descricao: 'Cobrança pontual (ex: IPVA)',
    icone: 'flash',
  },
];

/** Data inicial da conta única: hoje, ou o mesmo dia no mês que está aberto. */
function dataPadraoNoMes(mesRef: string): string {
  const hoje = obterHojeIso();
  if (mesRef === obterMesAtualIso()) return hoje;
  const [ano, mes] = mesRef.split('-').map(Number);
  return ajustarDiaDoMes(ano, mes, parseInt(hoje.slice(8, 10), 10));
}

export default function NovaContaModal() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, typography, spacing, radii } = useTema();
  const carregarMes = useMesStore((s) => s.carregarMes);
  // Mês aberto na tela de trás: a conta nova começa nele (ou logo depois)
  const mesVisto = useMesStore((s) => s.mesRef);

  // O simulador de parcelas abre este formulário já preenchido
  const preenchido = useLocalSearchParams<{
    tipo?: string;
    nome?: string;
    valor?: string;
    parcelas?: string;
    mes?: string;
  }>();
  const [tipo, setTipo] = useState<TipoConta>(
    TIPOS_CONTA.some((t) => t.tipo === preenchido.tipo) ? (preenchido.tipo as TipoConta) : 'fixa'
  );
  const [nome, setNome] = useState(preenchido.nome ?? '');
  const [valorCentavos, setValorCentavos] = useState(() => {
    const valor = Number(preenchido.valor);
    return Number.isInteger(valor) && valor > 0 ? valor : 0;
  });
  const [diaVencimento, setDiaVencimento] = useState('10');
  // Como a pessoa digita (DD/MM/AAAA); dataUnicaIso é o que vai para o banco
  const [dataUnica, setDataUnica] = useState(() => formatarData(dataPadraoNoMes(mesVisto)));
  const [temVencimento, setTemVencimento] = useState(true);
  const [parcelasTotal, setParcelasTotal] = useState(preenchido.parcelas ?? '2');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [compartilhada, setCompartilhada] = useState(false);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [pessoasSelecionadas, setPessoasSelecionadas] = useState<number[]>([]);
  const [modoDivisao, setModoDivisao] = useState<ModoDivisao>('igual');
  // Porcentagem como texto (aceita "33,5" enquanto digita); valor em centavos
  const [porcentagens, setPorcentagens] = useState<Record<number, string>>({});
  const [valoresDivisao, setValoresDivisao] = useState<Record<number, number>>({});
  const [salvando, setSalvando] = useState(false);
  // null = segue a sugestão; muda quando a pessoa usa as setas
  const [mesInicioEscolhido, setMesInicioEscolhido] = useState<string | null>(
    preenchido.mes && /^\d{4}-\d{2}$/.test(preenchido.mes) ? preenchido.mes : null
  );

  useEffect(() => {
    async function carregarDados() {
      const listaCat = await categoriasRepo.listarTodas(db);
      setCategorias(listaCat);
      if (listaCat.length > 0) {
        setCategoriaId((atual) => atual ?? listaCat[0].id);
      }
    }
    carregarDados();
  }, [db]);

  // Pessoas recarregam ao voltar da tela de pessoas, sem perder quem já foi escolhido
  useFocusEffect(
    useCallback(() => {
      pessoasRepo.listarTodas(db).then((lista) => {
        setPessoas(lista);
        const eu = lista.find((p) => p.nome === 'Eu');
        setPessoasSelecionadas((atual) => {
          const existentes = atual.filter((id) => lista.some((p) => p.id === id));
          return existentes.length > 0 ? existentes : eu ? [eu.id] : [];
        });
      });
    }, [db])
  );

  const togglePessoa = (idPessoa: number) => {
    if (pessoasSelecionadas.includes(idPessoa)) {
      if (pessoasSelecionadas.length > 1) {
        setPessoasSelecionadas(pessoasSelecionadas.filter((id) => id !== idPessoa));
      }
    } else {
      setPessoasSelecionadas([...pessoasSelecionadas, idPessoa]);
    }
  };

  const diaNum = parseInt(diaVencimento, 10);
  const parcelasNum = parseInt(parcelasTotal, 10);

  const diaValido =
    !temVencimento || tipo === 'unica' || (!isNaN(diaNum) && diaNum >= 1 && diaNum <= 31);
  const dataUnicaIso = dataBrParaIso(dataUnica);
  const dataUnicaValida = !temVencimento || tipo !== 'unica' || dataUnicaIso !== null;
  const parcelasValidas = tipo !== 'parcelada' || (!isNaN(parcelasNum) && parcelasNum >= 2);
  const nomeValido = nome.trim().length > 0;
  const valorValido = valorCentavos > 0;
  const categoriaValida = !!categoriaId;

  const divisao = compartilhada
    ? montarDivisao(
        valorCentavos,
        pessoasSelecionadas,
        modoDivisao,
        modoDivisao === 'porcentagem'
          ? Object.fromEntries(
              Object.entries(porcentagens).map(([id, t]) => [id, Number(t.replace(',', '.')) || 0])
            )
          : valoresDivisao
      )
    : null;
  const idEu = pessoas.find((p) => p.nome === 'Eu')?.id;
  const minhaParteDivisao =
    divisao?.valores && idEu !== undefined
      ? (divisao.valores[pessoasSelecionadas.indexOf(idEu)] ?? 0)
      : 0;
  const divisaoValida = !compartilhada || !!divisao?.valores;

  const formularioValido =
    divisaoValida &&
    nomeValido &&
    valorValido &&
    diaValido &&
    dataUnicaValida &&
    parcelasValidas &&
    categoriaValida;

  // Mês da primeira cobrança (fixa, variável, parcelada ou conta sem vencimento)
  const usaMesInicio = tipo !== 'unica' || !temVencimento;
  const diaParaSugestao = temVencimento && diaValido ? diaNum : null;
  const mesInicio =
    mesInicioEscolhido ?? sugerirMesInicio(mesVisto, diaParaSugestao, obterHojeIso());
  const [anoInicio, mesInicioNum] = mesInicio.split('-').map(Number);
  const primeiroVencimento =
    temVencimento && diaValido ? ajustarDiaDoMes(anoInicio, mesInicioNum, diaNum) : null;
  const primeiroJaVenceu = primeiroVencimento !== null && primeiroVencimento < obterHojeIso();

  const handleSalvar = async () => {
    if (!formularioValido || !categoriaId || salvando) return;
    setSalvando(true);

    try {
      // Sem vencimento: a conta começa no mês escolhido, sem dia certo
      const dataInicio = !temVencimento
        ? `${mesInicio}-01`
        : tipo === 'unica'
          ? (dataUnicaIso as string)
          : `${mesInicio}-${String(diaNum).padStart(2, '0')}`;
      const diaVencimentoConta = tipo === 'unica' || !temVencimento ? null : diaNum;
      const dataUnicaConta = tipo === 'unica' && temVencimento ? dataUnicaIso : null;

      // Conta, lançamentos e divisões juntos: ou salva tudo, ou nada
      await db.withTransactionAsync(async () => {
        const idConta = await contasRepo.criar(db, {
          nome: nome.trim(),
          categoria_id: categoriaId,
          tipo,
          valor_centavos: valorCentavos,
          dia_vencimento: diaVencimentoConta,
          data_unica: dataUnicaConta,
          parcelas_total: tipo === 'parcelada' ? parcelasNum : null,
          data_inicio: dataInicio,
          data_fim: null,
          ativa: 1,
          compartilhada: compartilhada ? 1 : 0,
          sem_vencimento: temVencimento ? 0 : 1,
        });

        // Gera os lançamentos correspondentes
        const lancamentosPrevistos = gerarLancamentosParaConta({
          id: idConta,
          nome: nome.trim(),
          categoria_id: categoriaId,
          tipo,
          valor_centavos: valorCentavos,
          dia_vencimento: diaVencimentoConta,
          data_unica: dataUnicaConta,
          parcelas_total: tipo === 'parcelada' ? parcelasNum : null,
          data_inicio: dataInicio,
          data_fim: null,
          ativa: 1,
          compartilhada: compartilhada ? 1 : 0,
          sem_vencimento: temVencimento ? 0 : 1,
        });

        for (const lp of lancamentosPrevistos) {
          const idLancamento = await lancamentosRepo.criar(db, lp);

          if (compartilhada && divisao?.valores) {
            // Mesma proporção em cada lançamento (o valor pode mudar por mês)
            const valores = redistribuirDivisao(divisao.valores, lp.valor_centavos);
            const divisoesObj = pessoasSelecionadas.map((pessoaId, index) => ({
              pessoa_id: pessoaId,
              valor_centavos: valores[index] ?? 0,
            }));
            await divisoesRepo.salvarDivisoes(db, idLancamento, divisoesObj);
          }
        }
      });

      await carregarMes(db);
      router.back();
    } catch (err) {
      console.error('Erro ao salvar conta:', err);
      setSalvando(false);
    }
  };

  const criarCategoria = async (nome: string): Promise<string | null> => {
    const { id, erro } = await categoriasRepo.criarPeloNome(db, nome);
    if (erro || id === null) return erro;
    setCategorias(await categoriasRepo.listarTodas(db));
    setCategoriaId(id);
    return null;
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header com botão fechar */}
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
          accessibilityLabel="Fechar"
          onPress={() => router.back()}
          style={styles.btnFechar}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.text, fontFamily: typography.fontFamily.bold },
          ]}>
          Nova Conta
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { padding: spacing.base, paddingBottom: 100 },
          ]}
          keyboardShouldPersistTaps="handled">
          {/* Seletor do tipo de conta */}
          <Text
            style={[
              styles.secaoTitulo,
              { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold },
            ]}>
            TIPO DE CONTA
          </Text>
          <View style={styles.tiposGrid}>
            {TIPOS_CONTA.map((item) => {
              const ativo = tipo === item.tipo;
              return (
                <Pressable
                  key={item.tipo}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ativo }}
                  onPress={() => setTipo(item.tipo)}
                  style={[
                    styles.tipoCard,
                    {
                      backgroundColor: ativo ? colors.primaryLight : colors.surface,
                      borderColor: ativo ? colors.primary : colors.border,
                      borderRadius: radii.card,
                      padding: spacing.md,
                    },
                  ]}>
                  <Ionicons
                    name={item.icone}
                    size={24}
                    color={ativo ? colors.primaryDark : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tipoTitulo,
                      {
                        color: ativo ? colors.primaryDark : colors.text,
                        fontFamily: typography.fontFamily.bold,
                        marginTop: spacing.xs,
                      },
                    ]}>
                    {item.titulo}
                  </Text>
                  <Text
                    style={[
                      styles.tipoDescricao,
                      {
                        color: ativo ? colors.primaryDark : colors.textSecondary,
                        fontFamily: typography.fontFamily.regular,
                        fontSize: typography.fontSize.tiny,
                        marginTop: 2,
                      },
                    ]}>
                    {item.descricao}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Nome da conta */}
          <CampoTexto
            rotulo="Nome da conta *"
            placeholder="Ex: Aluguel, Internet, Academia"
            value={nome}
            onChangeText={setNome}
            erro={!nomeValido && nome.length > 0 ? 'Informe um nome para a conta' : undefined}
            containerStyle={{ marginTop: spacing.base }}
          />

          {/* Valor */}
          <CampoMoeda
            rotulo={tipo === 'variavel' ? 'Valor previsto / estimado *' : 'Valor da conta *'}
            valorCentavos={valorCentavos}
            onChangeCentavos={setValorCentavos}
            erro={
              !valorValido && valorCentavos === 0 ? 'Informe um valor maior que zero' : undefined
            }
            destaqueGrande
            containerStyle={{ marginTop: spacing.base }}
          />

          {/* Conta com ou sem data de vencimento */}
          <View style={[styles.linhaSwitch, { marginTop: spacing.base }]}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: typography.fontFamily.medium,
                  fontSize: typography.fontSize.body,
                }}>
                Tem data de vencimento
              </Text>
              {!temVencimento ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily.regular,
                    fontSize: typography.fontSize.caption,
                    marginTop: 2,
                  }}>
                  {tipo === 'unica'
                    ? 'Entra no mês escolhido, sem dia certo.'
                    : 'Entra em cada mês, sem dia certo. Só fica atrasada se o mês acabar sem pagar.'}
                </Text>
              ) : null}
            </View>
            <Switch
              accessibilityLabel="Tem data de vencimento"
              value={temVencimento}
              onValueChange={setTemVencimento}
              trackColor={{ false: colors.surfaceVariant, true: colors.primaryLight }}
              thumbColor={temVencimento ? colors.primary : colors.textMuted}
            />
          </View>

          {/* Campos dinâmicos por tipo */}
          {tipo === 'parcelada' ? (
            <View style={{ flexDirection: 'row', gap: spacing.base, marginTop: spacing.base }}>
              <View style={{ flex: 1 }}>
                <CampoTexto
                  rotulo="Total de parcelas *"
                  keyboardType="numeric"
                  value={parcelasTotal}
                  onChangeText={setParcelasTotal}
                  erro={!parcelasValidas ? 'Mínimo 2 parcelas' : undefined}
                />
              </View>
              {temVencimento ? (
                <View style={{ flex: 1 }}>
                  <CampoTexto
                    rotulo="Dia do vencimento *"
                    keyboardType="numeric"
                    value={diaVencimento}
                    onChangeText={setDiaVencimento}
                    erro={!diaValido ? 'Dia entre 1 e 31' : undefined}
                  />
                </View>
              ) : (
                <View style={{ flex: 1 }} />
              )}
            </View>
          ) : !temVencimento ? null : tipo === 'unica' ? (
            <CampoData
              rotulo="Data de vencimento *"
              valor={dataUnica}
              onMudar={setDataUnica}
              containerStyle={{ marginTop: spacing.base }}
            />
          ) : (
            <CampoTexto
              rotulo="Dia do vencimento no mês *"
              keyboardType="numeric"
              value={diaVencimento}
              onChangeText={setDiaVencimento}
              erro={!diaValido ? 'Informe um dia entre 1 e 31' : undefined}
              containerStyle={{ marginTop: spacing.base }}
              ajuda="Em meses com menos dias, vence no último dia do mês"
            />
          )}

          {/* Mês da primeira cobrança */}
          {usaMesInicio ? (
            <View style={{ marginTop: spacing.base }}>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: typography.fontFamily.medium,
                  fontSize: typography.fontSize.body,
                }}>
                {tipo === 'parcelada' ? 'Primeira parcela em' : 'Primeira cobrança em'}
              </Text>
              <SeletorMesCompacto
                mesRef={mesInicio}
                onMudar={setMesInicioEscolhido}
                style={{ marginTop: spacing.xs }}
              />
              <Text
                style={{
                  color: primeiroJaVenceu ? colors.danger : colors.textSecondary,
                  fontFamily: typography.fontFamily.regular,
                  fontSize: typography.fontSize.caption,
                  marginTop: spacing.xs,
                }}>
                {primeiroVencimento === null
                  ? 'Vence no fim do mês.'
                  : primeiroJaVenceu
                    ? `Vence em ${formatarData(primeiroVencimento)}, que já passou: vai aparecer como atrasada.`
                    : `Vence em ${formatarData(primeiroVencimento)}.`}
              </Text>
            </View>
          ) : null}

          {/* Seletor de Categoria */}
          <Text
            style={[
              styles.secaoTitulo,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.semiBold,
                marginTop: spacing.xl,
                marginBottom: spacing.xs,
              },
            ]}>
            CATEGORIA
          </Text>
          <SeletorCategoria
            categorias={categorias}
            categoriaId={categoriaId}
            onSelecionar={setCategoriaId}
            onCriarCategoria={criarCategoria}
          />

          {/* Conta compartilhada */}
          <Cartao style={{ marginTop: spacing.xl }}>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: compartilhada }}
              onPress={() => setCompartilhada(!compartilhada)}
              style={styles.compartilhadaRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.compartilhadaTitulo,
                    { color: colors.text, fontFamily: typography.fontFamily.semiBold },
                  ]}>
                  Conta compartilhada?
                </Text>
                <Text
                  style={[
                    styles.compartilhadaDescricao,
                    {
                      color: colors.textSecondary,
                      fontFamily: typography.fontFamily.regular,
                      fontSize: typography.fontSize.tiny,
                    },
                  ]}>
                  Dividir os custos com outras pessoas cadastradas
                </Text>
              </View>
              <Ionicons
                name={compartilhada ? 'checkbox' : 'square-outline'}
                size={26}
                color={compartilhada ? colors.primary : colors.textSecondary}
              />
            </Pressable>

            {compartilhada ? (
              <View style={{ marginTop: spacing.base }}>
                <Text
                  style={[
                    styles.subSecao,
                    { color: colors.text, fontFamily: typography.fontFamily.medium },
                  ]}>
                  Dividir com:
                </Text>
                <View style={styles.pessoasWrap}>
                  {pessoas.map((p) => {
                    const ativa = pessoasSelecionadas.includes(p.id);
                    return (
                      <Pressable
                        key={p.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: ativa }}
                        onPress={() => togglePessoa(p.id)}
                        style={[
                          styles.pessoaChip,
                          {
                            backgroundColor: ativa ? colors.primaryLight : colors.surfaceVariant,
                            borderColor: ativa ? colors.primary : 'transparent',
                            borderRadius: radii.full,
                            paddingHorizontal: spacing.md,
                            paddingVertical: 6,
                          },
                        ]}>
                        <Text
                          style={{
                            color: ativa ? colors.primaryDark : colors.text,
                            fontFamily: typography.fontFamily.medium,
                            fontSize: 13,
                          }}>
                          {p.nome}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {pessoas.length <= 1 ? (
                  <Botao
                    titulo="Cadastrar pessoas"
                    variante="fantasma"
                    tamanho="pequeno"
                    onPress={() => router.push('/pessoas')}
                    style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}
                  />
                ) : null}

                <Text
                  style={[
                    styles.subSecao,
                    {
                      color: colors.text,
                      fontFamily: typography.fontFamily.medium,
                      marginTop: spacing.base,
                    },
                  ]}>
                  Como dividir:
                </Text>
                <GrupoOpcoes<ModoDivisao>
                  rotuloAcessivel="Como dividir"
                  opcoes={[
                    { valor: 'igual', rotulo: 'Igual' },
                    { valor: 'porcentagem', rotulo: 'Porcentagem' },
                    { valor: 'valor', rotulo: 'Valor' },
                  ]}
                  valor={modoDivisao}
                  onMudar={setModoDivisao}
                />

                {modoDivisao !== 'igual'
                  ? pessoasSelecionadas.map((id) => {
                      const pessoa = pessoas.find((p) => p.id === id);
                      return (
                        <View key={id} style={[styles.linhaDivisao, { marginTop: spacing.sm }]}>
                          <Text
                            style={{
                              flex: 1,
                              color: colors.text,
                              fontFamily: typography.fontFamily.medium,
                              fontSize: 14,
                            }}>
                            {pessoa?.nome}
                          </Text>
                          <View style={{ width: 150 }}>
                            {modoDivisao === 'porcentagem' ? (
                              <CampoTexto
                                accessibilityLabel={`Porcentagem de ${pessoa?.nome}`}
                                keyboardType="decimal-pad"
                                placeholder="%"
                                value={porcentagens[id] ?? ''}
                                onChangeText={(t) => setPorcentagens({ ...porcentagens, [id]: t })}
                              />
                            ) : (
                              <CampoMoeda
                                valorCentavos={valoresDivisao[id] ?? 0}
                                onChangeCentavos={(v) =>
                                  setValoresDivisao({ ...valoresDivisao, [id]: v })
                                }
                              />
                            )}
                          </View>
                        </View>
                      );
                    })
                  : null}

                {divisao?.erro ? (
                  <Text
                    style={[
                      styles.divisaoPrevia,
                      {
                        color: colors.danger,
                        fontFamily: typography.fontFamily.medium,
                        marginTop: spacing.sm,
                      },
                    ]}>
                    {divisao.erro}
                  </Text>
                ) : divisao?.valores ? (
                  <Text
                    style={[
                      styles.divisaoPrevia,
                      {
                        color: colors.primary,
                        fontFamily: typography.fontFamily.semiBold,
                        marginTop: spacing.sm,
                      },
                    ]}>
                    {idEu !== undefined && pessoasSelecionadas.includes(idEu)
                      ? `Sua parte: ${formatarMoeda(minhaParteDivisao)} de ${formatarMoeda(valorCentavos)}`
                      : `Você não está na divisão: sua parte é ${formatarMoeda(0)}`}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Cartao>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Botão Salvar fixo no rodapé */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            padding: spacing.base,
          },
        ]}>
        <Botao
          titulo={salvando ? 'Salvando...' : 'Salvar Conta'}
          onPress={handleSalvar}
          desativado={!formularioValido || salvando}
          carregando={salvando}
        />
      </View>
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
  btnFechar: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollContent: {},
  secaoTitulo: {
    fontSize: 12,
    letterSpacing: 1,
  },
  tiposGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tipoCard: {
    width: '48%',
    borderWidth: 1.5,
  },
  tipoTitulo: {
    fontSize: 15,
  },
  tipoDescricao: {},
  linhaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linhaDivisao: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compartilhadaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compartilhadaTitulo: {
    fontSize: 16,
  },
  compartilhadaDescricao: {
    marginTop: 2,
  },
  subSecao: {
    fontSize: 14,
    marginBottom: 8,
  },
  pessoasWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pessoaChip: {
    borderWidth: 1,
  },
  divisaoPrevia: {
    fontSize: 13,
  },
  footer: {},
});
