// middleware/auth.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: "Acceso denegado" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Inyecta los datos del usuario en la solicitud
        next();
    } catch (error) {
        res.status(400).json({ message: "Token inválido" });
    }
};

module.exports = authMiddleware;