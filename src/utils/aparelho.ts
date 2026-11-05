import { Platform } from 'react-native';

/** Como chamar o lugar onde os dados ficam guardados, nos textos do app. */
export const NESTE_APARELHO = Platform.OS === 'web' ? 'neste navegador' : 'neste celular';
export const DO_APARELHO = Platform.OS === 'web' ? 'do navegador' : 'do celular';
export const DESTE_APARELHO = Platform.OS === 'web' ? 'deste navegador' : 'deste celular';
export const TEMA_DO_SISTEMA = Platform.OS === 'web' ? 'Do sistema' : 'Do celular';
