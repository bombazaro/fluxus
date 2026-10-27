import React, { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { Botao, CabecalhoTela, CampoTexto, Cartao } from '@/src/components/ui';
import { SeletorCategoria } from '@/src/components/contas/SeletorCategoria';
import { categoriasRepo } from '@/src/db/repositorios/categoriasRepo';
import { ehCategoriaPadrao, NOME_CATEGORIA_MAXIMO, NOME_OUTROS } from '@/src/domain/categorias';
import { useMesStore } from '@/src/store/useMesStore';
import { Categoria } from '@/src/types';

/** Categoria sendo excluída e quantas contas usam ela. */
interface Exclusao {
  categoria: Categoria;
  contas: number;
  destinoId: number | null;
}

/** Cria, renomeia e exclui as categorias da pessoa. As que vêm com o app ficam fixas. */
export default function CategoriasScreen() {
  const db = useSQLiteContext();
  const { colors, typography, spacing, radii } = useTema();
  const carregarMes = useMesStore((s) => s.carregarMes);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [exclusao, setExclusao] = useState<Exclusao | null>(null);

  const carregar = useCallback(async () => {
    setCategorias(await categoriasRepo.listarTodas(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const limpar = () => {
    setNome('');
    setErro(null);
    setEditandoId(null);
  };

  const salvar = async () => {
    if (!nome.trim()) return;
    const msg =
      editandoId !== null
        ? await categoriasRepo.renomear(db, editandoId, nome)
        : (await categoriasRepo.criarPeloNome(db, nome)).erro;
    if (msg) {
      setErro(msg);
      return;
    }
    limpar();
    await carregar();
    await carregarMes(db);
  };

  const pedirExclusao = async (categoria: Categoria) => {
    const contas = await categoriasRepo.contarContas(db, categoria.id);
    const outros = categorias.find((c) => c.nome === NOME_OUTROS);
    if (contas === 0) {
      Alert.alert(`Excluir ${categoria.nome}?`, 'Nenhuma conta usa essa categoria.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => excluir(categoria.id, outros?.id ?? null),
        },
      ]);
      return;
    }
    setExclusao({ categoria, contas, destinoId: outros?.id ?? null });
  };

  const excluir = async (id: number, destinoId: number | null) => {
    if (destinoId === null) return;
    const msg = await categoriasRepo.excluir(db, id, destinoId);
    if (msg) {
      Alert.alert('Não foi possível excluir', msg);
      return;
    }
    if (editandoId === id) limpar();
    setExclusao(null);
    await carregar();
    await carregarMes(db);
  };

  const textoAjuda = {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
    lineHeight: 18,
  };

  const minhas = categorias.filter((c) => !ehCategoriaPadrao(c));
  const doApp = categorias.filter((c) => ehCategoriaPadrao(c));

  const linha = (c: Categoria, i: number, editavel: boolean) => (
    <View
      key={c.id}
      style={[
        styles.linha,
        { minHeight: 48, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border },
      ]}>
      <View style={[styles.bolinha, { backgroundColor: c.cor + '20', borderRadius: radii.full }]}>
        <Ionicons name={c.icone as keyof typeof Ionicons.glyphMap} size={16} color={c.cor} />
      </View>
      <Text
        style={{
          flex: 1,
          marginLeft: spacing.sm,
          color: colors.text,
          fontFamily: typography.fontFamily.medium,
          fontSize: typography.fontSize.body,
        }}>
        {c.nome}
      </Text>
      {editavel ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Renomear ${c.nome}`}
            onPress={() => {
              setEditandoId(c.id);
              setNome(c.nome);
              setErro(null);
            }}
            hitSlop={8}
            style={{ padding: 6 }}>
            <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Excluir ${c.nome}`}
            onPress={() => pedirExclusao(c)}
            hitSlop={8}
            style={{ padding: 6, marginLeft: spacing.xs }}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        </>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <CabecalhoTela titulo="Categorias" />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing.xxl }}>
        <Cartao>
          <CampoTexto
            rotulo={editandoId !== null ? 'Novo nome' : 'Nova categoria'}
            placeholder="Ex.: Pets, Cuidados pessoais"
            value={nome}
            onChangeText={(t) => {
              setNome(t);
              setErro(null);
            }}
            erro={erro ?? undefined}
            maxLength={NOME_CATEGORIA_MAXIMO}
            autoCapitalize="sentences"
            onSubmitEditing={salvar}
            returnKeyType="done"
          />
          <View style={[styles.linha, { marginTop: spacing.sm, gap: spacing.sm }]}>
            {editandoId !== null ? (
              <Botao titulo="Cancelar" variante="fantasma" onPress={limpar} style={{ flex: 1 }} />
            ) : null}
            <Botao
              titulo={editandoId !== null ? 'Salvar nome' : 'Adicionar'}
              onPress={salvar}
              desativado={!nome.trim()}
              style={{ flex: 1 }}
            />
          </View>
        </Cartao>

        <Text style={[textoAjuda, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          SUAS CATEGORIAS
        </Text>
        <Cartao>
          {minhas.length === 0 ? (
            <Text style={textoAjuda}>
              Você ainda não criou nenhuma. Crie aqui ou escolhendo Outros ao cadastrar uma conta.
            </Text>
          ) : (
            minhas.map((c, i) => linha(c, i, true))
          )}
        </Cartao>

        <Text style={[textoAjuda, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          DO APP (não podem ser mudadas)
        </Text>
        <Cartao>{doApp.map((c, i) => linha(c, i, false))}</Cartao>
      </ScrollView>

      <Modal
        visible={exclusao !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setExclusao(null)}>
        <View style={styles.overlay}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.card,
              padding: spacing.base,
            }}>
            <Text
              style={{
                color: colors.text,
                fontFamily: typography.fontFamily.bold,
                fontSize: 18,
              }}>
              Excluir {exclusao?.categoria.nome}?
            </Text>
            <Text style={[textoAjuda, { marginTop: spacing.sm }]}>
              {exclusao?.contas === 1
                ? '1 conta usa essa categoria. Para qual categoria ela vai?'
                : `${exclusao?.contas} contas usam essa categoria. Para qual categoria elas vão?`}
            </Text>
            <View style={{ marginTop: spacing.base }}>
              <SeletorCategoria
                categorias={categorias.filter((c) => c.id !== exclusao?.categoria.id)}
                categoriaId={exclusao?.destinoId ?? null}
                onSelecionar={(destinoId) =>
                  setExclusao((atual) => (atual ? { ...atual, destinoId } : atual))
                }
              />
            </View>
            <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
              <Botao
                titulo="Excluir e mover as contas"
                onPress={() => exclusao && excluir(exclusao.categoria.id, exclusao.destinoId)}
                desativado={exclusao?.destinoId == null}
              />
              <Botao titulo="Cancelar" variante="secundario" onPress={() => setExclusao(null)} />
            </View>
          </View>
        </View>
      </Modal>
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
  bolinha: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
});
