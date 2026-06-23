import { useEffect, useRef } from 'react';

/**
 * Opens an SSE connection to /events and calls handlers on events.
 * Auto-reconnects with exponential back-off (1s → 30s max).
 */
export function useSSE({ onDishUpdated, onStatusChange }) {
  const esRef    = useRef(null);
  const retryMs  = useRef(1000);
  const dead     = useRef(false);

  useEffect(() => {
    dead.current = false;

    function connect() {
      if (dead.current) return;
      onStatusChange?.('connecting');

      const es = new EventSource('/events');
      esRef.current = es;

      es.addEventListener('connected', () => {
        retryMs.current = 1000;
        onStatusChange?.('connected');
      });

      es.addEventListener('dish_updated', (e) => {
        try { onDishUpdated?.(JSON.parse(e.data)); }
        catch (err) { console.warn('SSE parse error', err); }
      });

      es.onerror = () => {
        es.close();
        if (dead.current) return;
        onStatusChange?.('reconnecting');
        setTimeout(() => {
          retryMs.current = Math.min(retryMs.current * 2, 30000);
          connect();
        }, retryMs.current);
      };
    }

    connect();
    return () => {
      dead.current = true;
      esRef.current?.close();
    };
  }, []); // eslint-disable-line
}
