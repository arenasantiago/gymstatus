const mongoose = require('mongoose');

/** Id de Mongo válido (24 caracteres hexadecimales). */
function isValidId(id) {
    return typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id);
}

/** Id del entrenador autenticado (inyectado por el middleware de auth). */
function coachIdOf(req) {
    return new mongoose.Types.ObjectId(req.user.userId);
}

/** Respuesta 400 con errores por campo (mismo formato en toda la API). */
function validationError(res, message, errors) {
    return res.status(400).json({ message, errors });
}

module.exports = { isValidId, coachIdOf, validationError };
