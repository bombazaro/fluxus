import React from 'react';
import { ViewStyle } from 'react-native';
import { CampoTexto } from './CampoTexto';
import { dataBrParaIso, mascararData } from '@/src/utils/formatadores';

export interface CampoDataProps {
  rotulo?: string;
  /** Texto como a pessoa vê: DD/MM/AAAA. Use dataBrParaIso para salvar. */
  valor: string;
  onMudar: (texto: string) => void;
  ajuda?: string;
  containerStyle?: ViewStyle;
}

/** Campo de data no formato brasileiro, com as barras colocadas sozinhas. */
export function CampoData({ rotulo, valor, onMudar, ajuda, containerStyle }: CampoDataProps) {
  const completa = valor.length === 10;
  const invalida = completa ? dataBrParaIso(valor) === null : valor.length > 0;

  return (
    <CampoTexto
      rotulo={rotulo}
      placeholder="DD/MM/AAAA"
      keyboardType="number-pad"
      maxLength={10}
      value={valor}
      onChangeText={(texto) => onMudar(mascararData(texto))}
      erro={invalida ? 'Informe uma data válida, ex: 22/10/2026' : undefined}
      ajuda={ajuda}
      containerStyle={containerStyle}
    />
  );
}
