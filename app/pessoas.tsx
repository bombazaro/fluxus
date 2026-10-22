import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { Botao, CabecalhoTela, CampoTexto, Cartao } from '@/src/components/ui';
import { pessoasRepo } from '@/src/db/repositorios/pessoasRepo';
import { useMesStore } from '@/src/store/useMesStore';
import { Pessoa } from '@/src/types';

/** Pessoas com quem as contas são divididas. "Eu" é fixo. */
export default function PessoasScreen() {
  const db = useSQLiteContext();
  const { colors, typography, spacing } = useTema();
  const carregarMes = useMesStore((s) => s.carregarMes);

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [nome, setNome] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setPessoas(await pessoasRepo.listarTodas(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const nomeLimpo = nome.trim();
  const nomeRepetido = pessoas.some(
    (p) => p.id !== editandoId && p.nome.toLowerCase() === nomeLimpo.toLowerCase()
  );

  const salvar = async () => {
    if (!nomeLimpo || nomeRepetido) return;
    if (editandoId !== null) {
      await pessoasRepo.renomear(db, editandoId, nomeLimpo);
    } else {
      await pessoasRepo.criar(db, nomeLimpo);
    }
    setNome('');
    setEditandoId(null);
    await carregar();
  };

  const excluir = async (pessoa: Pessoa) => {
    const divisoes = await pessoasRepo.contarDivisoes(db, pessoa.id);
    Alert.alert(
      `Excluir ${pessoa.nome}?`,
      divisoes > 0
        ? `${pessoa.nome} aparece em ${divisoes} divisão(ões) de contas. Elas também serão apagadas, e os acertos com essa pessoa somem.`
        : 'Essa pessoa não está em nenhuma conta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await pessoasRepo.excluir(db, pessoa.id);
            await carregar();
            await carregarMes(db);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <CabecalhoTela titulo="Pessoas" />

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
          Cadastre quem divide contas com você (ex.: quem mora junto). A divisão é anotada só neste
          celular: o celular da outra pessoa não é atualizado.
        </Text>

        <Cartao style={{ marginTop: spacing.base }}>
          <CampoTexto
            rotulo={editandoId !== null ? 'Novo nome' : 'Nome da pessoa'}
            placeholder="Ex: Ana"
            value={nome}
            onChangeText={setNome}
            erro={nomeRepetido ? 'Já existe uma pessoa com esse nome' : undefined}
            onSubmitEditing={salvar}
            returnKeyType="done"
          />
          <View style={[styles.linha, { marginTop: spacing.sm, gap: spacing.sm }]}>
            {editandoId !== null ? (
              <Botao
                titulo="Cancelar"
                variante="fantasma"
                onPress={() => {
                  setEditandoId(null);
                  setNome('');
                }}
                style={{ flex: 1 }}
              />
            ) : null}
            <Botao
              titulo={editandoId !== null ? 'Salvar nome' : 'Adicionar'}
              onPress={salvar}
              desativado={!nomeLimpo || nomeRepetido}
              style={{ flex: 1 }}
            />
          </View>
        </Cartao>

        <Cartao style={{ marginTop: spacing.base }}>
          {pessoas.map((p, i) => {
            const ehEu = p.nome === 'Eu';
            return (
              <View
                key={p.id}
                style={[
                  styles.linha,
                  {
                    minHeight: 48,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  },
                ]}>
                <Ionicons
                  name={ehEu ? 'person' : 'person-outline'}
                  size={20}
                  color={ehEu ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={{
                    flex: 1,
                    marginLeft: spacing.sm,
                    color: colors.text,
                    fontFamily: typography.fontFamily.medium,
                    fontSize: typography.fontSize.body,
                  }}>
                  {ehEu ? 'Eu (você)' : p.nome}
                </Text>
                {!ehEu ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Renomear ${p.nome}`}
                      onPress={() => {
                        setEditandoId(p.id);
                        setNome(p.nome);
                      }}
                      hitSlop={8}
                      style={{ padding: 6 }}>
                      <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Excluir ${p.nome}`}
                      onPress={() => excluir(p)}
                      hitSlop={8}
                      style={{ padding: 6, marginLeft: spacing.xs }}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </>
                ) : null}
              </View>
            );
          })}
        </Cartao>
      </ScrollView>
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
