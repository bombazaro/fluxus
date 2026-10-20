import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { Cartao } from '@/src/components/ui';
import { ItemConta } from '@/src/components/contas/ItemConta';
import { LancamentoComDetalhes } from '@/src/types';

export interface ProximosVencimentosProps {
  lancamentos: LancamentoComDetalhes[];
  onVerTodas: () => void;
  onAbrirConta: (contaId: number) => void;
  onMarcarPago: (lancamentoId: number) => void;
}

/** As próximas contas não pagas do mês (já filtradas e ordenadas por quem chama). */
export function ProximosVencimentos({
  lancamentos,
  onVerTodas,
  onAbrirConta,
  onMarcarPago,
}: ProximosVencimentosProps) {
  const { colors, typography, spacing } = useTema();

  return (
    <>
      <View style={[styles.secaoHeader, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>
        <Text
          style={[
            styles.secaoTitulo,
            { color: colors.textSecondary, fontFamily: typography.fontFamily.semiBold },
          ]}>
          PRÓXIMOS VENCIMENTOS
        </Text>
        <Pressable accessibilityRole="button" onPress={onVerTodas} hitSlop={12}>
          <Text
            style={[
              styles.verTodas,
              { color: colors.primary, fontFamily: typography.fontFamily.medium },
            ]}>
            Ver todas
          </Text>
        </Pressable>
      </View>

      {lancamentos.length === 0 ? (
        <Cartao style={{ alignItems: 'center', padding: spacing.xl, marginBottom: spacing.base }}>
          <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
          <Text
            style={[
              styles.parabensTexto,
              {
                color: colors.text,
                fontFamily: typography.fontFamily.semiBold,
                marginTop: spacing.xs,
              },
            ]}>
            Tudo pago neste mês!
          </Text>
          <Text
            style={[
              styles.parabensSub,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.regular,
                marginTop: 2,
              },
            ]}>
            Nenhum vencimento pendente no momento.
          </Text>
        </Cartao>
      ) : (
        <View style={{ marginBottom: spacing.base }}>
          {lancamentos.map((item) => (
            <ItemConta
              key={item.id}
              lancamento={item}
              onPress={() => onAbrirConta(item.conta_id)}
              onTogglePago={() => onMarcarPago(item.id)}
            />
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  secaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secaoTitulo: {
    fontSize: 12,
    letterSpacing: 1,
  },
  verTodas: {
    fontSize: 13,
  },
  parabensTexto: {
    fontSize: 16,
  },
  parabensSub: {
    fontSize: 13,
  },
});
