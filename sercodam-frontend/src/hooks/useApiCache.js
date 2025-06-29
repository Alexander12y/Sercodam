import { useState, useEffect, useRef } from 'react';

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const useApiCache = (key, apiCall, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastCallRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      // Verificar si hay datos en caché
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setData(cached.data);
        return;
      }

      // Evitar llamadas duplicadas
      if (lastCallRef.current === key) {
        return;
      }

      lastCallRef.current = key;
      setLoading(true);
      setError(null);

      try {
        const result = await apiCall();
        
        // Guardar en caché
        cache.set(key, {
          data: result,
          timestamp: Date.now()
        });
        
        setData(result);
      } catch (err) {
        setError(err);
        console.error(`Error in useApiCache for key ${key}:`, err);
      } finally {
        setLoading(false);
        lastCallRef.current = null;
      }
    };

    fetchData();
  }, [key, ...dependencies]);

  const invalidateCache = () => {
    cache.delete(key);
  };

  const refresh = async () => {
    cache.delete(key);
    lastCallRef.current = null;
    const result = await apiCall();
    cache.set(key, {
      data: result,
      timestamp: Date.now()
    });
    setData(result);
  };

  return { data, loading, error, invalidateCache, refresh };
};

// Función para limpiar caché expirado
export const cleanupExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
};

// Limpiar caché cada 10 minutos
setInterval(cleanupExpiredCache, 10 * 60 * 1000); 