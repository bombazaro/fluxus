import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTema } from '@/src/theme';

export interface AnelProgressoProps {
  /** De 0 a 1 (acima de 1 o anel fica cheio). */
  progresso: number;
  tamanho?: number;
  espessura?: number;
  cor?: string;
  children?: React.ReactNode;
}

/** Anel que vai se completando, com conteúdo no meio (ex.: o percentual). */
export function AnelProgresso({
  progresso,
  tamanho = 180,
  espessura = 14,
  cor,
  children,
}: AnelProgressoProps) {
  const { colors } = useTema();
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = Math.min(1, Math.max(0, progresso)) * circunferencia;

  return (
    <View
      style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={tamanho} height={tamanho} style={{ position: 'absolute' }}>
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={colors.surfaceVariant}
          strokeWidth={espessura}
          fill="none"
        />
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={cor ?? colors.primary}
          strokeWidth={espessura}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${preenchido} ${circunferencia}`}
          // Começa no topo e cresce no sentido horário
          transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
