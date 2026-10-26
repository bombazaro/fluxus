import { useEffect, useRef } from 'react';
import { Appearance, AppState } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { useConfigStore } from '@/src/store/useConfigStore';
import { useMesStore } from '@/src/store/useMesStore';
import {
  configurarNotificacoes,
  contaDaNotificacao,
  reagendarLembretes,
  rendaDaNotificacao,
} from '@/src/services/notificacoes';
import { rendasRepo } from '@/src/db/repositorios/rendasRepo';

configurarNotificacoes();

/** Espera as mudanças pararem antes de reagendar (marcar várias contas seguidas). */
const ESPERA_REAGENDAR_MS = 1500;

/**
 * Tarefas de quando o app abre, sem tela própria:
 * - lê as configurações e aplica o tema escolhido;
 * - leva para as boas-vindas na primeira abertura;
 * - mantém os lembretes em dia (ao abrir, ao voltar para o app e quando as contas mudam);
 * - abre a conta ao tocar em um lembrete;
 * - no aviso do salário, o botão "Recebi" já marca a renda como recebida.
 */
export function Inicializacao() {
  const db = useSQLiteContext();
  const navegacaoPronta = !!useRootNavigationState()?.key;

  const carregada = useConfigStore((s) => s.carregada);
  const tema = useConfigStore((s) => s.config.tema);
  const onboardingConcluido = useConfigStore((s) => s.config.onboardingConcluido);
  const notificacoesAtivas = useConfigStore((s) => s.config.notificacoesAtivas);
  const notificacaoHora = useConfigStore((s) => s.config.notificacaoHora);
  const notificacaoDiasAntes = useConfigStore((s) => s.config.notificacaoDiasAntes);
  // Muda quando uma conta é criada, paga, editada ou excluída
  const lancamentos = useMesStore((s) => s.lancamentos);
  // Muda quando uma renda é marcada como recebida (o aviso dela não precisa mais tocar)
  const rendas = useMesStore((s) => s.rendas);

  useEffect(() => {
    useConfigStore.getState().carregar(db);
  }, [db]);

  useEffect(() => {
    Appearance.setColorScheme(
      tema === 'sistema' ? 'unspecified' : tema === 'claro' ? 'light' : 'dark'
    );
  }, [tema]);

  useEffect(() => {
    if (carregada && navegacaoPronta && !onboardingConcluido) {
      router.replace('/boas-vindas');
    }
  }, [carregada, navegacaoPronta, onboardingConcluido]);

  // Lembretes: ao abrir, quando as configurações ou as contas mudam...
  useEffect(() => {
    if (!carregada) return;
    const config = { notificacoesAtivas, notificacaoHora, notificacaoDiasAntes };
    const timer = setTimeout(() => {
      reagendarLembretes(db, config).catch((err) =>
        console.warn('Não foi possível agendar os lembretes:', err)
      );
    }, ESPERA_REAGENDAR_MS);
    return () => clearTimeout(timer);
  }, [
    db,
    carregada,
    notificacoesAtivas,
    notificacaoHora,
    notificacaoDiasAntes,
    lancamentos,
    rendas,
  ]);

  // ...e ao voltar para o app (o Android pode ter apagado algum agendamento)
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active' || !useConfigStore.getState().carregada) return;
      reagendarLembretes(db, useConfigStore.getState().config).catch((err) =>
        console.warn('Não foi possível agendar os lembretes:', err)
      );
    });
    return () => assinatura.remove();
  }, [db]);

  // Tocar no lembrete abre o detalhe da conta
  const resposta = Notifications.useLastNotificationResponse();
  // A última resposta continua a mesma depois de tratada: não abrir duas vezes
  const respostaTratada = useRef<string | null>(null);
  useEffect(() => {
    if (!resposta || !navegacaoPronta || !carregada) return;
    const chave = `${resposta.notification.request.identifier}-${resposta.notification.date}-${resposta.actionIdentifier}`;
    if (respostaTratada.current === chave) return;

    const contaId = contaDaNotificacao(resposta);
    if (contaId !== null) {
      respostaTratada.current = chave;
      router.push(`/conta/${contaId}`);
      return;
    }

    // Aviso de renda: "Recebi" marca com o valor cadastrado; tocar no aviso abre a Início
    const renda = rendaDaNotificacao(resposta);
    if (!renda) return;
    respostaTratada.current = chave;
    Notifications.dismissNotificationAsync(resposta.notification.request.identifier).catch(
      () => {}
    );
    (async () => {
      if (renda.recebi) {
        const cadastrada = await rendasRepo.buscarPorId(db, renda.rendaId);
        if (cadastrada) {
          await rendasRepo.marcarRecebida(
            db,
            renda.rendaId,
            renda.mesRef,
            cadastrada.valor_centavos
          );
        }
      }
      router.navigate('/(tabs)');
      await useMesStore.getState().carregarMes(db, renda.mesRef);
    })().catch((err) => console.warn('Não foi possível marcar a renda:', err));
  }, [db, resposta, navegacaoPronta, carregada]);

  return null;
}
