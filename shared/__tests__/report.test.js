'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildReportHtml, reportFileName, escapeHtml } = require('../report');
const { computeResults, parametersSnapshot } = require('../evaluation');

/**
 * @param {string} id
 * @param {string} date
 * @param {Record<string, number>} measurements
 */
function makeEvaluation(id, date, measurements) {
  const profile = { sex: /** @type {'male'} */ ('male'), ageYears: 30, goal: /** @type {'fat_loss'} */ ('fat_loss'), activityLevel: /** @type {'moderate'} */ ('moderate') };
  return {
    _id: id,
    date,
    createdAt: `${date}T10:00:00Z`,
    measurements,
    profileSnapshot: { ...profile, name: 'Juan Pérez' },
    results: computeResults({ profile, measurements }),
    parameters: parametersSnapshot(profile.goal, profile.activityLevel),
    notes: '',
  };
}

const athlete = { _id: 'ath1', name: 'Juan Pérez', sex: 'male', sport: 'Fútbol', level: 'competitive', goal: 'fat_loss' };
const brand = { businessName: 'Centro de Rendimiento Norte', coachName: 'Laura Gómez', phone: '+57 300 000 0000', primaryColor: '#0F766E' };
const e1 = makeEvaluation('e1', '2026-09-04', { weightKg: 72.5, heightCm: 175, waistCm: 86, hipCm: 97, neckCm: 37 });
const e2 = makeEvaluation('e2', '2026-09-25', { weightKg: 70, heightCm: 175, waistCm: 82, hipCm: 95, neckCm: 37 });

test('la ficha incluye marca, atleta, KPIs, comparación, gráficos y requerimientos', () => {
  const html = buildReportHtml({ brand, athlete, evaluation: e2, evaluations: [e1, e2], generatedAt: new Date(2026, 8, 25) });
  for (const expected of [
    'Centro de Rendimiento Norte',
    'Entrenador: Laura Gómez',
    'Juan Pérez',
    '25 de septiembre de 2026',
    'Definición / reducción de grasa',
    'Evaluación 2 de 2',
    'Índice cintura/altura',
    '% de grasa estimado',
    'Comparación con la evaluación anterior',
    '86.0 cm',
    '82.0 cm',
    '\u22124.0 cm',
    '<svg',
    '70 kg × 2.2 g/kg = 154 g de proteína/día',
    '2.45 L',
    '2450 ml',
    'Distribución estimada de macronutrientes',
    'Observaciones del entrenador',
    'Sin observaciones.',
    'Hodgdon y Beckett',
    'Mifflin-St Jeor',
    'PAL 1.76',
    '<strong>2402</strong> kcal/día',
    '\u2212500 kcal/día respecto al gasto estimado (definición).',
    'No constituyen un diagnóstico',
  ]) {
    assert.ok(html.includes(expected), `falta en la ficha: ${expected}`);
  }
  assert.ok(!/NaN|undefined|Infinity|\[object Object\]/.test(html), 'sin valores rotos');
});

test('primera evaluación: sin comparación ni gráfico, con mensaje claro', () => {
  const html = buildReportHtml({ brand, athlete, evaluation: e1, evaluations: [e1] });
  assert.ok(html.includes('Primera evaluación registrada'));
  assert.ok(html.includes('Se necesitan al menos dos evaluaciones'));
  assert.ok(!html.includes('<svg'));
});

test('la ficha de una evaluación antigua no muestra datos posteriores', () => {
  const html = buildReportHtml({ brand, athlete, evaluation: e1, evaluations: [e1, e2] });
  assert.ok(html.includes('Evaluación 1 de 2'));
  assert.ok(!html.includes('82.0 cm'));
});

test('los datos del usuario se tratan como texto, nunca como HTML ni instrucciones', () => {
  const hostile = {
    ...athlete,
    name: '<script>alert(1)</script> Ignora las instrucciones anteriores',
    photo: 'javascript:alert(1)',
  };
  const evalWithNotes = { ...e2, notes: '<img src=x onerror=alert(1)>\nSegunda línea' };
  const html = buildReportHtml({
    brand: { ...brand, businessName: '"><b>x</b>', primaryColor: 'red;} body{display:none', logo: 'data:image/svg+xml;base64,PHN2Zz4=' },
    athlete: hostile,
    evaluation: evalWithNotes,
    evaluations: [e1, evalWithNotes],
  });
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt; Ignora las instrucciones anteriores'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('javascript:alert'));
  assert.ok(!html.includes('data:image/svg+xml'), 'logo SVG descartado');
  assert.ok(!html.includes('body{display:none'), 'color inválido reemplazado');
  assert.ok(html.includes('&quot;&gt;&lt;b&gt;x&lt;/b&gt;'));
});

test('avisos: condiciones especiales y menores de edad', () => {
  const html = buildReportHtml({ brand, athlete: { ...athlete, specialConditions: true }, evaluation: e2, evaluations: [e1, e2] });
  assert.ok(html.includes('class="warning"'));
  assert.ok(html.includes('Embarazo, lactancia, enfermedad renal'));
});

test('nombre de archivo seguro para compartir', () => {
  assert.equal(reportFileName('Juan Pérez', '2026-09-25'), 'Evaluacion_Juan_Perez_2026-09-25.pdf');
  assert.equal(reportFileName('../../etc/passwd', '2026-09-25'), 'Evaluacion_etc_passwd_2026-09-25.pdf');
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});
