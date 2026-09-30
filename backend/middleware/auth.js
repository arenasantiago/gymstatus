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
        // 401 (no 400) para que la app detecte la sesión vencida y vuelva al login.
        res.status(401).json({ message: "Sesión expirada o token inválido. Inicia sesión de nuevo." });
    }
};

module.exports = authMiddleware;
