// @ts-check
'use strict';

/**
 * Geometría del gráfico de evolución. La calcula una sola función que usan la
 * app (react-native-svg) y el PDF (SVG en texto), así ambos gráficos son
 * idénticos. El eje X es proporcional al tiempo real entre evaluaciones.
 */

const { isoToUtcDate, formatShortDate } = require('./dates');
const { round } = require('./formulas');

/**
 * @typedef {Object} ChartPoint
 * @property {number} x
 * @property {number} y
 * @property {number} value
 * @property {string} date
 * @property {string} [id]
 */

/**
 * @typedef {Object} LineChart
 * @property {number} width
 * @property {number} height
 * @property {{ left: number, top: number, right: number, bottom: number }} plot
 * @property {{ y: number, value: number, label: string }[]} yTicks
 * @property {{ x: number, label: string }[]} xLabels
 * @property {ChartPoint[]} points
 * @property {string} path
 * @property {string} areaPath
 * @property {boolean} empty
 */

/**
 * Paso "bonito" (1, 2, 2.5, 5 × 10^n) para ~n divisiones.
 * @param {number} range
 * @param {number} targetTicks
 */
function niceStep(range, targetTicks) {
  const raw = range / Math.max(1, targetTicks);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const residual = raw / magnitude;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10;
  return nice * magnitude;
}

/**
 * Decimales necesarios para mostrar un paso (0.25 → 2, 0.5 → 1, 2 → 0).
 * @param {number} step
 */
function stepDecimals(step) {
  for (let d = 0; d <= 4; d += 1) {
    if (Math.abs(round(step, d) - step) < 1e-9) return d;
  }
  return 4;
}

/**
 * @param {{
 *   series: { date: string, value: number, id?: string }[],
 *   width: number,
 *   height: number,
 *   padding?: { left?: number, right?: number, top?: number, bottom?: number },
 *   targetTicks?: number,
 *   maxXLabels?: number,
 *   withYear?: boolean,
 * }} options
 * @returns {LineChart}
 */
function buildLineChart(options) {
  const { series, width, height } = options;
  const pad = { left: 44, right: 16, top: 16, bottom: 28, ...(options.padding || {}) };
  const plot = {
    left: pad.left,
    top: pad.top,
    right: Math.max(pad.left + 1, width - pad.right),
    bottom: Math.max(pad.top + 1, height - pad.bottom),
  };
  const empty = !series || series.length === 0 || !(width > 0) || !(height > 0);
  if (empty) {
    return { width, height, plot, yTicks: [], xLabels: [], points: [], path: '', areaPath: '', empty: true };
  }

  const values = series.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    // Serie plana o un solo punto: abre un margen alrededor del valor.
    const spread = Math.abs(min) > 0 ? Math.abs(min) * 0.05 : 1;
    min -= spread;
    max += spread;
  }
  const step = niceStep(max - min, options.targetTicks || 4);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const decimals = stepDecimals(step);

  const plotW = plot.right - plot.left;
  const plotH = plot.bottom - plot.top;
  /** @param {number} v */
  const yOf = (v) => plot.bottom - ((v - lo) / (hi - lo)) * plotH;

  /** @type {{ y: number, value: number, label: string }[]} */
  const yTicks = [];
  for (let v = lo; v <= hi + step / 2; v += step) {
    const value = round(v, decimals);
    yTicks.push({ y: round(yOf(value), 2), value, label: value.toFixed(decimals) });
  }

  const times = series.map((p) => isoToUtcDate(p.date).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  /** @param {number} t */
  const xOf = (t) => (t1 === t0 ? plot.left + plotW / 2 : plot.left + ((t - t0) / (t1 - t0)) * plotW);

  /** @type {ChartPoint[]} */
  const points = series.map((p, i) => ({
    x: round(xOf(times[i]), 2),
    y: round(yOf(p.value), 2),
    value: p.value,
    date: p.date,
    id: p.id,
  }));

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const areaPath =
    points.length > 1
      ? `${path} L${points[points.length - 1].x} ${plot.bottom} L${points[0].x} ${plot.bottom} Z`
      : '';

  // Etiquetas del eje X: primera y última siempre; intermedias espaciadas.
  const maxLabels = Math.max(2, options.maxXLabels || 4);
  /** @type {number[]} */
  let idx = [];
  if (points.length <= maxLabels) idx = points.map((_, i) => i);
  else {
    for (let k = 0; k < maxLabels; k += 1) idx.push(Math.round((k * (points.length - 1)) / (maxLabels - 1)));
  }
  const minGap = 44;
  /** @type {{ x: number, label: string }[]} */
  const xLabels = [];
  for (const i of [...new Set(idx)]) {
    const p = points[i];
    const last = xLabels[xLabels.length - 1];
    if (last && p.x - last.x < minGap) {
      // Si choca con la anterior, la última etiqueta tiene prioridad.
      if (i === points.length - 1) xLabels[xLabels.length - 1] = { x: p.x, label: formatShortDate(p.date, options.withYear) };
      continue;
    }
    xLabels.push({ x: p.x, label: formatShortDate(p.date, options.withYear) });
  }

  return { width, height, plot, yTicks, xLabels, points, path, areaPath, empty: false };
}

module.exports = { buildLineChart, niceStep };
