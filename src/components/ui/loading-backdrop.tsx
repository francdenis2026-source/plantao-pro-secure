import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import loadingBgAsset from "@/assets/loading-backdrop.webp.asset.json";

const LOADING_BG_URL = loadingBgAsset.url;

// Cache de módulo: primeira vez => aguarda decode; próximas => síncrono.
let bgReady = false;
let bgPromise: Promise<void> | null = null;

function preloadBackdrop(): Promise<void> {
  if (bgReady) return Promise.resolve();
  if (bgPromise) return bgPromise;
  bgPromise = new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.onload = img.onerror = () => {
      bgReady = true;
      resolve();
    };
    img.src = LOADING_BG_URL;
  });
  return bgPromise;
}

// Dispara o preload assim que o módulo é avaliado (ocioso, não bloqueia).
if (typeof window !== "undefined") {
  const kick = () => void preloadBackdrop();
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(kick, { timeout: 1500 });
  } else {
    setTimeout(kick, 0);
  }
}

/**
 * Backdrop leve para telas de "Carregando...".
 * - Imagem servida via CDN (WebP ~55KB) com <link rel="preload"> no index.html
 * - Cache em módulo: aparece instantâneo após a 1ª carga
 * - Fallback em gradiente enquanto a imagem não decodifica (sem "flash preto")
 */
export function LoadingBackdrop({ className }: { className?: string }) {
  const [ready, setReady] = useState(bgReady);

  useEffect(() => {
    if (!ready) preloadBackdrop().then(() => setReady(true));
  }, [ready]);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden bg-zinc-950",
        className
      )}
    >
      {/* Gradiente base — visível imediatamente, evita flash */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />

      {/* Imagem tática (fade-in quando pronta) */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
        style={{
          backgroundImage: ready ? `url(${LOADING_BG_URL})` : undefined,
          opacity: ready ? 1 : 0,
          willChange: "opacity",
        }}
      />

      {/* Overlay escuro para contraste */}
      <div className="absolute inset-0 bg-zinc-950/70" />

      {/* Vinheta */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
