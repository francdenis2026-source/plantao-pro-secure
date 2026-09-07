import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

/**
 * ServiceWorkerUpdateBanner
 *
 * Banner discreto exibido logo após o auto-reload disparado pelo
 * novo Service Worker (ver src/main.tsx). Mostra ao usuário que uma
 * atualização foi aplicada e orienta a fechar/reabrir o app caso
 * algo pareça fora do lugar. Auto-dismiss em 8s.
 */
const FLAG_KEY = "pp_sw_updated_banner";

export function ServiceWorkerUpdateBanner() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = sessionStorage.getItem(FLAG_KEY);
      if (!v) return;
      sessionStorage.removeItem(FLAG_KEY);
      setVersion(v);
      const t = window.setTimeout(() => setVersion(null), 8000);
      return () => window.clearTimeout(t);
    } catch {
      /* ignore */
    }
  }, []);

  if (!version) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-[9999] bottom-4 sm:bottom-6 px-3 sm:px-0 w-[calc(100%-1.5rem)] sm:w-auto max-w-md animate-fade-in"
    >
      <div
        className="relative flex items-start gap-2.5 rounded-md border border-amber-400/30 bg-[linear-gradient(180deg,rgba(12,10,4,0.94)_0%,rgba(6,5,2,0.94)_100%)] backdrop-blur-sm px-3 py-2.5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.05)]"
      >
        <span aria-hidden className="absolute -top-px -left-px h-1.5 w-1.5 border-t border-l border-amber-400/60" />
        <span aria-hidden className="absolute -bottom-px -right-px h-1.5 w-1.5 border-b border-r border-amber-400/60" />

        <RefreshCw className="h-3.5 w-3.5 text-amber-300 shrink-0 mt-[2px]" strokeWidth={2.2} />

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.22em] text-amber-300/90 leading-none">
            Atualização aplicada
          </p>
          <p className="mt-1 font-sans text-[11.5px] leading-snug text-white/70">
            Nova versão carregada. Se algo parecer fora do lugar, feche e reabra o app.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setVersion(null)}
          aria-label="Fechar aviso"
          className="shrink-0 -mt-0.5 -mr-1 p-1 text-white/40 hover:text-amber-200 transition-colors"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
