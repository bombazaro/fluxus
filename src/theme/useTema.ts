import { useColorScheme } from 'react-native';
import { esquemaDeCores } from '@/src/domain/esquemaDeCores';
import { useConfigStore } from '@/src/store/useConfigStore';
import { darkColors, lightColors, ThemeColors } from './colors';
import { radii, spacing, layout } from './spacing';
import { typography } from './typography';

export function useTema() {
  const systemScheme = useColorScheme();
  // O tema escolhido vale também na web, onde o react-native-web não troca o esquema do sistema
  const preferido = useConfigStore((s) => s.config.tema);
  const isDark = esquemaDeCores(preferido, systemScheme) === 'dark';
  const colors: ThemeColors = isDark ? darkColors : lightColors;

  return {
    colors,
    isDark,
    spacing,
    radii,
    typography,
    layout,
  };
}
