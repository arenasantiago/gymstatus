require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Lista de orígenes permitidos
const allowedOrigins = [
    'http://localhost:19006',  // Expo Web
    'http://localhost:19000',  // Expo Dev Server
    'exp://localhost:19000',   // Expo Go
    'http://localhost:3000',   // React Development Server
    'http://localhost:8081',   // Vue Development Server
    'http://localhost:5000',   // Backend Development Server
];

// Configura CORS con opciones más seguras
app.use(cors({
    origin: function(origin, callback) {
        // Permitir solicitudes sin origen (como aplicaciones móviles o curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'La política CORS no permite el acceso desde este origen.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Permite el envío de cookies
    maxAge: 86400 // Cache preflight requests por 24 horas
}));

// Middleware
app.use(express.json());
app.use('/api/users', userRoutes);

// Función para conectar a MongoDB con reintentos
async function connectWithRetry(retries = 5, delay = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('✅ MongoDB conectado exitosamente');
            return true;
        } catch (error) {
            console.error(`❌ Intento ${i + 1} de ${retries} fallido:`, error.message);
            if (i < retries - 1) {
                console.log(`⏳ Reintentando en ${delay/1000} segundos...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    return false;
}

// Rutas de ejemplo
app.get('/', (req, res) => {
    res.send('Backend funcionando');
});

// Iniciar el servidor solo si la conexión a MongoDB es exitosa
connectWithRetry().then(connected => {
    if (connected) {
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
            console.log(`📝 API disponible en http://localhost:${PORT}`);
            console.log('🔒 CORS configurado para los siguientes orígenes:');
            allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
        });
    } else {
        console.error('❌ No se pudo conectar a MongoDB después de varios intentos');
        process.exit(1);
    }
});

