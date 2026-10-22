import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTema } from '@/src/theme';
import { LancamentoComDetalhes } from '@/src/types';
import { Etiqueta } from '@/src/components/ui/Etiqueta';
import { formatarData, formatarMesAno, formatarMoeda } from '@/src/utils/formatadores';
import { classificarSituacao } from '@/src/domain/classificarSituacao';
import { obterHojeIso } from '@/src/store/useMesStore';

export interface ItemContaProps {
  lancamento: LancamentoComDetalhes;
  onPress: () => void;
  onTogglePago: () => void;
}

export function ItemConta({ lancamento, onPress, onTogglePago }: ItemContaProps) {
  const { colors, typography, spacing, radii } = useTema();
  const hojeIso = obterHojeIso();
  const situacao = classificarSituacao(
    lancamento.vencimento,
    lancamento.pago,
    hojeIso,
    lancamento.sem_vencimento === 1
  );

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onTogglePago();
  };

  const isPago = lancamento.pago === 1;

  let etiquetaTexto = 'Mais adiante';
  let etiquetaTipo: 'sucesso' | 'alerta' | 'perigo' | 'neutro' = 'neutro';

  if (situacao === 'paga') {
    etiquetaTexto = 'Pago';
    etiquetaTipo = 'sucesso';
  } else if (situacao === 'atrasada') {
    etiquetaTexto = 'Atrasado';
    etiquetaTipo = 'perigo';
  } else if (situacao === 'esta_semana') {
    etiquetaTexto = 'Esta semana';
    etiquetaTipo = 'alerta';
  } else if (situacao === 'sem_vencimento') {
    etiquetaTexto = 'Sem vencimento';
  }

  const valorExibido =
    lancamento.compartilhada === 1 && typeof lancamento.minha_parte_centavos === 'number'
      ? lancamento.minha_parte_centavos
      : lancamento.valor_centavos;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Conta ${lancamento.conta_nome}, valor ${formatarMoeda(valorExibido)}, ${etiquetaTexto}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.card,
          padding: spacing.base,
          marginBottom: spacing.sm,
          opacity: pressed ? 0.9 : isPago ? 0.75 : 1,
        },
      ]}>
      {/* Botão de marcar pago */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={isPago ? 'Marcar como não paga' : 'Marcar como paga'}
        accessibilityState={{ checked: isPago }}
        onPress={handleToggle}
        hitSlop={12}
        style={[
          styles.checkbox,
          {
            backgroundColor: isPago ? colors.success : 'transparent',
            borderColor: isPago ? colors.success : colors.border,
            marginRight: spacing.md,
          },
        ]}>
        {isPago ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
      </Pressable>

      {/* Ícone da categoria */}
      <View
        style={[
          styles.categoriaIcone,
          {
            backgroundColor: lancamento.categoria_cor + '20',
            marginRight: spacing.md,
          },
        ]}>
        <Ionicons
          name={(lancamento.categoria_icone || 'pricetag') as any}
          size={20}
          color={lancamento.categoria_cor || colors.primary}
        />
      </View>

      {/* Textos centrais */}
      <View style={styles.infoCol}>
        <View style={styles.tituloRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.nomeConta,
              {
                color: isPago ? colors.textSecondary : colors.text,
                fontFamily: typography.fontFamily.semiBold,
                textDecorationLine: isPago ? 'line-through' : 'none',
              },
            ]}>
            {lancamento.conta_nome}
          </Text>

          {lancamento.parcela_numero ? (
            <Text
              style={[
                styles.parcelaTexto,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily.regular,
                  marginLeft: 6,
                },
              ]}>
              ({lancamento.parcela_numero}
              {lancamento.parcelas_total ? `/${lancamento.parcelas_total}` : ''})
            </Text>
          ) : null}
        </View>

        <Text
          style={[
            styles.vencimento,
            {
              color: situacao === 'atrasada' ? colors.danger : colors.textSecondary,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.caption,
              marginTop: 2,
            },
          ]}>
          {lancamento.sem_vencimento === 1
            ? situacao === 'atrasada'
              ? `Não paga em ${formatarMesAno(lancamento.mes_ref)}`
              : 'Sem data de vencimento'
            : `Venc. ${formatarData(lancamento.vencimento)}`}
        </Text>

        <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
          <Etiqueta texto={etiquetaTexto} tipo={etiquetaTipo} />
        </View>
      </View>

      {/* Valor e Etiqueta à direita */}
      <View style={styles.valorCol}>
        <Text
          style={[
            styles.valor,
            {
              color: isPago ? colors.success : colors.text,
              fontFamily: typography.fontFamily.bold,
              fontSize: typography.fontSize.body,
            },
          ]}>
          {formatarMoeda(valorExibido)}
        </Text>

        {lancamento.compartilhada === 1 && typeof lancamento.minha_parte_centavos === 'number' && (
          <Text
            style={[
              styles.compartilhadoTexto,
              {
                color: colors.textMuted,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.fontSize.tiny,
              },
            ]}>
            sua parte · de {formatarMoeda(lancamento.valor_centavos)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 64,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriaIcone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  tituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nomeConta: {
    fontSize: 16,
    flexShrink: 1,
  },
  parcelaTexto: {
    fontSize: 13,
  },
  vencimento: {},
  valorCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 12,
  },
  valor: {},
  compartilhadoTexto: {},
});
