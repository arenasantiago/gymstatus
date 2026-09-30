const Athlete = require('../models/Athlete');
const Evaluation = require('../models/Evaluation');
const asyncHandler = require('../utils/asyncHandler');
const { isValidId, coachIdOf, validationError } = require('../utils/request');
const { buildEvaluation } = require('../services/evaluationService');
const { sanitizeText, TEXT_LIMITS } = require('../../shared/validation');

// POST /api/athletes/:id/evaluations — crea SIEMPRE un registro nuevo; las
// evaluaciones anteriores nunca se sobrescriben.
const createEvaluation = asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Atleta no encontrado' });
    const coachId = coachIdOf(req);
    const athlete = await Athlete.findOne({ _id: req.params.id, coachId });
    if (!athlete) return res.status(404).json({ message: 'Atleta no encontrado' });

    const built = buildEvaluation({ athlete, body: req.body || {} });
    if ('errors' in built) return validationError(res, 'Revisa las mediciones.', built.errors);

    const evaluation = await Evaluation.create({ ...built.record, athleteId: athlete._id, coachId });

    // El objetivo y la actividad elegidos en la evaluación pasan a ser los
    // actuales del atleta (las evaluaciones anteriores conservan los suyos).
    const { goal, activityLevel } = built.record.profileSnapshot;
    if (athlete.goal !== goal || athlete.activityLevel !== activityLevel) {
        athlete.goal = goal;
        athlete.activityLevel = activityLevel;
        await athlete.save();
    }
    res.status(201).json(evaluation);
});

// GET /api/athletes/:id/evaluations
const listEvaluations = asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Atleta no encontrado' });
    const coachId = coachIdOf(req);
    const exists = await Athlete.exists({ _id: req.params.id, coachId });
    if (!exists) return res.status(404).json({ message: 'Atleta no encontrado' });
    const evaluations = await Evaluation.find({ athleteId: req.params.id, coachId }).sort({ date: 1, createdAt: 1 }).lean();
    res.json(evaluations);
});

// GET /api/evaluations/:id
const getEvaluation = asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Evaluación no encontrada' });
    const evaluation = await Evaluation.findOne({ _id: req.params.id, coachId: coachIdOf(req) }).lean();
    if (!evaluation) return res.status(404).json({ message: 'Evaluación no encontrada' });
    res.json(evaluation);
});

// PUT /api/evaluations/:id/notes — lo único editable: las observaciones.
// Mediciones y resultados son históricos; para corregirlos se elimina la
// evaluación y se registra de nuevo.
const updateEvaluationNotes = asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Evaluación no encontrada' });
    const notes = sanitizeText(req.body && req.body.notes, TEXT_LIMITS.notes);
    const evaluation = await Evaluation.findOneAndUpdate(
        { _id: req.params.id, coachId: coachIdOf(req) },
        { notes },
        { new: true },
    );
    if (!evaluation) return res.status(404).json({ message: 'Evaluación no encontrada' });
    res.json(evaluation);
});

// DELETE /api/evaluations/:id — solo por acción explícita del entrenador.
const deleteEvaluation = asyncHandler(async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Evaluación no encontrada' });
    const evaluation = await Evaluation.findOneAndDelete({ _id: req.params.id, coachId: coachIdOf(req) });
    if (!evaluation) return res.status(404).json({ message: 'Evaluación no encontrada' });
    res.json({ message: 'Evaluación eliminada' });
});

module.exports = { createEvaluation, listEvaluations, getEvaluation, updateEvaluationNotes, deleteEvaluation };
