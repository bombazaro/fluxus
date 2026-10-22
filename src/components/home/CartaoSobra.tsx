import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { BarraProgresso, Botao, Cartao } from '@/src/components/ui';
import { ResumoMes } from '@/src/domain/resumoDoMes';
import { formatarMoeda } from '@/src/utils/formatadores';

export interface CartaoSobraProps {
  resumo: ResumoMes;
  /** Leva a sobra para a reserva de emergência (só aparece se sobrar dinheiro). */
  onGuardarNaReserva?: () => void;
}

/** Cartão grande do Início: sobra do mês, quanto tem em mãos e renda comprometida. */
export function CartaoSobra({ resumo, onGuardarNaReserva }: CartaoSobraProps) {
  const { colors, typography, spacing } = useTema();

  const percentualUsadoFormatado = Math.round(resumo.percentualUsado * 100);
  const corPercentual =
    resumo.percentualUsado > 1
      ? colors.danger
      : resumo.percentualUsado >= 0.8
        ? colors.warning
        : colors.success;

  return (
    <Cartao style={{ marginBottom: spacing.base }}>
      <View style={styles.sobraHeader}>
        <View>
          <Text
            style={[
              styles.sobraLabel,
              { color: colors.textSecondary, fontFamily: typography.fontFamily.medium },
            ]}>
            Sobra estimada do mês
          </Text>
          <Text
            style={[
              styles.sobraValor,
              {
                color: resumo.sobra >= 0 ? colors.success : colors.danger,
                fontFamily: typography.fontFamily.bold,
              },
            ]}>
            {formatarMoeda(resumo.sobra)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={[
              styles.sobraAtualLabel,
              { color: colors.textSecondary, fontFamily: typography.fontFamily.regular },
            ]}>
            Em mãos agora:
          </Text>
          <Text
            style={[
              styles.sobraAtualValor,
              { color: colors.text, fontFamily: typography.fontFamily.semiBold },
            ]}>
            {formatarMoeda(resumo.sobraAtual)}
          </Text>
        </View>
      </View>

      {/* Barra de progresso da renda usada */}
      <View style={{ marginTop: spacing.base }}>
        <View style={styles.progressoInfo}>
          <Text
            style={[
              styles.progressoTexto,
              { color: colors.textSecondary, fontFamily: typography.fontFamily.regular },
            ]}>
            Renda comprometida
          </Text>
          <Text
            style={[
              styles.progressoTexto,
              { color: corPercentual, fontFamily: typography.fontFamily.bold },
            ]}>
            {percentualUsadoFormatado}%
          </Text>
        </View>
        <BarraProgresso progresso={resumo.percentualUsado} altura={10} />
      </View>

      {onGuardarNaReserva && resumo.sobra > 0 ? (
        <Botao
          titulo="Guardar a sobra na reserva"
          variante="fantasma"
          tamanho="pequeno"
          onPress={onGuardarNaReserva}
          iconeEsquerda={<Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />}
          style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
        />
      ) : null}
    </Cartao>
  );
}

const styles = StyleSheet.create({
  sobraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sobraLabel: {
    fontSize: 14,
  },
  sobraValor: {
    fontSize: 28,
    marginTop: 4,
  },
  sobraAtualLabel: {
    fontSize: 12,
  },
  sobraAtualValor: {
    fontSize: 16,
    marginTop: 2,
  },
  progressoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressoTexto: {
    fontSize: 13,
  },
});
