import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useTema } from '@/src/theme';
import { Botao, CabecalhoTela, CampoTexto, Cartao } from '@/src/components/ui';
import { confirmarCodigo, entrarComEmail, sair, validarEmail } from '@/src/services/conta';
import { exportarBackup } from '@/src/services/backup';
import {
  apagarDadosDaNuvem,
  ErroOutraConta,
  ligarConta,
  temDadosParaProteger,
} from '@/src/services/sync/ligacao';
import { sincronizar } from '@/src/services/sync/motor';
import {
  contaDisponivel,
  criarRedeSupabase,
  obterClienteSupabase,
} from '@/src/services/sync/supabase';
import { useContaStore } from '@/src/store/useContaStore';
import { useMesStore } from '@/src/store/useMesStore';
import { avisar } from '@/src/utils/avisar';
import { estiloFormulario } from '@/src/utils/layout';

/** Pergunta Sim/Não e devolve a resposta (fechar o aviso conta como não). */
function confirmar(titulo: string, mensagem: string, textoSim: string, perigo = false) {
  return new Promise<boolean>((resolver) => {
    avisar(
      titulo,
      mensagem,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
        {
          text: textoSim,
          style: perigo ? 'destructive' : 'default',
          onPress: () => resolver(true),
        },
      ],
      { onDismiss: () => resolver(false) }
    );
  });
}

function textoUltimaVez(iso: string | null): string {
  if (!iso) return 'ainda não sincronizou nesta sessão';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ContaSincronizadaScreen() {
  const db = useSQLiteContext();
  const { colors, typography, spacing } = useTema();
  const { usuario, rede, situacao, ultimaVez, erro: erroSync } = useContaStore();
  const carregarMes = useMesStore((s) => s.carregarMes);

  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cliente = obterClienteSupabase();
  const texto = {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
    lineHeight: 18,
  };

  const enviarCodigo = async () => {
    if (!cliente) return;
    setErro(null);
    if (!validarEmail(email)) return setErro('Digite um e-mail válido.');
    setOcupado(true);
    try {
      await entrarComEmail(cliente.auth, email);
      setCodigoEnviado(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o código.');
    } finally {
      setOcupado(false);
    }
  };

  const entrar = async () => {
    if (!cliente) return;
    setErro(null);
    setOcupado(true);
    try {
      const pessoa = await confirmarCodigo(cliente.auth, email, codigo);
      const jaLigado = await db.getFirstAsync<{ valor: string }>(
        "SELECT valor FROM sync_estado WHERE chave = 'usuario_id';"
      );
      const novaRede = criarRedeSupabase(cliente);
      // com o aparelho vazio não há o que proteger: entra direto, sem backup
      if (!jaLigado && (await temDadosParaProteger(db))) {
        const seguir = await confirmar(
          'Ligar este aparelho à conta',
          'Vamos salvar uma cópia de segurança dos seus dados atuais e depois juntá-los com o que já estiver na conta. Nada será apagado.',
          'Continuar'
        );
        if (!seguir) {
          await sair(cliente.auth);
          return;
        }
        await exportarBackup(db);
      }
      const resultado = await ligarConta(db, novaRede, pessoa.id);
      useContaStore.getState().definirUsuario(pessoa);
      useContaStore.getState().definirRede(novaRede);
      await carregarMes(db);
      setCodigo('');
      setCodigoEnviado(false);
      avisar(
        'Conta ligada',
        resultado === 'novo'
          ? 'Seus dados foram enviados para a conta.'
          : 'Seus dados foram juntados com os da conta.'
      );
    } catch (e) {
      if (e instanceof ErroOutraConta) await sair(cliente.auth).catch(() => {});
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setOcupado(false);
    }
  };

  const sincronizarAgora = async () => {
    if (!rede) return;
    const conta = useContaStore.getState();
    conta.comecou();
    try {
      const r = await sincronizar(db, rede);
      conta.terminou(null);
      if (r.aplicados > 0) await carregarMes(db);
    } catch (e) {
      conta.terminou(e instanceof Error ? e.message : 'Falha ao sincronizar.');
    }
  };

  const sairDaConta = async () => {
    if (!cliente) return;
    const sim = await confirmar(
      'Sair da conta?',
      'Os dados continuam neste aparelho, mas deixam de ser sincronizados até você entrar de novo.',
      'Sair'
    );
    if (!sim) return;
    await sair(cliente.auth);
    useContaStore.getState().definirUsuario(null);
    useContaStore.getState().definirRede(null);
  };

  const apagarNuvem = async () => {
    if (!cliente) return;
    const sim = await confirmar(
      'Apagar dados da nuvem?',
      'Isso apaga tudo o que a conta guardou na nuvem, em todos os aparelhos. Os dados deste aparelho continuam aqui. Seu e-mail de acesso não é apagado.',
      'Apagar da nuvem',
      true
    );
    if (!sim) return;
    try {
      await apagarDadosDaNuvem(db, cliente);
      await sair(cliente.auth);
      useContaStore.getState().definirUsuario(null);
      useContaStore.getState().definirRede(null);
      avisar('Pronto', 'Os dados da nuvem foram apagados.');
    } catch (e) {
      avisar('Erro', e instanceof Error ? e.message : 'Não foi possível apagar.');
    }
  };

  const situacaoTexto =
    situacao === 'sincronizando'
      ? 'Sincronizando...'
      : situacao === 'erro'
        ? `Erro: ${erroSync ?? 'tente de novo'}`
        : `Última sincronização: ${textoUltimaVez(ultimaVez)}`;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={{ flex: 1, backgroundColor: colors.background }}>
      <CabecalhoTela titulo="Conta e sincronização" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            { padding: spacing.base, paddingBottom: spacing.xxl },
            estiloFormulario,
          ]}>
          {!contaDisponivel ? (
            <Cartao>
              <Text style={texto}>
                A conta ainda não está disponível nesta versão do app. Seus dados continuam
                funcionando normalmente, só neste aparelho.
              </Text>
            </Cartao>
          ) : usuario && rede ? (
            <>
              <Cartao>
                <Text style={[texto, { color: colors.text }]}>Conectado como</Text>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: typography.fontFamily.bold,
                    fontSize: typography.fontSize.body,
                  }}>
                  {usuario.email}
                </Text>
                <Text style={[texto, { marginTop: spacing.sm }]}>{situacaoTexto}</Text>
              </Cartao>
              <View style={{ marginTop: spacing.base, gap: spacing.sm }}>
                <Botao
                  titulo="Sincronizar agora"
                  onPress={sincronizarAgora}
                  carregando={situacao === 'sincronizando'}
                />
                <Botao titulo="Sair da conta" variante="secundario" onPress={sairDaConta} />
                <Botao
                  titulo="Apagar meus dados da nuvem"
                  variante="fantasma"
                  onPress={apagarNuvem}
                />
              </View>
            </>
          ) : usuario ? (
            <Cartao>
              <Text style={texto}>
                Você entrou como {usuario.email}, mas este aparelho ainda não foi ligado à conta.
                Saia e entre de novo para ligar.
              </Text>
              <Botao
                titulo="Sair"
                variante="secundario"
                onPress={sairDaConta}
                style={{ marginTop: spacing.base }}
              />
            </Cartao>
          ) : (
            <>
              <Text style={[texto, { marginBottom: spacing.base }]}>
                Entre com seu e-mail para usar os mesmos dados no celular e no navegador. O app
                continua funcionando sem internet; a conta só guarda uma cópia e mantém tudo igual.
              </Text>
              <Text style={[texto, { marginBottom: spacing.base }]}>
                O que vai para a nuvem: suas contas, rendas, valores, categorias, pessoas e
                configurações, para poder sincronizar. Não pedimos nem guardamos dados bancários. Só
                você lê esses dados, e pode apagá-los da nuvem quando quiser.
              </Text>
              <Cartao>
                <CampoTexto
                  rotulo="E-mail"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setErro(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!codigoEnviado}
                  erro={!codigoEnviado ? (erro ?? undefined) : undefined}
                />
                {codigoEnviado ? (
                  <CampoTexto
                    rotulo="Código recebido por e-mail"
                    placeholder="Só números"
                    value={codigo}
                    onChangeText={(t) => {
                      setCodigo(t.replace(/\D/g, '').slice(0, 10));
                      setErro(null);
                    }}
                    keyboardType="number-pad"
                    maxLength={10}
                    erro={erro ?? undefined}
                    containerStyle={{ marginTop: spacing.base }}
                  />
                ) : null}
                <View style={{ marginTop: spacing.base, gap: spacing.sm }}>
                  {codigoEnviado ? (
                    <>
                      <Botao
                        titulo="Entrar"
                        onPress={entrar}
                        carregando={ocupado}
                        desativado={codigo.length < 6}
                      />
                      <Botao
                        titulo="Usar outro e-mail"
                        variante="fantasma"
                        onPress={() => {
                          setCodigoEnviado(false);
                          setCodigo('');
                          setErro(null);
                        }}
                      />
                    </>
                  ) : (
                    <Botao
                      titulo="Enviar código"
                      onPress={enviarCodigo}
                      carregando={ocupado}
                      desativado={!email.trim()}
                    />
                  )}
                </View>
              </Cartao>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
