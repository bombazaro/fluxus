import type { NotificationResponse } from 'expo-notifications';

/** No navegador não há notificações agendadas, então nunca há resposta. */
export function useRespostaNotificacao(): NotificationResponse | null {
  return null;
}
