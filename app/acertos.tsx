import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { Botao, CabecalhoTela, Cartao, EstadoVazio } from '@/src/components/ui';
import { divisoesRepo } from '@/src/db/repositorios/divisoesRepo';
import { AcertoPessoa, agruparAcertos, textoAcerto } from '@/src/domain/acertos';
import { obterMesAtualIso } from '@/src/store/useMesStore';
import { formatarMesAnoAbrev, formatarMoeda } from '@/src/utils/formatadores';

/** Quanto cada pessoa deve das contas divididas, até o mês atual. */
export default function AcertosScreen() {
  const db = useSQLiteContext();
  const { colors, typography, spacing } = useTema();
  const [acertos, setAcertos] = useState<AcertoPessoa[] | null>(null);

  const carregar = useCallback(async () => {
    const linhas = await divisoesRepo.listarAcertosPendentes(db, obterMesAtualIso());
    setAcertos(agruparAcertos(linhas));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const marcar = async (ids: number[]) => {
    await divisoesRepo.marcarAcertadas(db, ids);
    await carregar();
  };

  const acertarTudo = (acerto: AcertoPessoa) => {
    Alert.alert(
      `${acerto.nome} acertou tudo?`,
      `Marca ${formatarMoeda(acerto.totalCentavos)} como recebido de ${acerto.nome}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Marcar como acertado', onPress: () => marcar(acerto.itens.map((i) => i.divisao_id)) },
      ]
    );
  };

  const compartilhar = (acerto: AcertoPessoa) => {
    Share.share({ message: textoAcerto(acerto) }).catch(() => {});
  };

  const textoAjuda = {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
    lineHeight: 18,
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <CabecalhoTela titulo="Acertos" />

      {acertos !== null && acertos.length === 0 ? (
        <EstadoVazio
          icone="people-outline"
          titulo="Tudo acertado"
          subtitulo="Ninguém deve nada das contas divididas. Para dividir uma conta, marque 'Conta compartilhada' ao cadastrá-la."
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing.xxl }}>
          <Text style={textoAjuda}>
            Partes das contas divididas que cada pessoa ainda não te pagou, até este mês. Toque no
            ✓ quando a pessoa acertar.
          </Text>

          {(acertos ?? []).map((acerto) => (
            <Cartao key={acerto.pessoaId} style={{ marginTop: spacing.base }}>
              <View style={styles.linha}>
                <Text
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontFamily: typography.fontFamily.bold,
                    fontSize: typography.fontSize.subtitle,
                  }}>
                  {acerto.nome}
                </Text>
                <Text
                  style={{
                    color: colors.warning,
                    fontFamily: typography.fontFamily.bold,
                    fontSize: typography.fontSize.subtitle,
                  }}>
                  {formatarMoeda(acerto.totalCentavos)}
                </Text>
              </View>
              <Text style={textoAjuda}>deve para você</Text>

              {acerto.itens.map((item) => (
                <View
                  key={item.divisao_id}
                  style={[
                    styles.linha,
                    {
                      marginTop: spacing.sm,
                      paddingTop: spacing.sm,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    },
                  ]}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontFamily: typography.fontFamily.medium,
                        fontSize: 14,
                      }}>
                      {item.conta_nome}
                    </Text>
                    <Text style={textoAjuda}>{formatarMesAnoAbrev(item.mes_ref)}</Text>
                  </View>
                  <Text
                    style={{
                      color: colors.text,
                      fontFamily: typography.fontFamily.semiBold,
                      fontSize: 14,
                    }}>
                    {formatarMoeda(item.valor_centavos)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${acerto.nome} acertou ${item.conta_nome} de ${formatarMesAnoAbrev(item.mes_ref)}`}
                    onPress={() => marcar([item.divisao_id])}
                    hitSlop={8}
                    style={{ marginLeft: spacing.md }}>
                    <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
                  </Pressable>
                </View>
              ))}

              <View style={[styles.linha, { marginTop: spacing.base, gap: spacing.sm }]}>
                <Botao
                  titulo="Enviar resumo"
                  variante="secundario"
                  tamanho="pequeno"
                  onPress={() => compartilhar(acerto)}
                  iconeEsquerda={<Ionicons name="share-social-outline" size={16} color={colors.primary} />}
                  style={{ flex: 1 }}
                />
                <Botao
                  titulo="Acertou tudo"
                  tamanho="pequeno"
                  onPress={() => acertarTudo(acerto)}
                  style={{ flex: 1 }}
                />
              </View>
            </Cartao>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
