// @ts-check
'use strict';

/**
 * Utilidades de color para la marca configurable: garantizan texto legible
 * sobre el color elegido por el entrenador (contraste WCAG).
 */

const DARK_TEXT = '#0F172A';
const LIGHT_TEXT = '#FFFFFF';

/**
 * @param {string} hex '#RRGGBB'
 * @returns {[number, number, number]}
 */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * @param {[number, number, number]} rgb
 * @returns {string}
 */
function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** @param {string} hex */
function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number} Relación de contraste (1–21).
 */
function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Texto (blanco u oscuro) con mejor contraste sobre un fondo.
 * @param {string} background
 */
function readableTextOn(background) {
  return contrastRatio(background, LIGHT_TEXT) >= contrastRatio(background, DARK_TEXT) ? LIGHT_TEXT : DARK_TEXT;
}

/**
 * Color de marca usable como texto sobre blanco: si es demasiado claro
 * (contraste < 3:1) se oscurece hasta ser legible.
 * @param {string} hex
 */
function accentOnWhite(hex) {
  let rgb = hexToRgb(hex);
  for (let i = 0; i < 20 && contrastRatio(rgbToHex(rgb), LIGHT_TEXT) < 3; i += 1) {
    rgb = /** @type {[number, number, number]} */ (rgb.map((c) => c * 0.85));
  }
  return rgbToHex(rgb);
}

/**
 * Mezcla el color con blanco (amount 0 = color original, 1 = blanco).
 * @param {string} hex
 * @param {number} amount
 */
function tint(hex, amount) {
  const rgb = hexToRgb(hex);
  return rgbToHex(/** @type {[number, number, number]} */ (rgb.map((c) => c + (255 - c) * amount)));
}

module.exports = {
  DARK_TEXT,
  LIGHT_TEXT,
  hexToRgb,
  rgbToHex,
  relativeLuminance,
  contrastRatio,
  readableTextOn,
  accentOnWhite,
  tint,
};
