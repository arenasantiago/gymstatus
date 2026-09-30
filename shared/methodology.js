// @ts-check
'use strict';

/**
 * Metodología: fórmulas, factores, fuentes y limitaciones de cada cálculo.
 *
 * Se construye a partir de la configuración del motor (config.js) y de los
 * textos centralizados (content.js), de modo que lo que se explica es
 * exactamente lo que se calcula: si cambia un factor, cambia también aquí.
 */

const {
  CALC_VERSION,
  GOAL_KEYS,
  GOALS,
  ACTIVITY_KEYS,
  ACTIVITY_LEVELS,
  AGE_LIMITS,
  MEASUREMENT_FIELDS,
  BMI_CATEGORIES,
  WHTR_BANDS,
  WHTR_MAX_BMI,
  WHR_CUTOFFS,
  NAVY_CONSTANTS,
  WATER_BANDS,
  REHYDRATION_L_PER_KG,
  KCAL_PER_GRAM,
  CARB_REFERENCE_G_PER_KG,
} = require('./config');
const { describeEnergyAdjustment } = require('./evaluation');
const content = require('./content');

/**
 * @typedef {Object} MethodValue
 * @property {string} label
 * @property {string} value
 * @property {string} [note]
 */

/**
 * @typedef {Object} MethodItem
 * @property {string} title
 * @property {string[]} [formulas]   Expresiones generales.
 * @property {string} [text]         Qué estima y cómo se interpreta.
 * @property {MethodValue[]} [values] Factores o bandas en uso.
 * @property {string[]} [bullets]    Variables, ajustes o limitaciones.
 * @property {string} [source]
 */

/**
 * @typedef {Object} MethodSection
 * @property {'composition'|'energy'|'nutrients'|'scope'} key
 * @property {string} title
 * @property {string} [intro]
 * @property {MethodItem[]} items
 */

/**
 * Rango de una banda con límite superior exclusivo, evaluada con `decimals`
 * decimales: (0.4, 0.5) → "0.40–0.49"; (null, 0.4) → "< 0.40"; (0.6, ∞) → "≥ 0.60".
 * @param {number|null} lower
 * @param {number} upper
 * @param {number} decimals
 */
function bandRange(lower, upper, decimals) {
  /** @param {number} n */
  const fmt = (n) => n.toFixed(decimals);
  if (lower === null) return `< ${fmt(upper)}`;
  if (!Number.isFinite(upper)) return `≥ ${fmt(lower)}`;
  return `${fmt(lower)}–${fmt(upper - 1 / 10 ** decimals)}`;
}

/** @returns {MethodSection} */
function compositionSection() {
  const navy = NAVY_CONSTANTS;
  return {
    key: 'composition',
    title: 'Composición corporal',
    intro:
      'Indicadores calculados a partir de peso, altura y perímetros. Se priorizan el índice cintura/altura y la composición corporal; el IMC se muestra como dato complementario.',
    items: [
      {
        title: 'Índice cintura/altura (ICA)',
        formulas: ['ICA = cintura (cm) ÷ altura (cm)'],
        text: `${content.WHTR_NOTE} Aplica desde los 5 años; en adultos, NICE avala las categorías con IMC menor de ${WHTR_MAX_BMI} kg/m². Se evalúa con 2 decimales.`,
        values: WHTR_BANDS.map((band, i) => ({
          label: band.key === 'below_reference' ? 'Sin categoría NICE' : band.label,
          value: bandRange(i === 0 ? null : WHTR_BANDS[i - 1].below, band.below, 2),
        })),
        source: 'NICE NG246 (2025), recomendaciones 1.9.14 (adultos) y 1.10.10 (desde los 5 años)',
      },
      {
        title: '% de grasa estimado y masas',
        formulas: [
          `Hombres: % grasa = 495 ÷ (${navy.male.a} − ${navy.male.b} × log10(cintura − cuello) + ${navy.male.c} × log10(altura)) − 450`,
          `Mujeres: % grasa = 495 ÷ (${navy.female.a} − ${navy.female.b} × log10(cintura + cadera − cuello) + ${navy.female.c} × log10(altura)) − 450`,
          'Masa grasa = peso × % grasa ÷ 100',
          'Masa libre de grasa = peso − masa grasa',
        ],
        text: content.BODY_FAT_METHOD.method,
        bullets: [...content.BODY_FAT_METHOD.variables, ...content.BODY_FAT_METHOD.limitations],
        source: 'Hodgdon y Beckett (1984), Naval Health Research Center; ecuación de Siri',
      },
      {
        title: 'Índice cintura/cadera (ICC)',
        formulas: ['ICC = cintura (cm) ÷ cadera (cm)'],
        text: content.WHR_NOTE,
        values: [
          { label: 'Hombres', value: `≥ ${WHR_CUTOFFS.male.toFixed(2)}`, note: 'Riesgo metabólico sustancialmente aumentado' },
          { label: 'Mujeres', value: `≥ ${WHR_CUTOFFS.female.toFixed(2)}`, note: 'Riesgo metabólico sustancialmente aumentado' },
        ],
        source: 'OMS (2008), consulta de expertos sobre perímetro de cintura e ICC',
      },
      {
        title: 'Índice de masa corporal (IMC)',
        formulas: ['IMC = peso (kg) ÷ altura (m)²'],
        text: `${content.BMI_NOTE} Las categorías de adultos no se aplican a menores de ${AGE_LIMITS.adultFrom} años.`,
        values: BMI_CATEGORIES.map((category, i) => ({
          label: category.label,
          value: `${bandRange(i === 0 ? null : BMI_CATEGORIES[i - 1].below, category.below, 1)} kg/m²`,
        })),
        source: 'OMS, clasificación del IMC en adultos',
      },
      {
        title: 'Medición de la cintura',
        text: `${MEASUREMENT_FIELDS.waistCm.hint || ''} El mismo valor alimenta el ICA, el ICC y el % de grasa: medir siempre igual es lo que hace comparables las evaluaciones.`.trim(),
        bullets: [
          'El método de la Marina de EE. UU. se desarrolló midiendo la cintura en otro punto (a la altura del ombligo en hombres y en la zona más estrecha en mujeres), así que el % de grasa puede diferir algo del de ese protocolo. Lo importante es comparar evaluaciones medidas igual.',
        ],
        source: 'Protocolo de NICE NG246 para el índice cintura/altura',
      },
    ],
  };
}

/**
 * Expresión de la energía objetivo por tipo de ajuste, con los objetivos que
 * usa cada una según la configuración vigente.
 * @returns {string[]}
 */
function energyFormulas() {
  /** @param {'kcal'|'percent'} type */
  const goalsOf = (type) =>
    GOAL_KEYS.filter((key) => GOALS[key].energyAdjustment.type === type)
      .map((key) => GOALS[key].short.toLowerCase())
      .join(', ');
  const kcal = goalsOf('kcal');
  const percent = goalsOf('percent');
  return [
    ...(kcal ? [`Energía = GET + ajuste en kcal/día (${kcal})`] : []),
    ...(percent ? [`Energía = GET × (1 + ajuste ÷ 100) (${percent})`] : []),
  ];
}

/** @returns {MethodSection} */
function energySection() {
  return {
    key: 'energy',
    title: 'Energía',
    intro: 'Estimaciones poblacionales para adultos: la TMB no es lo que hay que comer, y el gasto real puede diferir del estimado.',
    items: [
      {
        title: 'Tasa metabólica basal (TMB)',
        formulas: [
          'Hombres: TMB = 10 × peso + 6.25 × altura − 5 × edad + 5',
          'Mujeres: TMB = 10 × peso + 6.25 × altura − 5 × edad − 161',
        ],
        text: `${content.BMR_METHOD.text} Peso en kg, altura en cm y edad en años.`,
        source: 'Mifflin et al. (1990); Frankenfield et al. (2005)',
      },
      {
        title: 'Gasto energético total (GET)',
        formulas: ['GET = TMB × nivel de actividad física (PAL)'],
        text: `${content.BMR_METHOD.tdee} Valores por defecto: los PAL de los ejemplos resueltos de FAO/OMS/UNU para cada estilo de vida, dentro de sus rangos.`,
        values: ACTIVITY_KEYS.map((key) => {
          const level = ACTIVITY_LEVELS[key];
          return {
            label: level.label,
            value: `PAL ${level.pal.toFixed(2)}`,
            note: `${level.description} Rango: ${level.palRange[0].toFixed(2)}–${level.palRange[1].toFixed(2)}.`,
          };
        }),
        source: 'FAO/OMS/UNU (2004), Human energy requirements, tablas 5.1 y 5.3',
      },
      {
        title: 'Energía según el objetivo',
        formulas: energyFormulas(),
        text: 'Cada ajuste se aplica en la unidad en que lo publica su fuente. Es un punto de partida: se revisa con la evolución del peso y de la composición corporal.',
        values: GOAL_KEYS.map((key) => ({
          label: GOALS[key].short,
          value: describeEnergyAdjustment(GOALS[key].energyAdjustment),
          note: GOALS[key].energyAdjustment.source,
        })),
        source: 'ACSM/AND/DC (2016); Iraki et al. (2019); Murphy y Koehler (2022). Mantenimiento y rendimiento: equilibrio energético (convención, sin ajuste)',
      },
    ],
  };
}

/** @returns {MethodSection} */
function nutrientsSection() {
  const fatPcts = [...new Set(GOAL_KEYS.map((key) => GOALS[key].fatPctOfEnergy))];
  const fatText = fatPcts.length === 1 ? `${fatPcts[0]} %` : fatPcts.map((p) => `${p} %`).join(' / ');
  return {
    key: 'nutrients',
    title: 'Proteína, macronutrientes e hidratación',
    items: [
      {
        title: 'Proteína',
        formulas: ['Proteína (g/día) = peso (kg) × factor del objetivo (g/kg)'],
        text: content.PROTEIN_NOTE,
        values: GOAL_KEYS.map((key) => ({
          label: GOALS[key].short,
          value: `${GOALS[key].proteinGPerKg.toFixed(1)} g/kg/día`,
          note: GOALS[key].proteinSource,
        })),
        source: 'ACSM/AND/DC (2016); ISSN (2017); Morton et al. (2018); Hector y Phillips (2018); Iraki et al. (2019)',
      },
      {
        title: 'Distribución de macronutrientes',
        formulas: [
          'Proteína = gramos calculados por kg de peso',
          `Grasas (g) = energía × ${fatText} ÷ ${KCAL_PER_GRAM.fat} kcal/g`,
          `Carbohidratos (g) = (energía − kcal de proteína − kcal de grasas) ÷ ${KCAL_PER_GRAM.carbs} kcal/g`,
        ],
        text: `${content.MACROS_NOTE} Las grasas se fijan en ${fatText} de la energía, una elección dentro del rango 20–35 %. Si la proteína y las grasas superan la energía objetivo, el reparto se marca como no viable en lugar de dar carbohidratos negativos. Los carbohidratos resultantes se comparan con estas referencias por carga de entrenamiento:`,
        values: CARB_REFERENCE_G_PER_KG.map((ref) => ({ label: ref.label, value: `${ref.min}–${ref.max} g/kg/día` })),
        source: `ACSM/AND/DC (2016); factores de Atwater ${KCAL_PER_GRAM.protein}/${KCAL_PER_GRAM.fat}/${KCAL_PER_GRAM.carbs} kcal/g`,
      },
      {
        title: 'Hidratación',
        formulas: ['Agua (ml/día) = peso (kg) × ml/kg según la edad'],
        text: content.WATER_NOTE.base,
        values: [
          ...WATER_BANDS.map((band, i) => {
            const previous = i === 0 ? null : WATER_BANDS[i - 1].maxAge;
            let label;
            if (previous === null) label = `Hasta ${band.maxAge} años`;
            else if (Number.isFinite(band.maxAge)) label = `${previous + 1}–${band.maxAge} años`;
            else label = `Más de ${previous} años`;
            return { label, value: `${band.mlPerKg} ml/kg/día` };
          }),
          {
            label: 'Reposición tras entrenar',
            value: `${REHYDRATION_L_PER_KG.min}–${REHYDRATION_L_PER_KG.max} L por kg perdido`,
            note: 'Se muestra aparte; nunca se suma al requerimiento base (ACSM/AND/DC 2016).',
          },
        ],
        bullets: content.WATER_NOTE.adjustments,
        source: 'Preparation for Dietetic Practice (M. Omstead, Toronto Metropolitan University)',
      },
    ],
  };
}

/** @returns {MethodSection} */
function scopeSection() {
  return {
    key: 'scope',
    title: 'Alcance y limitaciones',
    items: [
      { title: 'Estimaciones, no diagnóstico', text: content.GENERAL_DISCLAIMER },
      { title: 'Condiciones especiales', text: content.SPECIAL_CONDITIONS_WARNING },
      {
        title: 'Menores de 18 años',
        text: `${content.MINOR_WARNING} La app admite atletas desde los ${AGE_LIMITS.min} años; las categorías del índice cintura/altura sí se aplican desde los 5.`,
      },
      { title: content.SOMATOTYPE.title, text: content.SOMATOTYPE.intro, bullets: content.SOMATOTYPE.caveats },
      {
        title: 'Trazabilidad',
        text: `Cada evaluación guarda la versión del motor de cálculo (actual: ${CALC_VERSION}) y los factores con que se calculó. Cambiar la configuración no modifica las evaluaciones anteriores; las nuevas usan los factores vigentes.`,
      },
    ],
  };
}

/**
 * Metodología completa, en el orden en que se muestra.
 * @returns {{ calcVersion: string, sections: MethodSection[], references: string[] }}
 */
function buildMethodology() {
  return {
    calcVersion: CALC_VERSION,
    sections: [compositionSection(), energySection(), nutrientsSection(), scopeSection()],
    references: content.REFERENCES,
  };
}

module.exports = { buildMethodology, bandRange };
