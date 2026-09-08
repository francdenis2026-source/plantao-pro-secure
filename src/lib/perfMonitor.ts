/**
 * Lightweight Web Vitals + long-task logger.
 * No external deps — uses PerformanceObserver directly. Logs to console
 * (grep "[perf]") so you can see LCP / CLS / INP / long tasks and which
 * components are blocking the main thread.
 *
 * Enable in dev automatically; in prod only if localStorage.perf_logs === "1".
 */

type PerfEvent =
  | { type: 'LCP'; ms: number; element?: string }
  | { type: 'CLS'; value: number; sources?: string[] }
  | { type: 'INP'; ms: number; target?: string }
  | { type: 'LongTask'; ms: number; attribution?: string };

function log(evt: PerfEvent) {
  // eslint-disable-next-line no-console
  console.log(`[perf] ${evt.type}`, evt);
}

let started = false;

export function startPerfMonitor() {
  if (started) return;
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

  const enabled =
    import.meta.env.DEV ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('perf_logs') === '1');
  if (!enabled) return;

  started = true;

  // LCP — largest contentful paint
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as any;
      if (last) {
        log({
          type: 'LCP',
          ms: Math.round(last.renderTime || last.loadTime || last.startTime),
          element: last.element?.tagName + (last.element?.id ? '#' + last.element.id : ''),
        });
      }
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    /* unsupported */
  }

  // CLS — cumulative layout shift (session-based)
  try {
    let clsValue = 0;
    let clsEntries: any[] = [];
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      }
      log({
        type: 'CLS',
        value: Math.round(clsValue * 1000) / 1000,
        sources: clsEntries
          .flatMap((e) => e.sources || [])
          .map((s: any) => s.node?.tagName)
          .filter(Boolean)
          .slice(0, 3),
      });
    });
    po.observe({ type: 'layout-shift', buffered: true });
  } catch {
    /* unsupported */
  }

  // INP — interaction to next paint (uses "event" entries with duration)
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (entry.duration > 40) {
          log({
            type: 'INP',
            ms: Math.round(entry.duration),
            target: (entry.target as Element | undefined)?.tagName,
          });
        }
      }
    });
    po.observe({ type: 'event', buffered: true, durationThreshold: 40 } as any);
  } catch {
    /* unsupported */
  }

  // Long tasks — anything > 50 ms on the main thread. Prime scroll-lag signal.
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        log({
          type: 'LongTask',
          ms: Math.round(entry.duration),
          attribution: entry.attribution?.[0]?.containerName || entry.attribution?.[0]?.name,
        });
      }
    });
    po.observe({ type: 'longtask', buffered: true });
  } catch {
    /* unsupported */
  }
}
