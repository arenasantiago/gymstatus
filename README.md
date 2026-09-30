# GymStatus · Athlete Performance

Aplicación para entrenadores y preparadores físicos: registra a tus atletas,
haz evaluaciones antropométricas periódicas y obtén composición corporal,
requerimientos energéticos y de macronutrientes con fuentes citadas, evolución
en el tiempo y una ficha PDF con tu marca.

- App web (PWA instalable): https://gymstatus-frontend.vercel.app
- API: https://gymstatus.onrender.com (comprobación: `/api/health`)
- Repo: https://github.com/arenasantiago/gymstatus

> La API corre en el plan gratuito de Render: tras 15 min sin uso se apaga y el
> primer acceso tarda entre 30 y 60 s en responder. La app la despierta al
> abrirse; si el primer inicio de sesión tarda, espera unos segundos y reintenta.

## Funcionalidades

- Cuentas de entrenador con JWT; cada entrenador solo ve sus propios atletas.
- Perfil del atleta: sexo, fecha de nacimiento, deporte, nivel, objetivo,
  nivel de actividad, somatotipo (descriptivo), condiciones especiales y foto.
- Evaluaciones con peso, altura y perímetros (cintura, cadera, cuello, pecho,
  brazo, muslo) en sistema métrico o imperial.
- Resultados calculados y explicados uno a uno (fórmula, datos usados e
  interpretación separada del valor): IMC (OMS), índice cintura/altura (NICE),
  índice cintura/cadera (OMS), % de grasa (método de la Marina de EE. UU.,
  Hodgdon y Beckett 1984), masa grasa y libre de grasa, TMB (Mifflin-St Jeor),
  gasto energético total (PAL de FAO/OMS/UNU), objetivo energético según meta,
  proteína, grasas, carbohidratos e hidratación (ACSM/AND/DC, ISSN).
- Cada evaluación guarda un snapshot del perfil y de los parámetros con los que
  se calculó (`CALC_VERSION`), por lo que el historial sigue siendo explicable
  aunque la configuración cambie después. Solo las observaciones son editables.
- Evolución: gráfico por métrica y comparativo "actual vs anterior" coloreado
  según el objetivo del atleta.
- Ficha PDF con la marca del entrenador (nombre, logo, color, contacto).
- Pantalla de metodología con todas las fuentes y los factores en uso.

## Arquitectura

```
frontend/   App React Native + Expo SDK 57 (TypeScript). Pantallas, UI kit, tema,
            servicios (cliente HTTP, auth, PDF) y navegación.
backend/    API Node 20+ / Express 4 / Mongoose 8. Rutas → controladores →
            servicios → modelos; manejador de errores central en JSON.
shared/     Motor de cálculo puro en JavaScript (@ts-check + JSDoc), usado tal cual
            por el frontend y el backend: config (factores y rangos), fórmulas,
            validación, interpretación, unidades, fechas, informe PDF.
scripts/    postbuild-web.mjs: convierte la exportación web en una PWA instalable.
```

Reglas de diseño: toda la lógica de cálculo vive en `shared/` (nunca en una
pantalla ni en un controlador); las pantallas no construyen peticiones (usan
`frontend/services`); el estilo sale de los tokens de `frontend/theme`; los
secretos van en `backend/.env`. El detalle para colaboradores y agentes de IA
está en [AGENTS.md](AGENTS.md).

## Requisitos

- Node.js 20 o superior (probado con 24) y npm.
- Una base MongoDB: local (`mongodb://localhost:27017/gymstatus`) o MongoDB Atlas.
- Para probar en el teléfono: la app Expo Go y estar en la misma red Wi-Fi que la PC.

## Instalación y ejecución local

```bash
git clone https://github.com/arenasantiago/gymstatus.git
cd gymstatus
npm run install:all                     # dependencias de la raíz y del backend
cp backend/.env.example backend/.env    # rellena MONGODB_URI y JWT_SECRET
```

En dos terminales:

```bash
npm run backend        # API en http://localhost:5005  (npm run backend:dev = con nodemon)
npm start              # Metro/Expo. Escanea el QR con Expo Go (modo LAN, no uses --tunnel)
```

Otras formas de abrir el frontend: `npm run web`, `npm run android`, `npm run ios`.

Primer usuario: usa el botón "Crear cuenta" en la app o siembra uno desde el backend:

```bash
cd backend
npm run seed                                  # crea demo / demo123
npm run seed juan clave123 juan@correo.com    # usuario personalizado
```

### Cómo encuentra la app al backend

En desarrollo la URL se deduce sola (`frontend/config/api.ts`): en web usa
`localhost`, en un teléfono físico usa la IP de la PC que sirve Metro (la misma
del QR) y en el emulador de Android `10.0.2.2`. El puerto es el `PORT` del
backend (5005 por defecto; si lo cambias, define `EXPO_PUBLIC_API_PORT`).
Para forzar otro backend: `EXPO_PUBLIC_API_URL=https://mi-api/api npm start`.

Si en el teléfono aparece `Network request failed`: acepta el permiso de Red
local de Expo Go y permite Node.js en el Firewall de Windows para la red actual.

## Variables de entorno

Backend (`backend/.env`, plantilla en `backend/.env.example`):

| Variable         | Obligatoria | Descripción                                                        |
|------------------|-------------|--------------------------------------------------------------------|
| `MONGODB_URI`    | Sí          | Cadena de conexión de MongoDB (local o Atlas).                     |
| `JWT_SECRET`     | Sí          | Secreto para firmar los tokens; el servidor no arranca sin él.     |
| `PORT`           | No          | Puerto de la API (5005). Render lo inyecta automáticamente.        |
| `CORS_ORIGINS`   | En prod.    | Dominios web permitidos, separados por comas (el de Vercel).       |
| `JWT_EXPIRES_IN` | No          | Duración de la sesión, formato jsonwebtoken (`12h` por defecto).   |
| `DNS_OVERRIDE`   | No          | `off` para no forzar DNS públicos al resolver `mongodb+srv://`.    |

Frontend (`.env.production`, versionado, solo valores públicos): `EXPO_PUBLIC_API_URL`
se incrusta en el bundle al hacer `npm run build:web`.

## API

Base: `https://<host>/api`. Las rutas marcadas con auth requieren `Authorization: Bearer <token>`.
Los errores llegan como JSON `{ "message": "...", "errors": { campo: mensaje } }`.

| Método | Ruta                          | Auth | Descripción                                          |
|--------|-------------------------------|------|------------------------------------------------------|
| GET    | `/health`                     | No   | Comprobación de vida (`{ ok: true }`).               |
| POST   | `/users/register`             | No   | Crear cuenta de entrenador.                          |
| POST   | `/users/login`                | No   | Iniciar sesión; devuelve el JWT.                     |
| GET    | `/users/users/:id`            | Sí   | Ver la propia cuenta.                                |
| PUT    | `/users/users/:id`            | Sí   | Editar la propia cuenta.                             |
| DELETE | `/users/users/:id`            | Sí   | Eliminar la cuenta y todos sus datos.                |
| GET    | `/athletes`                   | Sí   | Atletas del entrenador con resumen de su última evaluación. |
| POST   | `/athletes`                   | Sí   | Crear atleta.                                        |
| GET    | `/athletes/:id`               | Sí   | Atleta con su historial de evaluaciones.             |
| PUT    | `/athletes/:id`               | Sí   | Editar perfil.                                       |
| DELETE | `/athletes/:id`               | Sí   | Eliminar atleta y su historial.                      |
| GET    | `/athletes/:id/evaluations`   | Sí   | Historial de evaluaciones.                           |
| POST   | `/athletes/:id/evaluations`   | Sí   | Registrar evaluación (valida, calcula y guarda).     |
| GET    | `/evaluations/:id`            | Sí   | Detalle de una evaluación.                           |
| PUT    | `/evaluations/:id/notes`      | Sí   | Editar observaciones (lo único editable).            |
| DELETE | `/evaluations/:id`            | Sí   | Eliminar evaluación.                                 |
| GET    | `/brand`                      | Sí   | Marca del entrenador para la ficha PDF.              |
| PUT    | `/brand`                      | Sí   | Guardar marca (nombre, logo, color, contacto).       |

Todas las consultas de atletas, evaluaciones y marca se filtran por el
entrenador autenticado: un id ajeno responde 404, nunca datos de otro.

## Pruebas y verificación

```bash
npm run typecheck                            # TypeScript (frontend + shared)
node --test "shared/__tests__/*.test.js"     # motor de cálculo (valores calculados a mano desde las fuentes)
cd backend && npm run test:api               # integración de la API contra MongoDB real
```

La prueba de integración usa la conexión de `backend/.env` pero siempre en una
base aislada (`gymstatus_e2e`) que se elimina al terminar.

## Despliegue

- Backend en Render como Web Service, definido en `render.yaml`
  (rootDir `backend`, `npm ci`, `node index.js`, health check `/api/health`,
  variables `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS`). En MongoDB Atlas hay que
  permitir el acceso desde cualquier IP (`0.0.0.0/0`), porque las IPs de salida
  del plan gratuito de Render cambian.
- Frontend web en Vercel, definido en `vercel.json`: `npm run build:web` genera
  `dist/` (exportación de Expo + manifest e iconos PWA) y toda ruta se reescribe
  a `index.html`. La URL de la API sale de `.env.production`.
- Ambos despliegan automáticamente desde la rama `master`. Solo el frontend
  reconstruye si cambian `frontend/`, `shared/`, `assets/` o la configuración
  web; solo el backend si cambian `backend/` o `shared/`.

## Tecnologías

Frontend: React Native 0.86, Expo SDK 57, React 19, TypeScript, React Navigation 7,
react-native-svg (gráficos), expo-print y expo-sharing (PDF), AsyncStorage.
Backend: Node.js, Express 4, Mongoose 8, JWT, bcrypt. Pruebas con `node:test`.

## Solución de problemas

- `querySrv ECONNREFUSED` al conectar con Atlas: la red no resuelve registros
  SRV. El backend fuerza DNS públicos por defecto; si tu red los bloquea, usa
  la cadena `mongodb://` estándar de Atlas o `DNS_OVERRIDE=off`.
- Desde el navegador la API responde 403 "La política CORS no permite...":
  añade el dominio del frontend a `CORS_ORIGINS` en el backend.
- La app web en producción intenta conectarse a `localhost`: reconstruye con
  `npm run build:web` (usa `--clear` para que Metro no reutilice la caché sin la
  variable `EXPO_PUBLIC_API_URL`).
- Expo no inicia o hay dependencias raras: `npx expo-doctor`, y en último caso
  `rm -rf node_modules && npm install`.

## Licencia

ISC.
