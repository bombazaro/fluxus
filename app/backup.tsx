import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/src/theme';
import { Botao, Cartao } from '@/src/components/ui';
import { useMesStore } from '@/src/store/useMesStore';
import { exportarBackup, importarBackup } from '@/src/services/backup';
import { formatarData } from '@/src/utils/formatadores';

export default function BackupScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, typography, spacing } = useTema();
  const carregarMes = useMesStore((s) => s.carregarMes);

  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);

  const handleExportar = async () => {
    setExportando(true);
    try {
      await exportarBackup(db);
    } catch (err) {
      console.error('Erro ao exportar backup:', err);
      Alert.alert('Erro', 'Não foi possível gerar o backup. Tente de novo.');
    } finally {
      setExportando(false);
    }
  };

  const importar = async () => {
    setImportando(true);
    try {
      const resultado = await importarBackup(db);
      if (resultado.status === 'erro') {
        Alert.alert('Backup não importado', resultado.mensagem);
      } else if (resultado.status === 'ok') {
        await carregarMes(db);
        Alert.alert(
          'Backup importado',
          `Dados restaurados do backup de ${formatarData(resultado.exportadoEm.slice(0, 10))}.`
        );
      }
    } catch (err) {
      console.error('Erro ao importar backup:', err);
      Alert.alert('Erro', 'Não foi possível importar o backup. Seus dados atuais não foram alterados.');
    } finally {
      setImportando(false);
    }
  };

  const handleImportar = () => {
    Alert.alert(
      'Importar backup',
      'Todos os dados atuais deste celular serão substituídos pelos do arquivo. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Substituir dados', style: 'destructive', onPress: importar },
      ]
    );
  };

  const textoCorpo = {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.body,
    lineHeight: typography.lineHeight.body,
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.base,
            paddingVertical: spacing.md,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.btnVoltar}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text
          style={{
            color: colors.text,
            fontFamily: typography.fontFamily.bold,
            fontSize: typography.fontSize.subtitle,
            marginLeft: spacing.sm,
          }}>
          Backup dos dados
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
        <Cartao destaque>
          <View style={styles.linha}>
            <Ionicons name="phone-portrait-outline" size={22} color={colors.warning} />
            <Text style={[textoCorpo, { flex: 1, marginLeft: spacing.sm }]}>
              Seus dados ficam só neste celular. Se desinstalar o app ou trocar de aparelho, eles
              são perdidos. Exporte um backup de vez em quando e guarde fora do celular.
            </Text>
          </View>
        </Cartao>

        <Cartao>
          <Text
            style={{
              color: colors.text,
              fontFamily: typography.fontFamily.semiBold,
              fontSize: typography.fontSize.body,
              marginBottom: spacing.xs,
            }}>
            Exportar
          </Text>
          <Text style={[textoCorpo, { marginBottom: spacing.base }]}>
            Gera um arquivo com todas as contas, rendas e pagamentos. Salve no Google Drive, mande
            para você no WhatsApp ou por e-mail.
          </Text>
          <Botao
            titulo="Exportar backup"
            onPress={handleExportar}
            carregando={exportando}
            desativado={importando}
          />
        </Cartao>

        <Cartao>
          <Text
            style={{
              color: colors.text,
              fontFamily: typography.fontFamily.semiBold,
              fontSize: typography.fontSize.body,
              marginBottom: spacing.xs,
            }}>
            Importar
          </Text>
          <Text style={[textoCorpo, { marginBottom: spacing.base }]}>
            Restaura os dados de um arquivo de backup. Serve também para passar os dados para outro
            celular. Os dados atuais deste celular são substituídos.
          </Text>
          <Botao
            titulo="Importar backup"
            variante="secundario"
            onPress={handleImportar}
            carregando={importando}
            desativado={exportando}
          />
        </Cartao>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  btnVoltar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
