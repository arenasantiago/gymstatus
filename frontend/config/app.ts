/**
 * Configuración de la app (no del motor de cálculo, que vive en
 * shared/config.js).
 */
import { DEFAULT_UNIT_SYSTEM, type UnitSystem } from '../../shared/units';

/** Nombre provisional del producto. */
export const APP_NAME = 'Athlete Performance';

/**
 * Sistema de unidades de la interfaz. Todo se guarda y calcula en métrico;
 * cambiar a 'imperial' solo cambia cómo se leen y muestran los campos
 * (shared/units.js) y el backend recibe `unitSystem` para convertir.
 */
export const UNIT_SYSTEM: UnitSystem = DEFAULT_UNIT_SYSTEM;

/** Colores sugeridos para la marca (el entrenador también puede escribir un hex). */
export const BRAND_COLOR_PRESETS = [
  '#2563EB', // azul
  '#0F766E', // verde azulado
  '#16A34A', // verde
  '#DC2626', // rojo
  '#EA580C', // naranja
  '#7C3AED', // violeta
  '#DB2777', // magenta
  '#0F172A', // grafito
] as const;
