const express = require('express');
const authMiddleware = require('../middleware/auth');
const { listAthletes, createAthlete, getAthlete, updateAthlete, deleteAthlete } = require('../controllers/athleteController');
const {
    createEvaluation,
    listEvaluations,
    getEvaluation,
    updateEvaluationNotes,
    deleteEvaluation,
} = require('../controllers/evaluationController');
const { getBrand, saveBrand } = require('../controllers/brandController');

/**
 * API de Athlete Performance. Todas las rutas requieren sesión y cada
 * consulta se filtra por el entrenador autenticado (coachId), de modo que un
 * entrenador nunca puede leer ni modificar atletas de otro.
 */
const router = express.Router();
router.use(authMiddleware);

router.get('/athletes', listAthletes);
router.post('/athletes', createAthlete);
router.get('/athletes/:id', getAthlete);
router.put('/athletes/:id', updateAthlete);
router.delete('/athletes/:id', deleteAthlete);

router.get('/athletes/:id/evaluations', listEvaluations);
router.post('/athletes/:id/evaluations', createEvaluation);

router.get('/evaluations/:id', getEvaluation);
router.put('/evaluations/:id/notes', updateEvaluationNotes);
router.delete('/evaluations/:id', deleteEvaluation);

router.get('/brand', getBrand);
router.put('/brand', saveBrand);

module.exports = router;
