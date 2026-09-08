import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'agent-panel-compact-mode';
const AUTO_BREAKPOINT = 1280; // abaixo disso no desktop → sugere compacto

type Pref = 'auto' | 'on' | 'off';

function readPref(): Pref {
  if (typeof window === 'undefined') return 'auto';
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === 'on' || v === 'off' || v === 'auto') return v;
  return 'auto';
}

function autoCompact(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < AUTO_BREAKPOINT && window.innerWidth >= 768;
}

/**
 * Modo compacto para o AgentPanel — reduz paddings, alturas e gaps.
 * - 'auto' (padrão): ativa automaticamente em desktops estreitos (<1280px)
 * - 'on' / 'off': forçado pelo usuário via toggle
 */
export function useCompactMode() {
  const [pref, setPref] = useState<Pref>(() => readPref());
  const [autoOn, setAutoOn] = useState<boolean>(() => autoCompact());

  useEffect(() => {
    const onResize = () => setAutoOn(autoCompact());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const compact = pref === 'on' ? true : pref === 'off' ? false : autoOn;

  const toggle = useCallback(() => {
    setPref((prev) => {
      const next: Pref = compact ? 'off' : 'on';
      try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, [compact]);

  return { compact, toggle, pref };
}
