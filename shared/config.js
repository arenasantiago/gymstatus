// @ts-check
'use strict';

/**
 * Configuración central del motor de cálculo de Athlete Performance.
 *
 * Aquí viven TODOS los factores, rangos de referencia y límites de validación
 * para poder ajustarlos sin tocar las fórmulas ni las pantallas. La fuente de
 * cada valor está junto al valor y se muestra en la pantalla de Metodología
 * (shared/methodology.js).
 *
 * Si cambias un factor, incrementa CALC_VERSION: cada evaluación guarda la
 * versión y los parámetros con los que se calculó, de modo que el historial
 * sigue siendo explicable aunque la configuración cambie después.
 */

/** @typedef {'male'|'female'} Sex */
/** @typedef {'muscle_gain'|'fat_loss'|'maintenance'|'performance'} GoalKey */
/** @typedef {'light'|'moderate'|'vigorous'} ActivityKey */
/** @typedef {'recreational'|'competitive'|'elite'} LevelKey */
/** @typedef {'ecto'|'meso'|'endo'|'mixed'} SomatotypeKey */
/** @typedef {'weightKg'|'heightCm'|'waistCm'|'hipCm'|'neckCm'|'chestCm'|'armCm'|'thighCm'} MeasurementKey */
/** @typedef {'mass'|'length'} Dimension */
/** @typedef {'ok'|'attention'|'high'|'neutral'} Tone */
/** @typedef {'up'|'down'|null} Preference */
/** @typedef {'weightKg'|'waistCm'|'hipCm'|'neckCm'|'chestCm'|'armCm'|'thighCm'|'bodyFatPct'|'fatMassKg'|'leanMassKg'|'whtr'|'whr'|'bmi'} MetricKey */

/**
 * Ajuste de energía sobre el gasto energético total (GET), en la unidad en que
 * lo expresa su fuente: el superávit de volumen se publica en % del GET y el
 * déficit de definición en kcal/día.
 * @typedef {Object} EnergyAdjustment
 * @property {'percent'|'kcal'} type
 * @property {number} value   % sobre el GET (type 'percent') o kcal/día (type 'kcal'). 0 = equilibrio.
 * @property {string} source  Referencia del valor (se muestra en la metodología).
 */

/**
 * @typedef {Object} GoalConfig
 * @property {string} label
 * @property {string} short
 * @property {number} proteinGPerKg        Proteína en g por kg de peso corporal.
 * @property {string} proteinSource        Referencia (o elección dentro de un rango) del factor.
 * @property {EnergyAdjustment} energyAdjustment
 * @property {number} fatPctOfEnergy       % de la energía objetivo que aportan las grasas.
 * @property {Partial<Record<MetricKey, 'up'|'down'>>} preferences
 *   Dirección de cambio alineada con el objetivo. Solo colorea el comparativo
 *   (verde = hacia el objetivo, rojo = en contra); las métricas sin dirección
 *   definida se muestran en gris. No es un juicio de salud.
 */

/**
 * @typedef {Object} ActivityConfig
 * @property {string} label
 * @property {string} description
 * @property {number} pal                  Nivel de actividad física (múltiplo de la TMB).
 * @property {[number, number]} palRange   Rango FAO/OMS/UNU de la categoría.
 */

/**
 * @typedef {Object} MeasurementField
 * @property {string} label
 * @property {Dimension} dimension
 * @property {number} min                  Límite de plausibilidad (detecta errores de digitación).
 * @property {number} max
 * @property {number} decimals
 * @property {'required'|'composition'|'tracking'} group
 * @property {string} hint
 */

/**
 * @typedef {Object} MetricConfig
 * @property {string} label
 * @property {string} shortLabel
 * @property {string} unit
 * @property {number} decimals
 * @property {'relative'|'points'|'absolute'} changeMode  relative: % de cambio; points: puntos porcentuales; absolute: solo diferencia.
 * @property {'measurements'|'results'} source
 * @property {string} [resultKey]
 */

const CALC_VERSION = '1.1.0';

/* ------------------------------------------------------------------ */
/* Perfil del atleta                                                   */
/* ------------------------------------------------------------------ */

/** @type {Sex[]} */
const SEX_KEYS = ['male', 'female'];
/** @type {Record<Sex, string>} */
const SEX_LABELS = { male: 'Hombre', female: 'Mujer' };

/** @type {GoalKey[]} */
const GOAL_KEYS = ['muscle_gain', 'fat_loss', 'maintenance', 'performance'];

/**
 * Factores por objetivo (valores por defecto, configurables).
 * Proteína: ACSM/AND/DC 2016 (1.2–2.0 g/kg), ISSN 2017 (1.4–2.0 g/kg),
 * Morton et al. 2018 (beneficio hasta ~1.6 g/kg, IC 95 % hasta 2.2), Iraki et
 * al. 2019 (1.6–2.2 g/kg en volumen) y Hector y Phillips 2018 (1.6–2.4 g/kg en
 * déficit).
 * Energía: cada ajuste en la unidad de su fuente (ver EnergyAdjustment).
 * Grasas: 20–35 % de la energía total (ACSM/AND/DC 2016); 25 % es una elección
 * dentro de ese rango.
 * @type {Record<GoalKey, GoalConfig>}
 */
const GOALS = {
  muscle_gain: {
    label: 'Volumen / ganancia muscular',
    short: 'Volumen',
    proteinGPerKg: 2.0,
    proteinSource: 'Dentro de 1.6–2.2 g/kg (Iraki et al. 2019) y 1.4–2.0 g/kg (ISSN 2017)',
    energyAdjustment: {
      type: 'percent',
      value: 10,
      source: 'Superávit de ~10–20 % del gasto en volumen (Iraki et al. 2019); se usa el extremo inferior',
    },
    fatPctOfEnergy: 25,
    preferences: { weightKg: 'up', leanMassKg: 'up' },
  },
  fat_loss: {
    label: 'Definición / reducción de grasa',
    short: 'Definición',
    proteinGPerKg: 2.2,
    proteinSource: 'Dentro de 1.6–2.4 g/kg en déficit (Hector y Phillips 2018)',
    energyAdjustment: {
      type: 'kcal',
      value: -500,
      source:
        'Reducción de 250–500 kcal/día sobre el gasto (ACSM/AND/DC 2016); se usa el extremo superior. Con ~500 kcal/día de déficit el entrenamiento de fuerza dejó de aumentar la masa magra aunque la fuerza siguió mejorando, y se recomienda no superar 500 kcal/día para preservarla (Murphy y Koehler 2022)',
    },
    fatPctOfEnergy: 25,
    preferences: {
      weightKg: 'down',
      waistCm: 'down',
      bodyFatPct: 'down',
      fatMassKg: 'down',
      leanMassKg: 'up',
      whtr: 'down',
    },
  },
  maintenance: {
    label: 'Mantenimiento',
    short: 'Mantenimiento',
    proteinGPerKg: 1.6,
    proteinSource: 'Meseta del beneficio en ~1.6 g/kg (Morton et al. 2018)',
    energyAdjustment: { type: 'kcal', value: 0, source: 'Equilibrio energético: energía igual al gasto estimado' },
    fatPctOfEnergy: 25,
    preferences: {},
  },
  performance: {
    label: 'Rendimiento deportivo',
    short: 'Rendimiento',
    proteinGPerKg: 1.8,
    proteinSource: 'Elección dentro de 1.2–2.0 g/kg (ACSM/AND/DC 2016) y 1.4–2.0 g/kg (ISSN 2017)',
    energyAdjustment: { type: 'kcal', value: 0, source: 'Equilibrio energético: energía igual al gasto estimado' },
    fatPctOfEnergy: 25,
    preferences: {},
  },
};

/** @type {ActivityKey[]} */
const ACTIVITY_KEYS = ['light', 'moderate', 'vigorous'];

/**
 * Niveles de actividad física (PAL) de FAO/OMS/UNU, Human energy requirements
 * (2004). Rangos: tabla 5.3. Valores por defecto: los PAL de los ejemplos
 * resueltos de la tabla 5.1 para cada estilo de vida (36.7/24 = 1.53,
 * 42.2/24 = 1.76 y 53.9/24 = 2.25).
 * @type {Record<ActivityKey, ActivityConfig>}
 */
const ACTIVITY_LEVELS = {
  light: {
    label: 'Ligera',
    description: 'Sedentario o actividad ligera: poco movimiento fuera de sesiones cortas o suaves.',
    pal: 1.53,
    palRange: [1.4, 1.69],
  },
  moderate: {
    label: 'Moderada',
    description: 'Activo: alrededor de 1 h diaria de ejercicio moderado a vigoroso.',
    pal: 1.76,
    palRange: [1.7, 1.99],
  },
  vigorous: {
    label: 'Vigorosa',
    description: 'Varias horas diarias de entrenamiento o trabajo físico intenso.',
    pal: 2.25,
    palRange: [2.0, 2.4],
  },
};

/** @type {LevelKey[]} */
const LEVEL_KEYS = ['recreational', 'competitive', 'elite'];
/** @type {Record<LevelKey, string>} */
const LEVEL_LABELS = {
  recreational: 'Recreativo',
  competitive: 'Competitivo',
  elite: 'Alto rendimiento',
};

/** Referencia descriptiva opcional: nunca se usa en ningún cálculo. */
/** @type {SomatotypeKey[]} */
const SOMATOTYPE_KEYS = ['ecto', 'meso', 'endo', 'mixed'];
/** @type {Record<SomatotypeKey, string>} */
const SOMATOTYPE_LABELS = {
  ecto: 'Predominio ectomorfo',
  meso: 'Predominio mesomorfo',
  endo: 'Predominio endomorfo',
  mixed: 'Mixto',
};

/** Edad admitida. Las fórmulas de % de grasa y TMB se desarrollaron en adultos. */
const AGE_LIMITS = { min: 14, max: 90, adultFrom: 18 };

/* ------------------------------------------------------------------ */
/* Mediciones                                                          */
/* ------------------------------------------------------------------ */

/** @type {MeasurementKey[]} */
const MEASUREMENT_KEYS = ['weightKg', 'heightCm', 'waistCm', 'hipCm', 'neckCm', 'chestCm', 'armCm', 'thighCm'];

/** Obligatorias para guardar cualquier evaluación. */
/** @type {MeasurementKey[]} */
const REQUIRED_MEASUREMENTS = ['weightKg', 'heightCm'];

/**
 * Unidad canónica: métrico (kg / cm). Los límites NO son valores de referencia
 * de salud: solo detectan errores de digitación.
 * @type {Record<MeasurementKey, MeasurementField>}
 */
const MEASUREMENT_FIELDS = {
  weightKg: {
    label: 'Peso',
    dimension: 'mass',
    min: 25,
    max: 250,
    decimals: 1,
    group: 'required',
    hint: 'En ayunas o a la misma hora en cada evaluación.',
  },
  heightCm: {
    label: 'Altura',
    dimension: 'length',
    min: 120,
    max: 230,
    decimals: 1,
    group: 'required',
    hint: 'Descalzo, de pie y erguido.',
  },
  waistCm: {
    label: 'Cintura',
    dimension: 'length',
    min: 40,
    max: 200,
    decimals: 1,
    group: 'composition',
    hint: 'Punto medio entre la última costilla y la cresta ilíaca, al final de una espiración normal. Mide siempre en el mismo punto.',
  },
  hipCm: {
    label: 'Cadera',
    dimension: 'length',
    min: 50,
    max: 200,
    decimals: 1,
    group: 'composition',
    hint: 'Perímetro máximo a la altura de los glúteos.',
  },
  neckCm: {
    label: 'Cuello',
    dimension: 'length',
    min: 20,
    max: 70,
    decimals: 1,
    group: 'composition',
    hint: 'Justo debajo de la laringe, con la cinta ligeramente inclinada hacia abajo.',
  },
  chestCm: {
    label: 'Pecho',
    dimension: 'length',
    min: 50,
    max: 200,
    decimals: 1,
    group: 'tracking',
    hint: 'A la altura de los pezones, al final de una espiración normal.',
  },
  armCm: {
    label: 'Brazo',
    dimension: 'length',
    min: 15,
    max: 70,
    decimals: 1,
    group: 'tracking',
    hint: 'Punto medio entre acromion y olécranon, brazo relajado.',
  },
  thighCm: {
    label: 'Muslo',
    dimension: 'length',
    min: 25,
    max: 120,
    decimals: 1,
    group: 'tracking',
    hint: 'Punto medio del muslo, de pie y con el peso repartido.',
  },
};

/** Etiquetas de datos del perfil que también pueden faltar en un cálculo. */
/** @type {Record<string, string>} */
const EXTRA_FIELD_LABELS = {
  ageYears: 'Edad',
  sex: 'Sexo biológico',
  goal: 'Objetivo',
  activityLevel: 'Nivel de actividad',
};

/* ------------------------------------------------------------------ */
/* Rangos de referencia e interpretación                               */
/* ------------------------------------------------------------------ */

/** Clasificación de IMC de la OMS para adultos (límite superior exclusivo). */
const BMI_CATEGORIES = [
  { below: 18.5, key: 'underweight', label: 'Bajo peso' },
  { below: 25, key: 'normal', label: 'Normal' },
  { below: 30, key: 'overweight', label: 'Sobrepeso' },
  { below: 35, key: 'obesity_1', label: 'Obesidad grado I' },
  { below: 40, key: 'obesity_2', label: 'Obesidad grado II' },
  { below: Infinity, key: 'obesity_3', label: 'Obesidad grado III' },
];

/**
 * ICC: punto de corte de la OMS (Waist circumference and waist–hip ratio,
 * expert consultation 2008). La OMS no define categorías por debajo del corte.
 * @type {Record<Sex, number>}
 */
const WHR_CUTOFFS = { male: 0.9, female: 0.85 };

/**
 * Índice cintura/altura: NICE NG246, recomendaciones 1.9.14 (adultos con
 * IMC < 35) y 1.10.10 (5 años en adelante). Límite superior exclusivo,
 * evaluado con 2 decimales.
 * @type {{ below: number, key: string, label: string, tone: Tone }[]}
 */
const WHTR_BANDS = [
  { below: 0.4, key: 'below_reference', label: 'Por debajo de 0.40', tone: 'neutral' },
  { below: 0.5, key: 'healthy', label: 'Adiposidad central saludable', tone: 'ok' },
  { below: 0.6, key: 'increased', label: 'Adiposidad central aumentada', tone: 'attention' },
  { below: Infinity, key: 'high', label: 'Adiposidad central alta', tone: 'high' },
];
/** NICE solo avala las categorías de ICA con IMC por debajo de este valor. */
const WHTR_MAX_BMI = 35;

/** Constantes de Hodgdon y Beckett (1984), versión en centímetros. */
const NAVY_CONSTANTS = {
  male: { a: 1.0324, b: 0.19077, c: 0.15456 },
  female: { a: 1.29579, b: 0.35004, c: 0.221 },
};
/** Fuera de este rango el resultado se trata como error de medición (no es un rango de salud). */
const BODY_FAT_PLAUSIBLE = { min: 2, max: 60 };

/**
 * Requerimiento base de líquidos por edad y peso: tabla de "Preparation for
 * Dietetic Practice" (M. Omstead, Toronto Metropolitan University). Guía
 * dietética general para adultos, no específica del deporte.
 */
const WATER_BANDS = [
  { maxAge: 55, mlPerKg: 35 },
  { maxAge: 75, mlPerKg: 30 },
  { maxAge: Infinity, mlPerKg: 25 },
];

/** Reposición tras entrenar: 1.25–1.5 L por kg perdido (ACSM/AND/DC 2016). */
const REHYDRATION_L_PER_KG = { min: 1.25, max: 1.5 };

/** Factores de Atwater generales. */
const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 };

/** Referencia de carbohidratos según carga de entrenamiento (ACSM/AND/DC 2016). */
const CARB_REFERENCE_G_PER_KG = [
  { key: 'light', label: 'Carga ligera (baja intensidad o técnica)', min: 3, max: 5 },
  { key: 'moderate', label: 'Carga moderada (≈1 h/día)', min: 5, max: 7 },
  { key: 'high', label: 'Carga alta (1–3 h/día)', min: 6, max: 10 },
  { key: 'very_high', label: 'Carga muy alta (> 4–5 h/día)', min: 8, max: 12 },
];

/* ------------------------------------------------------------------ */
/* Seguimiento: comparativo y gráficos                                 */
/* ------------------------------------------------------------------ */

/** @type {Record<MetricKey, MetricConfig>} */
const METRICS = {
  weightKg: { label: 'Peso', shortLabel: 'Peso', unit: 'kg', decimals: 1, changeMode: 'relative', source: 'measurements' },
  waistCm: { label: 'Cintura', shortLabel: 'Cintura', unit: 'cm', decimals: 1, changeMode: 'relative', source: 'measurements' },
  hipCm: { label: 'Cadera', shortLabel: 'Cadera', unit: 'cm', decimals: 1, changeMode: 'relative', source: 'measurements' },
  neckCm: { label: 'Cuello', shortLabel: 'Cuello', unit: 'cm', decimals: 1, changeMode: 'relative', source: 'measurements' },
  chestCm: { label: 'Pecho', shortLabel: 'Pecho', unit: 'cm', decimals: 1, changeMode: 'relative', source: 'measurements' },
  armCm: { label: 'Brazo', shortLabel: 'Brazo', unit: 'cm', decimals: 1, changeMode: 'relative', source: 'measurements' },
  thighCm: { label: 'Muslo', shortLabel: 'Muslo', unit: 'cm', decimals: 1, changeMode: 'relative', source: 'measurements' },
  bodyFatPct: { label: '% de grasa estimado', shortLabel: '% grasa', unit: '%', decimals: 1, changeMode: 'points', source: 'results', resultKey: 'bodyFat' },
  fatMassKg: { label: 'Masa grasa estimada', shortLabel: 'Masa grasa', unit: 'kg', decimals: 1, changeMode: 'relative', source: 'results', resultKey: 'fatMass' },
  leanMassKg: { label: 'Masa libre de grasa estimada', shortLabel: 'Masa libre de grasa', unit: 'kg', decimals: 1, changeMode: 'relative', source: 'results', resultKey: 'leanMass' },
  whtr: { label: 'Índice cintura/altura', shortLabel: 'ICA', unit: '', decimals: 2, changeMode: 'absolute', source: 'results', resultKey: 'whtr' },
  whr: { label: 'Índice cintura/cadera', shortLabel: 'ICC', unit: '', decimals: 2, changeMode: 'absolute', source: 'results', resultKey: 'whr' },
  bmi: { label: 'IMC', shortLabel: 'IMC', unit: 'kg/m²', decimals: 1, changeMode: 'absolute', source: 'results', resultKey: 'bmi' },
};

/** Métricas seleccionables en el gráfico de evolución. */
/** @type {MetricKey[]} */
const CHART_METRICS = ['weightKg', 'waistCm', 'bodyFatPct', 'whtr'];

/** Filas del comparativo actual vs anterior. */
/** @type {MetricKey[]} */
const COMPARISON_METRICS = ['weightKg', 'waistCm', 'hipCm', 'bodyFatPct', 'fatMassKg', 'leanMassKg', 'whtr', 'bmi', 'whr'];

/** @param {string} key */
function fieldLabel(key) {
  const field = /** @type {Record<string, MeasurementField>} */ (MEASUREMENT_FIELDS)[key];
  if (field) return field.label;
  return EXTRA_FIELD_LABELS[key] || key;
}

/** @param {Dimension} dimension */
function canonicalUnit(dimension) {
  return dimension === 'mass' ? 'kg' : 'cm';
}

module.exports = {
  CALC_VERSION,
  SEX_KEYS,
  SEX_LABELS,
  GOAL_KEYS,
  GOALS,
  ACTIVITY_KEYS,
  ACTIVITY_LEVELS,
  LEVEL_KEYS,
  LEVEL_LABELS,
  SOMATOTYPE_KEYS,
  SOMATOTYPE_LABELS,
  AGE_LIMITS,
  MEASUREMENT_KEYS,
  REQUIRED_MEASUREMENTS,
  MEASUREMENT_FIELDS,
  EXTRA_FIELD_LABELS,
  BMI_CATEGORIES,
  WHR_CUTOFFS,
  WHTR_BANDS,
  WHTR_MAX_BMI,
  NAVY_CONSTANTS,
  BODY_FAT_PLAUSIBLE,
  WATER_BANDS,
  REHYDRATION_L_PER_KG,
  KCAL_PER_GRAM,
  CARB_REFERENCE_G_PER_KG,
  METRICS,
  CHART_METRICS,
  COMPARISON_METRICS,
  fieldLabel,
  canonicalUnit,
};
