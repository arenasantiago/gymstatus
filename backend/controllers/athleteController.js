const Athlete = require('../models/Athlete');
const Evaluation = require('../models/Evaluation');
const asyncHandler = require('../utils/asyncHandler');
const { isValidId, coachIdOf, validationError } = require('../utils/request');
const { validateAthlete, hasErrors } = require('../../shared/validation');
const { isoToUtcDate } = require('../../shared/dates');

/** Campos editables del perfil (la foto solo si viene en la petición). */
function toDocument(value) {
    const doc = {
        name: value.name,
        sex: value.sex,
        birthDate: isoToUtcDate(value.birthDate),
        sport: value.sport,
        level: value.level,
        goal: value.goal,
        activityLevel: value.activityLevel,
        somatotype: value.somatotype,
        specialConditions: value.specialConditions,
    };
    if (value.photo !== undefined) doc.photo = value.photo;
    return doc;
}

// GET /api/athletes — lista del entrenador con el resumen de la última evaluación.
const listAthletes = asyncHandler(async (req, res) => {
    const coachId = coachIdOf(req);
    const [athletes, summaries] = await Promise.all([
        // La foto no se envía en la lista (solo si existe) para no cargar
        // decenas de imágenes en una sola respuesta.
        Athlete.aggregate([
            { $match: { coachId } },
            { $addFields: { hasPhoto: { $ne: [{ $ifNull: ['$photo', null] }, null] } } },
            { $project: { photo: 0 } },
            { $sort: { name: 1 } },
        ]),
        Evaluation.aggregate([
            { $match: { coachId } },
            { $sort: { date: -1, createdAt: -1 } },
            {
                $group: {
                    _id: '$athleteId',
                    evaluationCount: { $sum: 1 },
                    last: {
                        $first: {
                            _id: '$_id',
                            date: '$date',
                            weightKg: '$measurements.weightKg',
                            waistCm: '$measurements.waistCm',
                            bodyFat: '$results.bodyFat',
                        },
                    },
                },
            },
        ]),
    ]);
    const byAthlete = new Map(summaries.map((s) => [String(s._id), s]));

    res.json(
        athletes.map((a) => {
            const s = byAthlete.get(String(a._id));
            const bf = s && s.last.bodyFat;
            return {
                ...a,
                evaluationCount: s ? s.evaluationCount : 0,
                lastEvaluation: s
                    ? {
                          _id: s.last._id,
                          date: s.last.date,
                          weightKg: s.last.weightKg ?? null,
                          waistCm: s.last.waistCm ?? null,
                          bodyFatPct: bf && bf.status === 'ok' ? bf.value : null,
                      }
                    : null,
            };
        }),
    );
});

// POST /api/athletes
const createAthlete = asyncHandler(async (req, res) => {
    const { value, errors } = validateAthlete(req.body);
    if (hasErrors(errors)) return validationError(res, 'Revisa los datos del atleta.', errors);
    const athlete = await Athlete.create({ ...toDocument(value), coachId: coachIdOf(req) });
    res.status(201).json(athlete);
});

// GET /api/athletes/:id — perfil + historial completo (orden cronológico).
const getAthlete = asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Atleta no encontrado' });
    const coachId = coachIdOf(req);
    const athlete = await Athlete.findOne({ _id: req.params.id, coachId }).lean();
    if (!athlete) return res.status(404).json({ message: 'Atleta no encontrado' });
    const evaluations = await Evaluation.find({ athleteId: athlete._id, coachId }).sort({ date: 1, createdAt: 1 }).lean();
    res.json({ athlete, evaluations });
});

// PUT /api/athletes/:id — actualiza el perfil. Las evaluaciones anteriores no
// cambian: cada una conserva el snapshot del perfil con el que se calculó.
const updateAthlete = asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Atleta no encontrado' });
    const { value, errors } = validateAthlete(req.body);
    if (hasErrors(errors)) return validationError(res, 'Revisa los datos del atleta.', errors);
    const athlete = await Athlete.findOneAndUpdate(
        { _id: req.params.id, coachId: coachIdOf(req) },
        toDocument(value),
        { new: true, runValidators: true },
    );
    if (!athlete) return res.status(404).json({ message: 'Atleta no encontrado' });
    res.json(athlete);
});

// DELETE /api/athletes/:id — elimina el atleta y todo su historial.
const deleteAthlete = asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Atleta no encontrado' });
    const coachId = coachIdOf(req);
    const athlete = await Athlete.findOneAndDelete({ _id: req.params.id, coachId });
    if (!athlete) return res.status(404).json({ message: 'Atleta no encontrado' });
    const { deletedCount } = await Evaluation.deleteMany({ athleteId: athlete._id, coachId });
    res.json({ message: 'Atleta eliminado', deletedEvaluations: deletedCount });
});

module.exports = { listAthletes, createAthlete, getAthlete, updateAthlete, deleteAthlete };
