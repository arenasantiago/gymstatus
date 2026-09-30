/**
 * Gestión del token de autenticación en almacenamiento persistente.
 * Centraliza el acceso a AsyncStorage para que ninguna pantalla use
 * la clave de storage directamente.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'userToken';

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

/**
 * Indica si el token guardado sigue vigente según su fecha de expiración
 * (campo `exp` del JWT). No verifica la firma: eso lo hace el backend; solo
 * evita mostrar la app con una sesión que ya sabemos caducada.
 */
export function isTokenFresh(token: string | null, nowMs: number = Date.now()): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(globalThis.atob(padded));
    return typeof payload.exp === 'number' ? payload.exp * 1000 > nowMs + 60000 : true;
  } catch {
    return false;
  }
}
