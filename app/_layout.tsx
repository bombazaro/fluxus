import { useEffect } from 'react';
import { ErrorBoundaryProps, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SQLiteProvider } from 'expo-sqlite';
import { executarMigracoes } from '@/src/db/migrations';
import { Platform, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { darkColors, lightColors } from '@/src/theme/colors';
import { Inicializacao } from '@/src/components/Inicializacao';
import {
  bancoPresoPorOutraAba,
  recarregarParaReabrirBanco,
  textosDoErroDeAbertura,
} from '@/src/domain/erroAbertura';
import { ColunaWeb } from '@/src/components/ColunaWeb';
import { Dialogo } from '@/src/components/ui/Dialogo';
import { Sincronizador } from '@/src/components/Sincronizador';
import { ConectorConta } from '@/src/components/ConectorConta';
import { liberarWorkersAoSair } from '@/src/services/liberarWorkersAoSair';

// Antes de qualquer worker nascer: solta o arquivo do banco ao sair da página (Firefox)
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  liberarWorkersAoSair(window);
}

SplashScreen.preventAutoHideAsync();

/**
 * Tela mostrada quando algo quebra ao abrir o app (ex.: o banco não abre ou a
 * migração falha). Substitui a tela vermelha/em branco por uma mensagem clara.
 * Não usa a fonte Inter, porque o erro pode acontecer antes de ela carregar.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const textos = textosDoErroDeAbertura(error, Platform.OS === 'web');

  useEffect(() => {
    console.error('Erro ao abrir o app:', error);
    SplashScreen.hideAsync().catch(() => {});
  }, [error]);

  // O worker da página anterior pode demorar para soltar o arquivo (ex.: ao voltar do login
  // do Google). Depois da primeira falha o worker deste carregamento fica inutilizável
  // ("Invalid VFS state"), então tentar de novo sem recarregar não adianta: recarrega a página.
  useEffect(() => {
    if (Platform.OS !== 'web' || !bancoPresoPorOutraAba(error)) return;
    const espera = setTimeout(() => {
      if (recarregarParaReabrirBanco()) window.location.reload();
    }, 1500);
    return () => clearTimeout(espera);
  }, [error]);

  return (
    <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
      <Text style={[styles.errorTitle, { color: colors.danger }]}>{textos.titulo}</Text>
      <Text style={[styles.errorText, { color: colors.textSecondary }]}>{textos.explicacao}</Text>
      {textos.detalhe ? (
        <Text style={[styles.errorDetalhe, { color: colors.textMuted }]}>{textos.detalhe}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={[styles.errorBotao, { backgroundColor: colors.primary }]}>
        <Text style={styles.errorBotaoTexto}>Tentar de novo</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontError) {
      console.warn('Erro ao carregar fontes Inter:', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ColunaWeb>
      <SQLiteProvider databaseName="fluxus.db" onInit={executarMigracoes}>
        <Inicializacao />
        <ConectorConta />
        <Sincronizador />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="conta/nova"
            options={{
              presentation: 'modal',
              title: 'Nova Conta',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="conta/[id]"
            options={{
              title: 'Detalhes da Conta',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="rendas/index"
            options={{
              title: 'Rendas',
              headerShown: false,
            }}
          />
          <Stack.Screen name="configuracoes" options={{ headerShown: false }} />
          <Stack.Screen name="conta-sincronizada" options={{ headerShown: false }} />
          <Stack.Screen name="comparacao" options={{ headerShown: false }} />
          <Stack.Screen name="reserva" options={{ headerShown: false }} />
          <Stack.Screen name="simulador" options={{ headerShown: false }} />
          <Stack.Screen name="pessoas" options={{ headerShown: false }} />
          <Stack.Screen name="acertos" options={{ headerShown: false }} />
          <Stack.Screen name="gasto-rapido" options={{ headerShown: false }} />
          <Stack.Screen name="categorias" options={{ headerShown: false }} />
          <Stack.Screen
            name="boas-vindas"
            options={{ headerShown: false, gestureEnabled: false }}
          />
          <Stack.Screen
            name="backup"
            options={{
              title: 'Backup dos dados',
              headerShown: false,
            }}
          />
        </Stack>
        <Dialogo />
      </SQLiteProvider>
    </ColunaWeb>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorDetalhe: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
  errorBotao: {
    marginTop: 24,
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  errorBotaoTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
