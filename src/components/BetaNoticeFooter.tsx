import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { Shield, AlertTriangle, Heart, Lock, Server, Users, X } from 'lucide-react';


const SEEN_KEY = 'beta-notice-seen-v1';
const HIDDEN_KEY = 'beta-notice-hidden-v1';
const POS_KEY = 'beta-notice-pos-v1';

interface DraggableBetaPillProps {
  onOpen: () => void;
  onHide: () => void;
  retracted?: boolean;
}

function DraggableBetaPill({ onOpen, onHide, retracted = false }: DraggableBetaPillProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
  });
  const ref = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

  // Center initially if no saved position
  useEffect(() => {
    if (pos === null && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({
        x: window.innerWidth / 2 - r.width / 2,
        y: window.innerHeight / 2 - r.height / 2,
      });
    }
  }, [pos]);

  const clamp = (x: number, y: number) => {
    const el = ref.current;
    if (!el) return { x, y };
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(4, Math.min(window.innerWidth - r.width - 4, x)),
      y: Math.max(4, Math.min(window.innerHeight - r.height - 4, y)),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ref.current || !pos) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragState.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const nx = e.clientX - dragState.current.dx;
    const ny = e.clientY - dragState.current.dy;
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0) dragState.current.moved = true;
    const c = clamp(nx, ny);
    setPos(c);
  };

  const onPointerUp = () => {
    if (dragState.current && pos) {
      try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
    }
    const wasDrag = dragState.current?.moved;
    dragState.current = null;
    return wasDrag;
  };

  return (
    <div
      ref={ref}
      className={`group fixed z-[60] flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/95 pl-2.5 pr-1.5 py-1.5 shadow-lg backdrop-blur-md animate-fade-in motion-reduce:animate-none touch-none select-none cursor-grab active:cursor-grabbing transition-all duration-500 ease-out origin-center hover:!opacity-100 hover:!scale-100 focus-within:!opacity-100 focus-within:!scale-100 ${retracted ? 'opacity-40 scale-75' : 'opacity-100 scale-100'}`}
      style={{
        left: pos?.x ?? -9999,
        top: pos?.y ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
      }}
      role="group"
      aria-label="Aviso de versão beta (arrastável)"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <button
        type="button"
        onClick={(e) => {
          if (dragState.current?.moved) { e.preventDefault(); return; }
          onOpen();
        }}
        aria-label="Abrir aviso sobre versão beta"
        className="inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.18em] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-full px-1.5 py-0.5"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2 L21 6 V13 C21 17.5 17 21 12 22 C7 21 3 17.5 3 13 V6 Z"
            fill="hsl(var(--primary))"
            opacity="0.2"
            stroke="hsl(var(--primary))"
            strokeWidth="1.6"
          />
          <circle cx="18.5" cy="5.5" r="1.6" fill="hsl(var(--destructive))">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </svg>
        <span className="font-bold">BETA</span>
      </button>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onHide}
        aria-label="Ocultar permanentemente o selo beta"
        title="Ocultar"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

interface StaticBetaPillProps {
  onOpen: () => void;
  onHide: () => void;
  retracted?: boolean;
}

function StaticBetaPill({ onOpen, onHide, retracted = false }: StaticBetaPillProps) {
  // Ancorado logo abaixo do CommandStrip (mobile), centralizado, sem sobrepor.
  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-[55] flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/95 pl-2.5 pr-1.5 py-1 shadow-md backdrop-blur-md animate-fade-in motion-reduce:animate-none transition-all duration-300 origin-center hover:!opacity-100 hover:!scale-100 focus-within:!opacity-100 focus-within:!scale-100 ${retracted ? 'opacity-70 scale-90' : 'opacity-100 scale-100'}`}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      role="group"
      aria-label="Aviso de versão beta"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label="Abrir aviso sobre versão beta"
        className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-full px-1.5 py-0.5"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2 L21 6 V13 C21 17.5 17 21 12 22 C7 21 3 17.5 3 13 V6 Z"
            fill="hsl(var(--primary))"
            opacity="0.2"
            stroke="hsl(var(--primary))"
            strokeWidth="1.6"
          />
          <circle cx="18.5" cy="5.5" r="1.6" fill="hsl(var(--destructive))">
            <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </svg>
        <span className="font-bold">BETA</span>
      </button>
      <button
        type="button"
        onClick={onHide}
        aria-label="Ocultar permanentemente o selo beta"
        title="Ocultar"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <X className="h-3 w-3" strokeWidth={2.5} />
      </button>
    </div>
  );
}

/**
 * BetaNoticeFooter
 * Mobile-only. Abre modal automaticamente na 1ª visita e depois
 * fica como micro-selo discreto no canto inferior direito. Suporta
 * ocultação permanente e navegação completa por teclado.
 */
export function BetaNoticeFooter() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<boolean>(() => {
    try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
  });
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HIDDEN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const on = () => setIsMobile(mql.matches);
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
      // Só mostra 1 vez, e apenas 60s após o primeiro acesso
      const t = window.setTimeout(() => {
        try {
          if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
        } catch { /* ignore */ }
      }, 60_000);
      return () => window.clearTimeout(t);
    } catch {
      /* ignore */
    }
  }, []);


  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      try {
        localStorage.setItem(SEEN_KEY, '1');
      } catch {
        /* ignore */
      }
      setSeen(true);
    }
  };

  const hidePermanently = () => {
    try {
      localStorage.setItem(HIDDEN_KEY, '1');
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  return (
    <>
      {/* Pill removida — o aviso agora aparece só na primeira visita. */}


      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-md p-0 overflow-hidden border-primary/30"
          aria-labelledby="beta-notice-title"
          aria-describedby="beta-notice-desc"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            closeBtnRef.current?.focus();
          }}
        >
          <div className="relative border-b border-primary/20 bg-gradient-to-br from-primary/15 via-background to-background px-5 pt-5 pb-4">
            <DialogHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/40">
                  <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
                    Termos · Responsabilidades
                  </span>
                  <DialogTitle id="beta-notice-title" className="font-serif text-lg leading-tight">
                    Sobre o PlantãoPro
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription id="beta-notice-desc" className="sr-only">
                Informações sobre o aplicativo, termos de uso e responsabilidades. Pressione Escape para fechar.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="max-h-[65vh] overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }} onWheelCapture={(e) => e.stopPropagation()} onTouchMoveCapture={(e) => e.stopPropagation()}>
            <div
              ref={(node) => {
                // Radix já expõe close via DialogPrimitive.Close; guardamos referência
                // ao primeiro botão de fechar renderizado pelo DialogContent.
                if (node) {
                  const btn = node.closest('[role="dialog"]')?.querySelector<HTMLButtonElement>('[aria-label="Fechar"]');
                  if (btn) closeBtnRef.current = btn;
                }
              }}
              className="space-y-4 px-5 py-4 text-[13px] leading-relaxed text-foreground/90"
            >
              <section className="flex gap-3">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h4 className="font-bold text-foreground">Iniciativa independente</h4>
                  <p className="text-muted-foreground">
                    Este aplicativo é uma iniciativa de um <strong className="text-foreground/90">agente socioeducativo</strong>, criado como
                    ferramenta pessoal de organização de rotinas e plantões.
                  </p>
                </div>
              </section>

              <section className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                <div>
                  <h4 className="font-bold text-foreground">Não é oficial</h4>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground/90">Não se trata de aplicativo oficial da corporação ISE</strong> nem representa
                    qualquer entidade governamental ou institucional.
                  </p>
                </div>
              </section>

              <section className="flex gap-3">
                <Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h4 className="font-bold text-foreground">Uso gratuito</h4>
                  <p className="text-muted-foreground">
                    O acesso é <strong className="text-foreground/90">gratuito</strong> para os agentes que desejem utilizar como apoio
                    à sua rotina profissional.
                  </p>
                </div>
              </section>

              <section className="flex gap-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h4 className="font-bold text-foreground">Segurança</h4>
                  <p className="text-muted-foreground">
                    Seguimos os <strong className="text-foreground/90">protocolos de segurança</strong> recomendados para
                    aplicações web (TLS 1.3, criptografia em repouso, RLS e LGPD).
                  </p>
                </div>
              </section>

              <section className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                <div>
                  <h4 className="font-bold text-foreground">Responsabilidade</h4>
                  <p className="text-muted-foreground">
                    O desenvolvedor <strong className="text-foreground/90">não se responsabiliza por uso indevido</strong> das
                    informações inseridas ou compartilhadas dentro da plataforma.
                  </p>
                </div>
              </section>

              <section className="flex gap-3">
                <Server className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h4 className="font-bold text-foreground">Disponibilidade</h4>
                  <p className="text-muted-foreground">
                    <strong className="text-foreground/90">Não há garantia de disponibilidade contínua</strong> — a operação depende
                    da demanda e exige apoio financeiro para manter servidor, hospedagem e evolução.
                  </p>
                </div>
              </section>

              <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Feito por agente · Para agentes
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  QSL, Feijó! · &lt;dev&gt; Franc D'nis
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
