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

interface ListResponse<T> {
  data?: T[];
  medicines?: T[];
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
      const response = await api.get<T[] | ListResponse<T>>(endpoint);
      const data = response.data;
      if (Array.isArray(data)) {
        setItems(data);
      } else if (Array.isArray(data.data)) {
        setItems(data.data);
      } else if (Array.isArray(data.medicines)) {
        setItems(data.medicines);
      } else {
        setItems([]);
      }
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
