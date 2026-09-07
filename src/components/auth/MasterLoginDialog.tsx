import { ReactNode, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import heroAsset from '@/assets/master-login-hero.jpg.asset.json';

interface MasterLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

const GOLD = '#c9a84c';
const GOLD_SOFT = '#f0d78c';

// Pré-carrega o hero E o chunk da página /master assim que o módulo é importado.
// Assim, quando o usuário aciona o Master (triple-click no brasão), o dialog
// abre instantaneamente com a imagem já em cache, e o navigate('/master')
// posterior não passa pelo fallback preto do Suspense.
if (typeof window !== 'undefined') {
  const HREF = heroAsset.url;
  if (!document.querySelector(`link[rel="preload"][href="${HREF}"]`)) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = HREF;
    (link as HTMLLinkElement & { fetchPriority?: string }).fetchPriority = 'high';
    document.head.appendChild(link);
    // dispara download imediato
    const img = new Image();
    img.decoding = 'async';
    img.src = HREF;
  }
  // Prefetch do chunk /master em background — sem bloquear o first paint.
  const kickoff = () => {
    import('@/pages/Master').catch(() => {});
  };
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void })
    .requestIdleCallback;
  if (idle) idle(kickoff);
  else setTimeout(kickoff, 400);
}

/**
 * Master Login Dialog — Command Console edition.
 * Compact 380px window, real command-center photo header, SVG ornaments,
 * monospaced + serif typography appropriate for an administrator console.
 */

export function MasterLoginDialog({ open, onOpenChange, children }: MasterLoginDialogProps) {
  const [heroLoaded, setHeroLoaded] = useState(false);

  // Reforça o preload do chunk /master no instante que o dialog abre —
  // caso o prefetch idle ainda não tenha rodado.
  useEffect(() => {
    if (!open) return;
    import('@/pages/Master').catch(() => {});
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[92vw] max-w-[380px] p-0 gap-0 overflow-hidden border-0 bg-[#07080c] shadow-[0_30px_90px_-20px_rgba(201,168,76,0.35),0_0_0_1px_rgba(201,168,76,0.28)]"
      >
        <DialogTitle className="sr-only">Console Master · Autenticação</DialogTitle>
        <DialogDescription className="sr-only">
          Área restrita do Administrador Master. Credenciais criptografadas.
        </DialogDescription>

        {/* ================= HEADER — command center image ================= */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: '16 / 7',
            // Gradiente âmbar/preto como placeholder — evita "flash preto" se
            // a imagem ainda estiver decodificando.
            background:
              'radial-gradient(120% 90% at 85% 15%, rgba(201,168,76,0.28) 0%, transparent 55%), linear-gradient(180deg, #14100a 0%, #0a0b10 100%)',
          }}
        >
          <img
            src={heroAsset.url}
            alt=""
            loading="eager"
            decoding="async"
            {...({ fetchpriority: 'high' } as any)}
            width={1280}
            height={640}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ filter: 'contrast(1.05) saturate(0.95) brightness(0.95)' }}
            onLoad={() => setHeroLoaded(true)}
          />

          {/* Skeleton shimmer — visível apenas enquanto a imagem do hero carrega */}
          {!heroLoaded && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(110deg, rgba(201,168,76,0.06) 20%, rgba(240,215,140,0.18) 45%, rgba(201,168,76,0.06) 70%)',
                  backgroundSize: '200% 100%',
                  animation: 'mld-shimmer 1.4s linear infinite',
                }}
              />
              <style>{`@keyframes mld-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            </div>
          )}


          {/* Warm gold gradient wash — lighter so photo stays visible */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(120% 90% at 85% 15%, rgba(201,168,76,0.22) 0%, transparent 55%), linear-gradient(180deg, rgba(7,8,12,0.15) 0%, rgba(7,8,12,0.55) 65%, rgba(7,8,12,0.92) 100%)',
            }}
          />

          {/* SVG top HUD strip */}
          <svg
            className="absolute inset-x-0 top-0 h-6 w-full"
            viewBox="0 0 380 24"
            preserveAspectRatio="none"
            aria-hidden
          >
            <line x1="0" y1="12" x2="140" y2="12" stroke={GOLD} strokeWidth="0.5" opacity="0.5" strokeDasharray="2 2" />
            <line x1="240" y1="12" x2="380" y2="12" stroke={GOLD} strokeWidth="0.5" opacity="0.5" strokeDasharray="2 2" />
            <circle cx="152" cy="12" r="2" fill={GOLD}>
              <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <text x="160" y="15" fill={GOLD_SOFT} fontFamily="ui-monospace, monospace" fontSize="7" letterSpacing="2.5">
              SECURE CHANNEL
            </text>
            <circle cx="228" cy="12" r="1.4" fill={GOLD} opacity="0.6" />
          </svg>

          {/* Corner brackets */}
          <span className="absolute top-2 left-2 h-2.5 w-2.5 border-t border-l" style={{ borderColor: GOLD }} />
          <span className="absolute top-2 right-2 h-2.5 w-2.5 border-t border-r" style={{ borderColor: GOLD }} />

          {/* Master crest + title (bottom-left) */}
          <div className="absolute bottom-0 inset-x-0 px-4 pb-3 flex items-end gap-2.5">
            <svg width="34" height="38" viewBox="0 0 34 38" aria-hidden className="shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              <defs>
                <linearGradient id="mld-crest" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={GOLD_SOFT} />
                  <stop offset="100%" stopColor={GOLD} />
                </linearGradient>
              </defs>
              <path
                d="M17 1 L32 6 V19 C32 27 25 34 17 37 C9 34 2 27 2 19 V6 Z"
                fill="rgba(7,8,12,0.85)"
                stroke="url(#mld-crest)"
                strokeWidth="1.2"
              />
              {/* Star at top */}
              <path
                d="M17 8 L18.5 12 L22.5 12 L19.3 14.4 L20.6 18.4 L17 16 L13.4 18.4 L14.7 14.4 L11.5 12 L15.5 12 Z"
                fill="url(#mld-crest)"
              />
              {/* Chevrons */}
              <path d="M9 25 L17 20 L25 25" stroke="url(#mld-crest)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
              <path d="M9 30 L17 25 L25 30" stroke="url(#mld-crest)" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />
            </svg>
            <div className="min-w-0">
              <div className="text-[8.5px] font-mono tracking-[0.32em] uppercase" style={{ color: GOLD }}>
                Nível 10 · Master
              </div>
              <h2
                className="text-white leading-none mt-1"
                style={{
                  fontFamily: '"Libre Baskerville", "Playfair Display", Georgia, serif',
                  fontSize: '18px',
                  fontWeight: 700,
                  textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                }}
              >
                Console <span className="italic" style={{ color: GOLD_SOFT }}>Master</span>
              </h2>
              <div className="text-[9.5px] text-white/55 font-mono tracking-[0.2em] uppercase mt-0.5">
                Administrador do Sistema
              </div>
            </div>
          </div>

          {/* Bottom gold hairline */}
          <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        </div>

        {/* ================= CONTENT ================= */}
        <div className="relative px-5 pt-4 pb-5 bg-[#07080c]">
          {/* Corner ornaments */}
          <span className="absolute bottom-2 left-2 h-2.5 w-2.5 border-b border-l" style={{ borderColor: `${GOLD}80` }} />
          <span className="absolute bottom-2 right-2 h-2.5 w-2.5 border-b border-r" style={{ borderColor: `${GOLD}80` }} />

          {/* Auth section header with SVG ornament */}
          <div className="flex items-center gap-2 mb-4">
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden style={{ color: GOLD }}>
              <path d="M8 1 L14 4 V8 C14 11.5 11.5 14 8 15 C4.5 14 2 11.5 2 8 V4 Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5.5 8 L7.5 10 L10.5 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[9px] font-mono tracking-[0.3em] uppercase" style={{ color: `${GOLD}dd` }}>
              Autenticação Segura
            </span>
            <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${GOLD}55, transparent)` }} />
            <span className="text-[8.5px] font-mono tracking-[0.22em] text-white/30">
              v2.7
            </span>
          </div>

          {/* Form slot — style overrides for AuthInput + AuthButton */}
          <div
            className="space-y-3
              [&_label]:!text-[9.5px] [&_label]:!tracking-[0.26em] [&_label]:!uppercase [&_label]:!font-semibold [&_label]:!font-mono
              [&_label]:!text-[#c9a84ccc]
              [&_input]:!h-10 [&_input]:!text-[13px] [&_input]:!bg-black/50 [&_input]:!border-[#c9a84c30]
              [&_input]:focus-visible:!border-[#c9a84c] [&_input]:focus-visible:!ring-[#c9a84c33]
              [&_input]:!text-white [&_input]:placeholder:!text-white/25
              [&_button[type=submit]]:!h-11
              [&_button[type=submit]]:!bg-gradient-to-r [&_button[type=submit]]:!from-[#c9a84c] [&_button[type=submit]]:!via-[#f0d78c] [&_button[type=submit]]:!to-[#c9a84c]
              [&_button[type=submit]]:!text-black [&_button[type=submit]]:!font-bold [&_button[type=submit]]:!tracking-[0.18em] [&_button[type=submit]]:!uppercase [&_button[type=submit]]:!text-[12px]
              [&_button[type=submit]]:!shadow-[0_8px_24px_-8px_rgba(201,168,76,0.55)]"
          >
            {children}
          </div>

          {/* Footer metadata line */}
          <div className="mt-4 pt-3 border-t border-[#c9a84c1f] flex items-center justify-between text-[8.5px] font-mono tracking-[0.24em] uppercase text-white/35">
            <span className="flex items-center gap-1.5">
              <svg width="9" height="9" viewBox="0 0 12 12" aria-hidden style={{ color: GOLD }}>
                <rect x="2" y="5" width="8" height="6" rx="0.8" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4 5V3.5a2 2 0 014 0V5" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              TLS 1.3
            </span>
            <span className="tracking-[0.28em]">Plantão Pro</span>
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Online
            </span>
          </div>
        </div>

        {/* Bottom gold accent */}
        <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
      </DialogContent>
    </Dialog>
  );
}
