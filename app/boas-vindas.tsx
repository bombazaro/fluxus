import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { Botao, Cartao, LinhaSwitch } from '@/src/components/ui';
import { useConfigStore } from '@/src/store/useConfigStore';
import { pedirPermissaoComExplicacao } from '@/src/services/permissaoLembretes';

type IconeIonicons = keyof typeof Ionicons.glyphMap;

const PASSOS: { icone: IconeIonicons; titulo: string; texto: string }[] = [
  {
    icone: 'wallet-outline',
    titulo: 'Bem-vindo ao Fluxus',
    texto:
      'Cadastre suas contas e rendas uma vez. O app calcula sozinho quanto falta pagar, quanto ' +
      'sobra e avisa antes de cada vencimento.',
  },
  {
    icone: 'cash-outline',
    titulo: 'Quanto você recebe?',
    texto:
      'Cadastre seu salário e outras entradas, com o dia em que caem. É assim que o app mostra ' +
      'se o mês fecha e em qual dia o dinheiro fica mais apertado.',
  },
  {
    icone: 'receipt-outline',
    titulo: 'E quais são suas contas?',
    texto:
      'Aluguel, internet, luz, parcelas... Cadastre a primeira agora ou depois, pelo botão "+".',
  },
];

export default function BoasVindasScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, typography, spacing, radii } = useTema();
  const atualizar = useConfigStore((s) => s.atualizar);
  const notificacoesAtivas = useConfigStore((s) => s.config.notificacoesAtivas);
  const [passo, setPasso] = useState(0);

  const atual = PASSOS[passo];
  const ultimo = passo === PASSOS.length - 1;

  const concluir = async () => {
    await atualizar(db, { onboardingConcluido: true });
    router.replace('/(tabs)');
  };

  const ligarLembretes = async (ligar: boolean) => {
    if (!ligar) {
      await atualizar(db, { notificacoesAtivas: false });
    } else if (await pedirPermissaoComExplicacao()) {
      await atualizar(db, { notificacoesAtivas: true });
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.conteudo, { padding: spacing.xl }]}>
        <View
          style={[
            styles.icone,
            { backgroundColor: colors.primaryLight, borderRadius: radii.full },
          ]}>
          <Ionicons name={atual.icone} size={48} color={colors.primary} />
        </View>

        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontFamily: typography.fontFamily.bold,
            fontSize: typography.fontSize.title,
            textAlign: 'center',
            marginTop: spacing.xl,
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
            marginTop: spacing.md,
          }}>
          {atual.texto}
        </Text>

        {passo === 0 ? (
          <Cartao destaque style={{ marginTop: spacing.xl }}>
            <View style={styles.linha}>
              <Ionicons name="lock-closed-outline" size={22} color={colors.warning} />
              <Text
                style={{
                  flex: 1,
                  marginLeft: spacing.sm,
                  color: colors.text,
                  fontFamily: typography.fontFamily.regular,
                  fontSize: typography.fontSize.caption,
                  lineHeight: 18,
                }}>
                Sem conta, sem internet: seus dados ficam só neste celular. Se desinstalar o app,
                eles serão perdidos. Faça backup de vez em quando em Mais › Backup dos dados.
              </Text>
            </View>
          </Cartao>
        ) : null}

        {passo === 1 ? (
          <Botao
            titulo="Cadastrar minha renda"
            variante="secundario"
            onPress={() => router.push('/rendas')}
            style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
          />
        ) : null}

        {passo === 2 ? (
          <View style={{ alignSelf: 'stretch', marginTop: spacing.xl }}>
            <Botao
              titulo="Cadastrar primeira conta"
              variante="secundario"
              onPress={() => router.push('/conta/nova')}
            />
            <Cartao style={{ marginTop: spacing.base }}>
              <LinhaSwitch
                titulo="Lembrar dos vencimentos"
                descricao="Um aviso no dia anterior e outro no dia, às 9h"
                valor={notificacoesAtivas}
                onMudar={ligarLembretes}
              />
            </Cartao>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.base }}>
        <View style={styles.pontos} accessibilityLabel={`Passo ${passo + 1} de ${PASSOS.length}`}>
          {PASSOS.map((p, i) => (
            <View
              key={p.titulo}
              style={[
                styles.ponto,
                {
                  backgroundColor: i === passo ? colors.primary : colors.border,
                  width: i === passo ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>
        <Botao
          titulo={ultimo ? 'Começar a usar' : 'Continuar'}
          onPress={ultimo ? concluir : () => setPasso(passo + 1)}
        />
        {!ultimo ? (
          <Botao
            titulo="Pular"
            variante="fantasma"
            onPress={concluir}
            style={{ marginTop: spacing.xs }}
          />
        ) : null}
      </View>
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
  icone: {
    width: 96,
    height: 96,
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
