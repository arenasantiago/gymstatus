// @ts-check
'use strict';

/**
 * Orquestador del cálculo de una evaluación.
 *
 * Recibe el perfil, las mediciones (canónicas, ya validadas) y el contexto, y
 * devuelve un objeto de RESULTADOS donde cada indicador guarda:
 *   - status: 'ok' | 'missing' | 'invalid' | 'not_applicable'
 *   - value / unit (valor calculado, SIN redondear)
 *   - missing: etiquetas exactas de los datos que faltan
 *   - formula: fórmula general + operación con los valores de esta evaluación
 *   - inputs: los datos exactos usados
 *   - interpretation: separada del valor (puede ser null)
 *
 * Así se cumplen tres reglas: nunca se calcula con datos faltantes, cada
 * indicador conserva la fórmula con la que se obtuvo, y datos de entrada,
 * valores calculados e interpretaciones quedan separados.
 */

const config = require('./config');
const F = require('./formulas');
const { interpretBmi, interpretWhr, interpretWhtr } = require('./interpretation');
const { formatNumber, formatTrim, formatFactor, typographicMinus, MINUS } = require('./format');

const {
  CALC_VERSION,
  GOALS,
  ACTIVITY_LEVELS,
  WATER_BANDS,
  BODY_FAT_PLAUSIBLE,
  AGE_LIMITS,
  CARB_REFERENCE_G_PER_KG,
  REHYDRATION_L_PER_KG,
  fieldLabel,
} = config;

/**
 * @typedef {'ok'|'missing'|'invalid'|'not_applicable'} ResultStatus
 */

/**
 * @typedef {Object} FormulaTrace
 * @property {string} name        Nombre del método.
 * @property {string} expression  Fórmula general.
 * @property {string} [substituted] Operación con los valores de esta evaluación.
 * @property {string} [source]    Referencia bibliográfica.
 */

/**
 * @typedef {Object} ResultEntry
 * @property {ResultStatus} status
 * @property {number|null} value
 * @property {string} unit
 * @property {string[]} missing
 * @property {string} [reason]
 * @property {FormulaTrace} formula
 * @property {Record<string, any>} inputs
 * @property {import('./interpretation').Interpretation|null} interpretation
 */

/**
 * @typedef {Object} Profile
 * @property {import('./config').Sex} [sex]
 * @property {number} [ageYears]
 * @property {import('./config').GoalKey} [goal]
 * @property {import('./config').ActivityKey} [activityLevel]
 */

/**
 * @param {Partial<ResultEntry> & { formula: FormulaTrace }} partial
 * @returns {ResultEntry}
 */
function entry(partial) {
  return {
    status: partial.status || 'ok',
    value: partial.value === undefined ? null : partial.value,
    unit: partial.unit || '',
    missing: partial.missing || [],
    reason: partial.reason,
    formula: partial.formula,
    inputs: partial.inputs || {},
    interpretation: partial.interpretation || null,
  };
}

/**
 * Nombres legibles de los datos que faltan, en el orden solicitado.
 * @param {Record<string, unknown>} available
 * @param {string[]} keys
 * @returns {string[]}
 */
function missingLabels(available, keys) {
  return keys.filter((k) => available[k] === undefined || available[k] === null || available[k] === '').map(fieldLabel);
}

/**
 * Factor de agua en ml/kg según la edad.
 * @param {number} ageYears
 */
function waterBandFor(ageYears) {
  return WATER_BANDS.find((b) => ageYears <= b.maxAge) || WATER_BANDS[WATER_BANDS.length - 1];
}

/**
 * Referencia de carbohidratos que corresponde a los g/kg obtenidos.
 * @param {number} gPerKg
 */
function carbReferenceFor(gPerKg) {
  const matches = CARB_REFERENCE_G_PER_KG.filter((r) => gPerKg >= r.min && gPerKg <= r.max);
  if (matches.length > 0) return matches.map((r) => r.label).join(' / ');
  if (gPerKg < CARB_REFERENCE_G_PER_KG[0].min) return 'Por debajo de 3 g/kg (menor que la referencia para carga ligera)';
  return 'Por encima de 12 g/kg (mayor que la referencia para carga muy alta)';
}

/**
 * Calcula todos los indicadores de una evaluación.
 * @param {{
 *   profile: Profile,
 *   measurements: Partial<Record<import('./config').MeasurementKey, number>>,
 * }} input
 * @returns {Record<string, ResultEntry>}
 */
function computeResults({ profile, measurements }) {
  const m = measurements || {};
  const p = profile || {};
  const { weightKg, heightCm, waistCm, hipCm, neckCm } = m;
  const sex = p.sex;
  const age = p.ageYears;
  /** @type {Record<string, unknown>} */
  const avail = { ...m, sex, ageYears: age, goal: p.goal, activityLevel: p.activityLevel };
  const isAdult = typeof age === 'number' && age >= AGE_LIMITS.adultFrom;

  /** @type {Record<string, ResultEntry>} */
  const r = {};

  // --- IMC ---------------------------------------------------------------
  {
    const formula = {
      name: 'Índice de masa corporal',
      expression: 'IMC = peso (kg) ÷ altura (m)²',
      source: 'OMS',
    };
    const missing = missingLabels(avail, ['weightKg', 'heightCm']);
    const value = missing.length ? null : F.bmi(weightKg, heightCm);
    if (value === null) {
      r.bmi = entry({ status: missing.length ? 'missing' : 'invalid', unit: 'kg/m²', missing, formula });
    } else {
      const hM = /** @type {number} */ (heightCm) / 100;
      r.bmi = entry({
        value,
        unit: 'kg/m²',
        inputs: { weightKg, heightCm },
        formula: {
          ...formula,
          substituted: `${formatTrim(weightKg)} ÷ ${formatTrim(hM, 3)}² = ${formatNumber(value, 1)} kg/m²`,
        },
        interpretation: interpretBmi(value, age),
      });
    }
  }

  // --- Índice cintura/altura ---------------------------------------------
  {
    const formula = {
      name: 'Índice cintura/altura',
      expression: 'ICA = cintura (cm) ÷ altura (cm)',
      source: 'NICE NG246 (2025)',
    };
    const missing = missingLabels(avail, ['waistCm', 'heightCm']);
    const value = missing.length ? null : F.waistHeightRatio(waistCm, heightCm);
    if (value === null) {
      r.whtr = entry({ status: missing.length ? 'missing' : 'invalid', missing, formula });
    } else {
      r.whtr = entry({
        value,
        inputs: { waistCm, heightCm },
        formula: { ...formula, substituted: `${formatTrim(waistCm)} ÷ ${formatTrim(heightCm)} = ${formatNumber(value, 2)}` },
        interpretation: interpretWhtr(value, r.bmi.value, age),
      });
    }
  }

  // --- ICC ---------------------------------------------------------------
  {
    const formula = {
      name: 'Índice cintura/cadera',
      expression: 'ICC = cintura (cm) ÷ cadera (cm)',
      source: 'OMS (2008)',
    };
    const missing = missingLabels(avail, ['waistCm', 'hipCm']);
    const value = missing.length ? null : F.waistHipRatio(waistCm, hipCm);
    if (value === null) {
      r.whr = entry({ status: missing.length ? 'missing' : 'invalid', missing, formula });
    } else {
      r.whr = entry({
        value,
        inputs: { waistCm, hipCm },
        formula: { ...formula, substituted: `${formatTrim(waistCm)} ÷ ${formatTrim(hipCm)} = ${formatNumber(value, 2)}` },
        interpretation: sex ? interpretWhr(value, sex, age) : null,
      });
    }
  }

  // --- % de grasa estimado (Marina de EE. UU.) ---------------------------
  {
    const isFemale = sex === 'female';
    const formula = {
      name: 'Método de circunferencias de la Marina de EE. UU. (Hodgdon y Beckett, 1984)',
      expression: isFemale
        ? '% grasa = 495 ÷ (1.29579 − 0.35004 × log10(cintura + cadera − cuello) + 0.22100 × log10(altura)) − 450'
        : sex === 'male'
          ? '% grasa = 495 ÷ (1.0324 − 0.19077 × log10(cintura − cuello) + 0.15456 × log10(altura)) − 450'
          : 'Ecuación distinta para hombres y mujeres (requiere sexo biológico)',
      source: 'Hodgdon y Beckett (1984), Naval Health Research Center',
    };
    const needed = ['sex', 'heightCm', 'waistCm', 'neckCm'].concat(isFemale ? ['hipCm'] : []);
    const missing = missingLabels(avail, needed);

    if (missing.length) {
      r.bodyFat = entry({ status: 'missing', unit: '%', missing, formula });
    } else if (!isAdult) {
      r.bodyFat = entry({
        status: 'not_applicable',
        unit: '%',
        formula,
        reason: 'La ecuación se desarrolló con adultos; no se calcula en menores de 18 años.',
      });
    } else {
      const value = F.bodyFatNavy(/** @type {import('./config').Sex} */ (sex), { heightCm, waistCm, neckCm, hipCm });
      if (value === null || value < BODY_FAT_PLAUSIBLE.min || value > BODY_FAT_PLAUSIBLE.max) {
        r.bodyFat = entry({
          status: 'invalid',
          unit: '%',
          formula,
          inputs: { heightCm, waistCm, neckCm, hipCm: isFemale ? hipCm : undefined },
          reason: 'Las medidas producen un resultado fuera de rango. Revisa cintura, cuello y cadera (misma unidad y punto de medición).',
        });
      } else {
        const girthText = isFemale
          ? `${formatTrim(waistCm)} + ${formatTrim(hipCm)} − ${formatTrim(neckCm)}`
          : `${formatTrim(waistCm)} − ${formatTrim(neckCm)}`;
        r.bodyFat = entry({
          value,
          unit: '%',
          inputs: { heightCm, waistCm, neckCm, ...(isFemale ? { hipCm } : {}) },
          formula: {
            ...formula,
            substituted: `log10(${girthText}) y log10(${formatTrim(heightCm)}) → ${formatNumber(value, 1)} %`,
          },
          interpretation: null,
        });
      }
    }
  }

  // --- Masa grasa / masa libre de grasa (derivadas del % estimado) -------
  {
    const bf = r.bodyFat;
    const formulaFat = { name: 'Masa grasa estimada', expression: 'Masa grasa = peso × % grasa estimado ÷ 100' };
    const formulaLean = { name: 'Masa libre de grasa estimada', expression: 'Masa libre de grasa = peso − masa grasa' };
    if (bf.status !== 'ok' || typeof weightKg !== 'number') {
      const missing = typeof weightKg !== 'number' ? [fieldLabel('weightKg')] : bf.missing;
      const status = bf.status === 'ok' ? 'missing' : bf.status;
      r.fatMass = entry({ status, unit: 'kg', missing, reason: bf.reason, formula: formulaFat });
      r.leanMass = entry({ status, unit: 'kg', missing, reason: bf.reason, formula: formulaLean });
    } else {
      const fat = /** @type {number} */ (F.fatMassKg(weightKg, bf.value));
      const lean = /** @type {number} */ (F.fatFreeMassKg(weightKg, bf.value));
      r.fatMass = entry({
        value: fat,
        unit: 'kg',
        inputs: { weightKg, bodyFatPct: bf.value },
        formula: { ...formulaFat, substituted: `${formatTrim(weightKg)} × ${formatNumber(bf.value, 1)} ÷ 100 = ${formatNumber(fat, 1)} kg` },
      });
      r.leanMass = entry({
        value: lean,
        unit: 'kg',
        inputs: { weightKg, fatMassKg: fat },
        formula: { ...formulaLean, substituted: `${formatTrim(weightKg)} − ${formatNumber(fat, 1)} = ${formatNumber(lean, 1)} kg` },
      });
    }
  }

  // --- TMB (Mifflin-St Jeor) ---------------------------------------------
  {
    const formula = {
      name: 'Mifflin-St Jeor (1990)',
      expression:
        sex === 'female'
          ? 'TMB = 10 × peso + 6.25 × altura − 5 × edad − 161'
          : sex === 'male'
            ? 'TMB = 10 × peso + 6.25 × altura − 5 × edad + 5'
            : 'TMB = 10 × peso + 6.25 × altura − 5 × edad + 5 (hombres) / − 161 (mujeres)',
      source: 'Mifflin et al., Am J Clin Nutr 1990',
    };
    const missing = missingLabels(avail, ['sex', 'weightKg', 'heightCm', 'ageYears']);
    if (missing.length) {
      r.bmr = entry({ status: 'missing', unit: 'kcal/día', missing, formula });
    } else if (!isAdult) {
      r.bmr = entry({
        status: 'not_applicable',
        unit: 'kcal/día',
        formula,
        reason: 'La ecuación se validó en adultos (19–78 años); no se calcula en menores de 18 años.',
      });
    } else {
      const value = F.bmrMifflinStJeor(/** @type {import('./config').Sex} */ (sex), weightKg, heightCm, age);
      if (value === null || value <= 0) {
        r.bmr = entry({ status: 'invalid', unit: 'kcal/día', formula });
      } else {
        const constant = sex === 'female' ? '− 161' : '+ 5';
        r.bmr = entry({
          value,
          unit: 'kcal/día',
          inputs: { sex, weightKg, heightCm, ageYears: age },
          formula: {
            ...formula,
            substituted: `10 × ${formatTrim(weightKg)} + 6.25 × ${formatTrim(heightCm)} − 5 × ${age} ${constant} = ${formatNumber(value, 0)} kcal/día`,
          },
        });
      }
    }
  }

  // --- Gasto energético total (TMB × PAL) ---------------------------------
  {
    const formula = {
      name: 'Gasto energético diario total',
      expression: 'GET = TMB × nivel de actividad física (PAL)',
      source: 'FAO/OMS/UNU (2004), Human energy requirements',
    };
    const activity = p.activityLevel ? ACTIVITY_LEVELS[p.activityLevel] : undefined;
    if (r.bmr.status !== 'ok') {
      r.tdee = entry({ status: r.bmr.status, unit: 'kcal/día', missing: r.bmr.missing, reason: r.bmr.reason, formula });
    } else if (!activity) {
      r.tdee = entry({ status: 'missing', unit: 'kcal/día', missing: [fieldLabel('activityLevel')], formula });
    } else {
      const value = /** @type {number} */ (F.totalEnergyExpenditure(r.bmr.value, activity.pal));
      r.tdee = entry({
        value,
        unit: 'kcal/día',
        inputs: { bmrKcal: r.bmr.value, activityLevel: p.activityLevel, pal: activity.pal },
        formula: {
          ...formula,
          substituted: `${formatNumber(r.bmr.value, 0)} × ${formatFactor(activity.pal)} (${activity.label.toLowerCase()}) = ${formatNumber(value, 0)} kcal/día`,
        },
      });
    }
  }

  // --- Energía objetivo según el objetivo ---------------------------------
  const goal = p.goal ? GOALS[p.goal] : undefined;
  {
    const adj = goal ? goal.energyAdjustment : undefined;
    const formula = {
      name: 'Energía estimada según objetivo',
      expression:
        adj && adj.type === 'percent'
          ? 'Energía = GET × (1 + ajuste del objetivo ÷ 100)'
          : 'Energía = GET + ajuste del objetivo (kcal/día)',
      ...(adj ? { source: adj.source } : {}),
    };
    if (r.tdee.status !== 'ok') {
      r.energyTarget = entry({ status: r.tdee.status, unit: 'kcal/día', missing: r.tdee.missing, reason: r.tdee.reason, formula });
    } else if (!goal || !adj) {
      r.energyTarget = entry({ status: 'missing', unit: 'kcal/día', missing: [fieldLabel('goal')], formula });
    } else {
      const value = F.energyTarget(r.tdee.value, adj);
      if (value === null) {
        r.energyTarget = entry({
          status: 'invalid',
          unit: 'kcal/día',
          formula,
          reason: 'El ajuste del objetivo deja la energía en cero o por debajo. Revisa los factores en la configuración.',
        });
      } else {
        const tdeeText = formatNumber(r.tdee.value, 0);
        const goalText = goal.short.toLowerCase();
        let operation;
        if (adj.type === 'percent') {
          operation = `${tdeeText} × ${formatTrim(1 + adj.value / 100, 2)} (${goalText}, ${adj.value > 0 ? '+' : ''}${typographicMinus(String(adj.value))} %)`;
        } else if (adj.value === 0) {
          operation = `${tdeeText} (${goalText}: sin ajuste)`;
        } else {
          operation = `${tdeeText} ${adj.value > 0 ? '+' : MINUS} ${Math.abs(adj.value)} kcal (${goalText})`;
        }
        r.energyTarget = entry({
          value,
          unit: 'kcal/día',
          inputs: { tdeeKcal: r.tdee.value, goal: p.goal, adjustmentType: adj.type, adjustmentValue: adj.value },
          formula: { ...formula, substituted: `${operation} = ${formatNumber(value, 0)} kcal/día` },
        });
      }
    }
  }

  // --- Proteína diaria -----------------------------------------------------
  {
    const formula = {
      name: 'Proteína diaria estimada',
      expression: 'Proteína (g/día) = peso (kg) × factor del objetivo (g/kg)',
      source: 'ACSM/AND/DC (2016); ISSN (2017); Morton et al. (2018)',
    };
    const missing = missingLabels(avail, ['weightKg', 'goal']);
    if (missing.length || !goal) {
      r.protein = entry({ status: 'missing', unit: 'g/día', missing, formula });
    } else {
      const value = /** @type {number} */ (F.proteinGrams(weightKg, goal.proteinGPerKg));
      r.protein = entry({
        value,
        unit: 'g/día',
        inputs: { weightKg, goal: p.goal, gPerKg: goal.proteinGPerKg },
        formula: {
          ...formula,
          substituted: `${formatTrim(weightKg)} kg × ${formatFactor(goal.proteinGPerKg)} g/kg = ${formatNumber(value, 0)} g de proteína/día`,
        },
      });
    }
  }

  // --- Agua diaria (base) --------------------------------------------------
  {
    const formula = {
      name: 'Requerimiento base de líquidos',
      expression: 'Agua (ml/día) = peso (kg) × 35 ml/kg (≤ 55 años) · 30 ml/kg (56–75) · 25 ml/kg (> 75)',
      source: 'Preparation for Dietetic Practice (M. Omstead, Toronto Metropolitan University): guía dietética general por edad y peso',
    };
    const missing = missingLabels(avail, ['weightKg', 'ageYears']);
    if (missing.length) {
      r.water = entry({ status: 'missing', unit: 'ml/día', missing, formula });
    } else {
      const band = waterBandFor(/** @type {number} */ (age));
      const value = /** @type {number} */ (F.waterMl(weightKg, band.mlPerKg));
      r.water = entry({
        value,
        unit: 'ml/día',
        inputs: { weightKg, ageYears: age, mlPerKg: band.mlPerKg },
        formula: {
          ...formula,
          substituted: `${formatTrim(weightKg)} kg × ${band.mlPerKg} ml/kg = ${formatNumber(value, 0)} ml/día (${formatNumber(value / 1000, 2)} L)`,
        },
      });
    }
  }

  // --- Macronutrientes -------------------------------------------------------
  {
    const formula = {
      name: 'Distribución estimada de macronutrientes',
      expression:
        'Proteína = g calculados · Grasas = % de la energía ÷ 9 kcal/g · Carbohidratos = energía restante ÷ 4 kcal/g',
      source: 'Grasas 20–35 % de la energía (ACSM/AND/DC 2016); factores de Atwater 4/9/4',
    };
    if (r.energyTarget.status !== 'ok' || r.protein.status !== 'ok' || !goal) {
      const blocker = r.energyTarget.status !== 'ok' ? r.energyTarget : r.protein;
      r.macros = entry({ status: blocker.status, missing: blocker.missing, reason: blocker.reason, formula });
    } else {
      const split = F.macroSplit({
        energyKcal: /** @type {number} */ (r.energyTarget.value),
        proteinG: /** @type {number} */ (r.protein.value),
        fatPct: goal.fatPctOfEnergy,
        weightKg: /** @type {number} */ (weightKg),
      });
      if (!split || !split.viable) {
        r.macros = entry({
          status: 'invalid',
          formula,
          reason: 'La proteína y las grasas superan la energía estimada. Revisa el objetivo o los factores en la configuración.',
        });
      } else {
        r.macros = entry({
          value: split.totalKcal,
          unit: 'kcal/día',
          inputs: {
            energyKcal: r.energyTarget.value,
            proteinG: r.protein.value,
            fatPct: goal.fatPctOfEnergy,
            weightKg,
            split,
            carbReference: carbReferenceFor(split.carbs.gPerKg),
          },
          formula: {
            ...formula,
            substituted: `${split.protein.grams} g × 4 + ${split.fat.grams} g × 9 + ${split.carbs.grams} g × 4 = ${split.totalKcal} kcal`,
          },
        });
      }
    }
  }

  return r;
}

/**
 * Parámetros activos (se guardan con cada evaluación para trazabilidad).
 * @param {import('./config').GoalKey|undefined} goalKey
 * @param {import('./config').ActivityKey|undefined} activityKey
 */
function parametersSnapshot(goalKey, activityKey) {
  const goal = goalKey ? GOALS[goalKey] : null;
  const activity = activityKey ? ACTIVITY_LEVELS[activityKey] : null;
  return {
    calcVersion: CALC_VERSION,
    goal: goal
      ? {
          key: goalKey,
          proteinGPerKg: goal.proteinGPerKg,
          energyAdjustment: { type: goal.energyAdjustment.type, value: goal.energyAdjustment.value },
          fatPctOfEnergy: goal.fatPctOfEnergy,
        }
      : null,
    activity: activity ? { key: activityKey, pal: activity.pal } : null,
    waterBands: WATER_BANDS.map((b) => ({ maxAge: Number.isFinite(b.maxAge) ? b.maxAge : null, mlPerKg: b.mlPerKg })),
    rehydrationLPerKg: REHYDRATION_L_PER_KG,
  };
}

/**
 * Ajuste de energía de un objetivo en palabras, en la unidad de su fuente:
 * "+10 % sobre el gasto estimado", "−500 kcal/día respecto al gasto estimado"
 * o "igual al gasto estimado".
 * @param {{ type: 'percent'|'kcal', value: number }|null|undefined} adjustment
 * @returns {string}
 */
function describeEnergyAdjustment(adjustment) {
  if (!adjustment || !adjustment.value) return 'igual al gasto estimado';
  const sign = adjustment.value > 0 ? '+' : MINUS;
  const amount = Math.abs(adjustment.value);
  return adjustment.type === 'percent'
    ? `${sign}${amount} % sobre el gasto estimado`
    : `${sign}${amount} kcal/día respecto al gasto estimado`;
}

/**
 * Ajuste de energía con el que se calculó una evaluación: el de sus parámetros
 * guardados (la versión 1.0.0 del motor lo guardaba en %) o, si no hay, el del
 * objetivo en la configuración actual.
 * @param {any} parameters  `evaluation.parameters`
 * @param {import('./config').GoalConfig|null|undefined} goal
 * @returns {{ type: 'percent'|'kcal', value: number }|null}
 */
function energyAdjustmentOf(parameters, goal) {
  const saved = parameters && parameters.goal;
  if (saved && saved.energyAdjustment && typeof saved.energyAdjustment.value === 'number') {
    return { type: saved.energyAdjustment.type === 'percent' ? 'percent' : 'kcal', value: saved.energyAdjustment.value };
  }
  if (saved && typeof saved.energyAdjustmentPct === 'number') return { type: 'percent', value: saved.energyAdjustmentPct };
  return goal ? { type: goal.energyAdjustment.type, value: goal.energyAdjustment.value } : null;
}

module.exports = {
  computeResults,
  parametersSnapshot,
  describeEnergyAdjustment,
  energyAdjustmentOf,
  waterBandFor,
  carbReferenceFor,
};
