// @ts-check
'use strict';

/**
 * Interpretaciones descriptivas. Se mantienen separadas de los valores
 * calculados: un valor puede existir sin interpretación (p. ej. % de grasa,
 * para el que no hay rangos de referencia de consenso) y ninguna de estas
 * funciones emite diagnósticos.
 *
 * Las categorías se evalúan sobre el valor REDONDEADO que ve el usuario para
 * que el texto y el número mostrado nunca se contradigan.
 */

const { BMI_CATEGORIES, WHR_CUTOFFS, WHTR_BANDS, WHTR_MAX_BMI, AGE_LIMITS } = require('./config');
const { round } = require('./formulas');

/**
 * @typedef {Object} Interpretation
 * @property {string} key
 * @property {string} label
 * @property {import('./config').Tone} tone
 * @property {string} detail
 * @property {string} reference  Fuente del rango usado.
 */

/** @param {number|null|undefined} ageYears */
function isMinor(ageYears) {
  return typeof ageYears === 'number' && ageYears < AGE_LIMITS.adultFrom;
}

/**
 * @param {string} reference
 * @returns {Interpretation}
 */
function adultOnly(reference) {
  return {
    key: 'adult_reference',
    label: 'Sin clasificación (menor de 18 años)',
    tone: 'neutral',
    detail:
      'Este rango de referencia se definió para adultos. En menores de 18 años se interpreta con referencias por edad y sexo, que esta herramienta no incluye.',
    reference,
  };
}

/**
 * IMC: clasificación OMS, siempre en tono neutro para no presentarlo como
 * indicador definitivo en atletas.
 * @param {number|null} value
 * @param {number|null|undefined} ageYears
 * @returns {Interpretation|null}
 */
function interpretBmi(value, ageYears) {
  if (typeof value !== 'number') return null;
  const reference = 'OMS, clasificación del IMC en adultos';
  if (isMinor(ageYears)) return adultOnly(reference);

  const shown = round(value, 1);
  const category = BMI_CATEGORIES.find((c) => shown < c.below) || BMI_CATEGORIES[BMI_CATEGORIES.length - 1];
  return {
    key: category.key,
    label: `${category.label} según la OMS`,
    tone: 'neutral',
    detail:
      'El IMC no distingue entre masa muscular y grasa. En atletas con alta masa muscular puede resultar elevado sin que exista exceso de grasa corporal; interprétalo junto al % de grasa estimado y al índice cintura/altura.',
    reference,
  };
}

/**
 * ICC: la OMS define un único punto de corte por sexo.
 * @param {number|null} value
 * @param {import('./config').Sex} sex
 * @param {number|null|undefined} ageYears
 * @returns {Interpretation|null}
 */
function interpretWhr(value, sex, ageYears) {
  if (typeof value !== 'number' || !WHR_CUTOFFS[sex]) return null;
  const reference = 'OMS (2008), Waist circumference and waist–hip ratio';
  if (isMinor(ageYears)) return adultOnly(reference);

  const cutoff = WHR_CUTOFFS[sex];
  const who = sex === 'male' ? 'hombres' : 'mujeres';
  const shown = round(value, 2);
  if (shown >= cutoff) {
    return {
      key: 'at_or_above_cutoff',
      label: 'En o por encima del punto de corte de la OMS',
      tone: 'attention',
      detail: `La OMS asocia un ICC ≥ ${cutoff.toFixed(2)} en ${who} con un riesgo sustancialmente mayor de complicaciones metabólicas. Es una referencia poblacional, no un diagnóstico.`,
      reference,
    };
  }
  return {
    key: 'below_cutoff',
    label: 'Por debajo del punto de corte de la OMS',
    tone: 'ok',
    detail: `Punto de corte de la OMS para ${who}: ${cutoff.toFixed(2)}. La OMS no define categorías por debajo de ese valor.`,
    reference,
  };
}

/**
 * Índice cintura/altura: categorías de NICE NG246. Las mismas bandas aplican a
 * adultos (1.9.14, con IMC < 35, incluida alta masa muscular) y a niños y
 * jóvenes desde los 5 años (1.10.10, sin restricción de IMC).
 * @param {number|null} value
 * @param {number|null} bmiValue
 * @param {number|null|undefined} ageYears
 * @returns {Interpretation|null}
 */
function interpretWhtr(value, bmiValue, ageYears) {
  if (typeof value !== 'number') return null;
  const minor = isMinor(ageYears);
  const reference = minor ? 'NICE NG246 (2025), recomendación 1.10.10' : 'NICE NG246 (2025), recomendación 1.9.14';

  if (!minor && typeof bmiValue === 'number' && round(bmiValue, 1) >= WHTR_MAX_BMI) {
    return {
      key: 'not_applicable',
      label: 'Categoría no aplicable (IMC ≥ 35)',
      tone: 'neutral',
      detail: `NICE aplica estas categorías a personas con IMC menor de ${WHTR_MAX_BMI} kg/m². Sigue la tendencia del valor entre evaluaciones.`,
      reference,
    };
  }

  const shown = round(value, 2);
  const band = WHTR_BANDS.find((b) => shown < b.below) || WHTR_BANDS[WHTR_BANDS.length - 1];
  const detail =
    band.key === 'below_reference'
      ? 'NICE no define una categoría por debajo de 0.40.'
      : 'Rangos NICE: 0.40–0.49 saludable · 0.50–0.59 aumentada · 0.60 o más alta. NICE los considera aplicables también a adultos con alta masa muscular.';
  return { key: band.key, label: band.label, tone: band.tone, detail, reference };
}

module.exports = { interpretBmi, interpretWhr, interpretWhtr, isMinor };
