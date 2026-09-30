// @ts-check
'use strict';

/**
 * Sistemas de unidades.
 *
 * Todo se GUARDA y se CALCULA en métrico (kg, cm). La conversión solo ocurre en
 * los bordes de la interfaz (mostrar / leer un campo). Para activar unidades
 * imperiales basta con pasar 'imperial' a estas funciones desde la pantalla;
 * las fórmulas y la base de datos no cambian.
 */

/** @typedef {'metric'|'imperial'} UnitSystem */

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

/** @type {UnitSystem} */
const DEFAULT_UNIT_SYSTEM = 'metric';

/** @type {Record<UnitSystem, Record<import('./config').Dimension, string>>} */
const UNIT_LABELS = {
  metric: { mass: 'kg', length: 'cm' },
  imperial: { mass: 'lb', length: 'in' },
};

/**
 * Valor canónico (kg / cm) → valor en el sistema de la interfaz.
 * @param {number} value
 * @param {import('./config').Dimension} dimension
 * @param {UnitSystem} [system]
 * @returns {number}
 */
function fromCanonical(value, dimension, system = DEFAULT_UNIT_SYSTEM) {
  if (system !== 'imperial') return value;
  return dimension === 'mass' ? value / KG_PER_LB : value / CM_PER_IN;
}

/**
 * Valor escrito en la interfaz → valor canónico (kg / cm).
 * @param {number} value
 * @param {import('./config').Dimension} dimension
 * @param {UnitSystem} [system]
 * @returns {number}
 */
function toCanonical(value, dimension, system = DEFAULT_UNIT_SYSTEM) {
  if (system !== 'imperial') return value;
  return dimension === 'mass' ? value * KG_PER_LB : value * CM_PER_IN;
}

/**
 * @param {import('./config').Dimension} dimension
 * @param {UnitSystem} [system]
 * @returns {string}
 */
function unitLabel(dimension, system = DEFAULT_UNIT_SYSTEM) {
  return UNIT_LABELS[system][dimension];
}

module.exports = {
  KG_PER_LB,
  CM_PER_IN,
  DEFAULT_UNIT_SYSTEM,
  UNIT_LABELS,
  fromCanonical,
  toCanonical,
  unitLabel,
};
