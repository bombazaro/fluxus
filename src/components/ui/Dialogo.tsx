import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/src/theme';
import { useAvisoStore } from '@/src/utils/avisar';

/** Caixa de diálogo usada por `avisar` na web. Montada uma vez no layout raiz. */
export function Dialogo() {
  const { colors, typography, spacing, radii } = useTema();
  const pedido = useAvisoStore((s) => s.pedido);
  if (!pedido) return null;

  const cancelar = pedido.botoes.find((b) => b.style === 'cancel');

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => (cancelar ? cancelar.aoToque() : pedido.aoDispensar())}>
      <View style={styles.fundo}>
        <View
          role="alertdialog"
          aria-modal
          aria-labelledby="dialogo-titulo"
          aria-describedby={pedido.mensagem ? 'dialogo-mensagem' : undefined}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.card,
            padding: spacing.base,
            width: '100%',
            maxWidth: 400,
          }}>
          <Text
            nativeID="dialogo-titulo"
            role="heading"
            aria-level={2}
            style={{
              color: colors.text,
              fontFamily: typography.fontFamily.bold,
              fontSize: 18,
            }}>
            {pedido.titulo}
          </Text>
          {pedido.mensagem ? (
            <Text
              nativeID="dialogo-mensagem"
              style={{
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.fontSize.body,
                marginTop: spacing.sm,
              }}>
              {pedido.mensagem}
            </Text>
          ) : null}
          <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
            {pedido.botoes.map((b, i) => (
              <Pressable
                key={`${b.text}-${i}`}
                accessibilityRole="button"
                onPress={b.aoToque}
                style={{
                  minHeight: 48,
                  borderRadius: radii.button,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: b.style === 'cancel' ? 'transparent' : colors.surfaceVariant,
                }}>
                <Text
                  style={{
                    color: b.style === 'destructive' ? colors.danger : colors.text,
                    fontFamily: typography.fontFamily.semiBold,
                    fontSize: typography.fontSize.body,
                  }}>
                  {b.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
