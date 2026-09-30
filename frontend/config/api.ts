/**
 * Configuración central de la API.
 *
 * En React Native `localhost` apunta al propio dispositivo, no a tu PC.
 * Por eso, en desarrollo, la URL se deriva de la IP de la PC donde corre
 * Metro (Expo la expone en `Constants.expoConfig.hostUri`, p. ej.
 * "192.168.1.3:8081"). Así un iPhone/Android físico con Expo Go llega al
 * backend sin configurar nada, siempre que esté en la misma red Wi-Fi.
 *
 * El puerto por defecto se puede ajustar con `EXPO_PUBLIC_API_PORT`
 * (debe coincidir con el PORT del backend en backend/.env).
 *
 * Prioridad:
 *   1. EXPO_PUBLIC_API_URL (si está definida)
 *   2. En web: localhost
 *   3. IP LAN de la PC que sirve Metro (dispositivo físico / emulador en LAN)
 *   4. En emulador Android: 10.0.2.2 (alias del host)
 *   5. Fallback: localhost (simulador iOS en la misma Mac)
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Debe coincidir con PORT en backend/.env (por defecto 5005).
const DEFAULT_PORT = process.env.EXPO_PUBLIC_API_PORT || '5005';

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '::1'];

/**
 * IP/host de la PC que sirve Metro, tal como la ve el dispositivo.
 * Devuelve null cuando no hay servidor de desarrollo (build de producción),
 * cuando es loopback (no sirve desde otro dispositivo) o cuando es un túnel
 * de Expo (*.exp.direct), porque el túnel solo reenvía Metro, no el backend.
 */
function devServerHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;

  const host = hostUri.split(':')[0];
  if (!host || LOOPBACK_HOSTS.includes(host) || host.endsWith('.exp.direct')) {
    return null;
  }
  return host;
}

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (Platform.OS === 'web') {
    return `http://localhost:${DEFAULT_PORT}/api`;
  }

  const lanHost = devServerHost();
  if (lanHost) {
    return `http://${lanHost}:${DEFAULT_PORT}/api`;
  }

  if (Platform.OS === 'android') {
    // 10.0.2.2 es el alias que el emulador de Android usa para el host.
    return `http://10.0.2.2:${DEFAULT_PORT}/api`;
  }
  return `http://localhost:${DEFAULT_PORT}/api`;
}

export const API_URL = resolveBaseUrl();

if (__DEV__) {
  // Visible en la terminal de Metro: confirma a qué backend apunta el dispositivo.
  console.log(`[api] API_URL = ${API_URL}`);
}
