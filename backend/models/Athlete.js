const mongoose = require('mongoose');
const {
    SEX_KEYS,
    GOAL_KEYS,
    ACTIVITY_KEYS,
    LEVEL_KEYS,
    SOMATOTYPE_KEYS,
} = require('../../shared/config');
const { TEXT_LIMITS } = require('../../shared/validation');

/**
 * Perfil del atleta. Pertenece a un entrenador (coachId) y solo él puede
 * verlo o modificarlo. La edad no se guarda: se calcula desde la fecha de
 * nacimiento en la fecha de cada evaluación.
 */
const athleteSchema = new mongoose.Schema(
    {
        coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        name: { type: String, required: true, trim: true, maxlength: TEXT_LIMITS.name },
        // Sexo biológico: solo se usa en las ecuaciones que lo requieren.
        sex: { type: String, enum: SEX_KEYS, required: true },
        // Fecha de calendario guardada a medianoche UTC.
        birthDate: { type: Date, required: true },
        sport: { type: String, default: '', maxlength: TEXT_LIMITS.sport },
        level: { type: String, enum: LEVEL_KEYS, default: 'recreational' },
        goal: { type: String, enum: GOAL_KEYS, required: true },
        activityLevel: { type: String, enum: ACTIVITY_KEYS, required: true },
        // Referencia descriptiva opcional; no interviene en ningún cálculo.
        somatotype: { type: String, enum: [...SOMATOTYPE_KEYS, null], default: null },
        // Embarazo, enfermedad renal, etc.: muestra avisos en resultados y PDF.
        specialConditions: { type: Boolean, default: false },
        // Data URI (PNG/JPEG) ya redimensionada en el cliente.
        photo: { type: String, default: null },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model('Athlete', athleteSchema);
