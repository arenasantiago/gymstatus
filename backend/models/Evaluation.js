const mongoose = require('mongoose');
const { MEASUREMENT_KEYS, MEASUREMENT_FIELDS, SEX_KEYS, GOAL_KEYS, ACTIVITY_KEYS } = require('../../shared/config');
const { TEXT_LIMITS } = require('../../shared/validation');

/**
 * Evaluación: registro histórico inmutable de una fecha.
 *
 * Mantiene separados:
 *   - measurements     → datos introducidos por el entrenador (kg / cm)
 *   - profileSnapshot  → contexto del atleta en esa fecha (edad, objetivo…)
 *   - results          → valores calculados, cada uno con su fórmula, datos
 *                        usados e interpretación (separada del valor)
 *   - parameters       → factores y versión del motor de cálculo usados
 *
 * Las mediciones y resultados nunca se sobrescriben: una nueva medición crea
 * una nueva evaluación. Solo las observaciones del entrenador son editables.
 */
const measurementsSchema = new mongoose.Schema(
    Object.fromEntries(
        MEASUREMENT_KEYS.map((key) => [
            key,
            { type: Number, min: MEASUREMENT_FIELDS[key].min, max: MEASUREMENT_FIELDS[key].max },
        ]),
    ),
    { _id: false },
);

const profileSnapshotSchema = new mongoose.Schema(
    {
        name: String,
        sex: { type: String, enum: SEX_KEYS },
        ageYears: Number,
        goal: { type: String, enum: GOAL_KEYS },
        activityLevel: { type: String, enum: ACTIVITY_KEYS },
        sport: String,
        level: String,
        // Condición especial declarada en esa fecha (activa el aviso de salud).
        specialConditions: { type: Boolean, default: false },
    },
    { _id: false },
);

const evaluationSchema = new mongoose.Schema(
    {
        coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        athleteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete', required: true, index: true },
        // Fecha de calendario de la evaluación (medianoche UTC).
        date: { type: Date, required: true },
        measurements: { type: measurementsSchema, required: true },
        // Unidades en que se ingresaron (siempre se guardan en métrico).
        inputUnitSystem: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
        profileSnapshot: { type: profileSnapshotSchema, required: true },
        results: { type: mongoose.Schema.Types.Mixed, required: true },
        parameters: { type: mongoose.Schema.Types.Mixed, required: true },
        notes: { type: String, default: '', maxlength: TEXT_LIMITS.notes },
    },
    { timestamps: true, versionKey: false, minimize: false },
);

evaluationSchema.index({ athleteId: 1, date: 1, createdAt: 1 });

module.exports = mongoose.model('Evaluation', evaluationSchema);
