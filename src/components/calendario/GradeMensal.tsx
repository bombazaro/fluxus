import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/src/theme';
import { SemanaCalendario } from '@/src/domain/montarCalendario';

const DIAS_DA_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

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
                accessibilityLabel={`Dia ${dia.dia}${dia.ehHoje ? ', hoje' : ''}`}
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
});
