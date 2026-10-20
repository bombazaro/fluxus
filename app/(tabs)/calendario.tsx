import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { obterHojeIso, useMesStore } from '@/src/store/useMesStore';
import { MarcaDia, montarCalendario } from '@/src/domain/montarCalendario';
import { corDaMarca, GradeMensal, ROTULO_MARCA } from '@/src/components/calendario/GradeMensal';
import { Cartao } from '@/src/components/ui';
import { formatarMesAno } from '@/src/utils/formatadores';

export default function CalendarioScreen() {
  const db = useSQLiteContext();
  const { colors, typography, spacing } = useTema();

  const { mesRef, lancamentos, rendas, trocarMes, carregarMes } = useMesStore();

  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);

  useEffect(() => {
    carregarMes(db);
  }, [db, carregarMes]);

  const hojeIso = obterHojeIso();

  const semanas = useMemo(
    () => montarCalendario(mesRef, lancamentos, rendas, hojeIso),
    [mesRef, lancamentos, rendas, hojeIso]
  );

  const mudarMes = (delta: number) => {
    setDiaSelecionado(null);
    trocarMes(delta, db);
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Barra de mês com setas */}
      <View
        style={[
          styles.mesBarra,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.sm,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          onPress={() => mudarMes(-1)}
          hitSlop={12}
          style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>

        <Text
          style={[styles.mesTexto, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
          {formatarMesAno(mesRef)}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          onPress={() => mudarMes(1)}
          hitSlop={12}
          style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base }}>
        <Cartao>
          <GradeMensal
            semanas={semanas}
            diaSelecionado={diaSelecionado}
            onSelecionarDia={setDiaSelecionado}
          />

          {/* Legenda das cores */}
          <View style={[styles.legenda, { marginTop: spacing.md, gap: spacing.md }]}>
            {(Object.keys(ROTULO_MARCA) as MarcaDia[]).map((marca) => (
              <View key={marca} style={styles.legendaItem}>
                <View style={[styles.ponto, { backgroundColor: corDaMarca(marca, colors) }]} />
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily.regular,
                    fontSize: typography.fontSize.caption,
                    marginLeft: spacing.xs,
                  }}>
                  {ROTULO_MARCA[marca]}
                </Text>
              </View>
            ))}
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
  mesBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    padding: 8,
  },
  mesTexto: {
    fontSize: 18,
  },
  legenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ponto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
