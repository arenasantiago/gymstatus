// @ts-check
'use strict';

/**
 * Fórmulas puras. No validan rangos ni conocen la interfaz: reciben números en
 * unidades métricas y devuelven un número, o null cuando el cálculo no es
 * posible (dato faltante, división por cero o logaritmo de un valor ≤ 0).
 * La orquestación, los estados y los mensajes viven en evaluation.js.
 */

const { NAVY_CONSTANTS, KCAL_PER_GRAM, REHYDRATION_L_PER_KG } = require('./config');

/**
 * @typedef {Object} MacroPart
 * @property {number} grams
 * @property {number} kcal
 * @property {number} pct     % de la energía total de la distribución.
 * @property {number} gPerKg
 */

/**
 * @typedef {Object} MacroSplit
 * @property {MacroPart} protein
 * @property {MacroPart} fat
 * @property {MacroPart} carbs
 * @property {number} totalKcal
 * @property {boolean} viable  false si proteína + grasas superan la energía objetivo.
 */

/**
 * @param {unknown} value
 * @returns {value is number}
 */
function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Redondeo decimal simétrico sin errores de coma flotante (1.005 → 1.01).
 * @param {number} value
 * @param {number} [decimals]
 * @returns {number}
 */
function round(value, decimals = 0) {
  if (!Number.isFinite(value)) return value;
  const abs = Math.abs(value);
  if (abs < 1e-9) return 0;
  let rounded = Number(`${Math.round(Number(`${abs}e${decimals}`))}e-${decimals}`);
  if (!Number.isFinite(rounded)) {
    const factor = 10 ** decimals;
    rounded = Math.round(abs * factor) / factor;
  }
  if (rounded === 0) return 0;
  return value < 0 ? -rounded : rounded;
}

/**
 * IMC = peso (kg) / altura (m)².
 * @param {number|null|undefined} weightKg
 * @param {number|null|undefined} heightCm
 * @returns {number|null}
 */
function bmi(weightKg, heightCm) {
  if (!isPositiveNumber(weightKg) || !isPositiveNumber(heightCm)) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * ICC = cintura / cadera.
 * @param {number|null|undefined} waistCm
 * @param {number|null|undefined} hipCm
 * @returns {number|null}
 */
function waistHipRatio(waistCm, hipCm) {
  if (!isPositiveNumber(waistCm) || !isPositiveNumber(hipCm)) return null;
  return waistCm / hipCm;
}

/**
 * Índice cintura/altura = cintura / altura (misma unidad).
 * @param {number|null|undefined} waistCm
 * @param {number|null|undefined} heightCm
 * @returns {number|null}
 */
function waistHeightRatio(waistCm, heightCm) {
  if (!isPositiveNumber(waistCm) || !isPositiveNumber(heightCm)) return null;
  return waistCm / heightCm;
}

/**
 * % de grasa estimado — método de circunferencias de la Marina de EE. UU.
 * (Hodgdon y Beckett, 1984), versión en centímetros:
 *   Hombres: 495 / (1.0324 − 0.19077·log10(cintura − cuello) + 0.15456·log10(altura)) − 450
 *   Mujeres: 495 / (1.29579 − 0.35004·log10(cintura + cadera − cuello) + 0.22100·log10(altura)) − 450
 * @param {import('./config').Sex} sex
 * @param {{ heightCm?: number, waistCm?: number, neckCm?: number, hipCm?: number }} m
 * @returns {number|null}
 */
function bodyFatNavy(sex, m) {
  const { heightCm, waistCm, neckCm, hipCm } = m || {};
  if (!isPositiveNumber(heightCm) || !isPositiveNumber(waistCm) || !isPositiveNumber(neckCm)) return null;

  let girth;
  if (sex === 'male') {
    girth = waistCm - neckCm;
  } else if (sex === 'female') {
    if (!isPositiveNumber(hipCm)) return null;
    girth = waistCm + hipCm - neckCm;
  } else {
    return null;
  }
  // log10 solo está definido para valores > 0.
  if (!(girth > 0)) return null;

  const k = NAVY_CONSTANTS[sex];
  const density = k.a - k.b * Math.log10(girth) + k.c * Math.log10(heightCm);
  if (!(density > 0)) return null;
  // Ecuación de Siri: % grasa = 495 / densidad − 450.
  return 495 / density - 450;
}

/**
 * @param {number|null|undefined} weightKg
 * @param {number|null|undefined} bodyFatPct
 * @returns {number|null}
 */
function fatMassKg(weightKg, bodyFatPct) {
  if (!isPositiveNumber(weightKg) || typeof bodyFatPct !== 'number' || !Number.isFinite(bodyFatPct)) return null;
  return (weightKg * bodyFatPct) / 100;
}

/**
 * Masa libre de grasa = peso − masa grasa (incluye músculo, hueso, agua y órganos).
 * @param {number|null|undefined} weightKg
 * @param {number|null|undefined} bodyFatPct
 * @returns {number|null}
 */
function fatFreeMassKg(weightKg, bodyFatPct) {
  const fat = fatMassKg(weightKg, bodyFatPct);
  if (fat === null || !isPositiveNumber(weightKg)) return null;
  return weightKg - fat;
}

/**
 * TMB — Mifflin-St Jeor (1990):
 *   10 × peso (kg) + 6.25 × altura (cm) − 5 × edad (años) + 5 (hombres) / − 161 (mujeres)
 * @param {import('./config').Sex} sex
 * @param {number|null|undefined} weightKg
 * @param {number|null|undefined} heightCm
 * @param {number|null|undefined} ageYears
 * @returns {number|null}
 */
function bmrMifflinStJeor(sex, weightKg, heightCm, ageYears) {
  if (!isPositiveNumber(weightKg) || !isPositiveNumber(heightCm) || !isPositiveNumber(ageYears)) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  return null;
}

/**
 * Gasto energético diario total = TMB × PAL.
 * @param {number|null|undefined} bmrKcal
 * @param {number|null|undefined} pal
 * @returns {number|null}
 */
function totalEnergyExpenditure(bmrKcal, pal) {
  if (!isPositiveNumber(bmrKcal) || !isPositiveNumber(pal)) return null;
  return bmrKcal * pal;
}

/**
 * Energía objetivo a partir del GET y del ajuste del objetivo, en la unidad
 * de su fuente:
 *   - 'percent': GET × (1 + valor ÷ 100)
 *   - 'kcal':    GET + valor (kcal/día)
 * @param {number|null|undefined} tdeeKcal
 * @param {{ type: 'percent'|'kcal', value: number }|null|undefined} adjustment
 * @returns {number|null}
 */
function energyTarget(tdeeKcal, adjustment) {
  if (!isPositiveNumber(tdeeKcal) || !adjustment) return null;
  const { type, value: adj } = adjustment;
  if (typeof adj !== 'number' || !Number.isFinite(adj)) return null;
  let value;
  if (type === 'percent') value = tdeeKcal * (1 + adj / 100);
  else if (type === 'kcal') value = tdeeKcal + adj;
  else return null;
  return value > 0 ? value : null;
}

/**
 * Proteína (g/día) = peso (kg) × factor (g/kg).
 * @param {number|null|undefined} weightKg
 * @param {number|null|undefined} gPerKg
 * @returns {number|null}
 */
function proteinGrams(weightKg, gPerKg) {
  if (!isPositiveNumber(weightKg) || !isPositiveNumber(gPerKg)) return null;
  return weightKg * gPerKg;
}

/**
 * Agua base (ml/día) = peso (kg) × ml/kg.
 * @param {number|null|undefined} weightKg
 * @param {number|null|undefined} mlPerKg
 * @returns {number|null}
 */
function waterMl(weightKg, mlPerKg) {
  if (!isPositiveNumber(weightKg) || !isPositiveNumber(mlPerKg)) return null;
  return weightKg * mlPerKg;
}

/**
 * Distribución de macronutrientes: proteína fija (g), grasas como % de la
 * energía y carbohidratos con la energía restante. Trabaja con gramos enteros
 * para que "g × kcal/g" cuadre exactamente en pantalla y en el PDF.
 * @param {{ energyKcal: number, proteinG: number, fatPct: number, weightKg: number }} input
 * @returns {MacroSplit|null}
 */
function macroSplit({ energyKcal, proteinG, fatPct, weightKg }) {
  if (!isPositiveNumber(energyKcal) || !isPositiveNumber(proteinG) || !isPositiveNumber(weightKg)) return null;
  if (typeof fatPct !== 'number' || !(fatPct >= 0 && fatPct < 100)) return null;

  const proteinG0 = round(proteinG);
  const fatG0 = round((energyKcal * fatPct) / 100 / KCAL_PER_GRAM.fat);
  const remainingKcal = energyKcal - proteinG0 * KCAL_PER_GRAM.protein - fatG0 * KCAL_PER_GRAM.fat;
  const viable = remainingKcal >= 0;
  const carbsG0 = round(Math.max(0, remainingKcal) / KCAL_PER_GRAM.carbs);

  const kcal = {
    protein: proteinG0 * KCAL_PER_GRAM.protein,
    fat: fatG0 * KCAL_PER_GRAM.fat,
    carbs: carbsG0 * KCAL_PER_GRAM.carbs,
  };
  const totalKcal = kcal.protein + kcal.fat + kcal.carbs;
  /** @param {number} part */
  const pct = (part) => (totalKcal > 0 ? round((part / totalKcal) * 100) : 0);

  return {
    protein: { grams: proteinG0, kcal: kcal.protein, pct: pct(kcal.protein), gPerKg: round(proteinG0 / weightKg, 1) },
    fat: { grams: fatG0, kcal: kcal.fat, pct: pct(kcal.fat), gPerKg: round(fatG0 / weightKg, 1) },
    carbs: { grams: carbsG0, kcal: kcal.carbs, pct: pct(kcal.carbs), gPerKg: round(carbsG0 / weightKg, 1) },
    totalKcal,
    viable,
  };
}

/**
 * Reposición tras entrenar: 1.25–1.5 L por cada kg perdido (ACSM/AND/DC 2016).
 * @param {number|null|undefined} kgLost  Peso antes − peso después del entrenamiento.
 * @returns {{ min: number, max: number }|null}
 */
function rehydrationLiters(kgLost) {
  if (!isPositiveNumber(kgLost)) return null;
  return { min: kgLost * REHYDRATION_L_PER_KG.min, max: kgLost * REHYDRATION_L_PER_KG.max };
}

module.exports = {
  isPositiveNumber,
  round,
  bmi,
  waistHipRatio,
  waistHeightRatio,
  bodyFatNavy,
  fatMassKg,
  fatFreeMassKg,
  bmrMifflinStJeor,
  totalEnergyExpenditure,
  energyTarget,
  proteinGrams,
  waterMl,
  macroSplit,
  rehydrationLiters,
};
