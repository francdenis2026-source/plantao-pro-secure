import { useEffect, useState } from "react";
import { pushDiagEvent } from "@/lib/diagLog";
import splashAsset from "@/assets/brand/plantaopro-splash.webp.asset.json";
import logoUrl_ptr from "@/assets/brand/plantaopro-logo.png.asset.json";
const logoUrl = (logoUrl_ptr as {url:string}).url;

/**
 * Splash — v10 "Institucional Cinematográfico".
 * Exibe a arte oficial PlantãoPro (agente + viatura + wordmark) em fullscreen
 * antes do login/PlantaoHome. Uma vez por runtime. Preload eager + fallback
 * gradiente garante que nunca há flash em branco em qualquer navegador.
 * Respeita prefers-reduced-motion.
 */

const SPLASH_URL = splashAsset.url;

// Cache global — não remonta ao navegar entre rotas
let splashMountedThisRuntime = false;

// Preload assíncrono no módulo load (roda antes do primeiro render)
if (typeof window !== "undefined") {
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = SPLASH_URL;
  } catch {
    /* noop */
  }
}

const HOLD_MS = 1600;
const FADE_MS = 550;

export function SplashScreen() {
  const [visible, setVisible] = useState(() => !splashMountedThisRuntime);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    pushDiagEvent("info", "splash_mount", { willRender: visible });
    if (!visible) return;
    splashMountedThisRuntime = true;

    // Trava scroll somente enquanto o splash está visível. Antes, o cleanup
    // só rodava no unmount do componente; como ele permanece montado e retorna
    // null após o fade, o body ficava preso em overflow:hidden na homepage.
    const prevOverflow = document.body.style.overflow;
    const releaseScroll = () => {
      document.body.style.overflow = prevOverflow;
    };

    document.body.style.overflow = "hidden";

    const t1 = window.setTimeout(() => setFadeOut(true), HOLD_MS);
    const t2 = window.setTimeout(() => {
      releaseScroll();
      setVisible(false);
    }, HOLD_MS + FADE_MS + 30);

    // Safety net: força desmontar em 5s caso algo trave
    const safety = window.setTimeout(() => {
      setFadeOut(true);
      releaseScroll();
      setVisible(false);
    }, 5000);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(safety);
      releaseScroll();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Carregando PlantãoPro"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{
        // Fallback gradiente idêntico à paleta da arte — se a imagem demorar,
        // o usuário já vê a tonalidade correta, sem flash branco.
        background:
          "radial-gradient(ellipse 90% 60% at 60% 45%, #1a1408 0%, #0a0c12 55%, #050505 100%)",
        opacity: fadeOut ? 0 : 1,
        transition: `opacity ${FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        willChange: "opacity",
      }}
    >
      {/* Padrão tático de fundo (grid + brilho radial) */}
      <div
        aria-hidden
        className="sp-splash-bg absolute inset-0 pointer-events-none"
      />

      {/* Imagem institucional (agente).
          Desktop: object-cover à direita para deixar espaço à esquerda para
          a marca. Mobile: object-contain centralizado. */}
      <img
        src={SPLASH_URL}
        alt="PlantãoPro — Controle de Plantão, Escala e Banco de Horas"
        draggable={false}
        decoding="async"
        // @ts-expect-error fetchpriority is a valid HTML attribute
        fetchpriority="high"
        className="sp-splash-img absolute inset-0 w-full h-full select-none pointer-events-none"
        style={{
          animation: "spSplashIn 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      />

      {/* Overlay escuro para dar legibilidade à marca em qualquer tela */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,6,10,0.72) 0%, rgba(5,6,10,0.35) 35%, rgba(5,6,10,0.35) 65%, rgba(5,6,10,0.85) 100%)",
        }}
      />

      {/* Camada institucional — visível em TODAS as telas.
          Contém logomarca, wordmark, tagline (topo) e painel de status (base). */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between px-6 sm:px-10 pt-[max(env(safe-area-inset-top),2rem)] pb-[max(env(safe-area-inset-bottom),2.25rem)] z-[2]">
        {/* Topo: brasão + wordmark + tagline */}
        <div
          className="flex flex-col items-center gap-3"
          style={{ animation: "spSplashDown 700ms cubic-bezier(0.22,1,0.36,1) both" }}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={logoUrl}
              alt=""
              aria-hidden
              draggable={false}
              className="h-14 w-14 sm:h-16 sm:w-16 object-contain drop-shadow-[0_4px_18px_rgba(244,201,116,0.35)]"
            />
            <div className="flex flex-col leading-none">
              <span
                className="font-serif font-bold text-[22px] sm:text-[30px] tracking-tight text-white"
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
              >
                Plantão<span style={{ color: "#f4c974" }}>Pro</span>
              </span>
              <span className="mt-1 font-mono text-[9px] sm:text-[10px] tracking-[0.38em] uppercase text-white/70">
                Comando Operacional
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="h-px w-8 sm:w-12" style={{ background: "linear-gradient(90deg,transparent,#f4c974)" }} />
            <span className="font-mono text-[9.5px] sm:text-[10.5px] tracking-[0.32em] uppercase text-white/75">
              Controle · Escala · Banco de Horas
            </span>
            <span aria-hidden className="h-px w-8 sm:w-12" style={{ background: "linear-gradient(-90deg,transparent,#f4c974)" }} />
          </div>
        </div>

        {/* Rodapé: painel de status institucional */}
        <div
          className="flex flex-col items-center gap-3"
          style={{ animation: "spSplashUp 700ms 120ms cubic-bezier(0.22,1,0.36,1) both" }}
        >
          <div className="flex items-stretch divide-x divide-[#f4c974]/20 rounded-sm border border-[#f4c974]/25 bg-black/55 backdrop-blur-md overflow-hidden">
            <div className="flex flex-col items-center px-3.5 sm:px-5 py-1.5">
              <span className="font-mono text-[8px] tracking-[0.28em] uppercase text-white/50">Sistema</span>
              <span className="font-mono text-[10.5px] sm:text-[11.5px] tracking-[0.22em] uppercase text-[#f4c974] font-bold leading-tight">Online</span>
            </div>
            <div className="flex flex-col items-center px-3.5 sm:px-5 py-1.5">
              <span className="font-mono text-[8px] tracking-[0.28em] uppercase text-white/50">Setor</span>
              <span className="font-mono text-[10.5px] sm:text-[11.5px] tracking-[0.22em] uppercase text-white/90 font-bold leading-tight">ISE · AC</span>
            </div>
            <div className="flex flex-col items-center px-3.5 sm:px-5 py-1.5">
              <span className="font-mono text-[8px] tracking-[0.28em] uppercase text-white/50">Modo</span>
              <span className="font-mono text-[10.5px] sm:text-[11.5px] tracking-[0.22em] uppercase text-white/90 font-bold leading-tight">Tático</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: "#f4c974" }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "#f4c974", boxShadow: "0 0 8px #f4c974" }} />
            </span>
            <span className="font-mono text-[8.5px] sm:text-[9.5px] tracking-[0.38em] uppercase text-white/50">
              Inicializando módulos operacionais
            </span>
          </div>
        </div>
      </div>

      {/* Brackets táticos nos cantos (todas as telas) */}
      <div aria-hidden className="absolute inset-0 pointer-events-none z-[2]">
        <span className="absolute top-3 left-3 h-4 w-4 border-t-2 border-l-2" style={{ borderColor: "#f4c974aa" }} />
        <span className="absolute top-3 right-3 h-4 w-4 border-t-2 border-r-2" style={{ borderColor: "#f4c974aa" }} />
        <span className="absolute bottom-3 left-3 h-4 w-4 border-b-2 border-l-2" style={{ borderColor: "#f4c974aa" }} />
        <span className="absolute bottom-3 right-3 h-4 w-4 border-b-2 border-r-2" style={{ borderColor: "#f4c974aa" }} />
      </div>

      {/* Vinheta sutil para profundidade */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />


      {/* Barra de progresso institucional na base */}
      <div
        aria-hidden
        className="absolute bottom-[max(env(safe-area-inset-bottom),1rem)] left-1/2 -translate-x-1/2 w-[220px] h-[2px] overflow-hidden rounded-full z-10"
        style={{
          background: "rgba(244, 201, 116, 0.15)",
          animation: "spSplashFade 400ms 200ms both",
        }}
      >
        <div
          className="h-full"
          style={{
            width: "0%",
            background:
              "linear-gradient(90deg, #c9922b 0%, #f4c974 55%, #f4c974 100%)",
            boxShadow: "0 0 10px rgba(244, 201, 116, 0.7)",
            animation: `spSplashFill ${HOLD_MS}ms cubic-bezier(0.65, 0.05, 0.36, 1) 100ms forwards`,
          }}
        />
      </div>

      <style>{`
        /* Default (desktop / landscape): agente contida à direita, com espaço superior/inferior para a marca */
        .sp-splash-img { object-fit: contain; object-position: center 60%; }
        .sp-splash-bg {
          opacity: 1;
          background:
            radial-gradient(ellipse 80% 55% at 50% 50%, rgba(244,201,116,0.10) 0%, transparent 70%),
            linear-gradient(180deg, #0a0c12 0%, #12100a 50%, #050505 100%),
            repeating-linear-gradient(0deg, transparent 0 28px, rgba(244,201,116,0.03) 28px 29px),
            repeating-linear-gradient(90deg, transparent 0 28px, rgba(244,201,116,0.03) 28px 29px);
          animation: spSplashFade 500ms both;
        }
        /* Mobile portrait: encolhe a agente para não colidir com a marca no topo */
        @media (max-width: 767px) and (orientation: portrait) {
          .sp-splash-img { object-position: center 62%; transform: scale(0.78); }
        }

        @keyframes spSplashIn {
          from { opacity: 0; transform: scale(1.04); filter: blur(4px); }
          to   { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes spSplashDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spSplashUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spSplashFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spSplashFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="status"] * {
            animation-duration: 1ms !important;
            animation-delay: 0ms !important;
          }
        }
      `}</style>

    </div>
  );
}
