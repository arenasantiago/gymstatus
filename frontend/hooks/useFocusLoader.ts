/**
 * Carga datos cada vez que la pantalla gana el foco (así, al volver de
 * registrar una evaluación, el perfil y el historial se actualizan solos).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { errorMessage } from '../services/apiClient';

export function useFocusLoader<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  const hasData = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (mode: 'focus' | 'refresh') => {
      if (mode === 'refresh') setRefreshing(true);
      else if (!hasData.current) setLoading(true);
      try {
        const result = await loader();
        if (!mounted.current) return;
        hasData.current = true;
        setData(result);
        setError(null);
      } catch (e) {
        if (!mounted.current) return;
        setError(errorMessage(e, 'No se pudieron cargar los datos.'));
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [loader],
  );

  useFocusEffect(
    useCallback(() => {
      run('focus');
    }, [run]),
  );

  const reload = useCallback(() => run('refresh'), [run]);

  return { data, setData, error, loading, refreshing, reload };
}
