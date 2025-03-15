require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const Record = require('../models/Record');
const authMiddleware = require('../middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Configura CORS
app.use(cors({
    origin: 'http://localhost:8081', // Permite solicitudes desde este origen
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
    allowedHeaders: ['Content-Type', 'Authorization'], // Encabezados permitidos
}));

const url = process.env.MONGODB_URI;
// Middleware
app.use(express.json());
app.use('/api/users', userRoutes);

// MongoDB Connection
mongoose
    .connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB conectado'))
    .catch((err) => console.error('Error al conectar MongoDB:', err));

// Rutas de ejemplo
app.get('/', (req, res) => {
    res.send('Backend funcionando');

});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
console.log('MongoDB URI:', url);

