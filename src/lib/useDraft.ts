/**
 * useDraft.ts - Auto-save form draft to localStorage
 * Saves form state periodically, restores on mount
 */
import { useState, useEffect, useCallback } from 'preact/hooks';

/**
 * Auto-save form draft to localStorage
 * @param key - unique key per form (e.g. 'apply', 'master_628xxx')
 * @param initialState - default form values
 * @param debounceMs - save interval (default 2000ms)
 */
export function useDraft<T extends Record<string, any>>(
  key: string,
  initialState: T,
  debounceMs = 2000
): [T, (field: keyof T, value: any) => void, () => void] {
  const storageKey = 'asj_draft_' + key;

  // Restore from localStorage on mount
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialState;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...initialState, ...JSON.parse(saved) } : initialState;
    } catch {
      return initialState;
    }
  });

  // Auto-save on state change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {}
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [state, storageKey, debounceMs]);

  // Update single field
  const updateField = useCallback((field: keyof T, value: any) => {
    setState(prev => ({ ...prev, [field]: value }));
  }, []);

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setState(initialState);
  }, [storageKey, initialState]);

  return [state, updateField, clearDraft];
}
