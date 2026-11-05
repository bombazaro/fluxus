import { Platform } from 'react-native';

/** Como chamar o lugar onde os dados ficam guardados, nos textos do app. */
export const ESTE_APARELHO = Platform.OS === 'web' ? 'este navegador' : 'este celular';
export const O_APARELHO = Platform.OS === 'web' ? 'o navegador' : 'o celular';
export const TEMA_DO_SISTEMA = Platform.OS === 'web' ? 'Do sistema' : 'Do celular';
