# GymStatus

Aplicación móvil (React Native + Expo) que calcula el **IMC** (Índice de Masa
Corporal) y el **ICC** (Índice Cintura-Cadera) de una persona, interpreta el
resultado y permite guardar, consultar, editar y eliminar registros mediante un
backend propio en Node.js/Express sobre MongoDB.

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
   - Copia `backend/.env.example` a `backend/.env` y rellena los valores:
   ```
   MONGODB_URI=mongodb://localhost:27017/gymstatus
   PORT=5000
   JWT_SECRET=una-cadena-larga-y-aleatoria
   ```
   > El archivo `.env` NO se sube al repositorio (está en `.gitignore`).

   - Opcional (frontend): si pruebas en un dispositivo/emulador real, define la
     URL del backend accesible desde el dispositivo (no `localhost`):
   ```bash
   # variable de entorno de Expo
   EXPO_PUBLIC_API_URL=http://TU_IP_LAN:5000/api
   ```
   Por defecto el frontend usa `10.0.2.2` en el emulador de Android y
   `localhost` en web.

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
├── frontend/              # Aplicación React Native (Expo)
│   ├── components/        # Pantallas + UI kit reutilizable (components/ui)
│   ├── config/            # Configuración de la API (URL base por plataforma)
│   ├── services/          # Cliente HTTP, auth (token) y lógica de salud
│   ├── theme/             # Sistema de diseño (colores, spacing, tipografía)
│   └── Navigation/        # Configuración de navegación
├── backend/               # Servidor Node.js
│   ├── controllers/       # Lógica de negocio
│   ├── middleware/        # Autenticación JWT
│   ├── models/            # Modelos de MongoDB (User, Record)
│   └── routes/            # Rutas de la API
└── assets/                # Recursos estáticos (fuentes, iconos)
```

## Endpoints de la API

Base: `/api/users`

| Método | Ruta            | Auth | Descripción                          |
|--------|-----------------|------|--------------------------------------|
| POST   | `/register`     | No   | Registrar usuario                    |
| POST   | `/login`        | No   | Iniciar sesión (devuelve un JWT)     |
| POST   | `/records`      | Sí   | Guardar un registro de salud         |
| GET    | `/records`      | Sí   | Listar los registros del usuario     |
| PUT    | `/records/:id`  | Sí   | Editar un registro                   |
| DELETE | `/records/:id`  | Sí   | Eliminar un registro                 |

Las rutas protegidas requieren la cabecera `Authorization: Bearer <token>`.

## Tecnologías Utilizadas

- Frontend:
  - React Native
  - Expo
  - React Navigation
  - AsyncStorage (persistencia del token)

- Backend:
  - Node.js
  - Express
  - MongoDB
  - Mongoose
  - JWT + bcrypt (autenticación)

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