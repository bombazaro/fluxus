import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import {
  Botao,
  CabecalhoTela,
  CampoTexto,
  Cartao,
  GrupoOpcoes,
  LinhaSwitch,
  SeletorHora,
  TituloSecao,
} from '@/src/components/ui';
import { useConfigStore } from '@/src/store/useConfigStore';
import { useMesStore } from '@/src/store/useMesStore';
import {
  Configuracoes,
  NOME_MAXIMO,
  OPCOES_DIAS_ANTES,
  OPCOES_LIMITE_ATENCAO,
  OPCOES_MESES_MEDIA,
  TemaPreferido,
} from '@/src/domain/configuracoes';
import { EscolhaQuandoRecebe } from '@/src/components/config/EscolhaQuandoRecebe';
import { pedirPermissaoComExplicacao } from '@/src/services/permissaoLembretes';

export default function ConfiguracoesScreen() {
  const db = useSQLiteContext();
  const { colors, typography, spacing } = useTema();
  const config = useConfigStore((s) => s.config);
  const atualizar = useConfigStore((s) => s.atualizar);
  const carregarMes = useMesStore((s) => s.carregarMes);

  const mudar = (parcial: Partial<Configuracoes>) => atualizar(db, parcial);

  const [nome, setNome] = useState(config.nome);
  const salvarNome = () => {
    const limpo = nome.trim();
    setNome(limpo);
    if (limpo !== config.nome) mudar({ nome: limpo });
  };

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
        <TituloSecao style={{ marginTop: 0 }}>Você</TituloSecao>
        <Cartao>
          <CampoTexto
            rotulo="Como quer ser chamado"
            placeholder="Seu nome"
            value={nome}
            onChangeText={setNome}
            onBlur={salvarNome}
            onSubmitEditing={salvarNome}
            maxLength={NOME_MAXIMO}
            autoCapitalize="words"
            returnKeyType="done"
            ajuda="Aparece na saudação da tela Início."
          />
        </Cartao>

        <TituloSecao>Aparência</TituloSecao>
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
            descricao="Notificação antes e no dia em que cada conta vence, e no dia do salário"
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
              <SeletorHora
                hora={config.notificacaoHora}
                onMudar={(notificacaoHora) => mudar({ notificacaoHora })}
              />

              <View
                style={[
                  styles.dica,
                  {
                    backgroundColor: colors.warningLight,
                    marginTop: spacing.base,
                    padding: spacing.md,
                  },
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
            Do dinheiro do mês (renda + o que sobrou do mês anterior). Passou de 100%, o aviso fica
            vermelho.
          </Text>
        </Cartao>

        <TituloSecao>Cálculos</TituloSecao>
        <Cartao>
          <Text style={rotulo}>Seu salário cai antes ou depois das contas?</Text>
          <EscolhaQuandoRecebe
            usarSobra={config.usarSobraDoMesAnterior}
            onMudar={(usarSobraDoMesAnterior) => mudarCalculo({ usarSobraDoMesAnterior })}
          />
          <LinhaSwitch
            titulo="Contas divididas: contar só a minha parte"
            descricao="Desligado, o resumo conta o valor inteiro das contas compartilhadas"
            valor={config.contarSoMinhaParte}
            onMudar={(contarSoMinhaParte) => mudarCalculo({ contarSoMinhaParte })}
            style={{ marginTop: spacing.base }}
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
  dica: {
    borderRadius: 12,
  },
  linhaDados: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
