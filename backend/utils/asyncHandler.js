/**
 * Envuelve un controlador async para que cualquier error (incluidos los de
 * Mongo) llegue al manejador de errores central en lugar de quedar como una
 * promesa rechazada sin respuesta (Express 4 no captura errores async).
 */
module.exports = function asyncHandler(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
