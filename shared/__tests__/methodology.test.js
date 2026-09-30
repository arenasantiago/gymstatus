'use strict';

/**
 * La metodología se construye desde la misma configuración que calcula los
 * resultados: si un factor cambia, lo explicado debe cambiar con él.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildMethodology, bandRange } = require('../methodology');
const { CALC_VERSION, GOAL_KEYS, GOALS, ACTIVITY_KEYS, ACTIVITY_LEVELS } = require('../config');

/** @param {ReturnType<typeof buildMethodology>} m @param {string} title */
function item(m, title) {
  for (const section of m.sections) {
    const found = section.items.find((i) => i.title === title);
    if (found) return found;
  }
  throw new Error(`No existe el apartado "${title}"`);
}

test('rangos de bandas con límite superior exclusivo', () => {
  assert.equal(bandRange(0.4, 0.5, 2), '0.40–0.49');
  assert.equal(bandRange(null, 0.4, 2), '< 0.40');
  assert.equal(bandRange(0.6, Infinity, 2), '≥ 0.60');
  assert.equal(bandRange(18.5, 25, 1), '18.5–24.9');
});

test('secciones completas, cada cálculo con fórmula y fuente', () => {
  const m = buildMethodology();
  assert.equal(m.calcVersion, CALC_VERSION);
  assert.deepEqual(
    m.sections.map((s) => s.key),
    ['composition', 'energy', 'nutrients', 'scope'],
  );
  for (const section of m.sections.filter((s) => s.key !== 'scope')) {
    for (const i of section.items) {
      assert.ok(i.source, `${i.title}: cita su fuente`);
    }
  }
  for (const title of ['Índice cintura/altura (ICA)', '% de grasa estimado y masas', 'Tasa metabólica basal (TMB)', 'Proteína', 'Hidratación']) {
    assert.ok((item(m, title).formulas || []).length > 0, `${title}: muestra la fórmula`);
  }
  assert.ok(m.references.length >= 10);
  assert.ok(!/NaN|undefined|Infinity|\[object Object\]/.test(JSON.stringify(m)), 'sin valores rotos');
});

test('los PAL y los ajustes de energía mostrados son los de la configuración', () => {
  const m = buildMethodology();
  const tdee = item(m, 'Gasto energético total (GET)');
  assert.deepEqual(
    (tdee.values || []).map((v) => v.value),
    ACTIVITY_KEYS.map((k) => `PAL ${ACTIVITY_LEVELS[k].pal.toFixed(2)}`),
  );
  assert.deepEqual(
    (tdee.values || []).map((v) => v.value),
    ['PAL 1.53', 'PAL 1.76', 'PAL 2.25'],
  );

  const energy = item(m, 'Energía según el objetivo');
  const byGoal = Object.fromEntries((energy.values || []).map((v) => [v.label, v]));
  assert.equal(byGoal[GOALS.fat_loss.short].value, '\u2212500 kcal/día respecto al gasto estimado');
  assert.equal(byGoal[GOALS.muscle_gain.short].value, '+10 % sobre el gasto estimado');
  assert.equal(byGoal[GOALS.maintenance.short].value, 'igual al gasto estimado');
  for (const key of GOAL_KEYS) assert.ok(byGoal[GOALS[key].short].note, `${key}: fuente del ajuste`);
  assert.ok((energy.formulas || []).some((f) => f.includes('kcal/día') && f.includes('definición')));

  const protein = item(m, 'Proteína');
  assert.deepEqual(
    (protein.values || []).map((v) => v.value),
    GOAL_KEYS.map((k) => `${GOALS[k].proteinGPerKg.toFixed(1)} g/kg/día`),
  );
});

test('bandas de agua e ICA coherentes con el motor', () => {
  const m = buildMethodology();
  assert.deepEqual(
    (item(m, 'Hidratación').values || []).slice(0, 3).map((v) => `${v.label}: ${v.value}`),
    ['Hasta 55 años: 35 ml/kg/día', '56–75 años: 30 ml/kg/día', 'Más de 75 años: 25 ml/kg/día'],
  );
  assert.deepEqual(
    (item(m, 'Índice cintura/altura (ICA)').values || []).map((v) => v.value),
    ['< 0.40', '0.40–0.49', '0.50–0.59', '≥ 0.60'],
  );
});
