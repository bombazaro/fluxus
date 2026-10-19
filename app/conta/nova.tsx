import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTema } from '@/src/theme';

export default function NovaContaModal() {
  const { colors, typography, spacing } = useTema();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { padding: spacing.base }]}>
        <Text style={[styles.titulo, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
          Nova Conta
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  titulo: {
    fontSize: 24,
  },
});
