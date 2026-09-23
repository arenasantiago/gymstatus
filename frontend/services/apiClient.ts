/**
 * Cliente HTTP centralizado. Inyecta la URL base, cabeceras JSON y,
 * cuando existe, el token de autenticación. Devuelve el JSON parseado
 * o lanza un Error con el mensaje del backend.
 */
import { API_URL } from '../config/api';
import { getToken } from './auth';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T = any>(
  path: string,
  { method = 'GET', body, auth = false }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (!token) {
      throw new Error('No hay sesión activa. Inicia sesión de nuevo.');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

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
    const message =
      (data && (data.message || data.error)) || `Error ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}
