import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { SQLiteDatabase } from 'expo-sqlite';
import { Configuracoes } from '@/src/domain/configuracoes';
import {
  LIMITE_LEMBRETES,
  planejarAvisosRenda,
  planejarLembretes,
} from '@/src/domain/planejarLembretes';
import { rendasDoMes } from '@/src/domain/rendasDoMes';
import { rendasRepo } from '@/src/db/repositorios/rendasRepo';
import { adicionarMeses } from '@/src/domain/gerarLancamentos';
import { lancamentosRepo } from '@/src/db/repositorios/lancamentosRepo';
import { obterHojeIso } from '@/src/store/useMesStore';

export const CANAL_VENCIMENTOS = 'vencimentos';

/** Categoria dos avisos de renda que têm o botão "Recebi". */
const CATEGORIA_RENDA = 'renda';
export const ACAO_RECEBI = 'recebi';

/** Quantos dias à frente procurar contas para lembrar. */
const JANELA_DIAS = 45;

/** Mostra a notificação mesmo com o app aberto. Chamar uma vez, ao abrir o app. */
export function configurarNotificacoes(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** No Android 13+, o canal precisa existir antes de pedir a permissão. */
async function criarCanal(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationCategoryAsync(CATEGORIA_RENDA, [
    { identifier: ACAO_RECEBI, buttonTitle: 'Recebi', options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationChannelAsync(CANAL_VENCIMENTOS, {
    name: 'Vencimentos',
    description: 'Lembretes de contas que vão vencer',
    importance: AndroidImportance.HIGH,
  });
}

export async function temPermissao(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

/** Pede a permissão do sistema. Mostrar antes uma explicação de por que o app precisa. */
export async function pedirPermissao(): Promise<boolean> {
  await criarCanal();
  if (await temPermissao()) return true;
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

function somarDias(dataIso: string, dias: number): string {
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  const d = new Date(ano, mes - 1, dia + dias);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * Apaga todos os lembretes e agenda de novo a partir do banco. Chamado ao abrir o
 * app e sempre que as contas mudam: assim pagar, editar ou excluir já atualiza
 * os avisos, e o que o Android apagou volta a ser agendado.
 */
export async function reagendarLembretes(
  db: SQLiteDatabase,
  config: Pick<Configuracoes, 'notificacoesAtivas' | 'notificacaoHora' | 'notificacaoDiasAntes'>
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!config.notificacoesAtivas || !(await temPermissao())) return;

  await criarCanal();

  // Contas fixas do mês que vem só existem depois que o mês é aberto
  const hoje = obterHojeIso();
  const mesAtual = hoje.slice(0, 7);
  await lancamentosRepo.garantirMes(db, mesAtual);
  await lancamentosRepo.garantirMes(db, adicionarMeses(mesAtual, 1));

  const pendentes = await lancamentosRepo.listarPendentesEntre(
    db,
    hoje,
    somarDias(hoje, JANELA_DIAS)
  );

  // Avisos do dia do salário (e das outras rendas) deste mês e do próximo
  const todasRendas = await rendasRepo.listarTodas(db);
  const meses = await Promise.all(
    [mesAtual, adicionarMeses(mesAtual, 1)].map(async (mesRef) => ({
      mesRef,
      rendas: rendasDoMes(todasRendas, await rendasRepo.listarRecebidasDoMes(db, mesRef), mesRef),
    }))
  );
  const avisosRenda = planejarAvisosRenda(meses, config.notificacaoHora, new Date());

  for (const aviso of avisosRenda) {
    await Notifications.scheduleNotificationAsync({
      identifier: aviso.identificador,
      content: {
        title: aviso.titulo,
        body: aviso.corpo,
        data: { rendaId: aviso.rendaId, mesRef: aviso.mesRef },
        categoryIdentifier: aviso.comBotaoRecebi ? CATEGORIA_RENDA : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: aviso.quando,
        channelId: CANAL_VENCIMENTOS,
      },
    });
  }

  const limiteContas = Math.max(0, LIMITE_LEMBRETES - avisosRenda.length);
  for (const lembrete of planejarLembretes(pendentes, config, new Date(), limiteContas)) {
    await Notifications.scheduleNotificationAsync({
      identifier: lembrete.identificador,
      content: {
        title: lembrete.titulo,
        body: lembrete.corpo,
        data: { contaId: lembrete.contaId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: lembrete.quando,
        channelId: CANAL_VENCIMENTOS,
      },
    });
  }
}

/** Conta a abrir quando a pessoa toca no lembrete (ou null se não for um lembrete). */
export function contaDaNotificacao(
  resposta: Notifications.NotificationResponse | null | undefined
): number | null {
  if (!resposta || resposta.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return null;
  }
  const contaId = resposta.notification.request.content.data?.contaId;
  return typeof contaId === 'number' ? contaId : null;
}

/**
 * Aviso de renda tocado: qual renda e mês, e se foi no botão "Recebi"
 * (ou null se não for um aviso de renda).
 */
export function rendaDaNotificacao(
  resposta: Notifications.NotificationResponse | null | undefined
): { rendaId: number; mesRef: string; recebi: boolean } | null {
  if (!resposta) return null;
  const { rendaId, mesRef } = resposta.notification.request.content.data ?? {};
  if (typeof rendaId !== 'number' || typeof mesRef !== 'string') return null;
  return { rendaId, mesRef, recebi: resposta.actionIdentifier === ACAO_RECEBI };
}
