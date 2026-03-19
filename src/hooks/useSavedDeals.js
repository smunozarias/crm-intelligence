/**
 * useSavedDeals Hook
 * Manages the list of saved deal analyses from Supabase
 */

import { useState, useCallback } from 'react';
import { fetchAllSavedDeals } from '../services/cache';

export function useSavedDeals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllSavedDeals();
      setDeals(data);
    } catch (err) {
      setError(err.message || 'Erro ao buscar deals salvos');
    }
    setLoading(false);
  }, []);

  return { deals, loading, error, refresh };
}
