'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { interpretBmi, interpretWhr, interpretWhtr } = require('../interpretation');
const {
  parseDecimal,
  sanitizeText,
  validateMeasurements,
  validateAthlete,
  validateEvaluation,
  validateBrand,
  hasErrors,
} = require('../validation');
const { compareValues, buildComparison, buildSeries, currentAndPrevious, summarizeTrend } = require('../progress');
const { buildLineChart } = require('../chart');
const { ageOn, parseDisplayDate, maskDateInput, formatDisplayDate, formatShortDate, toIsoDate } = require('../dates');
const { toCanonical, fromCanonical } = require('../units');
const { formatSigned, formatLiters, formatTrim } = require('../format');
const { contrastRatio, accentOnWhite, readableTextOn } = require('../color');

test('índice cintura/altura: rangos NICE sobre el valor mostrado', () => {
  assert.equal(interpretWhtr(0.457, 22, 30)?.key, 'healthy');
  assert.equal(interpretWhtr(0.49486, 22, 30)?.key, 'healthy', '0.49486 se muestra 0.49');
  assert.equal(interpretWhtr(0.5, 22, 30)?.key, 'increased');
  assert.equal(interpretWhtr(0.6, 22, 30)?.key, 'high');
  assert.equal(interpretWhtr(0.38, 22, 30)?.key, 'below_reference');
  assert.equal(interpretWhtr(0.55, 36, 30)?.key, 'not_applicable', 'NICE: solo con IMC < 35');
});

test('ICC: punto de corte OMS por sexo', () => {
  assert.equal(interpretWhr(0.84, 'male', 30)?.key, 'below_cutoff');
  assert.equal(interpretWhr(0.9, 'male', 30)?.key, 'at_or_above_cutoff');
  assert.equal(interpretWhr(0.85, 'female', 30)?.key, 'at_or_above_cutoff');
  assert.equal(interpretWhr(0.84, 'female', 30)?.key, 'below_cutoff');
});

test('IMC: categoría OMS en tono neutro y aviso para atletas', () => {
  const i = interpretBmi(27.4, 28);
  assert.equal(i?.key, 'overweight');
  assert.equal(i?.tone, 'neutral');
  assert.match(String(i?.detail), /masa muscular/);
  assert.equal(interpretBmi(24.96, 28)?.key, 'overweight', '24.96 se muestra 25.0');
});

test('números: coma o punto decimal, vacíos y basura', () => {
  assert.equal(parseDecimal('70,5'), 70.5);
  assert.equal(parseDecimal(' 70.5 '), 70.5);
  assert.equal(parseDecimal(''), null);
  assert.equal(parseDecimal(null), null);
  assert.ok(Number.isNaN(parseDecimal('abc')));
  assert.ok(Number.isNaN(parseDecimal('1.2.3')));
  assert.ok(Number.isNaN(parseDecimal('-5')));
  assert.ok(Number.isNaN(parseDecimal({ $gt: '' })), 'un objeto nunca es un número');
});

test('mediciones: obligatorias, rangos plausibles y coherencia', () => {
  const missing = validateMeasurements({});
  assert.ok(missing.errors.weightKg && missing.errors.heightCm);

  const bad = validateMeasurements({ weightKg: '700', heightCm: '1.75', waistCm: '80', neckCm: '85' });
  assert.match(bad.errors.weightKg, /entre 25 y 250 kg/);
  assert.match(bad.errors.heightCm, /entre 120 y 230 cm/, 'detecta altura en metros por error');
  assert.match(bad.errors.neckCm, /entre 20 y 70 cm/, 'el rango se valida antes que la coherencia');

  // Ambos valores dentro de rango pero incoherentes entre sí.
  const incoherent = validateMeasurements({ weightKg: '70', heightCm: '175', waistCm: '45', neckCm: '50' });
  assert.match(incoherent.errors.neckCm, /menor que la cintura/);

  const ok = validateMeasurements({ weightKg: '70,46', heightCm: '175', waistCm: '80.04' });
  assert.equal(hasErrors(ok.errors), false);
  assert.deepEqual(ok.value, { weightKg: 70.5, heightCm: 175, waistCm: 80 });
});

test('unidades imperiales: se guardan siempre en métrico', () => {
  const r = validateMeasurements({ weightKg: '154.32', heightCm: '68.9' }, { unitSystem: 'imperial' });
  assert.equal(hasErrors(r.errors), false);
  assert.equal(r.value.weightKg, 70);
  assert.equal(r.value.heightCm, 175);
  assert.ok(Math.abs(fromCanonical(toCanonical(10, 'mass', 'imperial'), 'mass', 'imperial') - 10) < 1e-9);
});

test('perfil del atleta: edad, sexo y texto libre saneado', () => {
  const today = '2026-09-25';
  const r = validateAthlete(
    { name: '  Ana\u0000 Pérez  ', sex: 'female', birthDate: '2000-09-26', goal: 'fat_loss', activityLevel: 'moderate' },
    { today },
  );
  assert.equal(hasErrors(r.errors), false);
  assert.equal(r.value.name, 'Ana Pérez');
  assert.equal(r.value.level, 'recreational');

  const kid = validateAthlete({ name: 'Leo', sex: 'male', birthDate: '2020-01-01', goal: 'performance', activityLevel: 'light' }, { today });
  assert.match(kid.errors.birthDate, /entre 14 y 90/);

  const inj = validateAthlete({ name: { $ne: null }, sex: { $gt: '' }, birthDate: 'x', goal: 'hack', activityLevel: 'x' }, { today });
  assert.ok(inj.errors.name && inj.errors.sex && inj.errors.birthDate && inj.errors.goal && inj.errors.activityLevel);
});

test('evaluación: fecha válida, no futura y no anterior al nacimiento', () => {
  const opts = { today: '2026-09-25', birthDate: '2000-01-01' };
  assert.match(validateEvaluation({ date: '2026-10-10', measurements: { weightKg: 70, heightCm: 175 } }, opts).errors.date, /futura/);
  assert.match(validateEvaluation({ date: '1999-12-31', measurements: { weightKg: 70, heightCm: 175 } }, opts).errors.date, /nacimiento/);
  assert.match(validateEvaluation({ date: '2026-02-30', measurements: { weightKg: 70, heightCm: 175 } }, opts).errors.date, /válida/);
  const ok = validateEvaluation({ date: '2026-09-25', measurements: { weightKg: 70, heightCm: 175 }, notes: 'Buen trabajo' }, opts);
  assert.equal(hasErrors(ok.errors), false);
});

test('marca: color hexadecimal, contacto e imágenes seguras', () => {
  const r = validateBrand({ primaryColor: 'red', email: 'no-es-correo', logo: 'data:image/svg+xml;base64,PHN2Zz4=' });
  assert.ok(r.errors.primaryColor && r.errors.email && r.errors.logo, 'SVG rechazado (puede contener scripts)');
  const ok = validateBrand({ primaryColor: '#0f766e', email: 'coach@club.com', phone: '+57 300 123 4567' });
  assert.equal(hasErrors(ok.errors), false);
  assert.equal(ok.value.primaryColor, '#0F766E');
});

test('texto libre: se limita y se limpia, nunca se interpreta', () => {
  const long = 'a'.repeat(5000);
  assert.equal(sanitizeText(long, 1000).length, 1000);
  assert.equal(sanitizeText('línea 1\r\n\r\n\r\n\r\nlínea 2', 100), 'línea 1\n\nlínea 2');
  assert.equal(sanitizeText(42, 10), '');
});

test('comparación 86 → 82 cm: −4.0 cm y −4.7 %', () => {
  const c = compareValues('waistCm', 82, 86, 'fat_loss');
  assert.equal(c.delta, -4);
  assert.equal(c.deltaPct, -4.7);
  assert.equal(c.direction, 'down');
  assert.equal(c.tone, 'favorable');
  assert.equal(formatSigned(c.delta, 1), '\u22124.0');
});

test('% de grasa se compara en puntos, índices sin %', () => {
  const bf = compareValues('bodyFatPct', 14.2, 15.1, 'fat_loss');
  assert.equal(bf.delta, -0.9);
  assert.equal(bf.deltaPct, null);
  const whtr = compareValues('whtr', 0.47, 0.49, 'fat_loss');
  assert.equal(whtr.deltaPct, null);
  assert.equal(whtr.delta, -0.02);
});

test('el color del cambio depende del objetivo', () => {
  assert.equal(compareValues('weightKg', 72, 70, 'muscle_gain').tone, 'favorable');
  assert.equal(compareValues('weightKg', 72, 70, 'fat_loss').tone, 'unfavorable');
  assert.equal(compareValues('weightKg', 72, 70, 'maintenance').tone, 'neutral');
  assert.equal(compareValues('weightKg', 70.04, 70, 'fat_loss').tone, 'neutral', 'sin cambio visible = neutro');
});

const history = [
  { _id: 'c', date: '2026-09-18', createdAt: '2026-09-18T10:00:00Z', measurements: { weightKg: 71, waistCm: 83 }, profileSnapshot: { goal: 'fat_loss' }, results: { bodyFat: { status: 'ok', value: 15 } } },
  { _id: 'a', date: '2026-09-04', createdAt: '2026-09-04T10:00:00Z', measurements: { weightKg: 72.5, waistCm: 86 }, profileSnapshot: { goal: 'fat_loss' }, results: { bodyFat: { status: 'missing', value: null } } },
  { _id: 'd', date: '2026-09-25', createdAt: '2026-09-25T10:00:00Z', measurements: { weightKg: 70, waistCm: 82 }, profileSnapshot: { goal: 'fat_loss' }, results: { bodyFat: { status: 'ok', value: 14 } } },
  { _id: 'b', date: '2026-09-04', createdAt: '2026-09-04T12:00:00Z', measurements: { weightKg: 72.4 }, profileSnapshot: { goal: 'fat_loss' }, results: {} },
];

test('historial: orden cronológico y evaluación anterior', () => {
  const { current, previous, sorted } = currentAndPrevious(history);
  assert.deepEqual(sorted.map((e) => e._id), ['a', 'b', 'c', 'd']);
  assert.equal(current?._id, 'd');
  assert.equal(previous?._id, 'c');
  assert.equal(currentAndPrevious(history, 'c').previous?._id, 'b');
  assert.equal(currentAndPrevious(history, 'a').previous, null);
});

test('series y tendencia: solo evaluaciones con dato', () => {
  const waist = buildSeries(history, 'waistCm');
  assert.deepEqual(waist.map((p) => p.value), [86, 83, 82]);
  const bf = buildSeries(history, 'bodyFatPct');
  assert.deepEqual(bf.map((p) => p.value), [15, 14], 'ignora resultados no calculados');
  const trend = summarizeTrend(waist, 'waistCm', 'fat_loss');
  assert.equal(trend?.delta, -4);
  assert.equal(trend?.days, 21);
  assert.equal(trend?.weeks, 3);
  const rows = buildComparison(history[2], history[0]);
  assert.equal(rows.find((r) => r.metric === 'waistCm')?.delta, -1);
});

test('gráfico: eje X proporcional a la fecha, sin NaN', () => {
  const series = buildSeries(history, 'weightKg');
  const chart = buildLineChart({ series, width: 300, height: 160 });
  const xs = chart.points.map((p) => p.x);
  assert.ok(xs.every((x, i) => i === 0 || x >= xs[i - 1]), 'x crece con la fecha');
  assert.equal(xs[0], xs[1], 'misma fecha, misma x');
  for (const p of chart.points) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  assert.ok(chart.yTicks.length >= 2);

  const single = buildLineChart({ series: [{ date: '2026-09-25', value: 70 }], width: 300, height: 160 });
  assert.equal(single.points.length, 1);
  assert.ok(Number.isFinite(single.points[0].y));
  assert.equal(buildLineChart({ series: [], width: 300, height: 160 }).empty, true);
});

test('fechas de calendario sin desfase de zona horaria', () => {
  assert.equal(toIsoDate(new Date('2026-09-25T00:00:00.000Z')), '2026-09-25');
  assert.equal(formatDisplayDate('2026-09-25T00:00:00.000Z'), '25/09/2026');
  assert.equal(formatShortDate('2026-09-04'), '4 sep');
  assert.equal(ageOn('2000-09-26', '2026-09-25'), 25);
  assert.equal(ageOn('2000-09-25', '2026-09-25'), 26);
  assert.equal(parseDisplayDate('31/02/2026'), null);
  assert.equal(parseDisplayDate('5/9/2026'), '2026-09-05');
  assert.equal(maskDateInput('25092026'), '25/09/2026');
});

test('formato: litros, signos y números limpios', () => {
  assert.equal(formatLiters(2450), '2.45 L');
  assert.equal(formatSigned(0.04, 1), '0.0');
  assert.equal(formatSigned(1.25, 1), '+1.3');
  assert.equal(formatTrim(70), '70');
  assert.equal(formatTrim(1.75, 3), '1.75');
});

test('color de marca: texto legible siempre', () => {
  assert.equal(readableTextOn('#FACC15'), '#0F172A', 'amarillo → texto oscuro');
  assert.equal(readableTextOn('#1E3A8A'), '#FFFFFF', 'azul oscuro → texto blanco');
  assert.ok(contrastRatio(accentOnWhite('#FACC15'), '#FFFFFF') >= 3, 'acento claro se oscurece');
});
