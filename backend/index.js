require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
const { createApp, allowedOrigins } = require('./app');

// Algunos entornos (DNS IPv6 / VPN / redes corporativas) no resuelven los
// registros SRV de `mongodb+srv://` y Node falla con `querySrv ECONNREFUSED`.
// Forzar resolutores públicos evita ese problema sin cambiar la cadena de conexión.
// Se puede desactivar poniendo DNS_OVERRIDE=off en el .env.
if (process.env.DNS_OVERRIDE !== 'off') {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
}

// Mismo valor por defecto que el frontend (frontend/config/api.ts).
const PORT = process.env.PORT || 5005;

if (!process.env.JWT_SECRET) {
    console.error('❌ Falta JWT_SECRET en backend/.env (ver backend/.env.example).');
    process.exit(1);
}

const app = createApp();

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
