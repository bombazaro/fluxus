import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { LancamentoComDetalhes, Renda } from '@/src/types';
import { ItemConta } from '@/src/components/contas/ItemConta';
import { formatarData, formatarMoeda } from '@/src/utils/formatadores';

export interface ListaDoDiaProps {
  dataIso: string | null;
  lancamentos: LancamentoComDetalhes[];
  rendas: Renda[];
  totalContasCentavos: number;
  podeDesfazer: boolean;
  onFechar: () => void;
  onAbrirConta: (contaId: number) => void;
  onTogglePago: (lancamento: LancamentoComDetalhes) => void;
  onDesfazer: () => void;
}

/** Bottom sheet com as contas e rendas de um dia do calendário. */
export function ListaDoDia({
  dataIso,
  lancamentos,
  rendas,
  totalContasCentavos,
  podeDesfazer,
  onFechar,
  onAbrirConta,
  onTogglePago,
  onDesfazer,
}: ListaDoDiaProps) {
  const { colors, typography, spacing, radii } = useTema();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={dataIso !== null} transparent animationType="slide" onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar lista do dia"
          style={StyleSheet.absoluteFill}
          onPress={onFechar}
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderTopLeftRadius: radii.card,
              borderTopRightRadius: radii.card,
              paddingTop: spacing.sm,
              paddingBottom: insets.bottom + spacing.base,
            },
          ]}>
          <View style={[styles.alca, { backgroundColor: colors.border }]} />

          <View
            style={[styles.cabecalho, { paddingHorizontal: spacing.base, marginTop: spacing.sm }]}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: typography.fontFamily.bold,
                  fontSize: typography.fontSize.subtitle,
                }}>
                {dataIso ? formatarData(dataIso) : ''}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily.regular,
                  fontSize: typography.fontSize.caption,
                }}>
                Total do dia:{' '}
                <Text style={{ color: colors.text, fontFamily: typography.fontFamily.bold }}>
                  {formatarMoeda(totalContasCentavos)}
                </Text>
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onFechar}
              hitSlop={12}
              style={styles.botaoFechar}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: spacing.base, paddingTop: spacing.md }}
            style={styles.lista}>
            {rendas.map((r) => (
              <View
                key={`renda-${r.id}`}
                style={[
                  styles.renda,
                  {
                    backgroundColor: colors.infoLight,
                    borderRadius: radii.button,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                  },
                ]}>
                <Ionicons name="arrow-down-circle" size={20} color={colors.info} />
                <Text
                  style={{
                    flex: 1,
                    marginLeft: spacing.sm,
                    color: colors.text,
                    fontFamily: typography.fontFamily.medium,
                    fontSize: typography.fontSize.body,
                  }}>
                  {r.nome}
                </Text>
                <Text
                  style={{
                    color: colors.info,
                    fontFamily: typography.fontFamily.bold,
                    fontSize: typography.fontSize.body,
                  }}>
                  {formatarMoeda(r.valor_centavos)}
                </Text>
              </View>
            ))}

            {lancamentos.length === 0 ? (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily.regular,
                  fontSize: typography.fontSize.body,
                  textAlign: 'center',
                  paddingVertical: spacing.xl,
                }}>
                Nenhuma conta vence neste dia.
              </Text>
            ) : (
              lancamentos.map((l) => (
                <ItemConta
                  key={l.id}
                  lancamento={l}
                  onPress={() => onAbrirConta(l.conta_id)}
                  onTogglePago={() => onTogglePago(l)}
                />
              ))
            )}
          </ScrollView>

          {podeDesfazer ? (
            <View
              style={[
                styles.desfazer,
                {
                  marginHorizontal: spacing.base,
                  padding: spacing.md,
                  borderRadius: radii.button,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: typography.fontFamily.medium,
                  fontSize: 14,
                }}>
                Status de pagamento alterado.
              </Text>
              <Pressable accessibilityRole="button" onPress={onDesfazer} hitSlop={12}>
                <Text
                  style={{
                    color: colors.primary,
                    fontFamily: typography.fontFamily.bold,
                    fontSize: 14,
                  }}>
                  DESFAZER
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '75%',
  },
  alca: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botaoFechar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lista: {
    flexGrow: 0,
  },
  renda: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  desfazer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
});
