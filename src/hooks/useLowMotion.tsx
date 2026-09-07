import { useEffect, useState, useCallback } from 'react';

const KEY = 'agent_low_motion';
const EVT = 'low-motion-change';

function detectSlowDevice(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  try {
    const ua = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const cores = (navigator as any).hardwareConcurrency as number | undefined;
    const mem = (navigator as any).deviceMemory as number | undefined;
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    // Score-based: needs 2+ points to activate (reduces false positives)
    let score = 0;

    // Hard signals (2 points each) — near-certain slow device
    if (conn?.saveData === true) score += 2;
    if (mem !== undefined && mem <= 1) score += 2;
    if (cores !== undefined && cores <= 2) score += 2;
    if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') score += 2;

    // Soft signals (1 point) — only count on mobile to avoid flagging desktops
    if (isMobile) {
      if (mem !== undefined && mem <= 2) score += 1;
      if (cores !== undefined && cores <= 4) score += 1;
      if (conn?.effectiveType === '3g') score += 1;
      // Old Android WebView / very old iOS
      if (/Android\s([1-6])\./.test(ua)) score += 2;
      if (/OS\s([1-9]|1[0-2])_/.test(ua) && /iPhone|iPad/.test(ua)) score += 2;
    }

    return score >= 2;
  } catch {
    return false;
  }
}

function read(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(KEY);
  if (stored === '1') return true;
  if (stored === '0') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  return detectSlowDevice();
}

export function useLowMotion() {
  const [lowMotion, setLowMotion] = useState<boolean>(() => read());

  useEffect(() => {
    const onChange = () => setLowMotion(read());
    window.addEventListener(EVT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !read();
    localStorage.setItem(KEY, next ? '1' : '0');
    window.dispatchEvent(new Event(EVT));
    setLowMotion(next);
  }, []);

  const set = useCallback((v: boolean) => {
    localStorage.setItem(KEY, v ? '1' : '0');
    window.dispatchEvent(new Event(EVT));
    setLowMotion(v);
  }, []);

  return { lowMotion, toggle, set };
}
