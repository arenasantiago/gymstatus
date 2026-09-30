// @ts-check
'use strict';

/**
 * Historial y progreso: ordena evaluaciones, extrae series por métrica y
 * compara una evaluación con la anterior (cambio absoluto y, cuando tiene
 * sentido, porcentual).
 *
 * Las comparaciones se hacen sobre los valores REDONDEADOS que se muestran,
 * para que "86.0 → 82.0" siempre diga "−4.0" y nunca "−3.96".
 */

const { METRICS, GOALS, COMPARISON_METRICS } = require('./config');
const { round } = require('./formulas');
const { toIsoDate, daysBetween } = require('./dates');

/**
 * @typedef {Object} EvaluationLike
 * @property {string} [_id]
 * @property {string|Date} date
 * @property {string|Date} [createdAt]
 * @property {Record<string, number|undefined>} [measurements]
 * @property {Record<string, { status: string, value: number|null }>} [results]
 * @property {{ goal?: import('./config').GoalKey }} [profileSnapshot]
 */

/**
 * @typedef {'favorable'|'unfavorable'|'neutral'} ChangeTone
 */

/**
 * @typedef {Object} MetricComparison
 * @property {import('./config').MetricKey} metric
 * @property {string} label
 * @property {string} unit
 * @property {number} decimals
 * @property {number|null} current
 * @property {number|null} previous
 * @property {number|null} delta          Cambio absoluto (actual − anterior).
 * @property {number|null} deltaPct       Cambio porcentual (null si no aplica).
 * @property {'points'|'relative'|'absolute'} changeMode
 * @property {'up'|'down'|'flat'|null} direction
 * @property {ChangeTone} tone
 */

/**
 * Valor de una métrica en una evaluación (medición o resultado calculado).
 * @param {EvaluationLike|null|undefined} evaluation
 * @param {import('./config').MetricKey} metricKey
 * @returns {number|null}
 */
function metricValue(evaluation, metricKey) {
  if (!evaluation) return null;
  const metric = METRICS[metricKey];
  if (!metric) return null;
  if (metric.source === 'measurements') {
    const v = evaluation.measurements ? evaluation.measurements[metricKey] : undefined;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }
  const res = evaluation.results && metric.resultKey ? evaluation.results[metric.resultKey] : undefined;
  if (!res || res.status !== 'ok' || typeof res.value !== 'number') return null;
  return res.value;
}

/**
 * Orden cronológico: fecha de evaluación y, si coincide, fecha de creación.
 * @template {EvaluationLike} T
 * @param {T[]} evaluations
 * @returns {T[]}
 */
function sortEvaluations(evaluations) {
  return [...(evaluations || [])].sort((a, b) => {
    const da = toIsoDate(a.date) || '';
    const db = toIsoDate(b.date) || '';
    if (da !== db) return da < db ? -1 : 1;
    const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ca - cb;
  });
}

/**
 * Evaluación inmediatamente anterior a la indicada (en orden cronológico).
 * @template {EvaluationLike} T
 * @param {T[]} evaluations
 * @param {string} [evaluationId] Si se omite, se usa la más reciente.
 * @returns {{ current: T|null, previous: T|null, index: number, sorted: T[] }}
 */
function currentAndPrevious(evaluations, evaluationId) {
  const sorted = sortEvaluations(evaluations);
  let index = sorted.length - 1;
  if (evaluationId) index = sorted.findIndex((e) => String(e._id) === String(evaluationId));
  if (index < 0) return { current: null, previous: null, index: -1, sorted };
  return { current: sorted[index], previous: index > 0 ? sorted[index - 1] : null, index, sorted };
}

/**
 * Dirección de cambio alineada con el objetivo (solo para colorear).
 * @param {import('./config').MetricKey} metricKey
 * @param {import('./config').GoalKey|undefined} goalKey
 * @returns {import('./config').Preference}
 */
function preferenceFor(metricKey, goalKey) {
  const goal = goalKey ? GOALS[goalKey] : undefined;
  if (!goal) return null;
  return goal.preferences[metricKey] || null;
}

/**
 * Compara dos valores de una métrica.
 * @param {import('./config').MetricKey} metricKey
 * @param {number|null} current
 * @param {number|null} previous
 * @param {import('./config').GoalKey} [goalKey]
 * @returns {MetricComparison}
 */
function compareValues(metricKey, current, previous, goalKey) {
  const metric = METRICS[metricKey];
  const d = metric.decimals;
  const cur = typeof current === 'number' ? round(current, d) : null;
  const prev = typeof previous === 'number' ? round(previous, d) : null;

  /** @type {MetricComparison} */
  const result = {
    metric: metricKey,
    label: metric.label,
    unit: metric.unit,
    decimals: d,
    current: cur,
    previous: prev,
    delta: null,
    deltaPct: null,
    changeMode: metric.changeMode,
    direction: null,
    tone: 'neutral',
  };
  if (cur === null || prev === null) return result;

  const delta = round(cur - prev, d);
  result.delta = delta;
  // El % solo tiene sentido para magnitudes (kg, cm). Para el % de grasa se
  // informan puntos porcentuales y para los índices, la diferencia absoluta.
  if (metric.changeMode === 'relative' && prev !== 0) {
    result.deltaPct = round((delta / prev) * 100, 1);
  }
  result.direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  const pref = preferenceFor(metricKey, goalKey);
  if (delta !== 0 && pref) {
    const favorable = (pref === 'down' && delta < 0) || (pref === 'up' && delta > 0);
    result.tone = favorable ? 'favorable' : 'unfavorable';
  }
  return result;
}

/**
 * Filas de comparación entre una evaluación y la anterior.
 * @param {EvaluationLike|null} current
 * @param {EvaluationLike|null} previous
 * @param {import('./config').MetricKey[]} [metrics]
 * @returns {MetricComparison[]}
 */
function buildComparison(current, previous, metrics = COMPARISON_METRICS) {
  if (!current) return [];
  const goal = current.profileSnapshot ? current.profileSnapshot.goal : undefined;
  return metrics
    .map((key) => compareValues(key, metricValue(current, key), metricValue(previous, key), goal))
    .filter((row) => row.current !== null || row.previous !== null);
}

/**
 * Serie temporal de una métrica (solo evaluaciones con valor).
 * @param {EvaluationLike[]} evaluations
 * @param {import('./config').MetricKey} metricKey
 * @returns {{ date: string, value: number, id?: string }[]}
 */
function buildSeries(evaluations, metricKey) {
  /** @type {{ date: string, value: number, id?: string }[]} */
  const points = [];
  for (const e of sortEvaluations(evaluations)) {
    const value = metricValue(e, metricKey);
    const date = toIsoDate(e.date);
    if (value !== null && date) points.push({ date, value, id: e._id ? String(e._id) : undefined });
  }
  return points;
}

/**
 * Resumen de la tendencia entre el primer y el último punto de una serie.
 * @param {{ date: string, value: number }[]} series
 * @param {import('./config').MetricKey} metricKey
 * @param {import('./config').GoalKey} [goalKey]
 */
function summarizeTrend(series, metricKey, goalKey) {
  if (!series || series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const comparison = compareValues(metricKey, last.value, first.value, goalKey);
  const days = daysBetween(first.date, last.date) || 0;
  return { ...comparison, fromDate: first.date, toDate: last.date, days, weeks: round(days / 7, 1), points: series.length };
}

module.exports = {
  metricValue,
  sortEvaluations,
  currentAndPrevious,
  preferenceFor,
  compareValues,
  buildComparison,
  buildSeries,
  summarizeTrend,
};
