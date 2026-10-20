import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/src/theme';
import { MarcaDia, SemanaCalendario } from '@/src/domain/montarCalendario';
import { ThemeColors } from '@/src/theme/colors';

const DIAS_DA_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const ROTULO_MARCA: Record<MarcaDia, string> = {
  atrasada: 'Atrasada',
  pendente: 'Pendente',
  paga: 'Paga',
  renda: 'Renda',
};

export function corDaMarca(marca: MarcaDia, colors: ThemeColors): string {
  if (marca === 'atrasada') return colors.danger;
  if (marca === 'pendente') return colors.warning;
  if (marca === 'paga') return colors.success;
  return colors.info;
}

export interface GradeMensalProps {
  semanas: SemanaCalendario[];
  diaSelecionado: number | null;
  onSelecionarDia: (dia: number) => void;
}

export function GradeMensal({ semanas, diaSelecionado, onSelecionarDia }: GradeMensalProps) {
  const { colors, typography, spacing, radii, layout } = useTema();

  return (
    <View>
      <View style={styles.linha}>
        {DIAS_DA_SEMANA.map((letra, i) => (
          <Text
            key={i}
            style={[
              styles.diaSemana,
              {
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.medium,
                fontSize: typography.fontSize.caption,
                paddingVertical: spacing.xs,
              },
            ]}>
            {letra}
          </Text>
        ))}
      </View>

      {semanas.map((semana, i) => (
        <View key={i} style={styles.linha}>
          {semana.map((dia, j) => {
            if (!dia) {
              return <View key={j} style={[styles.celula, { minHeight: layout.minTouchTarget }]} />;
            }

            const selecionado = dia.dia === diaSelecionado;

            return (
              <Pressable
                key={j}
                accessibilityRole="button"
                accessibilityLabel={[
                  `Dia ${dia.dia}`,
                  dia.ehHoje ? 'hoje' : null,
                  ...dia.marcas.map((m) => ROTULO_MARCA[m]),
                ]
                  .filter(Boolean)
                  .join(', ')}
                accessibilityState={{ selected: selecionado }}
                onPress={() => onSelecionarDia(dia.dia)}
                style={[
                  styles.celula,
                  {
                    minHeight: layout.minTouchTarget,
                    margin: 2,
                    borderRadius: radii.sm,
                    backgroundColor: selecionado ? colors.primaryLight : 'transparent',
                    borderWidth: dia.ehHoje ? 2 : 0,
                    borderColor: colors.primary,
                  },
                ]}>
                <Text
                  style={{
                    color: dia.ehHoje ? colors.primary : colors.text,
                    fontFamily: dia.ehHoje
                      ? typography.fontFamily.bold
                      : typography.fontFamily.regular,
                    fontSize: typography.fontSize.body,
                  }}>
                  {dia.dia}
                </Text>
                <View style={[styles.pontos, { marginTop: 2 }]}>
                  {dia.marcas.map((marca) => (
                    <View
                      key={marca}
                      style={[styles.ponto, { backgroundColor: corDaMarca(marca, colors) }]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
  },
  diaSemana: {
    flex: 1,
    textAlign: 'center',
  },
  celula: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pontos: {
    flexDirection: 'row',
    gap: 2,
    height: 6,
  },
  ponto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
