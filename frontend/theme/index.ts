/**
 * Sistema de diseño centralizado de GymStatus.
 *
 * Todos los componentes consumen estos tokens en lugar de repetir
 * colores, espaciados y tamaños sueltos. Cambiar un valor aquí
 * lo actualiza en toda la aplicación de forma consistente.
 */

export const colors = {
  // Fondo y superficies (tema oscuro deportivo)
  background: '#0B0F0A',
  surface: '#162114',
  surfaceSolid: '#182417',
  surfaceElevated: '#20301D',

  // Marca (verde energía)
  primary: '#32FF09',
  primaryDark: '#26C207',
  primaryMuted: '#2E6626',
  secondary: '#468A34',

  // Texto
  textPrimary: '#FFFFFF',
  textSecondary: '#A9C6A2',
  textMuted: '#6E8A66',
  onPrimary: '#0B0F0A',

  // Bordes
  border: '#2C3D28',

  // Estados
  success: '#32FF09',
  warning: '#FFB020',
  danger: '#FF4D4D',
  info: '#4DA6FF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 30,
} as const;

export const fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  bold: 'Inter-Bold',
  display: 'RubikVinyl-Regular',
} as const;

export const fontSize = {
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  title: 32,
  display: 44,
} as const;

/** Categoría de IMC con su color asociado para feedback visual. */
export function bmiColor(category: string): string {
  switch (category) {
    case 'Normal':
      return colors.success;
    case 'Bajo':
    case 'Sobrepeso':
      return colors.warning;
    default:
      return colors.danger;
  }
}

/** Color asociado al nivel de riesgo del ICC. */
export function riskColor(risk: string): string {
  switch (risk) {
    case 'Bajo':
      return colors.success;
    case 'Moderado':
      return colors.warning;
    case 'Alto':
    case 'Muy Alto':
      return colors.danger;
    default:
      return colors.textMuted;
  }
}
