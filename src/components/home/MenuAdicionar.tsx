import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';

type IconeIonicons = keyof typeof Ionicons.glyphMap;

export interface MenuAdicionarProps {
  visivel: boolean;
  onFechar: () => void;
  onGastoRapido: () => void;
  onNovaConta: () => void;
}

/** O que o "+" da tela Início pode lançar: um gasto já pago ou uma conta a pagar. */
export function MenuAdicionar({
  visivel,
  onFechar,
  onGastoRapido,
  onNovaConta,
}: MenuAdicionarProps) {
  const { colors, typography, spacing, radii } = useTema();
  const insets = useSafeAreaInsets();

  const opcoes: { icone: IconeIonicons; titulo: string; texto: string; onPress: () => void }[] = [
    {
      icone: 'flash-outline',
      titulo: 'Gasto rápido',
      texto: 'Algo que você já pagou: mercado, lanche, farmácia',
      onPress: onGastoRapido,
    },
    {
      icone: 'receipt-outline',
      titulo: 'Nova conta',
      texto: 'Conta a pagar: aluguel, internet, parcelas',
      onPress: onNovaConta,
    },
  ];

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <Pressable
        accessibilityLabel="Fechar"
        onPress={onFechar}
        style={[styles.fundo, { paddingBottom: insets.bottom + spacing.base }]}>
        <Pressable
          style={[
            styles.folha,
            { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.sm },
          ]}>
          {opcoes.map((o, i) => (
            <Pressable
              key={o.titulo}
              accessibilityRole="button"
              accessibilityLabel={`${o.titulo}. ${o.texto}`}
              onPress={() => {
                onFechar();
                o.onPress();
              }}
              style={({ pressed }) => [
                styles.opcao,
                {
                  padding: spacing.md,
                  borderRadius: radii.button,
                  backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                },
              ]}>
              <View
                style={[
                  styles.icone,
                  { backgroundColor: colors.primaryLight, borderRadius: radii.full },
                ]}>
                <Ionicons name={o.icone} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: typography.fontFamily.semiBold,
                    fontSize: typography.fontSize.body,
                  }}>
                  {o.titulo}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily.regular,
                    fontSize: typography.fontSize.caption,
                    marginTop: 2,
                  }}>
                  {o.texto}
                </Text>
              </View>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
  },
  folha: {
    width: '100%',
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icone: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
