'use strict';

/**
 * Pruebas del motor de cálculo compartido (node:test, sin dependencias).
 * Los valores esperados se calcularon a mano a partir de las fórmulas
 * publicadas (fuentes en shared/config.js y en la pantalla de Metodología).
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const F = require('../formulas');
const { computeResults, parametersSnapshot, describeEnergyAdjustment, energyAdjustmentOf } = require('../evaluation');
const { GOALS, ACTIVITY_LEVELS } = require('../config');

/** @param {number} actual @param {number} expected @param {number} [eps] */
function near(actual, expected, eps = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= eps, `esperado ${expected}, obtenido ${actual}`);
}

test('IMC = peso / altura²', () => {
  near(/** @type {number} */ (F.bmi(70, 175)), 22.857142857);
  assert.equal(F.bmi(70, 0), null, 'no divide por cero');
  assert.equal(F.bmi(undefined, 175), null);
  assert.equal(F.bmi(-70, 175), null);
});

test('ICC e índice cintura/altura', () => {
  near(/** @type {number} */ (F.waistHipRatio(80, 95)), 0.842105263);
  near(/** @type {number} */ (F.waistHeightRatio(80, 175)), 0.457142857);
  assert.equal(F.waistHipRatio(80, 0), null);
  assert.equal(F.waistHeightRatio(80, 0), null);
});

test('% de grasa — Marina de EE. UU. (Hodgdon y Beckett, 1984)', () => {
  near(/** @type {number} */ (F.bodyFatNavy('male', { heightCm: 175, waistCm: 80, neckCm: 37 })), 13.714489434, 1e-6);
  near(/** @type {number} */ (F.bodyFatNavy('female', { heightCm: 165, waistCm: 70, hipCm: 98, neckCm: 32 })), 26.405882143, 1e-6);
  // Mujer sin cadera: no se calcula.
  assert.equal(F.bodyFatNavy('female', { heightCm: 165, waistCm: 70, neckCm: 32 }), null);
  // Cintura ≤ cuello → log10 de un valor ≤ 0: no se calcula.
  assert.equal(F.bodyFatNavy('male', { heightCm: 175, waistCm: 37, neckCm: 37 }), null);
  assert.equal(F.bodyFatNavy('male', { heightCm: 175, waistCm: 30, neckCm: 37 }), null);
});

test('TMB — Mifflin-St Jeor', () => {
  assert.equal(F.bmrMifflinStJeor('male', 70, 175, 30), 1648.75);
  assert.equal(F.bmrMifflinStJeor('female', 60, 165, 25), 1345.25);
  assert.equal(F.bmrMifflinStJeor('male', 70, 175, 0), null);
});

test('proteína: 70 kg × 2.2 g/kg = 154 g/día', () => {
  near(/** @type {number} */ (F.proteinGrams(70, 2.2)), 154);
  assert.equal(F.round(/** @type {number} */ (F.proteinGrams(70, 2.2))), 154);
});

test('agua base y reposición tras entrenar', () => {
  assert.equal(F.waterMl(70, 35), 2450);
  assert.deepEqual(F.rehydrationLiters(1), { min: 1.25, max: 1.5 });
  assert.equal(F.rehydrationLiters(0), null);
});

test('reparto de macronutrientes cuadra con la energía', () => {
  // Energía del ejemplo completo: 1648.75 kcal × PAL 1.76 − 500 kcal = 2401.8 kcal/día.
  const split = /** @type {NonNullable<ReturnType<typeof F.macroSplit>>} */ (
    F.macroSplit({ energyKcal: 1648.75 * 1.76 - 500, proteinG: 154, fatPct: 25, weightKg: 70 })
  );
  assert.equal(split.protein.grams, 154);
  assert.equal(split.fat.grams, 67);
  assert.equal(split.carbs.grams, 296);
  assert.equal(split.totalKcal, 154 * 4 + 67 * 9 + 296 * 4);
  assert.equal(split.protein.pct + split.fat.pct + split.carbs.pct, 100);
  assert.equal(split.viable, true);
  // Proteína + grasas por encima de la energía: se marca como no viable.
  const impossible = /** @type {NonNullable<ReturnType<typeof F.macroSplit>>} */ (
    F.macroSplit({ energyKcal: 500, proteinG: 154, fatPct: 25, weightKg: 70 })
  );
  assert.equal(impossible.viable, false);
});

test('redondeo decimal sin errores de coma flotante', () => {
  assert.equal(F.round(1.005, 2), 1.01);
  assert.equal(F.round(-4.65, 1), -4.7);
  assert.equal(F.round(0.49486, 2), 0.49);
  assert.equal(F.round(-0.0001, 2), 0);
});

test('evaluación completa (hombre, definición, actividad moderada)', () => {
  const r = computeResults({
    profile: { sex: 'male', ageYears: 30, goal: 'fat_loss', activityLevel: 'moderate' },
    measurements: { weightKg: 70, heightCm: 175, waistCm: 80, hipCm: 95, neckCm: 37 },
  });
  for (const key of ['bmi', 'whtr', 'whr', 'bodyFat', 'fatMass', 'leanMass', 'bmr', 'tdee', 'energyTarget', 'protein', 'water', 'macros']) {
    assert.equal(r[key].status, 'ok', `${key} debería calcularse`);
    assert.ok(r[key].formula.expression, `${key} guarda la fórmula`);
    assert.ok(r[key].formula.substituted, `${key} guarda la operación`);
  }
  near(/** @type {number} */ (r.bodyFat.value), 13.714489434, 1e-6);
  near(/** @type {number} */ (r.fatMass.value), 9.600142604, 1e-6);
  near(/** @type {number} */ (r.leanMass.value), 60.399857396, 1e-6);
  assert.equal(r.bmr.value, 1648.75);
  assert.equal(r.tdee.value, 1648.75 * 1.76, 'PAL moderado de FAO/OMS/UNU: 1.76');
  assert.equal(r.energyTarget.value, 1648.75 * 1.76 - 500, 'definición: −500 kcal/día sobre el GET');
  assert.equal(r.energyTarget.formula.substituted, '2902 \u2212 500 kcal (definición) = 2402 kcal/día');
  assert.equal(r.energyTarget.formula.expression, 'Energía = GET + ajuste del objetivo (kcal/día)');
  assert.match(String(r.energyTarget.formula.source), /ACSM\/AND\/DC 2016/);
  assert.equal(r.water.value, 2450);
  assert.equal(r.protein.formula.substituted, '70 kg × 2.2 g/kg = 154 g de proteína/día');
  assert.equal(r.bmi.interpretation && r.bmi.interpretation.tone, 'neutral', 'el IMC nunca se colorea como alerta');
  assert.equal(r.whtr.interpretation && r.whtr.interpretation.key, 'healthy');
  assert.equal(r.whr.interpretation && r.whr.interpretation.key, 'below_cutoff');
  assert.equal(r.bodyFat.interpretation, null, 'el % de grasa no se clasifica');
  assert.equal(r.macros.inputs.split.protein.grams, 154);
});

test('informa exactamente qué medición falta', () => {
  const r = computeResults({
    profile: { sex: 'female', ageYears: 25, goal: 'muscle_gain', activityLevel: 'light' },
    measurements: { weightKg: 60, heightCm: 165, waistCm: 70 },
  });
  assert.equal(r.bodyFat.status, 'missing');
  assert.deepEqual(r.bodyFat.missing, ['Cuello', 'Cadera']);
  assert.equal(r.whr.status, 'missing');
  assert.deepEqual(r.whr.missing, ['Cadera']);
  assert.equal(r.fatMass.status, 'missing');
  // Lo que sí se puede calcular, se calcula.
  assert.equal(r.bmi.status, 'ok');
  assert.equal(r.whtr.status, 'ok');
  assert.equal(r.bmr.status, 'ok');
  assert.equal(r.protein.status, 'ok');
});

test('sin objetivo ni actividad no se inventan requerimientos', () => {
  const r = computeResults({
    profile: { sex: 'male', ageYears: 30 },
    measurements: { weightKg: 70, heightCm: 175 },
  });
  assert.equal(r.bmr.status, 'ok');
  assert.equal(r.tdee.status, 'missing');
  assert.deepEqual(r.tdee.missing, ['Nivel de actividad']);
  assert.equal(r.protein.status, 'missing');
  assert.deepEqual(r.protein.missing, ['Objetivo']);
  assert.equal(r.macros.status, 'missing');
});

test('menor de 18: no se calculan fórmulas de adultos', () => {
  const r = computeResults({
    profile: { sex: 'male', ageYears: 16, goal: 'performance', activityLevel: 'vigorous' },
    measurements: { weightKg: 60, heightCm: 170, waistCm: 70, neckCm: 34 },
  });
  assert.equal(r.bodyFat.status, 'not_applicable');
  assert.equal(r.bmr.status, 'not_applicable');
  assert.equal(r.tdee.status, 'not_applicable');
  assert.equal(r.macros.status, 'not_applicable');
  assert.equal(r.bmi.interpretation && r.bmi.interpretation.key, 'adult_reference');
  // NICE 1.10.10: las bandas de cintura/altura sí aplican desde los 5 años.
  assert.equal(r.whtr.interpretation && r.whtr.interpretation.key, 'healthy');
  assert.match(String(r.whtr.interpretation && r.whtr.interpretation.reference), /1\.10\.10/);
});

test('altura 0 o datos imposibles: estado inválido, nunca Infinity/NaN', () => {
  const r = computeResults({
    profile: { sex: 'male', ageYears: 30 },
    measurements: { weightKg: 70, heightCm: 0, waistCm: 80 },
  });
  assert.equal(r.bmi.status, 'invalid');
  assert.equal(r.bmi.value, null);
  assert.equal(r.whtr.status, 'invalid');
  for (const entry of Object.values(r)) {
    assert.ok(entry.value === null || Number.isFinite(entry.value));
  }
});

test('la configuración guarda los parámetros usados', () => {
  const snap = parametersSnapshot('fat_loss', 'moderate');
  assert.equal(snap.goal && snap.goal.proteinGPerKg, GOALS.fat_loss.proteinGPerKg);
  assert.deepEqual(snap.goal && snap.goal.energyAdjustment, { type: 'kcal', value: -500 });
  assert.equal(snap.activity && snap.activity.pal, 1.76);
  assert.ok(snap.calcVersion);
});

test('PAL por defecto: ejemplos de FAO/OMS/UNU 2004 (tabla 5.1), dentro de los rangos de la tabla 5.3', () => {
  assert.equal(ACTIVITY_LEVELS.light.pal, 1.53);
  assert.equal(ACTIVITY_LEVELS.moderate.pal, 1.76);
  assert.equal(ACTIVITY_LEVELS.vigorous.pal, 2.25);
  for (const key of /** @type {const} */ (['light', 'moderate', 'vigorous'])) {
    const { pal, palRange } = ACTIVITY_LEVELS[key];
    assert.ok(pal >= palRange[0] && pal <= palRange[1], `${key}: ${pal} fuera de ${palRange.join('–')}`);
  }
});

test('ajuste de energía en la unidad de su fuente', () => {
  assert.deepEqual(
    { type: GOALS.fat_loss.energyAdjustment.type, value: GOALS.fat_loss.energyAdjustment.value },
    { type: 'kcal', value: -500 },
    'definición: déficit en kcal/día (ACSM/AND/DC 2016), no en %',
  );
  assert.equal(GOALS.muscle_gain.energyAdjustment.type, 'percent');
  assert.equal(GOALS.muscle_gain.energyAdjustment.value, 10);
  assert.equal(GOALS.maintenance.energyAdjustment.value, 0);
  assert.equal(GOALS.performance.energyAdjustment.value, 0);
  for (const key of /** @type {const} */ (['muscle_gain', 'fat_loss', 'maintenance', 'performance'])) {
    assert.ok(GOALS[key].energyAdjustment.source, `${key}: el ajuste de energía cita su fuente`);
    assert.ok(GOALS[key].proteinSource, `${key}: el factor de proteína cita su fuente`);
  }

  near(/** @type {number} */ (F.energyTarget(2000, { type: 'kcal', value: -500 })), 1500);
  near(/** @type {number} */ (F.energyTarget(2000, { type: 'percent', value: 10 })), 2200);
  near(/** @type {number} */ (F.energyTarget(2000, { type: 'kcal', value: 0 })), 2000);
  assert.equal(F.energyTarget(400, { type: 'kcal', value: -500 }), null, 'nunca energía negativa');
  assert.equal(F.energyTarget(null, { type: 'kcal', value: -500 }), null);
  assert.equal(F.energyTarget(2000, null), null);
  assert.equal(F.energyTarget(2000, /** @type {any} */ ({ type: 'x', value: 5 })), null);
  assert.equal(F.energyTarget(2000, { type: 'kcal', value: Number.NaN }), null);
});

test('energía objetivo: volumen en %, mantenimiento sin ajuste', () => {
  // Mujer, 25 años, 60 kg, 165 cm: TMB = 600 + 1031.25 − 125 − 161 = 1345.25 kcal.
  const gain = computeResults({
    profile: { sex: 'female', ageYears: 25, goal: 'muscle_gain', activityLevel: 'light' },
    measurements: { weightKg: 60, heightCm: 165 },
  });
  assert.equal(gain.bmr.value, 1345.25);
  assert.equal(gain.tdee.value, 1345.25 * 1.53);
  near(/** @type {number} */ (gain.energyTarget.value), 1345.25 * 1.53 * 1.1);
  assert.equal(gain.energyTarget.formula.substituted, '2058 × 1.1 (volumen, +10 %) = 2264 kcal/día');

  const keep = computeResults({
    profile: { sex: 'male', ageYears: 30, goal: 'maintenance', activityLevel: 'vigorous' },
    measurements: { weightKg: 70, heightCm: 175 },
  });
  assert.equal(keep.energyTarget.value, 1648.75 * 2.25);
  assert.equal(keep.energyTarget.formula.substituted, '3710 (mantenimiento: sin ajuste) = 3710 kcal/día');
});

test('textos del ajuste y evaluaciones guardadas con la versión anterior del motor', () => {
  assert.equal(describeEnergyAdjustment({ type: 'kcal', value: -500 }), '\u2212500 kcal/día respecto al gasto estimado');
  assert.equal(describeEnergyAdjustment({ type: 'percent', value: 10 }), '+10 % sobre el gasto estimado');
  assert.equal(describeEnergyAdjustment({ type: 'kcal', value: 0 }), 'igual al gasto estimado');
  // Motor 1.0.0: guardaba el ajuste como energyAdjustmentPct. Se respeta lo guardado.
  assert.deepEqual(energyAdjustmentOf({ goal: { energyAdjustmentPct: -15 } }, GOALS.fat_loss), { type: 'percent', value: -15 });
  assert.deepEqual(energyAdjustmentOf({ goal: { energyAdjustment: { type: 'kcal', value: -500 } } }, GOALS.fat_loss), {
    type: 'kcal',
    value: -500,
  });
  assert.deepEqual(energyAdjustmentOf(undefined, GOALS.muscle_gain), { type: 'percent', value: 10 });
  assert.equal(energyAdjustmentOf(undefined, null), null);
});
