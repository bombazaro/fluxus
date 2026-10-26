import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { Botao, CampoTexto } from '@/src/components/ui';
import { NOME_CATEGORIA_MAXIMO, NOME_OUTROS } from '@/src/domain/categorias';
import { Categoria } from '@/src/types';

export interface SeletorCategoriaProps {
  categorias: Categoria[];
  categoriaId: number | null;
  onSelecionar: (id: number) => void;
  /**
   * Com "Outros" escolhido, mostra um campo para criar uma categoria nova.
   * Devolve a mensagem de erro, ou null se criou (e já escolheu) a categoria.
   */
  onCriarCategoria?: (nome: string) => Promise<string | null>;
}

/** Lista horizontal de chips coloridos para escolher a categoria da conta. */
export function SeletorCategoria({
  categorias,
  categoriaId,
  onSelecionar,
  onCriarCategoria,
}: SeletorCategoriaProps) {
  const { colors, typography, spacing, radii } = useTema();
  const [nomeNova, setNomeNova] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  const outrosEscolhida =
    !!onCriarCategoria && categorias.find((c) => c.id === categoriaId)?.nome === NOME_OUTROS;

  const criar = async () => {
    if (!onCriarCategoria || criando) return;
    setCriando(true);
    try {
      const msg = await onCriarCategoria(nomeNova);
      setErro(msg);
      if (!msg) setNomeNova('');
    } finally {
      setCriando(false);
    }
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}>
        {categorias.map((cat) => {
          const selecionada = categoriaId === cat.id;
          return (
            <Pressable
              key={cat.id}
              accessibilityRole="radio"
              accessibilityLabel={`Categoria ${cat.nome}`}
              accessibilityState={{ selected: selecionada }}
              onPress={() => onSelecionar(cat.id)}
              style={[
                styles.categoriaChip,
                {
                  backgroundColor: selecionada ? cat.cor : colors.surface,
                  borderColor: selecionada ? cat.cor : colors.border,
                  borderRadius: radii.full,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                },
              ]}>
              <Ionicons
                name={cat.icone as keyof typeof Ionicons.glyphMap}
                size={16}
                color={selecionada ? '#FFFFFF' : cat.cor}
              />
              <Text
                style={[
                  styles.chipTexto,
                  {
                    color: selecionada ? '#FFFFFF' : colors.text,
                    fontFamily: typography.fontFamily.medium,
                    marginLeft: 6,
                  },
                ]}>
                {cat.nome}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {outrosEscolhida ? (
        <View
          style={{
            marginTop: spacing.sm,
            padding: spacing.md,
            borderRadius: radii.card,
            backgroundColor: colors.surfaceVariant,
          }}>
          <Text
            style={{
              color: colors.text,
              fontFamily: typography.fontFamily.medium,
              fontSize: 14,
              marginBottom: spacing.sm,
            }}>
            Quer criar uma categoria só sua? Ela fica salva para as próximas contas.
          </Text>
          <CampoTexto
            placeholder="Ex.: Pets, Cuidados pessoais"
            value={nomeNova}
            onChangeText={(t) => {
              setNomeNova(t);
              setErro(null);
            }}
            onSubmitEditing={criar}
            maxLength={NOME_CATEGORIA_MAXIMO}
            autoCapitalize="sentences"
            returnKeyType="done"
            erro={erro ?? undefined}
          />
          <Botao
            titulo="Criar categoria"
            tamanho="pequeno"
            onPress={criar}
            desativado={!nomeNova.trim() || criando}
            style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoriaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  chipTexto: {
    fontSize: 14,
  },
});
