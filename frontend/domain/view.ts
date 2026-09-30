/**
 * Lógica de presentación del dominio. Las pantallas no calculan nada: piden
 * aquí los datos ya preparados, y esto a su vez delega en el motor
 * compartido (/shared), el mismo que usa el backend y el PDF.
 */
import {
  ACTIVITY_KEYS,
  ACTIVITY_LEVELS,
  COMPARISON_METRICS,
  GOAL_KEYS,
  GOALS,
  LEVEL_KEYS,
  LEVEL_LABELS,
  MEASUREMENT_FIELDS,
  MEASUREMENT_KEYS,
  METRICS,
  SEX_KEYS,
  SEX_LABELS,
  SOMATOTYPE_KEYS,
  SOMATOTYPE_LABELS,
  type MetricKey,
} from '../../shared/config';
import { computeResults, describeEnergyAdjustment } from '../../shared/evaluation';
import { buildMethodology } from '../../shared/methodology';
import {
  buildComparison,
  buildSeries,
  compareValues,
  currentAndPrevious,
  summarizeTrend,
  type MetricComparison,
} from '../../shared/progress';
import { validateMeasurements } from '../../shared/validation';
import { ageOn, daysBetween, formatDisplayDate, toIsoDate, todayIsoLocal } from '../../shared/dates';
import { formatNumber, formatSigned } from '../../shared/format';
import { fromCanonical, unitLabel } from '../../shared/units';
import { UNIT_SYSTEM } from '../config/app';
import type {
  ActivityKey,
  Athlete,
  AthleteInput,
  Evaluation,
  GoalKey,
  LevelKey,
  MacroSplit,
  MeasurementKey,
  ResultEntry,
  ResultKey,
  Sex,
  SomatotypeKey,
} from './types';

/* ------------------------------------------------------------------ */
/* Opciones de los selectores                                          */
/* ------------------------------------------------------------------ */

export const sexOptions = SEX_KEYS.map((key: Sex) => ({ value: key, label: SEX_LABELS[key] }));

export const goalOptions = GOAL_KEYS.map((key: GoalKey) => ({
  value: key,
  label: GOALS[key].short,
  description: `${GOALS[key].label}: ${GOALS[key].proteinGPerKg.toFixed(1)} g/kg de proteína, energía ${describeEnergyAdjustment(
    GOALS[key].energyAdjustment,
  )}.`,
}));

export const activityOptions = ACTIVITY_KEYS.map((key: ActivityKey) => ({
  value: key,
  label: ACTIVITY_LEVELS[key].label,
  description: `${ACTIVITY_LEVELS[key].description} (factor ${ACTIVITY_LEVELS[key].pal.toFixed(2)})`,
}));

export const levelOptions = LEVEL_KEYS.map((key: LevelKey) => ({ value: key, label: LEVEL_LABELS[key] }));

export const somatotypeOptions = SOMATOTYPE_KEYS.map((key: SomatotypeKey) => ({
  value: key,
  label: SOMATOTYPE_LABELS[key],
}));

export const goalLabel = (key?: GoalKey | null) => (key && GOALS[key] ? GOALS[key].label : '—');
export const goalShort = (key?: GoalKey | null) => (key && GOALS[key] ? GOALS[key].short : '—');
export const activityLabel = (key?: ActivityKey | null) =>
  key && ACTIVITY_LEVELS[key] ? ACTIVITY_LEVELS[key].label : '—';
export const levelLabel = (key?: LevelKey | null) => (key && LEVEL_LABELS[key] ? LEVEL_LABELS[key] : '');
export const sexLabel = (key?: Sex | null) => (key && SEX_LABELS[key] ? SEX_LABELS[key] : '');

/* ------------------------------------------------------------------ */
/* Atleta                                                              */
/* ------------------------------------------------------------------ */

export function athleteAge(athlete: Pick<Athlete, 'birthDate'>, onDate: string = todayIsoLocal()): number | null {
  return ageOn(toIsoDate(athlete.birthDate), onDate);
}

/** "Hombre · 30 años · Fútbol · Competitivo" */
export function athleteSummary(athlete: Athlete): string {
  const age = athleteAge(athlete);
  return [sexLabel(athlete.sex), age !== null ? `${age} años` : '', athlete.sport, levelLabel(athlete.level)]
    .filter(Boolean)
    .join(' · ');
}

export function emptyAthleteInput(): AthleteInput {
  return {
    name: '',
    sex: '',
    birthDate: '',
    sport: '',
    level: 'recreational',
    goal: '',
    activityLevel: '',
    somatotype: null,
    specialConditions: false,
  };
}

/** Formulario del perfil con la fecha de nacimiento en DD/MM/AAAA. */
export function athleteToForm(athlete: Athlete): AthleteInput {
  return {
    name: athlete.name,
    sex: athlete.sex,
    birthDate: formatDisplayDate(athlete.birthDate),
    sport: athlete.sport || '',
    level: athlete.level || 'recreational',
    goal: athlete.goal,
    activityLevel: athlete.activityLevel,
    somatotype: athlete.somatotype ?? null,
    specialConditions: !!athlete.specialConditions,
  };
}

/* ------------------------------------------------------------------ */
/* Mediciones (formulario)                                             */
/* ------------------------------------------------------------------ */

export type MeasurementForm = Record<MeasurementKey, string>;

export const measurementGroups: { key: 'required' | 'composition' | 'tracking'; title: string; description: string }[] = [
  {
    key: 'required',
    title: 'Obligatorias',
    description: 'Necesarias para registrar la evaluación: IMC, TMB, proteína, agua y macronutrientes.',
  },
  {
    key: 'composition',
    title: 'Composición corporal',
    description:
      'Cintura: índice cintura/altura. Cintura + cadera: ICC. Cintura + cuello (y cadera en mujeres): % de grasa estimado.',
  },
  {
    key: 'tracking',
    title: 'Seguimiento (opcionales)',
    description: 'Perímetros para comparar la evolución. No intervienen en los cálculos.',
  },
];

export function fieldsOfGroup(group: 'required' | 'composition' | 'tracking'): MeasurementKey[] {
  return MEASUREMENT_KEYS.filter((key: MeasurementKey) => MEASUREMENT_FIELDS[key].group === group);
}

export function fieldUnit(key: MeasurementKey): string {
  return unitLabel(MEASUREMENT_FIELDS[key].dimension, UNIT_SYSTEM);
}

export function fieldLabel(key: MeasurementKey): string {
  return MEASUREMENT_FIELDS[key].label;
}

export function fieldHint(key: MeasurementKey): string {
  return MEASUREMENT_FIELDS[key].hint;
}

export function emptyMeasurementForm(): MeasurementForm {
  return Object.fromEntries(MEASUREMENT_KEYS.map((key: MeasurementKey) => [key, ''])) as MeasurementForm;
}

/** Valor de una medición guardada, en las unidades de la interfaz. */
export function displayMeasurement(key: MeasurementKey, value: number | undefined | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  const converted = fromCanonical(value, MEASUREMENT_FIELDS[key].dimension, UNIT_SYSTEM);
  return String(Math.round(converted * 10) / 10);
}

/**
 * Formulario precargado para una nueva evaluación: la altura se copia de la
 * evaluación anterior (rara vez cambia en adultos); el resto queda vacío y
 * el valor anterior se muestra como referencia.
 */
export function initialMeasurementForm(previous: Evaluation | null): MeasurementForm {
  const form = emptyMeasurementForm();
  if (previous && previous.measurements) {
    form.heightCm = displayMeasurement('heightCm', previous.measurements.heightCm);
  }
  return form;
}

/** Vista previa de resultados mientras se escriben las mediciones. */
export function previewResults(
  athlete: Athlete,
  dateIso: string | null,
  goal: GoalKey,
  activityLevel: ActivityKey,
  form: MeasurementForm,
): Record<string, ResultEntry> {
  const { value } = validateMeasurements(form, { unitSystem: UNIT_SYSTEM });
  const age = athleteAge(athlete, dateIso || todayIsoLocal());
  return computeResults({
    profile: { sex: athlete.sex, ageYears: age === null ? undefined : age, goal, activityLevel },
    measurements: value,
  });
}

/* ------------------------------------------------------------------ */
/* Resultados                                                          */
/* ------------------------------------------------------------------ */

export function result(evaluation: Evaluation | null | undefined, key: ResultKey): ResultEntry | null {
  const entry = evaluation && evaluation.results ? evaluation.results[key] : undefined;
  return entry || null;
}

export function resultValue(evaluation: Evaluation | null | undefined, key: ResultKey): number | null {
  const entry = result(evaluation, key);
  return entry && entry.status === 'ok' && typeof entry.value === 'number' ? entry.value : null;
}

/** "Falta: Cintura, Cuello" o el motivo por el que no aplica. */
export function missingText(entry: ResultEntry | null | undefined): string {
  if (!entry) return 'Sin dato';
  if (entry.status === 'missing' && entry.missing.length) return `Falta: ${entry.missing.join(', ')}`;
  if (entry.reason) return entry.reason;
  return 'No calculado';
}

export function macroSplitOf(evaluation: Evaluation | null | undefined): MacroSplit | null {
  const entry = result(evaluation, 'macros');
  if (!entry || entry.status !== 'ok') return null;
  const split = entry.inputs && (entry.inputs.split as MacroSplit | undefined);
  return split && split.protein && split.carbs && split.fat ? split : null;
}

/* ------------------------------------------------------------------ */
/* Historial, comparación y progreso                                   */
/* ------------------------------------------------------------------ */

export interface DashboardData {
  current: Evaluation | null;
  previous: Evaluation | null;
  /** Evaluaciones en orden cronológico. */
  sorted: Evaluation[];
  /** Filas con dato en la evaluación actual o en la anterior. */
  comparison: MetricComparison[];
  byMetric: Partial<Record<MetricKey, MetricComparison>>;
}

/** Métricas comparadas entre evaluaciones: composición + perímetros de seguimiento. */
const FULL_COMPARISON_METRICS: MetricKey[] = [
  ...(COMPARISON_METRICS as MetricKey[]),
  'neckCm',
  'chestCm',
  'armCm',
  'thighCm',
];

export function dashboardFor(evaluations: Evaluation[], evaluationId?: string): DashboardData {
  const { current, previous, sorted } = currentAndPrevious(evaluations, evaluationId);
  const comparison = current
    ? buildComparison(current, previous, FULL_COMPARISON_METRICS).filter(
        (row: MetricComparison) => row.current !== null || row.previous !== null,
      )
    : [];
  const byMetric: Partial<Record<MetricKey, MetricComparison>> = {};
  comparison.forEach((row: MetricComparison) => {
    byMetric[row.metric] = row;
  });
  return { current, previous, sorted, comparison, byMetric };
}

export const chartMetricOptions: { value: MetricKey; label: string }[] = (
  ['weightKg', 'waistCm', 'bodyFatPct', 'whtr', 'leanMassKg', 'hipCm'] as MetricKey[]
).map((key) => ({ value: key, label: METRICS[key].shortLabel }));

export function seriesFor(evaluations: Evaluation[], metric: MetricKey) {
  return buildSeries(evaluations, metric);
}

export function trendFor(evaluations: Evaluation[], metric: MetricKey, goal?: GoalKey) {
  return summarizeTrend(buildSeries(evaluations, metric), metric, goal);
}

/** Periodo en texto: "12 días", "6 semanas", "1.5 semanas". */
export function periodText(days: number): string {
  if (days < 14) return days === 1 ? '1 día' : `${days} días`;
  const weeks = days / 7;
  return `${formatNumber(weeks, Number.isInteger(weeks) || weeks >= 10 ? 0 : 1)} semanas`;
}

/**
 * Respuesta en lenguaje llano a "¿cómo ha evolucionado?" para una serie:
 * "Cintura: bajó 4.0 cm (−4.7 %) en 6 semanas · 4 evaluaciones".
 */
export function trendSentence(metric: MetricKey, trend: ReturnType<typeof summarizeTrend>): string {
  if (!trend || trend.delta === null) return '';
  const cfg = METRICS[metric];
  const period = `en ${periodText(trend.days)} · ${trend.points} evaluaciones`;
  if (trend.direction === 'flat' || trend.direction === null) {
    return `${cfg.label}: se mantuvo estable ${period}`;
  }
  const verb = trend.direction === 'up' ? 'subió' : 'bajó';
  const unit = cfg.changeMode === 'points' ? ' puntos porcentuales' : cfg.unit ? ` ${cfg.unit}` : '';
  const pct = trend.deltaPct !== null ? ` (${formatSigned(trend.deltaPct, 1)} %)` : '';
  return `${cfg.label}: ${verb} ${formatNumber(Math.abs(trend.delta), trend.decimals)}${unit}${pct} ${period}`;
}

export function metricConfig(metric: MetricKey) {
  return METRICS[metric];
}

/** Filas de la tabla de evolución: valor y cambio respecto al punto anterior. */
export function seriesRows(series: { date: string; value: number; id?: string }[], metric: MetricKey, goal?: GoalKey) {
  return series.map((point, i) => ({
    ...point,
    change: i > 0 ? compareValues(metric, point.value, series[i - 1].value, goal) : null,
  }));
}

/** Filtra una serie a las últimas N semanas (null = todo el historial). */
export function lastWeeks<T extends { date: string }>(series: T[], weeks: number | null, today: string = todayIsoLocal()): T[] {
  if (!weeks) return series;
  return series.filter((p) => {
    const days = daysBetween(p.date, today);
    return days !== null && days <= weeks * 7;
  });
}

/* ------------------------------------------------------------------ */
/* Presentación de cada resultado                                      */
/* ------------------------------------------------------------------ */

export const RESULT_DISPLAY: Record<ResultKey, { label: string; decimals: number; unit: string }> = {
  bmi: { label: 'IMC', decimals: 1, unit: 'kg/m²' },
  whtr: { label: 'Índice cintura/altura', decimals: 2, unit: '' },
  whr: { label: 'Índice cintura/cadera (ICC)', decimals: 2, unit: '' },
  bodyFat: { label: '% de grasa corporal estimado', decimals: 1, unit: '%' },
  fatMass: { label: 'Masa grasa estimada', decimals: 1, unit: 'kg' },
  leanMass: { label: 'Masa libre de grasa estimada', decimals: 1, unit: 'kg' },
  bmr: { label: 'TMB (tasa metabólica basal)', decimals: 0, unit: 'kcal/día' },
  tdee: { label: 'Gasto energético total estimado', decimals: 0, unit: 'kcal/día' },
  energyTarget: { label: 'Energía estimada según objetivo', decimals: 0, unit: 'kcal/día' },
  protein: { label: 'Proteína diaria estimada', decimals: 0, unit: 'g/día' },
  water: { label: 'Agua diaria estimada (base)', decimals: 0, unit: 'ml/día' },
  macros: { label: 'Macronutrientes estimados', decimals: 0, unit: 'kcal/día' },
};

/* ------------------------------------------------------------------ */
/* Metodología                                                         */
/* ------------------------------------------------------------------ */

export type { MethodItem, MethodSection, MethodValue } from '../../shared/methodology';

/** Fórmulas, factores vigentes, fuentes y limitaciones (pantalla de Metodología). */
export function methodology() {
  return buildMethodology();
}
