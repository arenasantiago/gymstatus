/**
 * Configuración central de la API.
 *
 * En React Native `localhost` apunta al propio dispositivo, no a tu PC.
 * Para probar en un dispositivo/emulador real define la variable de entorno
 * de Expo `EXPO_PUBLIC_API_URL` (p. ej. `http://192.168.1.10:5000/api`).
 *
 * Prioridad:
 *   1. EXPO_PUBLIC_API_URL (si está definida)
 *   2. En web: localhost
 *   3. En emulador Android: 10.0.2.2 (alias del host)
 *   4. Fallback: localhost
 */
import { Platform } from 'react-native';

const DEFAULT_PORT = 5000;

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (Platform.OS === 'web') {
    return `http://localhost:${DEFAULT_PORT}/api`;
  }
  if (Platform.OS === 'android') {
    // 10.0.2.2 es el alias que el emulador de Android usa para el host.
    return `http://10.0.2.2:${DEFAULT_PORT}/api`;
  }
  return `http://localhost:${DEFAULT_PORT}/api`;
}

export const API_URL = resolveBaseUrl();
