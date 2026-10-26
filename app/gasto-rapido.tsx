import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useTema } from '@/src/theme';
import {
  Botao,
  CabecalhoTela,
  CampoData,
  CampoMoeda,
  CampoTexto,
  Cartao,
} from '@/src/components/ui';
import { SeletorCategoria } from '@/src/components/contas/SeletorCategoria';
import { categoriasRepo } from '@/src/db/repositorios/categoriasRepo';
import { contasRepo } from '@/src/db/repositorios/contasRepo';
import { montarGastoRapido } from '@/src/domain/gastoRapido';
import { obterHojeIso, useMesStore } from '@/src/store/useMesStore';
import { Categoria } from '@/src/types';
import { dataBrParaIso, formatarData } from '@/src/utils/formatadores';

/** Categoria já marcada ao abrir: a de gasto do dia a dia mais comum. */
const CATEGORIA_SUGERIDA = 'Alimentação';

/** Lança em poucos toques um gasto que já foi pago (mercado, lanche, farmácia...). */
export default function GastoRapidoScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, typography, spacing } = useTema();
  const carregarMes = useMesStore((s) => s.carregarMes);

  const [valorCentavos, setValorCentavos] = useState(0);
  const [descricao, setDescricao] = useState('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [data, setData] = useState(() => formatarData(obterHojeIso()));
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    categoriasRepo
      .listarTodas(db)
      .then((lista) => {
        setCategorias(lista);
        setCategoriaId(
          (atual) =>
            atual ?? (lista.find((c) => c.nome === CATEGORIA_SUGERIDA) ?? lista[0])?.id ?? null
        );
      })
      .catch(() => {});
  }, [db]);

  const criarCategoria = async (nome: string): Promise<string | null> => {
    const { id, erro } = await categoriasRepo.criarPeloNome(db, nome);
    if (erro || id === null) return erro;
    setCategorias(await categoriasRepo.listarTodas(db));
    setCategoriaId(id);
    return null;
  };

  const salvar = async () => {
    if (salvando) return;
    const gasto = montarGastoRapido({
      descricao,
      valorCentavos,
      categoria: categorias.find((c) => c.id === categoriaId) ?? null,
      dataIso: dataBrParaIso(data),
      agoraIso: new Date().toISOString(),
    });
    if (gasto.erro !== null) {
      Alert.alert('Falta pouco', gasto.erro);
      return;
    }

    setSalvando(true);
    try {
      await contasRepo.registrarGastoRapido(db, gasto.conta, gasto.lancamento);
      await carregarMes(db);
      router.back();
    } catch (err) {
      console.error('Erro ao lançar gasto:', err);
      Alert.alert('Erro', 'Não foi possível lançar o gasto. Tente de novo.');
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <CabecalhoTela titulo="Gasto rápido" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing.xxl }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.fontSize.caption,
              lineHeight: 18,
            }}>
            Para o que você já pagou e não é conta fixa: mercado, lanche, farmácia... Entra como
            pago no resumo do mês e deixa a sobra mais perto da real.
          </Text>

          <Cartao style={{ marginTop: spacing.base }}>
            <CampoMoeda
              rotulo="Quanto gastou"
              valorCentavos={valorCentavos}
              onChangeCentavos={setValorCentavos}
              destaqueGrande
            />
            <CampoTexto
              rotulo="Com o quê (opcional)"
              placeholder="Ex.: Mercado, Lanche"
              value={descricao}
              onChangeText={setDescricao}
              maxLength={40}
              autoCapitalize="sentences"
              containerStyle={{ marginTop: spacing.base }}
            />
            <CampoData
              rotulo="Quando"
              valor={data}
              onMudar={setData}
              containerStyle={{ marginTop: spacing.base }}
            />
          </Cartao>

          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: typography.fontFamily.semiBold,
              fontSize: typography.fontSize.caption,
              marginTop: spacing.lg,
              marginBottom: spacing.sm,
            }}>
            CATEGORIA
          </Text>
          <SeletorCategoria
            categorias={categorias}
            categoriaId={categoriaId}
            onSelecionar={setCategoriaId}
            onCriarCategoria={criarCategoria}
          />

          <View style={{ marginTop: spacing.xl }}>
            <Botao
              titulo={salvando ? 'Lançando...' : 'Lançar gasto'}
              onPress={salvar}
              carregando={salvando}
              desativado={valorCentavos <= 0}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
