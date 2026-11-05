import * as Notifications from 'expo-notifications';

/** A última notificação tocada (ou botão dela). Só existe no celular. */
export function useRespostaNotificacao(): Notifications.NotificationResponse | null {
  return Notifications.useLastNotificationResponse() ?? null;
}
