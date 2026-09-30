// @ts-check
'use strict';

/**
 * Fechas de calendario sin zona horaria.
 *
 * Una evaluación ocurre en un DÍA, no en un instante. Se representan como
 * 'YYYY-MM-DD' y, cuando se guardan como Date, a medianoche UTC. Formatear con
 * la hora local mostraría el día anterior en América (UTC−5), por eso aquí
 * solo se usan componentes UTC.
 */

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** @param {number} n */
function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * @param {string} iso
 * @returns {boolean}
 */
function isValidIsoDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/**
 * Normaliza Date | 'YYYY-MM-DD' | ISO completo a 'YYYY-MM-DD'.
 * @param {unknown} value
 * @returns {string|null}
 */
function toIsoDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
    return m && isValidIsoDate(m[1]) ? m[1] : null;
  }
  return null;
}

/**
 * @param {string} iso 'YYYY-MM-DD'
 * @returns {Date}
 */
function isoToUtcDate(iso) {
  return new Date(`${iso}T00:00:00.000Z`);
}

/**
 * Fecha de hoy según el reloj LOCAL del dispositivo.
 * @param {Date} [now]
 * @returns {string}
 */
function todayIsoLocal(now = new Date()) {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/**
 * 'DD/MM/AAAA' → 'YYYY-MM-DD' (null si no es una fecha real).
 * @param {string} text
 * @returns {string|null}
 */
function parseDisplayDate(text) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(text || '').trim());
  if (!m) return null;
  const iso = `${m[3]}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`;
  return isValidIsoDate(iso) ? iso : null;
}

/**
 * Inserta las barras mientras se escribe: "1507" → "15/07", "15071998" → "15/07/1998".
 * @param {string} text
 * @returns {string}
 */
function maskDateInput(text) {
  const digits = String(text || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * @param {unknown} value
 * @returns {string} 'DD/MM/AAAA' o ''.
 */
function formatDisplayDate(value) {
  const iso = toIsoDate(value);
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * @param {unknown} value
 * @param {boolean} [withYear]
 * @returns {string} '4 sep' o '4 sep 2026'.
 */
function formatShortDate(value, withYear = false) {
  const iso = toIsoDate(value);
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const base = `${d} ${MONTHS_SHORT[m - 1]}`;
  return withYear ? `${base} ${y}` : base;
}

/**
 * @param {unknown} value
 * @returns {string} '4 de septiembre de 2026'.
 */
function formatLongDate(value) {
  const iso = toIsoDate(value);
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MONTHS_LONG[m - 1]} de ${y}`;
}

/**
 * Edad cumplida (años) en una fecha dada.
 * @param {unknown} birth
 * @param {unknown} on
 * @returns {number|null}
 */
function ageOn(birth, on) {
  const b = toIsoDate(birth);
  const o = toIsoDate(on);
  if (!b || !o) return null;
  const [by, bm, bd] = b.split('-').map(Number);
  const [oy, om, od] = o.split('-').map(Number);
  let age = oy - by;
  if (om < bm || (om === bm && od < bd)) age -= 1;
  return age;
}

/**
 * Días entre dos fechas (b − a).
 * @param {unknown} a
 * @param {unknown} b
 * @returns {number|null}
 */
function daysBetween(a, b) {
  const ia = toIsoDate(a);
  const ib = toIsoDate(b);
  if (!ia || !ib) return null;
  return Math.round((isoToUtcDate(ib).getTime() - isoToUtcDate(ia).getTime()) / 86400000);
}

module.exports = {
  MONTHS_SHORT,
  MONTHS_LONG,
  isValidIsoDate,
  toIsoDate,
  isoToUtcDate,
  todayIsoLocal,
  parseDisplayDate,
  maskDateInput,
  formatDisplayDate,
  formatShortDate,
  formatLongDate,
  ageOn,
  daysBetween,
};
