import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { Cartao, Etiqueta, TituloSecao } from '@/src/components/ui';
import { GraficoSobraMeses } from '@/src/components/graficos/GraficoSobraMeses';
import { usePrevisao, MESES_PREVISAO } from '@/src/hooks/usePrevisao';
import { useConfigStore } from '@/src/store/useConfigStore';
import { preverSaldo } from '@/src/domain/preverSaldo';
import { formatarMesAno, formatarMoeda } from '@/src/utils/formatadores';

type IconeIonicons = keyof typeof Ionicons.glyphMap;

const FERRAMENTAS: { titulo: string; descricao: string; icone: IconeIonicons; rota: Href }[] = [
  {
    titulo: 'Reserva de emergência',
    descricao: 'Meta, quanto já guardou e quando chega lá',
    icone: 'shield-checkmark-outline',
    rota: '/reserva',
  },
  {
    titulo: 'Simulador de parcelas',
    descricao: 'E se eu comprar isso parcelado?',
    icone: 'calculator-outline',
    rota: '/simulador',
  },
  {
    titulo: 'Comparar com o mês anterior',
    descricao: 'O que subiu e o que caiu, por categoria',
    icone: 'bar-chart-outline',
    rota: '/comparacao',
  },
];

function nomeMes(mesRef: string): string {
  return formatarMesAno(mesRef).toLowerCase();
}

export default function PlanejarScreen() {
  const router = useRouter();
  const { colors, typography, spacing, layout } = useTema();
  const { dados, parcelamentos, mesInicial, erro } = usePrevisao();
  const contarSoMinhaParte = useConfigStore((s) => s.config.contarSoMinhaParte);

  const meses = useMemo(
    () => (dados ? preverSaldo(dados, mesInicial, MESES_PREVISAO, { contarSoMinhaParte }) : []),
    [dados, mesInicial, contarSoMinhaParte]
  );
  const mesesNegativos = meses.filter((m) => m.sobraCentavos < 0);

  const textoAjuda = {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
    lineHeight: 18,
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text
          style={[styles.title, { color: colors.text, fontFamily: typography.fontFamily.bold }]}>
          Planejar
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.base,
          paddingTop: 0,
          paddingBottom: spacing.xxl,
        }}>
        <Cartao>
          <View style={styles.linhaTitulo}>
            <Text
              style={{
                flex: 1,
                color: colors.text,
                fontFamily: typography.fontFamily.semiBold,
                fontSize: typography.fontSize.body,
              }}>
              Sobra dos próximos meses
            </Text>
            <Etiqueta texto="Estimativa" tipo="info" />
          </View>

          {erro ? (
            <Text style={[textoAjuda, { color: colors.danger, marginTop: spacing.sm }]}>
              Não foi possível calcular a previsão. Puxe a tela Início para baixo e volte aqui.
            </Text>
          ) : meses.length > 0 ? (
            <>
              <View style={{ marginTop: spacing.base }}>
                <GraficoSobraMeses meses={meses} />
              </View>
              <Text style={[textoAjuda, { marginTop: spacing.base }]}>
                {mesesNegativos.length > 0
                  ? `Atenção: em ${mesesNegativos
                      .map((m) => nomeMes(m.mesRef).split(' ')[0])
                      .join(', ')} as contas passam da renda.`
                  : 'Pelas contas e rendas cadastradas, todos os meses fecham no positivo.'}{' '}
                Contas fixas pelo valor cadastrado, variáveis pela média e parcelas já lançadas.
                Gastos não cadastrados não entram.
              </Text>
            </>
          ) : null}
        </Cartao>

        {parcelamentos.length > 0 ? (
          <>
            <TituloSecao>Quando os parcelamentos terminam</TituloSecao>
            <Cartao>
              {parcelamentos.map((p, i) => (
                <View
                  key={p.contaId}
                  accessible
                  style={[
                    styles.linhaParcela,
                    {
                      paddingVertical: spacing.sm,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.border,
                    },
                  ]}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontFamily: typography.fontFamily.semiBold,
                        fontSize: 14,
                      }}>
                      {p.nome}
                    </Text>
                    <Text style={textoAjuda}>
                      Última parcela em {nomeMes(p.ultimoMes)}
                      {p.parcelasRestantes > 0
                        ? ` · faltam ${p.parcelasRestantes} parcela${p.parcelasRestantes > 1 ? 's' : ''}`
                        : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        color: colors.success,
                        fontFamily: typography.fontFamily.semiBold,
                        fontSize: 14,
                      }}>
                      +{formatarMoeda(p.valorCentavos)}
                    </Text>
                    <Text style={textoAjuda}>
                      a partir de {nomeMes(p.liberaAPartirDe).split(' ')[0]}
                    </Text>
                  </View>
                </View>
              ))}
            </Cartao>
          </>
        ) : null}

        <TituloSecao>Ferramentas</TituloSecao>
        {FERRAMENTAS.map((item) => (
          <Pressable
            key={item.titulo}
            accessibilityRole="button"
            accessibilityLabel={`${item.titulo}: ${item.descricao}`}
            onPress={() => router.push(item.rota)}>
            <Cartao style={{ marginBottom: spacing.sm }}>
              <View style={[styles.linha, { minHeight: layout.minTouchTarget }]}>
                <Ionicons name={item.icone} size={24} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontFamily: typography.fontFamily.semiBold,
                      fontSize: typography.fontSize.body,
                    }}>
                    {item.titulo}
                  </Text>
                  <Text style={textoAjuda}>{item.descricao}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </Cartao>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
  },
  linhaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linhaParcela: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
