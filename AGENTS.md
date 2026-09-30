# AGENTS.md — GymStatus / Athlete Performance

Guía para agentes de IA (Hermes, Warp, Codex, Cursor, Claude Code…) que trabajan en
este repo. Es la fuente de verdad operativa: si algo aquí contradice al código, gana
el código y hay que corregir este archivo (ver "Mantenimiento" al final).

Última verificación de los comandos: 2026-09-29 (Node 24, npm) — rama `feat/athlete-performance`.

## Qué es

App para entrenadores: registran atletas, les hacen evaluaciones antropométricas
(peso, altura, perímetros), el motor calcula IMC, ICA, ICC, % de grasa (Navy),
TMB/GET, macros e hidratación con fuentes citadas, muestra la evolución y exporta
una ficha PDF con la marca del entrenador. Nombre de producto: "Athlete Performance";
slug/paquete: `gymstatus`. Todo el texto de UI, comentarios y mensajes de error va en español.

## Mapa del repo

```
index.js                 Entry de Expo (registra frontend/App)
frontend/                App React Native + Expo SDK 57 (RN 0.86, React 19, TypeScript)
  components/            Pantallas (*Screen.tsx) y piezas (LineChart, ComparisonTable, metrics, results)
  components/ui/         UI kit reutilizable
  Navigation/            AppNavigator.tsx + types.ts (RootStackParamList)
  services/              apiClient (fetch + token + 401), performance (todas las llamadas a la API),
                         auth (token en AsyncStorage), session, pdfExport, images, dialogs
  domain/                Tipos del cliente (reflejan backend/models y reutilizan tipos de shared/)
  hooks/                 useFocusLoader, useReportExport
  config/                api.ts (URL base por plataforma, puerto 5005), app.ts (nombre, presets de marca)
  theme/                 Tokens de diseño (colors, spacing, radius, fonts, fontSize)
backend/                 API Node 20+ / Express 4 / Mongoose 8 (CommonJS)
  app.js                 createApp(): CORS, JSON 2 MB, rutas, 404 y manejador de errores central
  index.js               Arranque: dotenv, DNS override, conexión a Mongo con reintentos, listen
  routes/                userRoutes (/api/users), performanceRoutes (/api, todas con auth)
  controllers/           user, athlete, evaluation, brand
  services/              evaluationService.js (orquesta validar → calcular → snapshot)
  models/                User, Athlete, Evaluation, BrandSettings
  middleware/auth.js     JWT Bearer → req.user.userId
  utils/                 asyncHandler, request (isValidId, coachIdOf, validationError)
  tests/api.test.js      Prueba de integración contra Mongo real (base aislada gymstatus_e2e)
  seed.js / setup.js     Usuario de prueba / setup inicial
shared/                  Motor de cálculo puro en JS (// @ts-check), usado por frontend Y backend
  config.js              TODOS los factores, rangos y límites + CALC_VERSION
  formulas.js, evaluation.js, interpretation.js, methodology.js, validation.js,
  units.js, dates.js, format.js, progress.js, chart.js, report.js (HTML del PDF), color.js, content.js
  __tests__/             Pruebas node:test del motor (sin dependencias)
scripts/postbuild-web.mjs  Convierte dist/ (expo export web) en PWA instalable (manifest + iconos + metas iOS)
assets/                  Fuentes (Inter, Rubik) e iconos PWA
vercel.json              Despliegue del frontend web en Vercel (build:web → dist/; ignoreCommand omite cambios solo de backend)
render.yaml              Despliegue del backend en Render (rootDir backend, npm ci, health /api/health, buildFilter backend+shared)
.env.production          EXPO_PUBLIC_API_URL para builds de producción (público, versionado; lo lee `expo export`)
```

Producción: API https://gymstatus.onrender.com (Render free: se duerme a los 15 min, arranque en frío 30-60 s;
la app llama a /api/health al abrirse para despertarla) · Web https://gymstatus-frontend.vercel.app.
Ambos despliegan solos desde `master`.

## Comandos (verificados)

```bash
npm run install:all          # deps raíz + backend
cp backend/.env.example backend/.env   # y rellenar MONGODB_URI, JWT_SECRET (PORT=5005)

npm run backend              # API en http://localhost:5005 (npm run backend:dev = nodemon)
npm start                    # Metro/Expo (LAN; NO usar --tunnel, el túnel no expone el backend)
npm run web                  # Expo web
npm run build:web            # expo export web + scripts/postbuild-web.mjs → dist/ (PWA)
cd backend && npm run seed   # crea usuario demo/demo123 (o: npm run seed usuario clave email)
```

Puertas de verificación — correr las que apliquen ANTES de dar algo por terminado:

```bash
npm run typecheck                               # tsc --noEmit (frontend + shared vía @ts-check)
node --test "shared/__tests__/*.test.js"        # motor de cálculo (47 pruebas, <1 s)
cd backend && npm run test:api                  # e2e API (14 pruebas, ~40 s, requiere MONGODB_URI real;
                                                # usa y borra la base gymstatus_e2e, nunca toca datos reales)
```

No hay ESLint ni Prettier configurados: respeta el estilo del archivo que editas.

## Reglas de arquitectura (no negociables)

1. Toda lógica de cálculo, validación e interpretación vive en `shared/` y se usa
   idéntica en frontend y backend. Nunca dupliques una fórmula en una pantalla o
   controlador. Si cambias un factor o rango en `shared/config.js`, incrementa
   `CALC_VERSION` y cita la fuente junto al valor (se muestra en Metodología).
2. Las evaluaciones son inmutables salvo `notes`: guardan `profileSnapshot`,
   `results` y `parameters` con los que se calcularon, para que el historial siga
   siendo explicable aunque la configuración cambie después. No añadas endpoints
   que reescriban resultados; si hace falta corregir, se crea otra evaluación.
3. Las pantallas nunca construyen rutas ni `fetch`: usan `frontend/services/performance.ts`
   → `apiClient.ts`. Un 401 limpia el token y dispara `onSessionExpired` (vuelve a Login).
4. Backend: cada controlador va envuelto en `asyncHandler`; toda consulta a
   Athlete/Evaluation/BrandSettings se filtra por `coachId` (`coachIdOf(req)`) — un
   entrenador jamás ve datos de otro. Ids mal formados → 404, nunca 500. Errores en
   JSON y en español: `{ message, errors? }` (400 de validación con errores por campo).
5. Unidad canónica métrica (kg/cm). El sistema imperial solo convierte al leer y
   mostrar (`shared/units.js`); el backend recibe `unitSystem` y convierte.
6. Estilos solo con tokens de `frontend/theme` (colores, spacing, radius, fonts).
   Nada de hex sueltos en componentes (excepción: presets de marca en `config/app.ts`).
7. Secretos: `backend/.env` nunca se sube. Toda variable nueva se documenta en
   `backend/.env.example` con comentario (y en `render.yaml` si producción la necesita).
   El puerto 5005 debe coincidir en `backend/.env`, `frontend/config/api.ts` y README.
   `.env.production` SÍ se versiona: solo admite variables `EXPO_PUBLIC_*` (van al bundle).
8. Fotos/logos viajan como data URI (límite JSON 2 MB en `app.js`); comprímelas en
   el cliente (`services/images.ts`) antes de enviar.

## Estilo de código

- Backend: CommonJS, 4 espacios, `require`. Frontend y shared: 2 espacios; frontend en
  TypeScript, shared en JS con `// @ts-check` y JSDoc (`tsc` lo revisa).
- Comentarios de cabecera explicando el "por qué" del archivo; mensajes al usuario en español.
- Pruebas con `node:test` + `node:assert/strict`, sin frameworks.

## Git

- Commits estilo `tipo(gymstatus): descripción` (feat, fix, chore, docs, security, refactor, test).
- No hagas commit, push ni reescribas historial sin que Santiago lo pida.
- `dist/`, `.expo/`, `node_modules/` y `backend/.env` están ignorados; no los fuerces.

## Coordinación entre agentes

Santiago ejecuta varios agentes en paralelo (Hermes en Orca, otro en Warp, etc.).
Antes de tocar nada: `git status` — puede haber cambios sin commitear de otra sesión.
Nunca reviertas, formatees ni "limpies" archivos que no forman parte de tu tarea. Si
encuentras conflicto con trabajo ajeno, detente y pregunta.

## Definición de terminado

Nada está hecho hasta que se ejecutó. Al reportar, distingue explícitamente:
VERIFICADO (comando corrido y salida real) / NO VERIFICADO (no se pudo ejecutar, di por qué)
/ BLOQUEADO (falta credencial, servicio o decisión). Nunca inventes salidas.

## Trampas conocidas

- Expo `--tunnel` solo reenvía Metro: la app no llega al backend. Usa modo LAN.
- `mongodb+srv://` puede fallar con `querySrv ECONNREFUSED` en algunas redes; `index.js`
  fuerza DNS 8.8.8.8/1.1.1.1 (desactivar con `DNS_OVERRIDE=off`).
- CORS: la app nativa no envía `Origin` (permitido). Para el frontend web desplegado hay
  que añadir el dominio a `CORS_ORIGINS` en el `.env` del backend.
- `expo export` no genera manifest ni iconos iOS: siempre `npm run build:web`, no `export:web` solo.
- Metro cachea la transformación de `frontend/config/api.ts` CON el valor de `EXPO_PUBLIC_API_URL`
  incrustado: por eso `build:web` lleva `--clear`. Sin él, un build puede quedarse con `localhost`.
- Render ejecuta `node index.js` desde `rootDir: backend`. Si el servicio se crea a mano sin Root
  Directory, arranca el `index.js` de la RAÍZ (el de Expo) y muere con ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING.
- El backend NO se despliega en Vercel (necesita proceso Node + Mongo); vercel.json solo cubre el web build.

## Mantenimiento de este archivo

Este archivo se mantiene actualizado por los propios agentes. Reglas:

- Si en tu cambio añades, renombras o eliminas un script npm, carpeta de primer nivel,
  variable de entorno, grupo de endpoints o puerta de verificación, actualiza la
  sección correspondiente EN EL MISMO cambio. No lo dejes para después.
- Si un comando documentado aquí falla o ya no existe, corrígelo aquí; no lo esquives
  en silencio.
- Si una trampa te costó más de un intento, añade una línea en "Trampas conocidas".
- Cuando vuelvas a correr las tres puertas de verificación con éxito, actualiza la
  fecha de "Última verificación" del encabezado.
- Ediciones puntuales, no reescrituras. Máximo ~150 líneas: si crece, condensa.
- NO incluyas: progreso de tareas, historial de cambios, decisiones pendientes, ni
  nada que se pueda deducir leyendo el código en 10 segundos. Eso va en commits o en README.
