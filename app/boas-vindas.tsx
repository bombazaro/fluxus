import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
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
  GrupoOpcoes,
  LinhaSwitch,
  SeletorHora,
} from '@/src/components/ui';
import { rendasRepo } from '@/src/db/repositorios/rendasRepo';
import { useConfigStore } from '@/src/store/useConfigStore';
import { useMesStore } from '@/src/store/useMesStore';
import {
  OPCOES_DIAS_ANTES,
  OPCOES_LIMITE_ATENCAO,
  TemaPreferido,
} from '@/src/domain/configuracoes';
import { validarRendaInicial } from '@/src/domain/rendaInicial';
import { pedirPermissaoComExplicacao } from '@/src/services/permissaoLembretes';

type IconeIonicons = keyof typeof Ionicons.glyphMap;

type Passo = 'inicio' | 'renda' | 'lembretes' | 'mes' | 'aparencia';

const PASSOS: { id: Passo; icone: IconeIonicons; titulo: string; texto: string }[] = [
  {
    id: 'inicio',
    icone: 'wallet-outline',
    titulo: 'Bem-vindo ao Fluxus',
    texto:
      'Cadastre suas contas e rendas uma vez. O app calcula sozinho quanto falta pagar, quanto ' +
      'sobra e avisa antes de cada vencimento. Antes, umas perguntas rápidas.',
  },
  {
    id: 'renda',
    icone: 'cash-outline',
    titulo: 'Quanto você recebe?',
    texto:
      'Seu salário ou a renda principal. Com o dia em que o dinheiro cai, o app mostra se o mês ' +
      'fecha e em qual dia fica mais apertado.',
  },
  {
    id: 'lembretes',
    icone: 'notifications-outline',
    titulo: 'Quer ser lembrado?',
    texto: 'O app avisa antes de cada conta vencer, para nada passar da data.',
  },
  {
    id: 'mes',
    icone: 'calendar-outline',
    titulo: 'Como é o seu mês?',
    texto: 'Duas escolhas que mudam as contas do resumo. Dá para trocar depois em Configurações.',
  },
  {
    id: 'aparencia',
    icone: 'color-palette-outline',
    titulo: 'Tudo pronto!',
    texto: 'Escolha o tema e cadastre suas contas: aluguel, internet, luz, parcelas...',
  },
];

export default function BoasVindasScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, typography, spacing, radii } = useTema();
  const config = useConfigStore((s) => s.config);
  const atualizar = useConfigStore((s) => s.atualizar);
  const carregarMes = useMesStore((s) => s.carregarMes);

  const [indice, setIndice] = useState(0);
  const [nomeRenda, setNomeRenda] = useState('Salário');
  const [valorRenda, setValorRenda] = useState(0);
  const [diaRenda, setDiaRenda] = useState('');
  const [erroRenda, setErroRenda] = useState<string | null>(null);
  // Se a pessoa voltar e mudar a renda, atualiza a mesma em vez de criar outra
  const [rendaId, setRendaId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  const atual = PASSOS[indice];
  const ultimo = indice === PASSOS.length - 1;

  const salvarRenda = async (): Promise<boolean> => {
    const { renda, erro } = validarRendaInicial({
      nome: nomeRenda,
      valorCentavos: valorRenda,
      diaTexto: diaRenda,
    });
    setErroRenda(erro);
    if (erro) return false;
    if (!renda) return true;

    if (rendaId !== null) {
      await rendasRepo.atualizar(db, rendaId, renda);
    } else {
      setRendaId(await rendasRepo.criar(db, { ...renda, tipo: 'fixa', mes_ref: null, ativa: 1 }));
    }
    return true;
  };

  const avancar = async () => {
    if (salvando) return;
    setSalvando(true);
    try {
      if (atual.id === 'renda' && !(await salvarRenda())) return;
      setIndice(indice + 1);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a renda. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const concluir = async (depois?: () => void) => {
    await atualizar(db, { onboardingConcluido: true });
    await carregarMes(db);
    router.replace('/(tabs)');
    depois?.();
  };

  const ligarLembretes = async (ligar: boolean) => {
    if (!ligar) {
      await atualizar(db, { notificacoesAtivas: false });
    } else if (await pedirPermissaoComExplicacao()) {
      await atualizar(db, { notificacoesAtivas: true });
    }
  };

  const textoAjuda = {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
    lineHeight: 18,
  };
  const rotulo = {
    color: colors.text,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.body,
    marginBottom: spacing.xs,
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.conteudo, { padding: spacing.xl }]}>
          <View
            style={[
              styles.icone,
              { backgroundColor: colors.primaryLight, borderRadius: radii.full },
            ]}>
            <Ionicons name={atual.icone} size={44} color={colors.primary} />
          </View>

          <Text
            accessibilityRole="header"
            style={{
              color: colors.text,
              fontFamily: typography.fontFamily.bold,
              fontSize: typography.fontSize.title,
              textAlign: 'center',
              marginTop: spacing.lg,
            }}>
            {atual.titulo}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.body,
              lineHeight: 24,
              textAlign: 'center',
              marginTop: spacing.sm,
            }}>
            {atual.texto}
          </Text>

          <View style={[styles.corpo, { marginTop: spacing.xl }]}>
            {atual.id === 'inicio' ? (
              <Cartao destaque>
                <View style={styles.linha}>
                  <Ionicons name="lock-closed-outline" size={22} color={colors.warning} />
                  <Text
                    style={[textoAjuda, { flex: 1, marginLeft: spacing.sm, color: colors.text }]}>
                    Sem conta, sem internet: seus dados ficam só neste celular. Se desinstalar o
                    app, eles serão perdidos. Faça backup de vez em quando em Mais › Backup dos
                    dados.
                  </Text>
                </View>
              </Cartao>
            ) : null}

            {atual.id === 'renda' ? (
              <Cartao>
                <CampoTexto
                  rotulo="Nome"
                  placeholder="Ex: Salário"
                  value={nomeRenda}
                  onChangeText={setNomeRenda}
                />
                <CampoMoeda
                  rotulo="Quanto cai por mês"
                  valorCentavos={valorRenda}
                  onChangeCentavos={(v) => {
                    setValorRenda(v);
                    setErroRenda(null);
                  }}
                  containerStyle={{ marginTop: spacing.base }}
                />
                <CampoTexto
                  rotulo="Dia em que cai"
                  placeholder="Ex: 5"
                  keyboardType="number-pad"
                  maxLength={2}
                  value={diaRenda}
                  onChangeText={(t) => {
                    setDiaRenda(t.replace(/\D/g, ''));
                    setErroRenda(null);
                  }}
                  erro={erroRenda ?? undefined}
                  ajuda="Se cair no dia 31 e o mês for mais curto, conta o último dia."
                  containerStyle={{ marginTop: spacing.base }}
                />
                <Text style={[textoAjuda, { marginTop: spacing.sm }]}>
                  Outras rendas (freela, 13º, bônus) você cadastra depois em Mais › Rendas. Se
                  preferir, deixe em branco e continue.
                </Text>
              </Cartao>
            ) : null}

            {atual.id === 'lembretes' ? (
              <Cartao>
                <LinhaSwitch
                  titulo="Lembrar dos vencimentos"
                  descricao="Uma notificação antes e outra no dia em que a conta vence"
                  valor={config.notificacoesAtivas}
                  onMudar={ligarLembretes}
                />
                {config.notificacoesAtivas ? (
                  <>
                    <Text style={[rotulo, { marginTop: spacing.base }]}>Avisar</Text>
                    <GrupoOpcoes<number>
                      rotuloAcessivel="Quantos dias antes avisar"
                      opcoes={OPCOES_DIAS_ANTES.map((dias) => ({
                        valor: dias,
                        rotulo:
                          dias === 0 ? 'Só no dia' : `${dias} dia${dias > 1 ? 's' : ''} antes`,
                      }))}
                      valor={config.notificacaoDiasAntes}
                      onMudar={(notificacaoDiasAntes) => atualizar(db, { notificacaoDiasAntes })}
                    />
                    <Text style={[rotulo, { marginTop: spacing.base }]}>Horário</Text>
                    <SeletorHora
                      hora={config.notificacaoHora}
                      onMudar={(notificacaoHora) => atualizar(db, { notificacaoHora })}
                    />
                    <Text style={[textoAjuda, { marginTop: spacing.base }]}>
                      Se os lembretes não chegarem, deixe o Fluxus sem restrição de bateria nas
                      configurações do celular.
                    </Text>
                    <Botao
                      titulo="Abrir configurações do app"
                      variante="fantasma"
                      tamanho="pequeno"
                      onPress={() => Linking.openSettings()}
                      style={{ alignSelf: 'flex-start' }}
                    />
                  </>
                ) : null}
              </Cartao>
            ) : null}

            {atual.id === 'mes' ? (
              <>
                <Cartao>
                  <LinhaSwitch
                    titulo="Começar com a sobra do mês anterior"
                    descricao="Ex.: você recebe dia 30 e as contas vencem dia 10. O que sobrou do mês passado paga essas contas, então o app não mostra o mês no vermelho à toa."
                    valor={config.usarSobraDoMesAnterior}
                    onMudar={(usarSobraDoMesAnterior) => atualizar(db, { usarSobraDoMesAnterior })}
                  />
                </Cartao>
                <Cartao style={{ marginTop: spacing.base }}>
                  <Text style={rotulo}>
                    Avisar que o mês está apertado quando as contas passam de
                  </Text>
                  <GrupoOpcoes<number>
                    rotuloAcessivel="Limite do aviso de aperto"
                    opcoes={OPCOES_LIMITE_ATENCAO.map((p) => ({ valor: p, rotulo: `${p}%` }))}
                    valor={config.limiteAtencaoPercentual}
                    onMudar={(limiteAtencaoPercentual) =>
                      atualizar(db, { limiteAtencaoPercentual })
                    }
                  />
                  <Text style={[textoAjuda, { marginTop: spacing.xs }]}>
                    Do dinheiro do mês. Com 80% e renda de R$ 3.000, o aviso amarelo aparece quando
                    as contas passam de R$ 2.400. Passou de 100%, fica vermelho.
                  </Text>
                </Cartao>
              </>
            ) : null}

            {atual.id === 'aparencia' ? (
              <Cartao>
                <Text style={rotulo}>Tema</Text>
                <GrupoOpcoes<TemaPreferido>
                  rotuloAcessivel="Tema"
                  opcoes={[
                    { valor: 'sistema', rotulo: 'Do celular' },
                    { valor: 'claro', rotulo: 'Claro' },
                    { valor: 'escuro', rotulo: 'Escuro' },
                  ]}
                  valor={config.tema}
                  onMudar={(tema) => atualizar(db, { tema })}
                />
              </Cartao>
            ) : null}
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.base }}>
          <View
            style={styles.pontos}
            accessibilityLabel={`Passo ${indice + 1} de ${PASSOS.length}`}>
            {PASSOS.map((p, i) => (
              <View
                key={p.id}
                style={[
                  styles.ponto,
                  {
                    backgroundColor: i === indice ? colors.primary : colors.border,
                    width: i === indice ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>

          {ultimo ? (
            <>
              <Botao
                titulo="Cadastrar primeira conta"
                onPress={() => concluir(() => router.push('/conta/nova'))}
              />
              <Botao
                titulo="Começar a usar"
                variante="fantasma"
                onPress={() => concluir()}
                style={{ marginTop: spacing.xs }}
              />
            </>
          ) : (
            <>
              <Botao titulo="Continuar" onPress={avancar} desativado={salvando} />
              <View style={[styles.linha, { marginTop: spacing.xs }]}>
                {indice > 0 ? (
                  <Botao
                    titulo="Voltar"
                    variante="fantasma"
                    onPress={() => setIndice(indice - 1)}
                    style={{ flex: 1 }}
                  />
                ) : null}
                <Botao
                  titulo="Pular tudo"
                  variante="fantasma"
                  onPress={() => concluir()}
                  style={{ flex: 1 }}
                />
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  conteudo: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corpo: {
    alignSelf: 'stretch',
  },
  icone: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pontos: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  ponto: {
    height: 8,
    borderRadius: 4,
  },
});
