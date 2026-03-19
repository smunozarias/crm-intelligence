/**
 * useToast Hook
 * Simple toast notification system
 */

import { useState, useCallback } from 'react';

export function useToast(duration = 3000) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), duration);
  }, [duration]);

  return { toast, showToast };
}
