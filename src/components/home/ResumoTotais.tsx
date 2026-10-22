import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/src/theme';
import { Cartao } from '@/src/components/ui';
import { ResumoMes } from '@/src/domain/resumoDoMes';
import { formatarMoeda } from '@/src/utils/formatadores';

function MiniCartao({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  const { colors, typography, spacing } = useTema();

  return (
    <Cartao
      style={[
        styles.miniCard,
        { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
      ]}>
      <Text
        style={[
          styles.miniLabel,
          { color: colors.textSecondary, fontFamily: typography.fontFamily.regular },
        ]}>
        {rotulo}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[styles.miniValor, { color: cor, fontFamily: typography.fontFamily.bold }]}>
        {formatarMoeda(valor)}
      </Text>
    </Cartao>
  );
}

/** Três cartões pequenos: Total do mês | Já pago | Falta pagar. */
export function ResumoTotais({ resumo }: { resumo: ResumoMes }) {
  const { colors } = useTema();

  return (
    <View style={styles.trioCards}>
      <MiniCartao rotulo="Total mês" valor={resumo.totalContas} cor={colors.text} />
      <MiniCartao rotulo="Já pago" valor={resumo.totalPago} cor={colors.success} />
      <MiniCartao
        rotulo="Falta pagar"
        valor={resumo.faltaPagar}
        cor={resumo.faltaPagar > 0 ? colors.warning : colors.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  trioCards: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  miniCard: {
    alignItems: 'center',
  },
  miniLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  miniValor: {
    fontSize: 14,
  },
});
