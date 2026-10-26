import React, { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/src/theme';
import { Botao, CampoMoeda } from '@/src/components/ui';
import { Renda } from '@/src/types';
import { formatarMesAno } from '@/src/utils/formatadores';

export interface ModalValorRecebidoProps {
  /** Renda variável sendo marcada; null fecha o modal. */
  renda: Renda | null;
  mesRef: string;
  onConfirmar: (valorCentavos: number) => void;
  onFechar: () => void;
}

/** Pergunta quanto caiu de uma renda variável antes de marcá-la como recebida. */
export function ModalValorRecebido({
  renda,
  mesRef,
  onConfirmar,
  onFechar,
}: ModalValorRecebidoProps) {
  const { colors, typography, spacing, radii } = useTema();
  const [valorCentavos, setValorCentavos] = useState(0);
  // Começa com o valor cadastrado sempre que abre para outra renda
  const [rendaAnterior, setRendaAnterior] = useState<Renda | null>(null);
  if (renda !== rendaAnterior) {
    setRendaAnterior(renda);
    if (renda) setValorCentavos(renda.valor_centavos);
  }

  return (
    <Modal visible={renda !== null} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.base },
          ]}>
          <Text
            style={[styles.titulo, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
            Quanto caiu de {renda?.nome}?
          </Text>
          <CampoMoeda
            rotulo={`Valor recebido em ${formatarMesAno(mesRef)}`}
            valorCentavos={valorCentavos}
            onChangeCentavos={setValorCentavos}
            erro={valorCentavos <= 0 ? 'Informe um valor maior que zero' : undefined}
            containerStyle={{ marginTop: spacing.base }}
          />
          <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
            <Botao
              titulo="Marcar como recebida"
              onPress={() => onConfirmar(valorCentavos)}
              desativado={valorCentavos <= 0}
            />
            <Botao titulo="Cancelar" onPress={onFechar} variante="secundario" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
  },
  titulo: {
    fontSize: 18,
  },
});
