import { Platform, useWindowDimensions } from 'react-native';
import { tamanhoDaTela, TamanhoDaTela } from '@/src/domain/tamanhoDaTela';

/** Tamanho da janela. No app do celular é sempre `compacto`: só a web se adapta. */
export function useTamanhoDaTela(): TamanhoDaTela {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' ? tamanhoDaTela(width) : 'compacto';
}
