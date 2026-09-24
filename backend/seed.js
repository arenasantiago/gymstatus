/**
 * Script para crear (o actualizar) un usuario de prueba rápidamente.
 * Útil cuando el cluster se reinicia y la base queda vacía.
 *
 * Uso:
 *   node seed.js                       -> crea usuario "demo" / "demo123"
 *   node seed.js miuser mipass correo  -> crea usuario personalizado
 */
require('dotenv').config();
const dns = require('dns');
const mongoose = require('mongoose');
const User = require('./models/User');

if (process.env.DNS_OVERRIDE !== 'off') {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const username = process.argv[2] || 'demo';
const password = process.argv[3] || 'demo123';
const email = process.argv[4] || `${username}@demo.com`;

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
        console.log('✅ Conectado a MongoDB');

        let user = await User.findOne({ username });
        if (user) {
            // El hook pre('save') vuelve a hashear la contraseña.
            user.email = email;
            user.password = password;
            await user.save();
            console.log(`♻️  Usuario "${username}" actualizado.`);
        } else {
            await User.create({ username, email, password });
            console.log(`✨ Usuario "${username}" creado.`);
        }

        console.log('\nCredenciales para iniciar sesión:');
        console.log(`   usuario:    ${username}`);
        console.log(`   contraseña: ${password}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
})();
