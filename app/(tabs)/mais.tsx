import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { Cartao } from '@/src/components/ui';

type IconeIonicons = keyof typeof Ionicons.glyphMap;

const ITENS: { titulo: string; descricao: string; icone: IconeIonicons; rota: Href }[] = [
  {
    titulo: 'Rendas',
    descricao: 'Salário, freelas e outras entradas',
    icone: 'wallet-outline',
    rota: '/rendas',
  },
  {
    titulo: 'Backup dos dados',
    descricao: 'Exportar e importar, ou passar para outro celular',
    icone: 'cloud-upload-outline',
    rota: '/backup',
  },
];

export default function MaisScreen() {
  const router = useRouter();
  const { colors, typography, spacing, layout } = useTema();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
          Mais
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        {ITENS.map((item) => (
          <Pressable
            key={item.titulo}
            accessibilityRole="button"
            accessibilityLabel={`${item.titulo}: ${item.descricao}`}
            onPress={() => router.push(item.rota)}>
            <Cartao style={{ marginBottom: spacing.sm }}>
              <View style={[styles.linha, { minHeight: layout.minTouchTarget }]}>
                <Ionicons name={item.icone} size={24} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontFamily: typography.fontFamily.semiBold,
                      fontSize: typography.fontSize.body,
                    }}>
                    {item.titulo}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontFamily: typography.fontFamily.regular,
                      fontSize: typography.fontSize.caption,
                    }}>
                    {item.descricao}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </Cartao>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
