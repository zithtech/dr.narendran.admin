import { useCallback, useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export interface Resource<T> {
  items: T[];
  loading: boolean;
  error: string;
  /** When the last successful fetch finished; drives "Last synced …". */
  syncedAt: number | null;
  refresh: () => Promise<void>;
}

/** Loads a list endpoint (`GET /api/<endpoint>`) and exposes a refresh handle. */
export function useResource<T>(endpoint: string, errorLabel: string): Resource<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncedAt, setSyncedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<T[]>(endpoint);
      setItems(Array.isArray(response.data) ? response.data : []);
      setError('');
      setSyncedAt(Date.now());
    } catch (err: unknown) {
      setError(getErrorMessage(err, `Failed to load ${errorLabel}.`));
    } finally {
      setLoading(false);
    }
  }, [endpoint, errorLabel]);

  useEffect(() => {
    // Fetch on mount; the state updates happen after the await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { items, loading, error, syncedAt, refresh };
}
