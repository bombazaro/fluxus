import { useEffect } from 'react';
import { Stack } from 'expo-router';
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
import { View, Text, StyleSheet } from 'react-native';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function DatabaseFallback({ error }: { error?: Error }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Ops! Ocorreu um problema ao abrir o banco de dados.</Text>
      <Text style={styles.errorText}>
        {error?.message || 'Não foi possível carregar os dados armazenados.'}
      </Text>
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
    <SQLiteProvider
      databaseName="fluxus.db"
      onInit={executarMigracoes}
      onError={(err) => console.error('Erro no SQLite:', err)}>
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
      </Stack>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
