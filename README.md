# GymStatus

Aplicación móvil para gestionar el estado de gimnasios desarrollada con React Native y Expo.

## Requisitos Previos

- Node.js (versión 18 o superior)
- npm (incluido con Node.js)
- MongoDB (versión 6.0 o superior)
- Expo CLI (`npm install -g expo-cli`)

## Instalación

1. Clonar el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd gymstatus
```

2. Instalar dependencias del proyecto principal:
```bash
npm install
```

3. Instalar dependencias del backend:
```bash
cd backend
npm install
cd ..
```

4. Configurar variables de entorno:
   - Crear un archivo `.env` en la carpeta `backend` con las siguientes variables:
   ```
   MONGODB_URI=tu_uri_de_mongodb
   PORT=3000
   ```

## Ejecución

1. Iniciar el backend:
```bash
cd backend
npm start
```

2. En una nueva terminal, iniciar el frontend:
```bash
# Desde la raíz del proyecto
npm start
```

3. Para ejecutar en diferentes plataformas:
   - Android: `npm run android`
   - iOS: `npm run ios`
   - Web: `npm run web`

## Estructura del Proyecto

```
gymstatus/
├── frontend/          # Aplicación React Native
│   ├── components/    # Componentes reutilizables
│   └── Navigation/    # Configuración de navegación
├── backend/           # Servidor Node.js
│   ├── controllers/   # Lógica de negocio
│   ├── models/        # Modelos de MongoDB
│   └── routes/        # Rutas de la API
└── assets/           # Recursos estáticos
```

## Tecnologías Utilizadas

- Frontend:
  - React Native
  - Expo
  - React Navigation
  - Axios

- Backend:
  - Node.js
  - Express
  - MongoDB
  - Mongoose

## Solución de Problemas Comunes

1. Si encuentras errores de dependencias:
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

2. Si Expo no inicia:
```bash
expo doctor
```

3. Si MongoDB no se conecta:
- Verifica que el servicio de MongoDB esté corriendo
- Confirma que la URI de conexión sea correcta
- Asegúrate de que el puerto no esté bloqueado

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia ISC. 