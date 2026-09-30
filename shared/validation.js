// @ts-check
'use strict';

/**
 * Validación compartida por la app (feedback inmediato en el formulario) y el
 * backend (fuente de verdad antes de guardar). Devuelve siempre
 * { value, errors } con errores por campo en español.
 *
 * Todo texto libre (nombres, observaciones, marca) se trata como DATO: se
 * limpia de caracteres de control y se limita su longitud. Nunca se interpreta
 * ni se ejecuta; al generar el PDF se escapa como HTML.
 */

const {
  SEX_KEYS,
  GOAL_KEYS,
  ACTIVITY_KEYS,
  LEVEL_KEYS,
  SOMATOTYPE_KEYS,
  AGE_LIMITS,
  MEASUREMENT_KEYS,
  REQUIRED_MEASUREMENTS,
  MEASUREMENT_FIELDS,
} = require('./config');
const { round } = require('./formulas');
const { toCanonical, fromCanonical, unitLabel } = require('./units');
const { isValidIsoDate, ageOn, todayIsoLocal, daysBetween } = require('./dates');
const { formatTrim } = require('./format');

/** Longitudes máximas de texto libre. */
const TEXT_LIMITS = {
  name: 80,
  sport: 60,
  notes: 1000,
  businessName: 80,
  coachName: 80,
  phone: 30,
  email: 120,
  contactExtra: 120,
};

/** Tamaño máximo de las imágenes guardadas como data URI (caracteres base64). */
const IMAGE_LIMITS = {
  photo: 400000,
  logo: 600000,
};

const DEFAULT_BRAND_COLOR = '#2563EB';
const EARLIEST_EVALUATION = '1950-01-01';

/**
 * @typedef {Record<string, string>} FieldErrors
 */

/**
 * Convierte texto a número aceptando coma o punto decimal ("70,5" y "70.5").
 * @param {unknown} input
 * @returns {number|null} null si está vacío; NaN si no es un número válido.
 */
function parseDecimal(input) {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : NaN;
  const text = String(input).trim().replace(/\s+/g, '');
  if (text === '') return null;
  const normalized = text.replace(',', '.');
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return NaN;
  return Number(normalized);
}

/**
 * Limpia texto libre: quita caracteres de control (salvo saltos de línea),
 * espacios sobrantes y recorta a la longitud máxima.
 * @param {unknown} value
 * @param {number} maxLength
 * @returns {string}
 */
function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

/**
 * @param {unknown} value
 * @param {number} maxChars
 * @returns {{ ok: boolean, error?: string }}
 */
function checkImageDataUri(value, maxChars) {
  if (typeof value !== 'string' || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value)) {
    return { ok: false, error: 'La imagen debe ser PNG o JPEG.' };
  }
  if (value.length > maxChars) {
    return { ok: false, error: 'La imagen es demasiado grande. Usa una imagen más pequeña.' };
  }
  return { ok: true };
}

/**
 * Valida y normaliza mediciones. Los valores devueltos están en unidades
 * canónicas (kg / cm), redondeados a la precisión de cada campo.
 * @param {Record<string, unknown>} raw
 * @param {{ unitSystem?: import('./units').UnitSystem, required?: string[] }} [options]
 * @returns {{ value: Partial<Record<import('./config').MeasurementKey, number>>, errors: FieldErrors }}
 */
function validateMeasurements(raw, options = {}) {
  const unitSystem = options.unitSystem || 'metric';
  const required = options.required || REQUIRED_MEASUREMENTS;
  /** @type {Partial<Record<import('./config').MeasurementKey, number>>} */
  const value = {};
  /** @type {FieldErrors} */
  const errors = {};
  const source = raw && typeof raw === 'object' ? raw : {};

  for (const key of MEASUREMENT_KEYS) {
    const field = MEASUREMENT_FIELDS[key];
    const parsed = parseDecimal(source[key]);
    if (parsed === null) {
      if (required.includes(key)) errors[key] = `${field.label} es obligatorio.`;
      continue;
    }
    if (Number.isNaN(parsed)) {
      errors[key] = `${field.label}: ingresa un número válido.`;
      continue;
    }
    const canonical = toCanonical(parsed, field.dimension, unitSystem);
    if (canonical < field.min || canonical > field.max) {
      const unit = unitLabel(field.dimension, unitSystem);
      const min = formatTrim(fromCanonical(field.min, field.dimension, unitSystem), 1);
      const max = formatTrim(fromCanonical(field.max, field.dimension, unitSystem), 1);
      errors[key] = `${field.label} debe estar entre ${min} y ${max} ${unit}. Revisa el valor.`;
      continue;
    }
    value[key] = round(canonical, field.decimals);
  }

  if (value.waistCm !== undefined && value.neckCm !== undefined && value.waistCm <= value.neckCm) {
    errors.neckCm = 'El cuello debe ser menor que la cintura. Revisa ambas medidas.';
  }
  return { value, errors };
}

/**
 * @param {unknown} v
 * @param {readonly string[]} allowed
 * @returns {v is string}
 */
function isOneOf(v, allowed) {
  return typeof v === 'string' && allowed.includes(v);
}

/**
 * Perfil del atleta.
 * @param {Record<string, unknown>} raw
 * @param {{ today?: string, partial?: boolean }} [options]
 */
function validateAthlete(raw, options = {}) {
  const today = options.today || todayIsoLocal();
  const source = raw && typeof raw === 'object' ? raw : {};
  /** @type {Record<string, any>} */
  const value = {};
  /** @type {FieldErrors} */
  const errors = {};

  const name = sanitizeText(source.name, TEXT_LIMITS.name);
  if (name.length < 2) errors.name = 'Ingresa el nombre del atleta (mínimo 2 caracteres).';
  else value.name = name;

  if (!isOneOf(source.sex, SEX_KEYS)) errors.sex = 'Selecciona el sexo biológico (se usa en las fórmulas).';
  else value.sex = source.sex;

  const birthDate = typeof source.birthDate === 'string' ? source.birthDate.slice(0, 10) : '';
  if (!isValidIsoDate(birthDate)) {
    errors.birthDate = 'Ingresa una fecha de nacimiento válida (DD/MM/AAAA).';
  } else {
    const age = ageOn(birthDate, today);
    if (age === null || age < AGE_LIMITS.min || age > AGE_LIMITS.max) {
      errors.birthDate = `La edad debe estar entre ${AGE_LIMITS.min} y ${AGE_LIMITS.max} años.`;
    } else {
      value.birthDate = birthDate;
    }
  }

  value.sport = sanitizeText(source.sport, TEXT_LIMITS.sport);

  if (source.level === undefined || source.level === null || source.level === '') value.level = 'recreational';
  else if (!isOneOf(source.level, LEVEL_KEYS)) errors.level = 'Nivel deportivo no válido.';
  else value.level = source.level;

  if (!isOneOf(source.goal, GOAL_KEYS)) errors.goal = 'Selecciona el objetivo actual.';
  else value.goal = source.goal;

  if (!isOneOf(source.activityLevel, ACTIVITY_KEYS)) errors.activityLevel = 'Selecciona el nivel de actividad.';
  else value.activityLevel = source.activityLevel;

  if (source.somatotype === undefined || source.somatotype === null || source.somatotype === '') value.somatotype = null;
  else if (!isOneOf(source.somatotype, SOMATOTYPE_KEYS)) errors.somatotype = 'Referencia de somatotipo no válida.';
  else value.somatotype = source.somatotype;

  value.specialConditions = source.specialConditions === true;

  if (source.photo === undefined) {
    // Sin cambios en la foto.
  } else if (source.photo === null || source.photo === '') {
    value.photo = null;
  } else {
    const check = checkImageDataUri(source.photo, IMAGE_LIMITS.photo);
    if (!check.ok) errors.photo = check.error || 'Imagen no válida.';
    else value.photo = source.photo;
  }

  return { value, errors };
}

/**
 * Datos de una nueva evaluación.
 * @param {Record<string, unknown>} raw
 * @param {{ birthDate?: string, today?: string, unitSystem?: import('./units').UnitSystem }} [options]
 */
function validateEvaluation(raw, options = {}) {
  const today = options.today || todayIsoLocal();
  const source = raw && typeof raw === 'object' ? raw : {};
  /** @type {Record<string, any>} */
  const value = {};
  /** @type {FieldErrors} */
  const errors = {};

  const date = typeof source.date === 'string' ? source.date.slice(0, 10) : '';
  if (!isValidIsoDate(date)) {
    errors.date = 'Ingresa una fecha de evaluación válida (DD/MM/AAAA).';
  } else {
    const aheadDays = daysBetween(today, date);
    if (aheadDays !== null && aheadDays > 1) errors.date = 'La fecha de evaluación no puede ser futura.';
    else if (date < EARLIEST_EVALUATION) errors.date = 'Fecha de evaluación no válida.';
    else if (options.birthDate && date < options.birthDate) errors.date = 'La evaluación no puede ser anterior al nacimiento.';
    else value.date = date;
  }

  const measurements = validateMeasurements(
    /** @type {Record<string, unknown>} */ (source.measurements || {}),
    { unitSystem: options.unitSystem },
  );
  value.measurements = measurements.value;
  Object.assign(errors, measurements.errors);

  if (source.goal !== undefined) {
    if (!isOneOf(source.goal, GOAL_KEYS)) errors.goal = 'Objetivo no válido.';
    else value.goal = source.goal;
  }
  if (source.activityLevel !== undefined) {
    if (!isOneOf(source.activityLevel, ACTIVITY_KEYS)) errors.activityLevel = 'Nivel de actividad no válido.';
    else value.activityLevel = source.activityLevel;
  }

  value.notes = sanitizeText(source.notes, TEXT_LIMITS.notes);
  return { value, errors };
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
}

/**
 * Configuración de marca del entrenador.
 * @param {Record<string, unknown>} raw
 */
function validateBrand(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  /** @type {Record<string, any>} */
  const value = {};
  /** @type {FieldErrors} */
  const errors = {};

  value.businessName = sanitizeText(source.businessName, TEXT_LIMITS.businessName);
  value.coachName = sanitizeText(source.coachName, TEXT_LIMITS.coachName);

  const phone = sanitizeText(source.phone, TEXT_LIMITS.phone);
  if (phone && !/^[0-9+()\-\s.]{5,30}$/.test(phone)) errors.phone = 'Teléfono no válido.';
  else value.phone = phone;

  const email = sanitizeText(source.email, TEXT_LIMITS.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Correo no válido.';
  else value.email = email;

  value.contactExtra = sanitizeText(source.contactExtra, TEXT_LIMITS.contactExtra);

  if (source.primaryColor === undefined || source.primaryColor === '') value.primaryColor = DEFAULT_BRAND_COLOR;
  else if (!isHexColor(source.primaryColor)) errors.primaryColor = 'Usa un color hexadecimal, por ejemplo #2563EB.';
  else value.primaryColor = String(source.primaryColor).toUpperCase();

  if (source.logo === undefined) {
    // Sin cambios.
  } else if (source.logo === null || source.logo === '') {
    value.logo = null;
  } else {
    const check = checkImageDataUri(source.logo, IMAGE_LIMITS.logo);
    if (!check.ok) errors.logo = check.error || 'Imagen no válida.';
    else value.logo = source.logo;
  }

  return { value, errors };
}

/** @param {FieldErrors} errors */
function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

module.exports = {
  TEXT_LIMITS,
  IMAGE_LIMITS,
  DEFAULT_BRAND_COLOR,
  parseDecimal,
  sanitizeText,
  checkImageDataUri,
  isHexColor,
  validateMeasurements,
  validateAthlete,
  validateEvaluation,
  validateBrand,
  hasErrors,
};
