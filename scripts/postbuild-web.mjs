// @ts-check
/**
 * Post-procesa la carpeta `dist/` generada por `expo export --platform web`
 * para convertir la salida en una PWA instalable, con foco en el "Agregar a
 * pantalla de inicio" de iOS (que NO usa el manifest, sino apple-touch-icon
 * y las meta apple-mobile-web-app-*).
 *
 * Idempotente: se puede correr varias veces sin duplicar etiquetas.
 * Uso: `node scripts/postbuild-web.mjs` (o `npm run build:web`, que lo encadena).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const pwa = join(root, 'assets', 'pwa');

const THEME_COLOR = '#2563EB';
const BACKGROUND = '#0A0F1A';
const APP_NAME = 'Athlete Performance';
const SHORT_NAME = 'Atletas';

if (!existsSync(dist)) {
  console.error('✖ No existe dist/. Corre primero `expo export --platform web`.');
  process.exit(1);
}

// 1) Copiar iconos a dist/icons/
const iconsOut = join(dist, 'icons');
mkdirSync(iconsOut, { recursive: true });
const icons = [
  'icon-192.png',
  'icon-512.png',
  'maskable-512.png',
  'apple-touch-icon.png',
];
for (const name of icons) {
  const src = join(pwa, name);
  if (!existsSync(src)) {
    console.error(`✖ Falta el icono ${src}. Regenera assets/pwa/.`);
    process.exit(1);
  }
  copyFileSync(src, join(iconsOut, name));
}

// 2) Generar manifest.webmanifest (para Android/Chrome y escritorio)
const manifest = {
  name: APP_NAME,
  short_name: SHORT_NAME,
  description: 'Evaluación y seguimiento del rendimiento de atletas.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  theme_color: THEME_COLOR,
  background_color: BACKGROUND,
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
writeFileSync(join(dist, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// 3) Inyectar en index.html las etiquetas PWA (sin duplicar)
const indexPath = join(dist, 'index.html');
let html = readFileSync(indexPath, 'utf8');

const tags = [
  `<link rel="manifest" href="/manifest.webmanifest">`,
  `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`,
  `<meta name="apple-mobile-web-app-capable" content="yes">`,
  `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`,
  `<meta name="apple-mobile-web-app-title" content="${SHORT_NAME}">`,
  `<meta name="mobile-web-app-capable" content="yes">`,
];

const toInject = tags.filter((t) => {
  // Detectar por atributo clave para evitar duplicados en re-ejecuciones.
  const key = t.match(/rel="([^"]+)"|name="([^"]+)"/);
  const id = key ? (key[1] || key[2]) : t;
  return !html.includes(id === t ? t : `"${id}"`);
});

if (toInject.length) {
  html = html.replace('</head>', `  ${toInject.join('\n  ')}\n</head>`);
  writeFileSync(indexPath, html);
}

console.log(`✔ PWA lista: manifest + ${icons.length} iconos + ${toInject.length} meta tags inyectadas en dist/`);
