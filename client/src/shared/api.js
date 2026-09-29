import { useCallback, useEffect, useRef, useState } from 'react';

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      'x-requested-with': 'gan',
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login' && path !== '/me') {
      window.dispatchEvent(new Event('gan:unauthorized'));
    }
    const err = new Error(data.error || 'request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Loads data, and reloads it whenever the app comes back to the foreground. */
export function useLoad(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const latest = useRef(path);
  latest.current = path;

  const reload = useCallback(async () => {
    if (!path) return;
    try {
      const result = await api(path);
      if (latest.current === path) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (latest.current === path) setError(err);
    }
  }, [path]);

  useEffect(() => {
    setData(null);
    reload();
    const onVisible = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  return { data, setData, error, reload };
}
