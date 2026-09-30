// @ts-check
'use strict';

/**
 * Ficha profesional en PDF.
 *
 * buildReportHtml() es una función PURA: recibe los datos ya cargados y
 * devuelve un documento HTML autocontenido (sin recursos externos: el logo y
 * la foto van como data URI) que la app convierte en PDF con expo-print en
 * iOS/Android o imprime desde el navegador en web.
 *
 * Seguridad: todo texto proveniente de usuarios (nombres, observaciones,
 * datos de contacto) se escapa como HTML y se trata solo como dato. Las
 * imágenes se revalidan (solo PNG/JPEG en base64) y el color de marca se
 * valida como hexadecimal antes de insertarse.
 */

const { GOALS, SEX_LABELS, LEVEL_LABELS, ACTIVITY_LEVELS, MEASUREMENT_KEYS, MEASUREMENT_FIELDS, METRICS, SOMATOTYPE_LABELS } = require('./config');
const { currentAndPrevious, buildComparison, buildSeries } = require('./progress');
const { buildLineChart } = require('./chart');
const { formatNumber, formatSigned, formatLiters, EMPTY } = require('./format');
const { formatLongDate, formatShortDate, formatDisplayDate, toIsoDate, todayIsoLocal } = require('./dates');
const { isHexColor, checkImageDataUri, IMAGE_LIMITS, DEFAULT_BRAND_COLOR } = require('./validation');
const { accentOnWhite, readableTextOn, tint } = require('./color');
const { describeEnergyAdjustment, energyAdjustmentOf } = require('./evaluation');
const content = require('./content');

/** A4 a 72 ppp. */
const PAGE = { width: 595, height: 842, margin: 28 };

const TONE_COLORS = { favorable: '#15803D', unfavorable: '#B91C1C', neutral: '#475569' };
const INTERPRETATION_COLORS = { ok: '#15803D', attention: '#B45309', high: '#B91C1C', neutral: '#475569' };

/**
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, (c) => {
    /** @type {Record<string, string>} */
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[c];
  });
}

/**
 * @param {unknown} dataUri
 * @param {number} maxChars
 * @returns {string|null}
 */
function safeImage(dataUri, maxChars) {
  return checkImageDataUri(dataUri, maxChars).ok ? /** @type {string} */ (dataUri) : null;
}

/**
 * Quita tildes y eñes sin depender de String.prototype.normalize (no
 * garantizado en todos los motores JS móviles).
 * @param {string} text
 */
function stripAccents(text) {
  /** @type {Record<string, string>} */
  const map = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n', Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ü: 'U', Ñ: 'N' };
  return text.replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g, (c) => map[c] || c);
}

/**
 * Nombre de archivo seguro: "Evaluacion_Juan_Perez_2026-09-25.pdf".
 * @param {string} athleteName
 * @param {unknown} date
 */
function reportFileName(athleteName, date) {
  const slug = stripAccents(String(athleteName || 'atleta'))
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'atleta';
  return `Evaluacion_${slug}_${toIsoDate(date) || 'sin-fecha'}.pdf`;
}

/**
 * @param {{ status: string, value: number|null } | undefined} result
 */
function okValue(result) {
  return result && result.status === 'ok' && typeof result.value === 'number' ? result.value : null;
}

/**
 * Motivo legible de un indicador no calculado.
 * @param {any} result
 */
function notCalculatedText(result) {
  if (!result) return 'No calculado.';
  if (result.status === 'missing' && result.missing && result.missing.length) {
    return `No calculado: falta ${result.missing.join(', ').toLowerCase()}.`;
  }
  return result.reason ? `No calculado: ${result.reason}` : 'No calculado.';
}

/**
 * Flecha + variación coloreada.
 * @param {import('./progress').MetricComparison|undefined} row
 * @param {string} [previousDate]
 */
function deltaHtml(row, previousDate) {
  if (!row || row.delta === null) {
    return '<span class="delta muted">Primera medición</span>';
  }
  const arrow = row.direction === 'up' ? '▲' : row.direction === 'down' ? '▼' : '●';
  const unit = row.changeMode === 'points' ? ' pts' : row.unit ? ` ${row.unit}` : '';
  const since = previousDate ? ` vs ${escapeHtml(formatShortDate(previousDate))}` : '';
  return `<span class="delta" style="color:${TONE_COLORS[row.tone]}">${arrow} ${formatSigned(row.delta, row.decimals)}${unit}</span><span class="since">${since}</span>`;
}

/**
 * Gráfico de línea como SVG en texto (misma geometría que la app).
 * @param {{ date: string, value: number }[]} series
 * @param {{ width: number, height: number, color: string, decimals: number }} opts
 */
function chartSvg(series, opts) {
  const chart = buildLineChart({
    series,
    width: opts.width,
    height: opts.height,
    padding: { left: 34, right: 10, top: 10, bottom: 18 },
    targetTicks: 3,
    maxXLabels: 3,
  });
  if (chart.empty) return '';
  const { plot } = chart;
  const grid = chart.yTicks
    .map(
      (t) =>
        `<line x1="${plot.left}" x2="${plot.right}" y1="${t.y}" y2="${t.y}" stroke="#E2E8F0" stroke-width="0.6"/>` +
        `<text x="${plot.left - 5}" y="${t.y + 3}" font-size="7" fill="#64748B" text-anchor="end">${escapeHtml(t.label)}</text>`,
    )
    .join('');
  const xLabels = chart.xLabels
    .map((l) => `<text x="${l.x}" y="${opts.height - 5}" font-size="7" fill="#64748B" text-anchor="middle">${escapeHtml(l.label)}</text>`)
    .join('');
  const area = chart.areaPath ? `<path d="${chart.areaPath}" fill="${opts.color}" fill-opacity="0.10"/>` : '';
  const line = chart.points.length > 1 ? `<path d="${chart.path}" fill="none" stroke="${opts.color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>` : '';
  const dots = chart.points
    .map((p, i) => {
      const last = i === chart.points.length - 1;
      return `<circle cx="${p.x}" cy="${p.y}" r="${last ? 3.2 : 2.2}" fill="${last ? opts.color : '#FFFFFF'}" stroke="${opts.color}" stroke-width="1.2"/>`;
    })
    .join('');
  return `<svg width="${opts.width}" height="${opts.height}" viewBox="0 0 ${opts.width} ${opts.height}" xmlns="http://www.w3.org/2000/svg">${grid}${xLabels}${area}${line}${dots}</svg>`;
}

/**
 * @param {{
 *   brand?: Record<string, any>|null,
 *   athlete: Record<string, any>,
 *   evaluation: Record<string, any>,
 *   evaluations?: Record<string, any>[],
 *   generatedAt?: Date,
 *   pageScale?: number,
 *   cssPageMargin?: boolean,
 * }} input
 *   pageScale: el diseño está en puntos de una página A4 (595 × 842). iOS
 *   imprime 1 px CSS = 1 pt (escala 1); Android y los navegadores imprimen a
 *   96 ppp, por lo que necesitan 96/72 para obtener el mismo tamaño físico.
 *   cssPageMargin: false cuando el margen lo aplica el motor nativo (iOS usa
 *   la opción `margins` de expo-print e ignora @page), para no duplicarlo.
 * @returns {string}
 */
function buildReportHtml(input) {
  const brand = input.brand || {};
  const athlete = input.athlete || {};
  const evaluation = input.evaluation;
  const all = input.evaluations && input.evaluations.length ? input.evaluations : [evaluation];
  const pageScale = typeof input.pageScale === 'number' && input.pageScale > 0 && input.pageScale <= 3 ? input.pageScale : 1;
  const pageMargin = input.cssPageMargin === false ? 0 : PAGE.margin;

  const { current, previous, index, sorted } = currentAndPrevious(/** @type {any[]} */ (all), evaluation._id);
  const cur = current || evaluation;
  const history = index >= 0 ? sorted.slice(0, index + 1) : [cur];
  const results = cur.results || {};
  const m = cur.measurements || {};
  const snap = cur.profileSnapshot || {};
  const goal = snap.goal && GOALS[/** @type {import('./config').GoalKey} */ (snap.goal)];
  const energyAdj = goal ? energyAdjustmentOf(cur.parameters, goal) : null;

  // --- Marca -----------------------------------------------------------------
  const brandColor = isHexColor(brand.primaryColor) ? String(brand.primaryColor) : DEFAULT_BRAND_COLOR;
  const accent = accentOnWhite(brandColor);
  const onBrand = readableTextOn(brandColor);
  const soft = tint(brandColor, 0.9);
  const logo = safeImage(brand.logo, IMAGE_LIMITS.logo);
  const photo = safeImage(athlete.photo, IMAGE_LIMITS.photo);
  const businessName = brand.businessName || 'Evaluación deportiva';
  const coachName = brand.coachName || '';

  // --- Comparación y KPIs ----------------------------------------------------
  const comparison = buildComparison(cur, previous || null);
  /** @param {string} key */
  const rowFor = (key) => comparison.find((r) => r.metric === key);
  const prevDate = previous ? toIsoDate(previous.date) || undefined : undefined;

  const whtrInterp = results.whtr && results.whtr.interpretation;
  /** @type {{ label: string, value: string, unit: string, metric: string, highlight?: boolean, note?: string, noteColor?: string, missing?: string }[]} */
  const kpis = [
    { label: 'Peso', metric: 'weightKg', value: formatNumber(m.weightKg, 1), unit: 'kg' },
    {
      label: '% de grasa estimado',
      metric: 'bodyFatPct',
      value: formatNumber(okValue(results.bodyFat), 1),
      unit: '%',
      missing: okValue(results.bodyFat) === null ? notCalculatedText(results.bodyFat) : undefined,
    },
    {
      label: 'Cintura',
      metric: 'waistCm',
      value: formatNumber(m.waistCm, 1),
      unit: 'cm',
      missing: m.waistCm === undefined ? 'No medida.' : undefined,
    },
    {
      label: 'Índice cintura/altura',
      metric: 'whtr',
      value: formatNumber(okValue(results.whtr), 2),
      unit: '',
      highlight: true,
      note: whtrInterp ? whtrInterp.label : undefined,
      noteColor: whtrInterp ? INTERPRETATION_COLORS[/** @type {'ok'} */ (whtrInterp.tone)] : undefined,
      missing: okValue(results.whtr) === null ? notCalculatedText(results.whtr) : undefined,
    },
  ];

  const kpiHtml = kpis
    .map((k) => {
      const body =
        k.value === EMPTY
          ? `<div class="kpi-value muted">${EMPTY}</div><div class="kpi-note muted">${escapeHtml(k.missing || 'Sin dato.')}</div>`
          : `<div class="kpi-value">${k.value}<span class="kpi-unit">${k.unit ? ` ${k.unit}` : ''}</span></div>` +
            `<div class="kpi-delta">${deltaHtml(rowFor(k.metric), prevDate)}</div>` +
            (k.note ? `<div class="kpi-note" style="color:${k.noteColor}">${escapeHtml(k.note)}</div>` : '');
      return `<div class="kpi${k.highlight ? ' kpi-highlight' : ''}"><div class="kpi-label">${escapeHtml(k.label)}</div>${body}</div>`;
    })
    .join('');

  // --- Indicadores complementarios -------------------------------------------
  /** @param {string} key @param {string} label @param {number} decimals @param {string} unit */
  const indicatorRow = (key, label, decimals, unit) => {
    const r = results[key];
    const v = okValue(r);
    const interp = r && r.interpretation;
    const valueCell = v === null ? `<span class="muted">${escapeHtml(notCalculatedText(r))}</span>` : `<strong>${formatNumber(v, decimals)}</strong>${unit ? ` ${unit}` : ''}`;
    const interpCell = interp
      ? `<span style="color:${INTERPRETATION_COLORS[/** @type {'ok'} */ (interp.tone)]}">${escapeHtml(interp.label)}</span>`
      : '<span class="muted">—</span>';
    return `<tr><td>${escapeHtml(label)}</td><td class="num">${valueCell}</td><td>${interpCell}</td></tr>`;
  };
  const indicatorsHtml = [
    indicatorRow('bmi', 'IMC', 1, 'kg/m²'),
    indicatorRow('whr', 'Índice cintura/cadera (ICC)', 2, ''),
    indicatorRow('fatMass', 'Masa grasa estimada', 1, 'kg'),
    indicatorRow('leanMass', 'Masa libre de grasa estimada', 1, 'kg'),
  ].join('');

  // --- Tabla comparativa -----------------------------------------------------
  let comparisonHtml;
  if (!previous) {
    comparisonHtml = '<p class="muted small">Primera evaluación registrada. La comparación aparecerá a partir de la segunda evaluación.</p>';
  } else {
    const rows = comparison
      .map((r) => {
        const unit = r.unit ? ` ${r.unit}` : '';
        const deltaUnit = r.changeMode === 'points' ? ' pts' : unit;
        const pct = r.deltaPct === null ? '—' : `${formatSigned(r.deltaPct, 1)} %`;
        const delta = r.delta === null ? '—' : `<span style="color:${TONE_COLORS[r.tone]}">${formatSigned(r.delta, r.decimals)}${deltaUnit}</span>`;
        return `<tr><td>${escapeHtml(r.label)}</td><td class="num">${r.previous === null ? '—' : `${formatNumber(r.previous, r.decimals)}${unit}`}</td><td class="num"><strong>${r.current === null ? '—' : `${formatNumber(r.current, r.decimals)}${unit}`}</strong></td><td class="num">${delta}</td><td class="num">${pct}</td></tr>`;
      })
      .join('');
    comparisonHtml = `<table class="table"><thead><tr><th>Indicador</th><th class="num">Anterior<br><span class="th-sub">${escapeHtml(formatDisplayDate(previous.date))}</span></th><th class="num">Actual<br><span class="th-sub">${escapeHtml(formatDisplayDate(cur.date))}</span></th><th class="num">Cambio</th><th class="num">Cambio %</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="legend"><span style="color:${TONE_COLORS.favorable}">Verde</span>: cambio en la dirección del objetivo actual · <span style="color:${TONE_COLORS.unfavorable}">rojo</span>: en dirección contraria · gris: sin dirección definida para este objetivo. El % de grasa se compara en puntos porcentuales (pts).</p>`;
  }

  // --- Gráficos de evolución -------------------------------------------------
  /** @type {import('./config').MetricKey[]} */
  const chartMetrics = ['weightKg', 'waistCm', 'bodyFatPct'];
  const charts = chartMetrics
    .map((key) => ({ key, series: buildSeries(/** @type {any[]} */ (history), key) }))
    .filter((c) => c.series.length >= 2);
  let chartsHtml;
  if (charts.length === 0) {
    chartsHtml = '<p class="muted small">Se necesitan al menos dos evaluaciones con la misma medición para mostrar la evolución.</p>';
  } else {
    chartsHtml = `<div class="charts">${charts
      .map(({ key, series }) => {
        const metric = METRICS[key];
        const first = series[0];
        const last = series[series.length - 1];
        const unit = metric.unit ? ` ${metric.unit}` : '';
        return `<div class="chart"><div class="chart-title">${escapeHtml(metric.label)}</div><div class="chart-sub">${formatNumber(first.value, metric.decimals)} → ${formatNumber(last.value, metric.decimals)}${unit} (${formatSigned(last.value - first.value, metric.decimals)}${metric.changeMode === 'points' ? ' pts' : unit})</div>${chartSvg(series, { width: 165, height: 92, color: accent, decimals: metric.decimals })}</div>`;
      })
      .join('')}</div>`;
  }

  // --- Requerimientos --------------------------------------------------------
  const bmr = okValue(results.bmr);
  const tdee = okValue(results.tdee);
  const target = okValue(results.energyTarget);
  const activity = snap.activityLevel ? ACTIVITY_LEVELS[/** @type {import('./config').ActivityKey} */ (snap.activityLevel)] : null;
  const energyHtml =
    bmr === null
      ? `<p class="muted small">${escapeHtml(notCalculatedText(results.bmr))}</p>`
      : `<table class="kv">
          <tr><td>TMB estimada (reposo)</td><td class="num"><strong>${formatNumber(bmr, 0)}</strong> kcal/día</td></tr>
          <tr><td>Gasto energético total${activity ? ` (actividad ${escapeHtml(activity.label.toLowerCase())}, PAL ${activity.pal})` : ''}</td><td class="num">${tdee === null ? '—' : `<strong>${formatNumber(tdee, 0)}</strong> kcal/día`}</td></tr>
          <tr><td>Energía estimada para el objetivo</td><td class="num">${target === null ? '—' : `<strong>${formatNumber(target, 0)}</strong> kcal/día`}</td></tr>
        </table>
        <p class="formula">${escapeHtml(results.bmr.formula.substituted || '')}</p>`;

  const protein = okValue(results.protein);
  const proteinHtml =
    protein === null
      ? `<p class="muted small">${escapeHtml(notCalculatedText(results.protein))}</p>`
      : `<div class="big">${formatNumber(protein, 0)} <span>g/día</span></div><p class="formula">${escapeHtml(results.protein.formula.substituted || '')}</p>`;

  const water = okValue(results.water);
  const waterHtml =
    water === null
      ? `<p class="muted small">${escapeHtml(notCalculatedText(results.water))}</p>`
      : `<div class="big">${formatLiters(water)} <span>/día · ${formatNumber(water, 0)} ml</span></div><p class="formula">${escapeHtml(results.water.formula.substituted || '')}</p><p class="small muted">Base sin entrenamiento. Tras entrenar: 1.25–1.5 L por cada kg de peso perdido.</p>`;

  const macros = results.macros && results.macros.status === 'ok' ? results.macros.inputs.split : null;
  let macrosHtml;
  if (!macros) {
    macrosHtml = `<p class="muted small">${escapeHtml(notCalculatedText(results.macros))}</p>`;
  } else {
    const parts = [
      { key: 'protein', label: 'Proteínas', color: accent },
      { key: 'carbs', label: 'Carbohidratos', color: tint(brandColor, 0.35) },
      { key: 'fat', label: 'Grasas', color: tint(brandColor, 0.65) },
    ];
    const bar = parts
      .map((p) => `<div style="width:${macros[p.key].pct}%;background:${p.color}"></div>`)
      .join('');
    const rows = parts
      .map((p) => {
        const x = macros[p.key];
        return `<tr><td><span class="swatch" style="background:${p.color}"></span>${p.label}</td><td class="num"><strong>${x.grams}</strong> g</td><td class="num">${x.gPerKg} g/kg</td><td class="num">${x.kcal} kcal</td><td class="num">${x.pct} %</td></tr>`;
      })
      .join('');
    macrosHtml = `<div class="macro-bar">${bar}</div>
      <table class="table"><thead><tr><th>Macronutriente</th><th class="num">g/día</th><th class="num">g/kg</th><th class="num">kcal</th><th class="num">% energía</th></tr></thead>
      <tbody>${rows}<tr class="total"><td>Total</td><td></td><td></td><td class="num">${macros.totalKcal} kcal</td><td class="num">100 %</td></tr></tbody></table>
      <p class="small muted">Grasas: ${goal ? goal.fatPctOfEnergy : '—'} % de la energía. Carbohidratos: energía restante (${macros.carbs.gPerKg} g/kg; referencia: ${escapeHtml(results.macros.inputs.carbReference)}).</p>`;
  }

  // --- Mediciones --------------------------------------------------------------
  const measurementsHtml = MEASUREMENT_KEYS.map((key) => {
    const field = MEASUREMENT_FIELDS[key];
    const v = m[key];
    const unit = field.dimension === 'mass' ? 'kg' : 'cm';
    return `<div class="meas"><span>${escapeHtml(field.label)}</span><strong>${typeof v === 'number' ? `${formatNumber(v, field.decimals)} ${unit}` : EMPTY}</strong></div>`;
  }).join('');

  // --- Perfil ------------------------------------------------------------------
  const sexLabel = snap.sex ? SEX_LABELS[/** @type {import('./config').Sex} */ (snap.sex)] : '';
  const levelLabel = athlete.level ? LEVEL_LABELS[/** @type {import('./config').LevelKey} */ (athlete.level)] : '';
  const facts = [
    sexLabel,
    typeof snap.ageYears === 'number' ? `${snap.ageYears} años` : '',
    athlete.sport ? String(athlete.sport) : '',
    levelLabel,
  ].filter(Boolean);
  const somatotype = athlete.somatotype && SOMATOTYPE_LABELS[/** @type {import('./config').SomatotypeKey} */ (athlete.somatotype)];
  const initials = String(athlete.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const notes = String(cur.notes || '').trim();
  const contact = [brand.phone, brand.email, brand.contactExtra].filter(Boolean).map(escapeHtml).join(' · ');
  const generated = formatLongDate(todayIsoLocal(input.generatedAt || new Date()));

  const warnings = [];
  const hasSpecialConditions = athlete.specialConditions === true || snap.specialConditions === true;
  if (hasSpecialConditions) warnings.push(content.SPECIAL_CONDITIONS_WARNING);
  if (typeof snap.ageYears === 'number' && snap.ageYears < 18) warnings.push(content.MINOR_WARNING);

  const methods = [
    ['IMC', 'peso ÷ altura² (OMS). Dato complementario: no distingue músculo de grasa.'],
    ['Índice cintura/altura', 'cintura ÷ altura. Categorías NICE NG246: 0.40–0.49 saludable, 0.50–0.59 aumentada, ≥ 0.60 alta.'],
    ['ICC', 'cintura ÷ cadera. Punto de corte OMS: 0.90 hombres, 0.85 mujeres.'],
    ['% de grasa estimado', 'método de circunferencias de la Marina de EE. UU. (Hodgdon y Beckett, 1984). Estimación con margen de error; útil para comparar tendencias.'],
    ['TMB', 'Mifflin-St Jeor (1990). GET = TMB × PAL (FAO/OMS/UNU, 2004).'],
    ...(energyAdj ? [['Energía', `${describeEnergyAdjustment(energyAdj)} (${goal ? goal.short.toLowerCase() : 'objetivo'}).`]] : []),
    ['Proteína', `peso × factor del objetivo${goal ? ` (${goal.proteinGPerKg} g/kg)` : ''}.`],
    ['Agua', 'peso × ml/kg según la edad (35 ml/kg hasta 55 años). Ajustes por entrenamiento y clima aparte.'],
  ]
    .map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(reportFileName(athlete.name, cur.date).replace(/\.pdf$/, ''))}</title>
<style>
  @page { size: A4; margin: ${pageMargin}pt; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #0F172A; font-size: 9.5px; line-height: 1.4; background: #FFFFFF; }
  .doc { width: 100%; max-width: ${PAGE.width - PAGE.margin * 2}px; margin: 0 auto; zoom: ${pageScale}; }
  .muted { color: #64748B; }
  .small { font-size: 8.5px; }
  .num { text-align: right; white-space: nowrap; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid ${brandColor}; padding-bottom: 10px; margin-bottom: 12px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand img { max-height: 44px; max-width: 120px; object-fit: contain; }
  .brand-name { font-size: 13px; font-weight: 700; }
  .brand-coach { color: #475569; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 14px; margin: 0; color: ${accent}; letter-spacing: 0.2px; }
  .doc-title div { color: #475569; }
  .athlete { display: flex; align-items: center; gap: 12px; background: ${soft}; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; }
  .avatar { width: 52px; height: 52px; border-radius: 26px; object-fit: cover; flex-shrink: 0; }
  .avatar-initials { width: 52px; height: 52px; border-radius: 26px; background: ${brandColor}; color: ${onBrand}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 17px; flex-shrink: 0; }
  .athlete-name { font-size: 15px; font-weight: 700; }
  .athlete-facts { color: #334155; }
  .athlete-right { margin-left: auto; text-align: right; }
  .goal { display: inline-block; background: ${brandColor}; color: ${onBrand}; border-radius: 12px; padding: 3px 9px; font-weight: 700; font-size: 9px; }
  .eval-count { color: #475569; margin-top: 4px; }
  h2 { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.6px; color: ${accent}; margin: 14px 0 6px; }
  .kpis { display: flex; gap: 8px; }
  .kpi { flex: 1; border: 1px solid #E2E8F0; border-radius: 10px; padding: 8px 9px; min-height: 74px; }
  .kpi-highlight { border: 1.5px solid ${brandColor}; background: ${soft}; }
  .kpi-label { color: #475569; font-size: 8.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
  .kpi-value { font-size: 19px; font-weight: 700; margin-top: 3px; }
  .kpi-unit { font-size: 10px; font-weight: 600; color: #475569; }
  .kpi-delta { margin-top: 2px; }
  .kpi-note { margin-top: 3px; font-weight: 600; font-size: 8.5px; }
  .delta { font-weight: 700; }
  .since { color: #94A3B8; }
  .table { width: 100%; border-collapse: collapse; }
  .table th { text-align: left; font-size: 8.5px; color: #475569; font-weight: 600; border-bottom: 1px solid #CBD5E1; padding: 4px 5px; }
  .table td { border-bottom: 1px solid #EEF2F7; padding: 4px 5px; }
  .table tr.total td { font-weight: 700; border-bottom: none; }
  .th-sub { font-weight: 400; color: #94A3B8; }
  .legend { font-size: 7.5px; color: #64748B; margin: 4px 0 0; }
  .charts { display: flex; gap: 8px; }
  .chart { flex: 1; border: 1px solid #E2E8F0; border-radius: 10px; padding: 7px 6px 3px; }
  .chart-title { font-weight: 700; font-size: 9px; }
  .chart-sub { color: #475569; font-size: 8px; margin-bottom: 2px; }
  .grid2 { display: flex; gap: 10px; }
  .grid2 > div { flex: 1; }
  .box { border: 1px solid #E2E8F0; border-radius: 10px; padding: 8px 10px; }
  .box h3 { font-size: 9px; margin: 0 0 4px; color: #334155; text-transform: uppercase; letter-spacing: 0.3px; }
  .big { font-size: 18px; font-weight: 700; }
  .big span { font-size: 9.5px; font-weight: 600; color: #475569; }
  .formula { font-family: Menlo, Consolas, "Courier New", monospace; font-size: 8px; color: #334155; background: #F8FAFC; border-radius: 6px; padding: 4px 6px; margin: 5px 0 0; }
  .kv { width: 100%; border-collapse: collapse; }
  .kv td { padding: 2px 0; }
  .macro-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; margin: 2px 0 6px; }
  .swatch { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
  .meas-grid { display: flex; flex-wrap: wrap; gap: 5px; }
  .meas { width: calc(25% - 4px); border: 1px solid #EEF2F7; border-radius: 7px; padding: 4px 6px; display: flex; justify-content: space-between; }
  .meas span { color: #475569; }
  .notes { white-space: pre-wrap; word-wrap: break-word; border-left: 3px solid ${brandColor}; background: #F8FAFC; padding: 7px 10px; border-radius: 0 8px 8px 0; }
  .warning { border: 1px solid #F59E0B; background: #FFFBEB; color: #78350F; border-radius: 8px; padding: 6px 9px; margin-top: 8px; font-size: 8.5px; }
  .methods { margin: 0; padding-left: 14px; font-size: 8px; color: #334155; }
  .methods li { margin-bottom: 1px; }
  .disclaimer { font-size: 7.5px; color: #64748B; margin-top: 8px; border-top: 1px solid #E2E8F0; padding-top: 6px; }
  .footer { display: flex; justify-content: space-between; font-size: 8px; color: #475569; margin-top: 6px; }
  .avoid-break { page-break-inside: avoid; break-inside: avoid; }
</style>
</head>
<body>
<div class="doc">
  <div class="header avoid-break">
    <div class="brand">
      ${logo ? `<img src="${logo}" alt="">` : ''}
      <div>
        <div class="brand-name">${escapeHtml(businessName)}</div>
        ${coachName ? `<div class="brand-coach">Entrenador: ${escapeHtml(coachName)}</div>` : ''}
      </div>
    </div>
    <div class="doc-title">
      <h1>Evaluación de rendimiento y composición corporal</h1>
      <div>${escapeHtml(formatLongDate(cur.date))}</div>
    </div>
  </div>

  <div class="athlete avoid-break">
    ${photo ? `<img class="avatar" src="${photo}" alt="">` : `<div class="avatar-initials">${escapeHtml(initials)}</div>`}
    <div>
      <div class="athlete-name">${escapeHtml(athlete.name || snap.name || '')}</div>
      <div class="athlete-facts">${facts.map(escapeHtml).join(' · ')}</div>
      ${somatotype ? `<div class="small muted">Somatotipo (referencia descriptiva, no se usa en los cálculos): ${escapeHtml(somatotype)}</div>` : ''}
    </div>
    <div class="athlete-right">
      ${goal ? `<span class="goal">${escapeHtml(goal.label)}</span>` : ''}
      <div class="eval-count">Evaluación ${index >= 0 ? index + 1 : 1} de ${sorted.length || 1}</div>
    </div>
  </div>

  <h2>Indicadores principales</h2>
  <div class="kpis avoid-break">${kpiHtml}</div>

  <div class="avoid-break" style="margin-top:10px">
    <h2 style="margin-top:0">Comparación con la evaluación anterior</h2>
    ${comparisonHtml}
  </div>

  <div class="avoid-break">
    <h2>Evolución</h2>
    ${chartsHtml}
  </div>

  <div class="avoid-break">
    <h2>Indicadores complementarios</h2>
    <table class="table"><thead><tr><th>Indicador</th><th class="num">Valor</th><th>Interpretación general</th></tr></thead><tbody>${indicatorsHtml}</tbody></table>
    <p class="legend">${escapeHtml(content.BMI_NOTE)}</p>
  </div>

  <h2>Requerimientos diarios estimados</h2>
  <div class="grid2 avoid-break">
    <div class="box"><h3>Energía</h3>${energyHtml}</div>
    <div class="box"><h3>Proteína</h3>${proteinHtml}</div>
  </div>
  <div class="grid2 avoid-break" style="margin-top:8px">
    <div class="box"><h3>Agua</h3>${waterHtml}</div>
    <div class="box"><h3>Distribución estimada de macronutrientes</h3>${macrosHtml}</div>
  </div>

  <div class="avoid-break">
    <h2>Mediciones registradas</h2>
    <div class="meas-grid">${measurementsHtml}</div>
  </div>

  <div class="avoid-break">
    <h2>Observaciones del entrenador</h2>
    <div class="notes">${notes ? escapeHtml(notes) : '<span class="muted">Sin observaciones.</span>'}</div>
    ${warnings.map((w) => `<div class="warning">${escapeHtml(w)}</div>`).join('')}
  </div>

  <div class="avoid-break">
    <h2>Métodos utilizados</h2>
    <ul class="methods">${methods}</ul>
    <div class="disclaimer">${escapeHtml(content.GENERAL_DISCLAIMER)} ${hasSpecialConditions ? '' : escapeHtml(content.SPECIAL_CONDITIONS_WARNING)}</div>
    <div class="footer">
      <span>${escapeHtml(businessName)}${coachName ? ` · ${escapeHtml(coachName)}` : ''}${contact ? ` · ${contact}` : ''}</span>
      <span>Generado el ${escapeHtml(generated)}</span>
    </div>
  </div>
</div>
</body>
</html>`;
}

module.exports = { PAGE, buildReportHtml, reportFileName, escapeHtml, chartSvg };
