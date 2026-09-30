// @ts-check
'use strict';

/**
 * Formato de números para pantalla y PDF (mismas reglas en ambos).
 * Punto decimal y signo menos tipográfico (−) en las variaciones.
 */

const { round } = require('./formulas');

const MINUS = '\u2212';
const EMPTY = '—';

/**
 * @param {unknown} value
 * @returns {value is number}
 */
function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * @param {number|null|undefined} value
 * @param {number} [decimals]
 * @returns {string}
 */
function formatNumber(value, decimals = 1) {
  if (!isNumber(value)) return EMPTY;
  return round(value, decimals).toFixed(decimals);
}

/**
 * @param {number|null|undefined} value
 * @param {string} unit
 * @param {number} [decimals]
 * @returns {string}
 */
function formatWithUnit(value, unit, decimals = 1) {
  const text = formatNumber(value, decimals);
  if (text === EMPTY || !unit) return text;
  return `${text} ${unit}`;
}

/**
 * Variación con signo: "+1.2", "−0.8", "0.0".
 * @param {number|null|undefined} value
 * @param {number} [decimals]
 * @returns {string}
 */
function formatSigned(value, decimals = 1) {
  if (!isNumber(value)) return EMPTY;
  const r = round(value, decimals);
  if (r === 0) return (0).toFixed(decimals);
  return `${r > 0 ? '+' : MINUS}${Math.abs(r).toFixed(decimals)}`;
}

/**
 * @param {number|null|undefined} ml
 * @returns {string} "2.45 L"
 */
function formatLiters(ml) {
  if (!isNumber(ml)) return EMPTY;
  return `${(round(ml) / 1000).toFixed(2)} L`;
}

/**
 * Texto de un factor sin ceros sobrantes: 2.2 → "2.2", 2 → "2.0".
 * @param {number} value
 * @returns {string}
 */
function formatFactor(value) {
  if (!isNumber(value)) return EMPTY;
  return Number.isInteger(value) ? value.toFixed(1) : String(round(value, 2));
}

/**
 * Número sin ceros decimales sobrantes: 70 → "70", 70.50 → "70.5", 1.755 → "1.755".
 * Se usa para mostrar los datos tal como se ingresaron dentro de una operación.
 * @param {number|null|undefined} value
 * @param {number} [maxDecimals]
 * @returns {string}
 */
function formatTrim(value, maxDecimals = 2) {
  if (!isNumber(value)) return EMPTY;
  const fixed = round(value, maxDecimals).toFixed(maxDecimals);
  return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
}

/**
 * Número negativo con el signo menos tipográfico (para operaciones escritas).
 * @param {string} text
 * @returns {string}
 */
function typographicMinus(text) {
  return text.startsWith('-') ? `${MINUS}${text.slice(1)}` : text;
}

module.exports = {
  MINUS,
  EMPTY,
  isNumber,
  formatNumber,
  formatWithUnit,
  formatSigned,
  formatLiters,
  formatFactor,
  formatTrim,
  typographicMinus,
};
