type DiagLevel = 'log' | 'info' | 'warn' | 'error';

const ERRORS_KEY = 'plantaopro_console_errors';
const EVENTS_KEY = 'plantaopro_diag_events';
const MAX_ITEMS = 50;

function safeGetArray(key: string): any[] {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function safeSetArray(key: string, arr: any[]) {
  try {
    sessionStorage.setItem(key, JSON.stringify(arr.slice(0, MAX_ITEMS)));
  } catch {
    // ignore
  }
}

export function pushConsoleError(message: string) {
  const arr = safeGetArray(ERRORS_KEY);
  arr.unshift(`[${new Date().toISOString()}] ${message}`);
  safeSetArray(ERRORS_KEY, arr);
}

export function pushDiagEvent(level: DiagLevel, name: string, data?: Record<string, unknown>) {
  const arr = safeGetArray(EVENTS_KEY);
  const payload = {
    t: new Date().toISOString(),
    level,
    name,
    data: data ?? {},
  };
  arr.unshift(payload);
  safeSetArray(EVENTS_KEY, arr);
}

export function getDiagEvents(): any[] {
  return safeGetArray(EVENTS_KEY);
}
