import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import {
  Botao,
  CampoMoeda,
  CampoTexto,
  Cartao,
} from '@/src/components/ui';
import { Categoria, Pessoa, TipoConta } from '@/src/types';
import { categoriasRepo } from '@/src/db/repositorios/categoriasRepo';
import { contasRepo } from '@/src/db/repositorios/contasRepo';
import { lancamentosRepo } from '@/src/db/repositorios/lancamentosRepo';
import { pessoasRepo } from '@/src/db/repositorios/pessoasRepo';
import { divisoesRepo } from '@/src/db/repositorios/divisoesRepo';
import { gerarLancamentosParaConta } from '@/src/domain/gerarLancamentos';
import { useMesStore, obterHojeIso, obterMesAtualIso } from '@/src/store/useMesStore';
import { formatarMoeda } from '@/src/utils/formatadores';
import { dividirContaPorIgual } from '@/src/domain/dividirConta';
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

export default function NovaContaModal() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, typography, spacing, radii } = useTema();
  const carregarMes = useMesStore((s) => s.carregarMes);

  const [tipo, setTipo] = useState<TipoConta>('fixa');
  const [nome, setNome] = useState('');
  const [valorCentavos, setValorCentavos] = useState(0);
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [dataUnica, setDataUnica] = useState(obterHojeIso());
  const [parcelasTotal, setParcelasTotal] = useState('2');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [compartilhada, setCompartilhada] = useState(false);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [pessoasSelecionadas, setPessoasSelecionadas] = useState<number[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregarDados() {
      const listaCat = await categoriasRepo.listarTodas(db);
      setCategorias(listaCat);
      if (listaCat.length > 0) {
        setCategoriaId((atual) => atual ?? listaCat[0].id);
      }

      const listaPessoas = await pessoasRepo.listarTodas(db);
      setPessoas(listaPessoas);
      const eu = listaPessoas.find((p) => p.nome === 'Eu');
      if (eu) {
        setPessoasSelecionadas([eu.id]);
      }
    }
    carregarDados();
  }, [db]);

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
    tipo === 'unica' || (!isNaN(diaNum) && diaNum >= 1 && diaNum <= 31);
  const parcelasValidas =
    tipo !== 'parcelada' || (!isNaN(parcelasNum) && parcelasNum >= 2);
  const nomeValido = nome.trim().length > 0;
  const valorValido = valorCentavos > 0;
  const categoriaValida = !!categoriaId;

  const formularioValido =
    nomeValido && valorValido && diaValido && parcelasValidas && categoriaValida;

  const handleSalvar = async () => {
    if (!formularioValido || !categoriaId || salvando) return;
    setSalvando(true);

    try {
      const mesAtual = obterMesAtualIso();
      const dataInicio =
        tipo === 'unica' ? dataUnica : `${mesAtual}-${String(diaNum).padStart(2, '0')}`;

      // Conta, lançamentos e divisões juntos: ou salva tudo, ou nada
      await db.withTransactionAsync(async () => {
        const idConta = await contasRepo.criar(db, {
          nome: nome.trim(),
          categoria_id: categoriaId,
          tipo,
          valor_centavos: valorCentavos,
          dia_vencimento: tipo === 'unica' ? null : diaNum,
          data_unica: tipo === 'unica' ? dataUnica : null,
          parcelas_total: tipo === 'parcelada' ? parcelasNum : null,
          data_inicio: dataInicio,
          data_fim: null,
          ativa: 1,
          compartilhada: compartilhada ? 1 : 0,
          sem_vencimento: 0,
        });

        // Gera os lançamentos correspondentes
        const lancamentosPrevistos = gerarLancamentosParaConta({
          id: idConta,
          nome: nome.trim(),
          categoria_id: categoriaId,
          tipo,
          valor_centavos: valorCentavos,
          dia_vencimento: tipo === 'unica' ? null : diaNum,
          data_unica: tipo === 'unica' ? dataUnica : null,
          parcelas_total: tipo === 'parcelada' ? parcelasNum : null,
          data_inicio: dataInicio,
          data_fim: null,
          ativa: 1,
          compartilhada: compartilhada ? 1 : 0,
          sem_vencimento: 0,
        });

        for (const lp of lancamentosPrevistos) {
          const idLancamento = await lancamentosRepo.criar(db, lp);

          if (compartilhada && pessoasSelecionadas.length > 0) {
            const divisaoPorcentagem = dividirContaPorIgual(
              lp.valor_centavos,
              pessoasSelecionadas.length
            );
            const divisoesObj = pessoasSelecionadas.map((pessoaId, index) => ({
              pessoa_id: pessoaId,
              valor_centavos: divisaoPorcentagem[index] || 0,
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
            erro={!valorValido && valorCentavos === 0 ? 'Informe um valor maior que zero' : undefined}
            destaqueGrande
            containerStyle={{ marginTop: spacing.base }}
          />

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
              <View style={{ flex: 1 }}>
                <CampoTexto
                  rotulo="Dia do vencimento *"
                  keyboardType="numeric"
                  value={diaVencimento}
                  onChangeText={setDiaVencimento}
                  erro={!diaValido ? 'Dia entre 1 e 31' : undefined}
                />
              </View>
            </View>
          ) : tipo === 'unica' ? (
            <CampoTexto
              rotulo="Data de vencimento (AAAA-MM-DD) *"
              placeholder="Ex: 2026-05-15"
              value={dataUnica}
              onChangeText={setDataUnica}
              containerStyle={{ marginTop: spacing.base }}
              ajuda="Data no formato AAAA-MM-DD"
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
          />

          {/* Conta compartilhada */}
          <Cartao style={{ marginTop: spacing.xl }}>
            <Pressable
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

                {pessoasSelecionadas.length > 0 ? (
                  <Text
                    style={[
                      styles.divisaoPrevia,
                      {
                        color: colors.primary,
                        fontFamily: typography.fontFamily.semiBold,
                        marginTop: spacing.sm,
                      },
                    ]}>
                    Sua parte estimada:{' '}
                    {formatarMoeda(
                      dividirContaPorIgual(valorCentavos, pessoasSelecionadas.length)[0] || 0
                    )}
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
