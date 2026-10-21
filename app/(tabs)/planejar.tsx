import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTema } from '@/src/theme';
import { EstadoVazio } from '@/src/components/ui';

export default function PlanejarScreen() {
  const { colors, typography } = useTema();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
          Planejar
        </Text>
      </View>
      {/* Conteúdo das etapas 7 a 9 do plano.md, ainda não implementadas */}
      <EstadoVazio
        icone="construct-outline"
        titulo="Em breve"
        subtitulo="Aqui vão ficar a previsão dos próximos meses, a comparação com o mês anterior, a reserva de emergência e o simulador de parcelas."
        style={styles.emBreve}
      />
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
  emBreve: {
    flex: 1,
    justifyContent: 'center',
  },
});
