/**
 * Aviso global de sesión expirada: el cliente HTTP lo emite al recibir un
 * 401 y el navegador raíz vuelve a la pantalla de inicio de sesión.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifySessionExpired(): void {
  listeners.forEach((listener) => listener());
}
