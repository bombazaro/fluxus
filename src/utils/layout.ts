import { Platform, ViewStyle } from 'react-native';

const SO_NA_WEB = Platform.OS === 'web';

function limitar(maxWidth: number): ViewStyle {
  // No celular e nos tablets do app a tela continua ocupando a largura toda
  return SO_NA_WEB ? { width: '100%', maxWidth, alignSelf: 'center' } : {};
}

/** Telas de formulário e de configuração: conteúdo estreito e centralizado em janelas largas. */
export const estiloFormulario: ViewStyle = limitar(560);

/** Telas de gráfico: um pouco mais largas que os formulários. */
export const estiloGrafico: ViewStyle = limitar(720);

/** Janelas e folhas que aparecem por cima da tela. */
export const estiloJanela: ViewStyle = limitar(440);
