import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import {
  Botao,
  CabecalhoTela,
  CampoMoeda,
  CampoTexto,
  Cartao,
  SeletorMesCompacto,
  TituloSecao,
} from '@/src/components/ui';
import { GraficoSobraMeses } from '@/src/components/graficos/GraficoSobraMeses';
import { usePrevisao } from '@/src/hooks/usePrevisao';
import { useConfigStore } from '@/src/store/useConfigStore';
import { preverSaldo } from '@/src/domain/preverSaldo';
import { simularImpacto, simularParcelas, Veredito } from '@/src/domain/simularParcelas';
import { adicionarMeses } from '@/src/domain/gerarLancamentos';
import { formatarMesAno, formatarMoeda } from '@/src/utils/formatadores';

/** Meses carregados para a previsão (cobre compras de até 24x a partir do mês atual). */
const MESES_CARREGADOS = 36;
/** Colunas do gráfico: mais que isso fica estreito demais no celular. */
const MESES_NO_GRAFICO = 12;

function mesesEntre(de: string, ate: string): number {
  const [anoDe, mesDe] = de.split('-').map(Number);
  const [anoAte, mesAte] = ate.split('-').map(Number);
  return (anoAte - anoDe) * 12 + (mesAte - mesDe);
}

export default function SimuladorScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radii } = useTema();
  const { dados, mesInicial } = usePrevisao(MESES_CARREGADOS);
  const contarSoMinhaParte = useConfigStore((s) => s.config.contarSoMinhaParte);

  const [nome, setNome] = useState('');
  const [valorTotal, setValorTotal] = useState(0);
  const [parcelasTexto, setParcelasTexto] = useState('10');
  const [jurosTexto, setJurosTexto] = useState('0');
  const [mesPrimeira, setMesPrimeira] = useState(() => adicionarMeses(mesInicial, 1));

  const parcelas = parseInt(parcelasTexto, 10);
  const juros = Number(jurosTexto.replace(',', '.'));
  const parcelasValidas = Number.isInteger(parcelas) && parcelas >= 1 && parcelas <= 24;
  const jurosValidos = Number.isFinite(juros) && juros >= 0 && juros <= 20;
  const primeiraValida = mesPrimeira >= mesInicial;
  const pronto = valorTotal > 0 && parcelasValidas && jurosValidos && primeiraValida;

  const simulacao = pronto ? simularParcelas(valorTotal, parcelas, juros) : null;

  const ultimoMes = pronto ? adicionarMeses(mesPrimeira, parcelas - 1) : mesInicial;
  const quantidade = Math.min(MESES_CARREGADOS, Math.max(6, mesesEntre(mesInicial, ultimoMes) + 1));

  const base = useMemo(
    () => (dados ? preverSaldo(dados, mesInicial, quantidade, { contarSoMinhaParte }) : []),
    [dados, mesInicial, quantidade, contarSoMinhaParte]
  );
  const impacto =
    simulacao && base.length > 0
      ? simularImpacto(base, simulacao.parcelaCentavos, mesPrimeira, parcelas)
      : null;

  // Gráfico a partir da primeira parcela, até 12 meses
  const inicioGrafico = base.findIndex((m) => m.mesRef >= mesPrimeira);
  const fatia = (lista: typeof base) =>
    lista.slice(Math.max(0, inicioGrafico), Math.max(0, inicioGrafico) + MESES_NO_GRAFICO);

  const vereditos: Record<Veredito, { texto: string; cor: string; fundo: string; icone: keyof typeof Ionicons.glyphMap }> = {
    folga: {
      texto: 'Cabe com folga',
      cor: colors.success,
      fundo: colors.successLight,
      icone: 'checkmark-circle',
    },
    aperta: {
      texto: 'Cabe, mas aperta',
      cor: colors.warning,
      fundo: colors.warningLight,
      icone: 'alert-circle',
    },
    nao_cabe: {
      texto: 'Não cabe',
      cor: colors.danger,
      fundo: colors.dangerLight,
      icone: 'close-circle',
    },
  };

  const textoAjuda = {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
    lineHeight: 18,
  };

  const cadastrar = () => {
    if (!simulacao) return;
    router.push({
      pathname: '/conta/nova',
      params: {
        tipo: 'parcelada',
        nome: nome.trim(),
        valor: String(simulacao.parcelaCentavos),
        parcelas: String(parcelas),
        mes: mesPrimeira,
      },
    });
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <CabecalhoTela titulo="Simulador de parcelas" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing.xxl }}>
          <Text style={textoAjuda}>
            Veja se uma compra parcelada cabe nos próximos meses. Nada é salvo até você
            cadastrar a conta.
          </Text>

          <CampoTexto
            rotulo="O que vai comprar (opcional)"
            placeholder="Ex: Celular, Geladeira"
            value={nome}
            onChangeText={setNome}
            containerStyle={{ marginTop: spacing.base }}
          />
          <CampoMoeda
            rotulo="Valor total"
            valorCentavos={valorTotal}
            onChangeCentavos={setValorTotal}
            destaqueGrande
            containerStyle={{ marginTop: spacing.base }}
          />
          <View style={{ flexDirection: 'row', gap: spacing.base, marginTop: spacing.base }}>
            <View style={{ flex: 1 }}>
              <CampoTexto
                rotulo="Parcelas"
                keyboardType="number-pad"
                value={parcelasTexto}
                onChangeText={setParcelasTexto}
                erro={!parcelasValidas ? 'De 1 a 24' : undefined}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CampoTexto
                rotulo="Juros ao mês (%)"
                keyboardType="decimal-pad"
                value={jurosTexto}
                onChangeText={setJurosTexto}
                erro={!jurosValidos ? 'De 0 a 20' : undefined}
              />
            </View>
          </View>
          <Text
            style={{
              marginTop: spacing.base,
              marginBottom: spacing.xs,
              color: colors.text,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.fontSize.body,
            }}>
            Primeira parcela em
          </Text>
          <SeletorMesCompacto mesRef={mesPrimeira} onMudar={setMesPrimeira} />
          {!primeiraValida ? (
            <Text style={[textoAjuda, { color: colors.danger, marginTop: spacing.xs }]}>
              Escolha este mês ou um dos próximos.
            </Text>
          ) : null}

          {simulacao ? (
            <>
              <TituloSecao>Resultado</TituloSecao>
              <Cartao>
                <View style={styles.linha}>
                  <View style={{ flex: 1 }}>
                    <Text style={textoAjuda}>Parcela</Text>
                    <Text
                      style={{
                        color: colors.text,
                        fontFamily: typography.fontFamily.bold,
                        fontSize: typography.fontSize.title,
                      }}>
                      {parcelas}× {formatarMoeda(simulacao.parcelaCentavos)}
                    </Text>
                  </View>
                </View>
                <Text style={[textoAjuda, { marginTop: spacing.xs }]}>
                  Total: {formatarMoeda(simulacao.totalCentavos)}
                  {simulacao.jurosCentavos > 0
                    ? ` · ${formatarMoeda(simulacao.jurosCentavos)} de juros`
                    : ' · sem juros'}
                  {` · até ${formatarMesAno(ultimoMes).toLowerCase()}`}
                </Text>

                {impacto ? (
                  <View
                    accessible
                    accessibilityLabel={`Veredito: ${vereditos[impacto.veredito].texto}`}
                    style={[
                      styles.veredito,
                      {
                        backgroundColor: vereditos[impacto.veredito].fundo,
                        borderRadius: radii.button,
                        padding: spacing.md,
                        marginTop: spacing.base,
                      },
                    ]}>
                    <Ionicons
                      name={vereditos[impacto.veredito].icone}
                      size={28}
                      color={vereditos[impacto.veredito].cor}
                    />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text
                        style={{
                          color: vereditos[impacto.veredito].cor,
                          fontFamily: typography.fontFamily.bold,
                          fontSize: typography.fontSize.subtitle,
                        }}>
                        {vereditos[impacto.veredito].texto}
                      </Text>
                      {impacto.piorMes ? (
                        <Text style={[textoAjuda, { color: colors.text }]}>
                          No pior mês ({formatarMesAno(impacto.piorMes.mesRef).toLowerCase()}), sua
                          sobra {impacto.piorMes.sobraCentavos < 0 ? 'fica negativa em ' : 'cai para '}
                          {formatarMoeda(Math.abs(impacto.piorMes.sobraCentavos))}.
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </Cartao>

              {impacto ? (
                <Cartao style={{ marginTop: spacing.base }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontFamily: typography.fontFamily.semiBold,
                      fontSize: typography.fontSize.body,
                      marginBottom: spacing.xs,
                    }}>
                    Sobra com e sem a compra
                  </Text>
                  <View style={[styles.linha, { marginBottom: spacing.base }]}>
                    <View style={[styles.marcador, { backgroundColor: colors.success }]} />
                    <Text style={textoAjuda}>Com a compra</Text>
                    <View
                      style={[
                        styles.marcador,
                        { borderWidth: 1.5, borderColor: colors.textMuted, marginLeft: spacing.base },
                      ]}
                    />
                    <Text style={textoAjuda}>Sem a compra</Text>
                  </View>
                  <GraficoSobraMeses meses={fatia(impacto.comCompra)} comparacao={fatia(base)} />
                  <Text style={[textoAjuda, { marginTop: spacing.base }]}>
                    Estimativa pelas contas e rendas cadastradas.
                  </Text>
                </Cartao>
              ) : null}

              <Botao
                titulo="Cadastrar como conta parcelada"
                onPress={cadastrar}
                style={{ marginTop: spacing.base }}
              />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
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
  veredito: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marcador: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 6,
  },
});
