/**
 * Cliente HTTP centralizado. Inyecta la URL base, cabeceras JSON y,
 * cuando existe, el token de autenticación. Devuelve el JSON parseado
 * o lanza un ApiError con el mensaje del backend y los errores por campo.
 */
import { API_URL } from '../config/api';
import { clearToken, getToken } from './auth';
import { notifySessionExpired } from './session';

const TIMEOUT_MS = 60000;

/**
 * Despierta el backend sin bloquear la interfaz. En el plan gratuito de
 * Render el servidor se apaga tras 15 min sin tráfico y tarda ~30-60 s en
 * volver; lanzar esta petición al abrir la app hace que, cuando el usuario
 * termine de escribir sus credenciales, el servidor ya esté listo. Por eso
 * TIMEOUT_MS también cubre un arranque en frío completo.
 */
export function warmUpApi(): void {
  fetch(`${API_URL}/health`).catch(() => {
    // Silencioso: si falla, la siguiente petición real mostrará el error.
  });
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Mensaje legible para mostrar en la interfaz. */
export function errorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function apiRequest<T = any>(
  path: string,
  { method = 'GET', body, auth = false }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (!token) {
      notifySessionExpired();
      throw new ApiError('No hay sesión activa. Inicia sesión de nuevo.', 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new ApiError(
      aborted
        ? 'El servidor tardó demasiado en responder. Inténtalo de nuevo.'
        : `No se pudo conectar con el servidor (${API_URL}). Revisa que el backend esté encendido y que el dispositivo esté en la misma red.`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  let data: any = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      await clearToken();
      notifySessionExpired();
      throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
    }
    const message = (data && (data.message || data.error)) || `Error ${response.status}`;
    const fieldErrors = data && typeof data.errors === 'object' && data.errors ? data.errors : {};
    throw new ApiError(String(message), response.status, fieldErrors);
  }

  return data as T;
}
