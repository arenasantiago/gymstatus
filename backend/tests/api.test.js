'use strict';

/**
 * Prueba de integración de la API contra MongoDB real.
 *
 * Usa la conexión de backend/.env pero SIEMPRE en una base aislada
 * (gymstatus_e2e) que se elimina al terminar: nunca toca los datos reales.
 *
 *   cd backend && npm run test:api
 */

require('dotenv').config({ quiet: true });
const test = require('node:test');
const assert = require('node:assert/strict');
const dns = require('dns');
const mongoose = require('mongoose');

const { buildReportHtml } = require('../../shared/report');

const TEST_DB = 'gymstatus_e2e';
if (!/_e2e$/.test(TEST_DB)) throw new Error('La base de pruebas debe terminar en _e2e');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-solo-para-pruebas';
if (process.env.DNS_OVERRIDE !== 'off') dns.setServers(['8.8.8.8', '1.1.1.1']);

const { createApp } = require('../app');

// PNG de 1×1 px.
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

let server;
let base;

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function registerAndLogin(username) {
  const password = `Clave-${username}-123`;
  const reg = await api('/api/users/register', { method: 'POST', body: { username, email: `${username}@e2e.test`, password } });
  assert.equal(reg.status, 201, JSON.stringify(reg.data));
  assert.equal(reg.data.user.password, undefined, 'el registro no devuelve el hash');
  const login = await api('/api/users/login', { method: 'POST', body: { username, password } });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  return { token: login.data.token, id: login.data.user._id };
}

const athleteInput = {
  name: 'Juan Pérez',
  sex: 'male',
  birthDate: '1996-03-10',
  sport: 'Fútbol',
  level: 'competitive',
  goal: 'fat_loss',
  activityLevel: 'moderate',
  somatotype: 'meso',
  photo: TINY_PNG,
};

test.before(async () => {
  if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI en backend/.env');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: TEST_DB, serverSelectionTimeoutMS: 20000 });
  await mongoose.connection.dropDatabase();
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    assert.equal(mongoose.connection.db.databaseName, TEST_DB);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test('flujo completo del entrenador y aislamiento entre cuentas', async (t) => {
  const coachA = await registerAndLogin('coach_a');
  const coachB = await registerAndLogin('coach_b');
  const A = coachA.token;
  const B = coachB.token;
  let athleteId;
  let firstEvalId;
  let secondEvalId;

  await t.test('sin sesión o con token inválido → 401', async () => {
    assert.equal((await api('/api/athletes')).status, 401);
    assert.equal((await api('/api/athletes', { token: 'x.y.z' })).status, 401);
  });

  await t.test('login rechaza objetos (inyección NoSQL)', async () => {
    const r = await api('/api/users/login', { method: 'POST', body: { username: { $ne: null }, password: { $ne: null } } });
    assert.equal(r.status, 400);
  });

  await t.test('crear atleta: valida y devuelve errores por campo', async () => {
    const bad = await api('/api/athletes', { method: 'POST', token: A, body: { name: 'J', sex: 'x', birthDate: '2030-01-01' } });
    assert.equal(bad.status, 400);
    for (const field of ['name', 'sex', 'birthDate', 'goal', 'activityLevel']) {
      assert.ok(bad.data.errors[field], `falta error de ${field}`);
    }
    const ok = await api('/api/athletes', { method: 'POST', token: A, body: athleteInput });
    assert.equal(ok.status, 201, JSON.stringify(ok.data));
    athleteId = ok.data._id;
    assert.equal(ok.data.coachId, coachA.id);
  });

  await t.test('lista de atletas: sin foto embebida, con indicador y resumen', async () => {
    const r = await api('/api/athletes', { token: A });
    assert.equal(r.status, 200);
    assert.equal(r.data.length, 1);
    assert.equal(r.data[0].photo, undefined);
    assert.equal(r.data[0].hasPhoto, true);
    assert.equal(r.data[0].evaluationCount, 0);
    assert.equal(r.data[0].lastEvaluation, null);
  });

  await t.test('evaluación inválida: no se guarda y explica qué corregir', async () => {
    const r = await api(`/api/athletes/${athleteId}/evaluations`, {
      method: 'POST',
      token: A,
      body: { date: '2099-01-01', measurements: { weightKg: 'abc', heightCm: '0', waistCm: '86' } },
    });
    assert.equal(r.status, 400);
    assert.match(r.data.errors.date, /futura/);
    assert.match(r.data.errors.weightKg, /número válido/);
    assert.match(r.data.errors.heightCm, /entre 120 y 230/);
    const list = await api(`/api/athletes/${athleteId}/evaluations`, { token: A });
    assert.equal(list.data.length, 0);
  });

  await t.test('primera evaluación: resultados con fórmula e interpretación separadas', async () => {
    const r = await api(`/api/athletes/${athleteId}/evaluations`, {
      method: 'POST',
      token: A,
      body: {
        date: '2026-09-04',
        measurements: { weightKg: '72,5', heightCm: '175', waistCm: '86', hipCm: '97', neckCm: '37', armCm: '34' },
        notes: 'Inicio de la fase de definición.',
      },
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    firstEvalId = r.data._id;
    assert.equal(r.data.measurements.weightKg, 72.5, 'acepta coma decimal');
    assert.equal(r.data.profileSnapshot.ageYears, 30);
    assert.equal(r.data.profileSnapshot.goal, 'fat_loss');
    const { results } = r.data;
    assert.equal(results.bodyFat.status, 'ok');
    assert.ok(results.bodyFat.formula.expression.includes('log10'));
    assert.equal(results.protein.formula.substituted, '72.5 kg × 2.2 g/kg = 160 g de proteína/día');
    assert.equal(results.whtr.interpretation.key, 'healthy');
    assert.equal(results.bmi.interpretation.tone, 'neutral');
    assert.equal(r.data.parameters.goal.proteinGPerKg, 2.2);
    assert.deepEqual(r.data.parameters.goal.energyAdjustment, { type: 'kcal', value: -500 }, 'se guarda el déficit en kcal/día');
    assert.equal(results.energyTarget.status, 'ok');
    assert.equal(results.energyTarget.value, results.tdee.value - 500, 'el servidor recalcula con el mismo motor');
    assert.ok(r.data.parameters.calcVersion);
  });

  await t.test('segunda evaluación: nueva fila, la anterior queda intacta', async () => {
    const r = await api(`/api/athletes/${athleteId}/evaluations`, {
      method: 'POST',
      token: A,
      body: { date: '2026-09-25', measurements: { weightKg: '70', heightCm: '175', waistCm: '82', hipCm: '95', neckCm: '37' } },
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    secondEvalId = r.data._id;

    const detail = await api(`/api/athletes/${athleteId}`, { token: A });
    assert.equal(detail.status, 200);
    assert.equal(detail.data.athlete.photo, TINY_PNG, 'el detalle sí incluye la foto');
    assert.deepEqual(detail.data.evaluations.map((e) => e._id), [firstEvalId, secondEvalId], 'orden cronológico');
    assert.equal(detail.data.evaluations[0].measurements.waistCm, 86, 'la evaluación anterior no se sobrescribe');

    const list = await api('/api/athletes', { token: A });
    assert.equal(list.data[0].evaluationCount, 2);
    assert.equal(list.data[0].lastEvaluation.waistCm, 82);
    assert.ok(list.data[0].lastEvaluation.bodyFatPct > 0);
  });

  await t.test('observaciones: únicas editables, guardadas como texto', async () => {
    const hostile = '<script>alert(1)</script>\u0007 Mantener carga';
    const r = await api(`/api/evaluations/${secondEvalId}/notes`, { method: 'PUT', token: A, body: { notes: hostile } });
    assert.equal(r.status, 200);
    assert.equal(r.data.notes, '<script>alert(1)</script> Mantener carga', 'se limpian caracteres de control');
    assert.equal(r.data.measurements.waistCm, 82);
  });

  await t.test('otro entrenador no puede ver ni tocar al atleta', async () => {
    assert.deepEqual((await api('/api/athletes', { token: B })).data, []);
    assert.equal((await api(`/api/athletes/${athleteId}`, { token: B })).status, 404);
    assert.equal((await api(`/api/athletes/${athleteId}`, { method: 'PUT', token: B, body: athleteInput })).status, 404);
    assert.equal((await api(`/api/athletes/${athleteId}`, { method: 'DELETE', token: B })).status, 404);
    assert.equal(
      (await api(`/api/athletes/${athleteId}/evaluations`, { method: 'POST', token: B, body: { date: '2026-09-25', measurements: { weightKg: 70, heightCm: 175 } } })).status,
      404,
    );
    assert.equal((await api(`/api/evaluations/${firstEvalId}`, { token: B })).status, 404);
    assert.equal((await api(`/api/evaluations/${firstEvalId}`, { method: 'DELETE', token: B })).status, 404);
    assert.equal((await api(`/api/users/users/${coachA.id}`, { token: B })).status, 403);
    const users = await api('/api/users/users', { token: B });
    assert.deepEqual(users.data.map((u) => u.username), ['coach_b'], 'no se expone la lista de usuarios');
  });

  await t.test('ids mal formados → 404, nunca 500', async () => {
    assert.equal((await api('/api/athletes/no-es-un-id', { token: A })).status, 404);
    assert.equal((await api('/api/evaluations/123', { token: A })).status, 404);
  });

  await t.test('marca: valores por defecto, validación y guardado', async () => {
    const def = await api('/api/brand', { token: A });
    assert.equal(def.status, 200);
    assert.equal(def.data.primaryColor, '#2563EB');
    const bad = await api('/api/brand', { method: 'PUT', token: A, body: { primaryColor: 'red', logo: 'data:image/svg+xml;base64,PHN2Zz4=' } });
    assert.equal(bad.status, 400);
    assert.ok(bad.data.errors.primaryColor && bad.data.errors.logo);
    const ok = await api('/api/brand', {
      method: 'PUT',
      token: A,
      body: { businessName: 'Centro de Rendimiento Norte', coachName: 'Laura Gómez', phone: '+57 300 000 0000', primaryColor: '#0f766e', logo: TINY_PNG },
    });
    assert.equal(ok.status, 200, JSON.stringify(ok.data));
    assert.equal(ok.data.primaryColor, '#0F766E');
    assert.equal((await api('/api/brand', { token: B })).data.businessName, '', 'cada entrenador tiene su marca');
  });

  await t.test('la ficha PDF se genera con los datos reales de la API', async () => {
    const detail = await api(`/api/athletes/${athleteId}`, { token: A });
    const brand = await api('/api/brand', { token: A });
    const html = buildReportHtml({
      brand: brand.data,
      athlete: detail.data.athlete,
      evaluation: detail.data.evaluations[1],
      evaluations: detail.data.evaluations,
    });
    for (const expected of ['Centro de Rendimiento Norte', 'Juan Pérez', '25 de septiembre de 2026', '\u22124.0 cm', '<svg', TINY_PNG, '&lt;script&gt;alert(1)&lt;/script&gt; Mantener carga']) {
      assert.ok(html.includes(expected), `falta en la ficha: ${expected}`);
    }
    assert.ok(!/NaN|undefined|Infinity|\[object Object\]/.test(html));
  });

  await t.test('eliminar atleta borra también su historial', async () => {
    const r = await api(`/api/athletes/${athleteId}`, { method: 'DELETE', token: A });
    assert.equal(r.status, 200);
    assert.equal(r.data.deletedEvaluations, 2);
    assert.equal((await api(`/api/evaluations/${firstEvalId}`, { token: A })).status, 404);
  });
});
