import { useColorScheme } from 'react-native';
import { darkColors, lightColors, ThemeColors } from './colors';
import { radii, spacing, layout } from './spacing';
import { typography } from './typography';

export function useTema() {
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';
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

export { darkColors, lightColors, radii, spacing, typography, layout };
export type { ThemeColors };
