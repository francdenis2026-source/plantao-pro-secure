import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value`. Only updates after `delay` ms of stability.
 * Any pending update is cancelled when `value` changes again — effectively
 * "cancelling previous searches" as the user types.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
