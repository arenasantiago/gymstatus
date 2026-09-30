/**
 * Construcción de una evaluación a partir de los datos del formulario.
 *
 * Toda la lógica de validación y cálculo vive en /shared (la misma que usa la
 * app); aquí solo se orquesta: validar → edad a la fecha → calcular →
 * snapshot del perfil y de los parámetros usados.
 */
const { validateEvaluation, hasErrors } = require('../../shared/validation');
const { computeResults, parametersSnapshot } = require('../../shared/evaluation');
const { ageOn, toIsoDate, isoToUtcDate, todayIsoLocal } = require('../../shared/dates');

/**
 * @param {{ athlete: any, body: Record<string, unknown>, today?: string }} input
 * @returns {{ errors: Record<string, string> } | { record: Record<string, any> }}
 */
function buildEvaluation({ athlete, body, today = todayIsoLocal() }) {
    const unitSystem = body && body.unitSystem === 'imperial' ? 'imperial' : 'metric';
    const birthDate = toIsoDate(athlete.birthDate) || undefined;
    const { value, errors } = validateEvaluation(body, { birthDate, today, unitSystem });
    if (hasErrors(errors)) return { errors };

    const goal = value.goal || athlete.goal;
    const activityLevel = value.activityLevel || athlete.activityLevel;
    const ageYears = ageOn(birthDate, value.date);
    const profile = { sex: athlete.sex, ageYears: ageYears === null ? undefined : ageYears, goal, activityLevel };

    return {
        record: {
            date: isoToUtcDate(value.date),
            measurements: value.measurements,
            inputUnitSystem: unitSystem,
            profileSnapshot: {
                name: athlete.name,
                sex: athlete.sex,
                ageYears: profile.ageYears,
                goal,
                activityLevel,
                sport: athlete.sport || '',
                level: athlete.level,
                specialConditions: athlete.specialConditions === true,
            },
            results: computeResults({ profile, measurements: value.measurements }),
            parameters: parametersSnapshot(goal, activityLevel),
            notes: value.notes,
        },
    };
}

module.exports = { buildEvaluation };
