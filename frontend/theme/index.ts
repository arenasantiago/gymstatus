/**
 * Sistema de diseño centralizado de Athlete Performance.
 *
 * Todos los componentes consumen estos tokens en lugar de repetir colores,
 * espaciados y tamaños sueltos. Tema oscuro deportivo: fondo azul noche,
 * acento cian y colores de estado sobrios (el ámbar indica "revisar", no
 * alarma).
 */

export const colors = {
  // Fondo y superficies
  background: '#0A0F1A',
  surface: '#111827',
  surfaceElevated: '#1A2333',
  surfaceSunken: '#0D1422',

  // Marca / acento
  primary: '#38BDF8',
  primaryStrong: '#0EA5E9',
  primaryMuted: 'rgba(56, 189, 248, 0.14)',
  onPrimary: '#04121F',

  // Texto
  textPrimary: '#F1F5F9',
  textSecondary: '#A3B1C6',
  textMuted: '#6B7A90',

  // Bordes
  border: '#243044',
  borderStrong: '#33415C',

  // Estados
  success: '#34D399',
  successMuted: 'rgba(52, 211, 153, 0.14)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251, 191, 36, 0.14)',
  danger: '#F87171',
  dangerMuted: 'rgba(248, 113, 113, 0.14)',
  info: '#60A5FA',
  infoMuted: 'rgba(96, 165, 250, 0.14)',
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
  lg: 16,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
} as const;

/** Ancho máximo del contenido (tablet / web) para que no se estire. */
export const contentMaxWidth = 760;

/** Tono de una interpretación descriptiva (shared/interpretation.js). */
export type InterpretationTone = 'ok' | 'attention' | 'high' | 'neutral';

/** Tono de un cambio respecto a la evaluación anterior (shared/progress.js). */
export type ChangeTone = 'favorable' | 'unfavorable' | 'neutral';

export function toneColor(tone?: InterpretationTone | string | null): string {
  switch (tone) {
    case 'ok':
      return colors.success;
    case 'attention':
      return colors.warning;
    case 'high':
      return colors.danger;
    default:
      return colors.textSecondary;
  }
}

export function toneBackground(tone?: InterpretationTone | string | null): string {
  switch (tone) {
    case 'ok':
      return colors.successMuted;
    case 'attention':
      return colors.warningMuted;
    case 'high':
      return colors.dangerMuted;
    default:
      return colors.surfaceElevated;
  }
}

/** Verde si el cambio va en la dirección del objetivo, ámbar si va en contra. */
export function changeColor(tone?: ChangeTone | string | null): string {
  switch (tone) {
    case 'favorable':
      return colors.success;
    case 'unfavorable':
      return colors.warning;
    default:
      return colors.textSecondary;
  }
}
