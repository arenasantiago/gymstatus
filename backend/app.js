/**
 * Construcción de la aplicación Express (sin conectar a la base ni escuchar
 * un puerto) para poder reutilizarla en index.js y en las pruebas.
 */
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const performanceRoutes = require('./routes/performanceRoutes');

// Lista de orígenes permitidos (la app nativa no envía Origin).
// En desarrollo se permiten los localhost de Expo/Metro; en producción se
// añaden los dominios web (p. ej. el de Vercel) vía CORS_ORIGINS en el .env,
// separados por comas: CORS_ORIGINS=https://tu-app.vercel.app,https://tudominio.com
const DEV_ORIGINS = [
    'http://localhost:19006',  // Expo Web (SDK antiguos)
    'http://localhost:19000',  // Expo Dev Server
    'exp://localhost:19000',   // Expo Go
    'http://localhost:3000',   // React Development Server
    'http://localhost:8081',   // Expo Web / Metro (SDK 50+)
    'http://localhost:5000',   // Backend Development Server
];

const ENV_ORIGINS = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

const allowedOrigins = [...DEV_ORIGINS, ...ENV_ORIGINS];

class CorsError extends Error {}

function createApp() {
    const app = express();

    app.use(cors({
        origin(origin, callback) {
            // Permitir solicitudes sin origen (aplicaciones móviles o curl)
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new CorsError('La política CORS no permite el acceso desde este origen.'), false);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        maxAge: 86400, // Cache preflight requests por 24 horas
    }));

    // La foto del atleta y el logo viajan como data URI (máx. ~0.6 MB).
    app.use(express.json({ limit: '2mb' }));

    app.get('/', (req, res) => res.send('Backend funcionando'));
    app.get('/api/health', (req, res) => res.json({ ok: true }));

    app.use('/api/users', userRoutes);
    app.use('/api', performanceRoutes);

    app.use((req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

    // Manejador de errores central: respuestas JSON en español y sin trazas.
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        if (err instanceof CorsError) return res.status(403).json({ message: err.message });
        if (err.type === 'entity.too.large') {
            return res.status(413).json({ message: 'La información enviada es demasiado grande. Usa imágenes más pequeñas.' });
        }
        if (err.type === 'entity.parse.failed') {
            return res.status(400).json({ message: 'El cuerpo de la petición no es JSON válido.' });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: 'Datos no válidos.', errors: Object.fromEntries(Object.entries(err.errors || {}).map(([k, v]) => [k, v.message])) });
        }
        console.error(err);
        return res.status(500).json({ message: 'Error interno del servidor' });
    });

    return app;
}

module.exports = { createApp, allowedOrigins };
