import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import {
  Botao,
  CabecalhoTela,
  Cartao,
  GrupoOpcoes,
  LinhaSwitch,
  TituloSecao,
} from '@/src/components/ui';
import { useConfigStore } from '@/src/store/useConfigStore';
import { useMesStore } from '@/src/store/useMesStore';
import {
  Configuracoes,
  OPCOES_DIAS_ANTES,
  OPCOES_LIMITE_ATENCAO,
  OPCOES_MESES_MEDIA,
  TemaPreferido,
} from '@/src/domain/configuracoes';
import { pedirPermissaoComExplicacao } from '@/src/services/permissaoLembretes';

function formatarHora(hora: number): string {
  return `${String(hora).padStart(2, '0')}:00`;
}

export default function ConfiguracoesScreen() {
  const db = useSQLiteContext();
  const { colors, typography, spacing } = useTema();
  const config = useConfigStore((s) => s.config);
  const atualizar = useConfigStore((s) => s.atualizar);
  const carregarMes = useMesStore((s) => s.carregarMes);

  const mudar = (parcial: Partial<Configuracoes>) => atualizar(db, parcial);

  // Mudanças que alteram os números do mês: recalcular
  const mudarCalculo = async (parcial: Partial<Configuracoes>) => {
    await atualizar(db, parcial);
    await carregarMes(db);
  };

  const ligarLembretes = async (ligar: boolean) => {
    if (!ligar) {
      mudar({ notificacoesAtivas: false });
      return;
    }
    if (await pedirPermissaoComExplicacao()) {
      mudar({ notificacoesAtivas: true });
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
      <CabecalhoTela titulo="Configurações" />

      <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing.xxl }}>
        <TituloSecao style={{ marginTop: 0 }}>Aparência</TituloSecao>
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
            onMudar={(tema) => mudar({ tema })}
          />
        </Cartao>

        <TituloSecao>Lembretes</TituloSecao>
        <Cartao>
          <LinhaSwitch
            titulo="Lembrar dos vencimentos"
            descricao="Notificação antes e no dia em que cada conta vence"
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
                  rotulo: dias === 0 ? 'Só no dia' : `${dias} dia${dias > 1 ? 's' : ''} antes`,
                }))}
                valor={config.notificacaoDiasAntes}
                onMudar={(notificacaoDiasAntes) => mudar({ notificacaoDiasAntes })}
              />

              <Text style={[rotulo, { marginTop: spacing.base }]}>Horário</Text>
              <View style={styles.linhaHora}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Uma hora mais cedo"
                  onPress={() => mudar({ notificacaoHora: (config.notificacaoHora + 23) % 24 })}
                  hitSlop={8}
                  style={[styles.botaoHora, { backgroundColor: colors.surfaceVariant }]}>
                  <Ionicons name="remove" size={22} color={colors.text} />
                </Pressable>
                <Text
                  accessibilityLabel={`Horário do lembrete: ${formatarHora(config.notificacaoHora)}`}
                  style={{
                    color: colors.text,
                    fontFamily: typography.fontFamily.bold,
                    fontSize: typography.fontSize.title,
                    marginHorizontal: spacing.lg,
                  }}>
                  {formatarHora(config.notificacaoHora)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Uma hora mais tarde"
                  onPress={() => mudar({ notificacaoHora: (config.notificacaoHora + 1) % 24 })}
                  hitSlop={8}
                  style={[styles.botaoHora, { backgroundColor: colors.surfaceVariant }]}>
                  <Ionicons name="add" size={22} color={colors.text} />
                </Pressable>
              </View>

              <View
                style={[
                  styles.dica,
                  { backgroundColor: colors.warningLight, marginTop: spacing.base, padding: spacing.md },
                ]}>
                <Text style={[textoAjuda, { color: colors.text }]}>
                  Em alguns celulares (Xiaomi, Samsung, Motorola), a economia de bateria atrasa ou
                  apaga os lembretes. Se eles não chegarem, deixe o Fluxus{' '}
                  <Text style={{ fontFamily: typography.fontFamily.semiBold }}>
                    sem restrição de bateria
                  </Text>{' '}
                  nas configurações do app.
                </Text>
                <Botao
                  titulo="Abrir configurações do app"
                  variante="fantasma"
                  tamanho="pequeno"
                  onPress={() => Linking.openSettings()}
                  style={{ marginTop: spacing.xs, alignSelf: 'flex-start' }}
                />
              </View>
            </>
          ) : null}
        </Cartao>

        <TituloSecao>Aviso de aperto</TituloSecao>
        <Cartao>
          <Text style={rotulo}>Aviso amarelo quando as contas passam de</Text>
          <GrupoOpcoes<number>
            rotuloAcessivel="Limite do aviso amarelo"
            opcoes={OPCOES_LIMITE_ATENCAO.map((p) => ({ valor: p, rotulo: `${p}%` }))}
            valor={config.limiteAtencaoPercentual}
            onMudar={(limiteAtencaoPercentual) => mudar({ limiteAtencaoPercentual })}
          />
          <Text style={[textoAjuda, { marginTop: spacing.xs }]}>
            Do dinheiro do mês (renda + o que sobrou do mês anterior). Passou de 100%, o aviso
            fica vermelho.
          </Text>
        </Cartao>

        <TituloSecao>Cálculos</TituloSecao>
        <Cartao>
          <LinhaSwitch
            titulo="Começar com a sobra do mês anterior"
            descricao="Útil para quem recebe no fim do mês e paga as contas no começo do seguinte"
            valor={config.usarSobraDoMesAnterior}
            onMudar={(usarSobraDoMesAnterior) => mudarCalculo({ usarSobraDoMesAnterior })}
          />
          <LinhaSwitch
            titulo="Contas divididas: contar só a minha parte"
            descricao="Desligado, o resumo conta o valor inteiro das contas compartilhadas"
            valor={config.contarSoMinhaParte}
            onMudar={(contarSoMinhaParte) => mudarCalculo({ contarSoMinhaParte })}
            style={{ marginTop: spacing.sm }}
          />
          <Text style={[rotulo, { marginTop: spacing.base }]}>
            Sugestão das contas variáveis pela média de
          </Text>
          <GrupoOpcoes<number>
            rotuloAcessivel="Meses na média das contas variáveis"
            opcoes={OPCOES_MESES_MEDIA.map((m) => ({ valor: m, rotulo: `${m} meses` }))}
            valor={config.mesesMedia}
            onMudar={(mesesMedia) => mudar({ mesesMedia })}
          />
        </Cartao>

        <TituloSecao>Seus dados</TituloSecao>
        <Cartao destaque>
          <View style={styles.linhaDados}>
            <Ionicons name="phone-portrait-outline" size={22} color={colors.warning} />
            <Text style={[textoAjuda, { flex: 1, marginLeft: spacing.sm, color: colors.text }]}>
              Seus dados ficam só neste celular. Se desinstalar o app, eles serão perdidos. Faça
              backup de vez em quando em Mais › Backup dos dados.
            </Text>
          </View>
        </Cartao>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  linhaHora: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoHora: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dica: {
    borderRadius: 12,
  },
  linhaDados: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
