require('dotenv').config();
const mongoose = require('mongoose');

async function setupDatabase() {
    try {
        // Intentar conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conexión a MongoDB establecida correctamente');
        
        // Verificar que podemos realizar operaciones
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📚 Colecciones disponibles:', collections.map(c => c.name).join(', '));
        
        console.log('✨ Configuración completada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al configurar la base de datos:', error.message);
        console.log('\nSugerencias para resolver el problema:');
        console.log('1. Verifica que tu conexión a internet esté activa');
        console.log('2. Asegúrate de que la URI de MongoDB en el archivo .env sea correcta');
        console.log('3. Si estás usando MongoDB Atlas, verifica que tu IP esté en la lista blanca');
        console.log('4. Verifica que el usuario y contraseña en la URI sean correctos');
        process.exit(1);
    }
}

setupDatabase(); 