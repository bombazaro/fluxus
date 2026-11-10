import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useTema } from '@/src/theme';
import { Botao, CabecalhoTela, CampoTexto, Cartao } from '@/src/components/ui';
import { useIaDisponivel } from '@/src/hooks/useIa';
import { categoriasRepo } from '@/src/db/repositorios/categoriasRepo';
import { CadastroInterpretado, TEXTO_MAXIMO } from '@/src/domain/ia/tipos';
import { ErroIa, interpretarTexto } from '@/src/services/ia/cliente';
import { obterHojeIso } from '@/src/store/useMesStore';
import { Categoria } from '@/src/types';
import { estiloFormulario } from '@/src/utils/layout';

const EXEMPLOS = [
  'paguei 150 de mercado ontem',
  'internet 100 vence dia 10',
  'netflix 55,90 todo mês dia 12',
];

/** Leva o cadastro interpretado para o formulário certo, já preenchido, para a pessoa conferir. */
function paramsDoFormulario(c: CadastroInterpretado) {
  const comum: Record<string, string> = { ia: '1' };
  if (c.valorCentavos !== null) comum.valor = String(c.valorCentavos);
  if (c.categoriaId !== null) comum.categoria = String(c.categoriaId);
  if (c.avisos.length > 0) comum.aviso = c.avisos.join(' ');
  if (c.dataIso) comum.data = c.dataIso;

  if (c.tipo === 'pago') {
    return { pathname: '/gasto-rapido' as const, params: { ...comum, descricao: c.descricao } };
  }
  const params: Record<string, string> = { ...comum, tipo: c.tipo, nome: c.descricao };
  if (c.diaVencimento !== null) params.dia = String(c.diaVencimento);
  if (c.parcelas !== null) params.parcelas = String(c.parcelas);
  return { pathname: '/conta/nova' as const, params };
}

/** Cadastro por frase livre: a IA só interpreta e preenche; quem confere e salva é a pessoa. */
export default function TextoLivreScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, typography, spacing } = useTema();
  const { disponivel, cliente } = useIaDisponivel();

  const [texto, setTexto] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    categoriasRepo
      .listarTodas(db)
      .then(setCategorias)
      .catch(() => {});
  }, [db]);

  const interpretar = async () => {
    if (!cliente || carregando) return;
    setMensagem(null);
    setCarregando(true);
    try {
      const r = await interpretarTexto(cliente, texto, categorias, obterHojeIso());
      if (!r.entendeu) {
        setMensagem(r.motivo);
        return;
      }
      router.replace(paramsDoFormulario(r.cadastro));
    } catch (e) {
      setMensagem(e instanceof ErroIa ? e.message : 'Algo deu errado. Use o cadastro manual.');
    } finally {
      setCarregando(false);
    }
  };

  const texto12 = {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
    lineHeight: 18,
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <CabecalhoTela titulo="Texto livre" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            { padding: spacing.base, paddingBottom: spacing.xxl },
            estiloFormulario,
          ]}>
          {!disponivel ? (
            <Cartao>
              <Text style={texto12}>
                A IA só funciona com a conta conectada e sincronizando. Entre na conta em Mais ›
                Conta e sincronização, ou use o cadastro manual.
              </Text>
              <View style={{ marginTop: spacing.base }}>
                <Botao titulo="Gasto rápido" onPress={() => router.replace('/gasto-rapido')} />
                <Botao
                  titulo="Nova conta"
                  variante="secundario"
                  onPress={() => router.replace('/conta/nova')}
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            </Cartao>
          ) : (
            <>
              <Text style={texto12}>
                Escreva como falaria. A IA entende o valor, a categoria e a data e abre o formulário
                já preenchido. Você confere e salva: ela nunca salva sozinha.
              </Text>

              <Cartao style={{ marginTop: spacing.base }}>
                <CampoTexto
                  rotulo="O que você gastou?"
                  placeholder={EXEMPLOS[0]}
                  value={texto}
                  onChangeText={setTexto}
                  maxLength={TEXTO_MAXIMO}
                  multiline
                  autoCapitalize="sentences"
                />
                <Text style={[texto12, { marginTop: spacing.sm }]}>
                  Exemplos: {EXEMPLOS.join(' · ')}
                </Text>
              </Cartao>

              {mensagem ? (
                <Text
                  accessibilityRole="alert"
                  style={{
                    color: colors.danger,
                    fontFamily: typography.fontFamily.medium,
                    fontSize: typography.fontSize.caption,
                    marginTop: spacing.base,
                  }}>
                  {mensagem}
                </Text>
              ) : null}

              <View style={{ marginTop: spacing.xl }}>
                <Botao
                  titulo={carregando ? 'Interpretando...' : 'Interpretar'}
                  onPress={interpretar}
                  carregando={carregando}
                  desativado={!texto.trim()}
                />
                {mensagem ? (
                  <Botao
                    titulo="Cadastrar à mão"
                    variante="secundario"
                    onPress={() => router.replace('/gasto-rapido')}
                    style={{ marginTop: spacing.sm }}
                  />
                ) : null}
              </View>

              <Text style={[texto12, { marginTop: spacing.lg }]}>
                Privacidade: o texto que você digita (e os nomes das suas categorias) é enviado ao
                Google (Gemini) só para ser interpretado. O Fluxus não o guarda. No plano gratuito
                do Google, esse conteúdo pode ser usado para melhorar os produtos dele. Não escreva
                dados pessoais sensíveis.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
