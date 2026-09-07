import { useEffect, useState, useCallback, useMemo } from "react";
import { X } from "lucide-react";

type Reason =
  | "copy"
  | "context"
  | "drag"
  | "printscreen"
  | "save"
  | "print"
  | "source";

const REASON_COPY: Record<Reason, { title: string; body: string }> = {
  copy: {
    title: "Cópia bloqueada",
    body: "A cópia de conteúdo deste sistema não é permitida.",
  },
  context: {
    title: "Menu bloqueado",
    body: "O menu de contexto sobre mídias está desativado por segurança.",
  },
  drag: {
    title: "Arrasto bloqueado",
    body: "Não é permitido arrastar ou baixar imagens deste sistema.",
  },
  printscreen: {
    title: "Captura de tela bloqueada",
    body:
      "Este espaço reúne conteúdo dedicado a agentes de segurança pública do sistema socioeducativo. Capturas de tela, gravações e fotografias não são permitidas.",
  },
  save: {
    title: "Download bloqueado",
    body: "Salvar a página ou seus recursos não é permitido.",
  },
  print: {
    title: "Impressão bloqueada",
    body: "A impressão do conteúdo do sistema não é permitida.",
  },
  source: {
    title: "Visualização do código bloqueada",
    body: "Não é permitido visualizar o código-fonte do sistema.",
  },
};

/**
 * Global protection layer:
 * - Blocks right-click / drag / copy on images, svgs, videos
 * - Blocks keyboard shortcuts: PrintScreen, Ctrl/⌘+S/P/U
 * - Briefly scrambles the screen when PrintScreen is pressed
 * - Shows a professional SVG dialog with contextual message
 *
 * Deterrent-only; determined users can still capture via external tools.
 */
export function ImageProtection() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("context");
  const [scrambled, setScrambled] = useState(false);

  const show = useCallback((r: Reason) => {
    setReason(r);
    setOpen(true);
  }, []);

  // ---- Mouse / clipboard / drag on mídia ----
  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const isMedia = !!t?.closest?.(
        "img,svg,picture,video,canvas,[data-protect-image]",
      );
      if (!isMedia) return;
      e.preventDefault();
      e.stopPropagation();
      show("context");
    };
    const onDragStart = (e: DragEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest?.("img,svg,picture,video,canvas")) return;
      e.preventDefault();
      show("drag");
    };
    const onCopy = (e: ClipboardEvent) => {
      const sel = window.getSelection?.()?.toString();
      const active = document.activeElement as HTMLElement | null;
      const isEditable =
        active?.tagName === "INPUT" ||
        active?.tagName === "TEXTAREA" ||
        active?.isContentEditable;
      if (sel && isEditable) return; // allow copy inside form fields
      if (sel) {
        e.preventDefault();
        show("copy");
        return;
      }
      if (active?.closest?.("img,svg,picture,video,canvas")) {
        e.preventDefault();
        show("copy");
      }
    };
    document.addEventListener("contextmenu", onContext, true);
    document.addEventListener("dragstart", onDragStart, true);
    document.addEventListener("copy", onCopy, true);
    return () => {
      document.removeEventListener("contextmenu", onContext, true);
      document.removeEventListener("dragstart", onDragStart, true);
      document.removeEventListener("copy", onCopy, true);
    };
  }, [show]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const scramble = () => {
      setScrambled(true);
      window.setTimeout(() => setScrambled(false), 1400);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const kL = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      // PrintScreen — scramble immediately to poison the frame buffer
      if (e.key === "PrintScreen" || kL === "printscreen") {
        e.preventDefault();
        scramble();
        show("printscreen");
        return;
      }

      // View source
      if (mod && kL === "u") {
        e.preventDefault();
        show("source");
        return;
      }
      // Save
      if (mod && kL === "s") {
        e.preventDefault();
        show("save");
        return;
      }
      // Print
      if (mod && kL === "p") {
        e.preventDefault();
        show("print");
        return;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        // Some OSes only send keyup for PrintScreen — cover both.
        try {
          navigator.clipboard?.writeText?.(
            "Captura bloqueada — PlantãoPro · conteúdo dedicado a agentes de segurança pública do sistema socioeducativo.",
          );
        } catch {
          /* ignore */
        }
        scramble();
        show("printscreen");
      }
    };

    const onBeforePrint = (e: Event) => {
      e.preventDefault?.();
      scramble();
      show("print");
    };

    const onVisibility = () => {
      // Poison snapshot briefly when the tab loses focus (common capture flow)
      if (document.visibilityState === "hidden") scramble();
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("beforeprint", onBeforePrint);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("beforeprint", onBeforePrint);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [show]);

  // Auto-dismiss dialog
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setOpen(false), 6000);
    return () => window.clearTimeout(t);
  }, [open]);

  // ---- Watermark tiled pattern (SVG data-URI) ----
  const watermarkUrl = useMemo(() => {
    const stamp = new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const label = `PLANTÃOPRO • AGENTES DE SEGURANÇA · SOCIOEDUCATIVO • ${stamp}`;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='520' height='320' viewBox='0 0 520 320'>
      <g fill='none' fill-rule='evenodd' opacity='0.09'>
        <text x='0' y='160' transform='rotate(-24 260 160)' font-family='IBM Plex Mono, monospace' font-size='16' font-weight='600' fill='#fbbf24' letter-spacing='2'>
          ${label}
        </text>
        <text x='40' y='300' transform='rotate(-24 260 160)' font-family='IBM Plex Mono, monospace' font-size='11' fill='#f59e0b' letter-spacing='4'>
          CONTEÚDO PROTEGIDO • DEDICADO AOS AGENTES
        </text>
      </g>
    </svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  }, []);

  const msg = REASON_COPY[reason];

  return (
    <>
      {/* Global tiled watermark — sits above content, ignores clicks */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          pointerEvents: "none",
          backgroundImage: watermarkUrl,
          backgroundRepeat: "repeat",
          mixBlendMode: "overlay",
        }}
      />

      {/* PrintScreen scramble curtain — professional SVG message */}
      {scrambled && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background:
              "radial-gradient(ellipse at center, #14100a 0%, #050505 80%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 24,
            padding: 24,
          }}
        >
          <svg
            width="320"
            height="200"
            viewBox="0 0 320 200"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="scrGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f0d78c" />
                <stop offset="100%" stopColor="#b8860b" />
              </linearGradient>
              <filter id="scrGlow">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* HUD corner brackets */}
            <path
              d="M8 8 L48 8 M8 8 L8 48"
              stroke="url(#scrGold)"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <path
              d="M312 8 L272 8 M312 8 L312 48"
              stroke="url(#scrGold)"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <path
              d="M8 192 L48 192 M8 192 L8 152"
              stroke="url(#scrGold)"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <path
              d="M312 192 L272 192 M312 192 L312 152"
              stroke="url(#scrGold)"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />

            {/* Shield */}
            <g transform="translate(130 30)" filter="url(#scrGlow)">
              <path
                d="M30 4 L58 14 V44 C58 62 46 78 30 88 C14 78 2 62 2 44 V14 Z"
                fill="rgba(0,0,0,0.85)"
                stroke="url(#scrGold)"
                strokeWidth="2"
              />
              {/* Camera with slash */}
              <rect
                x="14"
                y="34"
                width="32"
                height="20"
                rx="2"
                fill="none"
                stroke="url(#scrGold)"
                strokeWidth="1.8"
              />
              <path
                d="M20 34 L23 30 H37 L40 34"
                fill="none"
                stroke="url(#scrGold)"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <circle
                cx="30"
                cy="44"
                r="5"
                fill="none"
                stroke="url(#scrGold)"
                strokeWidth="1.6"
              />
              <line
                x1="10"
                y1="60"
                x2="50"
                y2="24"
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>

            {/* Title */}
            <text
              x="160"
              y="150"
              textAnchor="middle"
              fill="url(#scrGold)"
              fontFamily="'Libre Baskerville', Georgia, serif"
              fontSize="20"
              fontWeight="700"
              letterSpacing="1"
            >
              Captura Bloqueada
            </text>
            <text
              x="160"
              y="170"
              textAnchor="middle"
              fill="#f0d78c"
              opacity="0.75"
              fontFamily="'IBM Plex Mono', ui-monospace, monospace"
              fontSize="9"
              letterSpacing="4"
            >
              CONTEÚDO PROTEGIDO · CÓPIA NÃO AUTORIZADA
            </text>
            <text
              x="160"
              y="186"
              textAnchor="middle"
              fill="#c9a84c"
              opacity="0.55"
              fontFamily="'IBM Plex Mono', ui-monospace, monospace"
              fontSize="8"
              letterSpacing="3"
            >
              DEDICADO AOS AGENTES DE SEGURANÇA · SOCIOEDUCATIVO
            </text>
          </svg>
        </div>
      )}

      {open && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="img-protect-title"
          className="fixed inset-0 z-[10000] flex items-center justify-center px-4 animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-xl border border-amber-500/40 bg-zinc-950 shadow-2xl shadow-amber-900/30 overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="h-1 bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-200 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 flex flex-col items-center text-center">
              {/* Professional SVG shield mark */}
              <svg
                width="96"
                height="108"
                viewBox="0 0 96 108"
                fill="none"
                aria-hidden="true"
                className="mb-4"
              >
                <defs>
                  <linearGradient id="dlgGold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                </defs>
                <path
                  d="M48 4 L88 18 V52 C88 76 70 96 48 104 C26 96 8 76 8 52 V18 Z"
                  fill="rgba(10,10,10,0.9)"
                  stroke="url(#dlgGold)"
                  strokeWidth="2.5"
                />
                <path
                  d="M48 20 L74 30 V54 C74 71 62 84 48 88 C34 84 22 71 22 54 V30 Z"
                  fill="none"
                  stroke="url(#dlgGold)"
                  strokeOpacity="0.55"
                  strokeWidth="1"
                />
                {/* Camera-with-slash glyph */}
                <g transform="translate(28 40)">
                  <rect
                    x="0"
                    y="6"
                    width="40"
                    height="26"
                    rx="3"
                    fill="none"
                    stroke="url(#dlgGold)"
                    strokeWidth="2"
                  />
                  <path
                    d="M8 6 L12 1 H28 L32 6"
                    fill="none"
                    stroke="url(#dlgGold)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="20"
                    cy="19"
                    r="6"
                    fill="none"
                    stroke="url(#dlgGold)"
                    strokeWidth="1.8"
                  />
                  <line
                    x1="-4"
                    y1="36"
                    x2="44"
                    y2="-4"
                    stroke="#ef4444"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </g>
              </svg>

              <h2
                id="img-protect-title"
                className="font-['Libre_Baskerville',_Georgia,_serif] text-amber-300 text-xl font-bold mb-1"
              >
                {msg.title}
              </h2>
              <div className="text-[10px] uppercase tracking-[0.28em] text-amber-500/70 mb-4 font-mono">
                Dedicado aos agentes · Segurança Socioeducativa
              </div>

              <p className="text-zinc-200 text-sm leading-relaxed mb-3">
                {msg.body}
              </p>
              <p className="text-zinc-400 text-xs leading-relaxed">
                O <span className="text-zinc-200 font-medium">PlantãoPro</span>{" "}
                é um espaço independente criado para apoiar{" "}
                <span className="text-zinc-200 font-medium">
                  agentes de segurança pública do sistema socioeducativo
                </span>
                . Não é um site institucional ou oficial — todo o conteúdo é
                autoral e protegido. Cópias, capturas ou fotografias não são
                autorizadas.
              </p>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-5 px-6 py-2 rounded-md bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 text-sm font-bold uppercase tracking-wider transition-colors"
              >
                Entendi
              </button>
            </div>

            <div className="px-4 py-2 bg-zinc-900/80 border-t border-zinc-800 text-[10px] text-center text-zinc-500 uppercase tracking-widest font-mono">
              PlantãoPro · Acesso Monitorado
            </div>
          </div>
        </div>
      )}
    </>
  );
}
