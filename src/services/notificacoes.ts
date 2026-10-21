import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { SQLiteDatabase } from 'expo-sqlite';
import { Configuracoes } from '@/src/domain/configuracoes';
import { planejarLembretes } from '@/src/domain/planejarLembretes';
import { adicionarMeses } from '@/src/domain/gerarLancamentos';
import { lancamentosRepo } from '@/src/db/repositorios/lancamentosRepo';
import { obterHojeIso } from '@/src/store/useMesStore';

export const CANAL_VENCIMENTOS = 'vencimentos';

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

  for (const lembrete of planejarLembretes(pendentes, config, new Date())) {
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
