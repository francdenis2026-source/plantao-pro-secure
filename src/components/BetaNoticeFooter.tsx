import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Info } from 'lucide-react';
import { BrasaoSentinela } from '@/components/BrasaoSentinela';

const SEEN_KEY = 'beta-notice-seen-v3';
const HIDDEN_KEY = 'beta-notice-hidden-v3';
const DELAY_MS = 60_000;

const POINTS = [
  'Iniciativa independente de um agente socioeducativo — não é o aplicativo oficial da ISE nem representa o Governo do Acre.',
  'Uso gratuito, sem garantia de disponibilidade contínua; a operação depende de apoio para manter servidor e hospedagem.',
  'Seguimos boas práticas de segurança (TLS 1.3, LGPD), mas o desenvolvedor não se responsabiliza por uso indevido dos dados inseridos.',
];

/**
 * Aviso institucional "Sobre o PlantãoPro" — compacto, uma tela só, com
 * opção explícita de não exibir novamente. Aparece uma vez, 60s após o
 * primeiro acesso.
 */
export function BetaNoticeFooter() {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    let t: number | undefined;

    const alreadyHandled = () => {
      try {
        return !!(localStorage.getItem(SEEN_KEY) || localStorage.getItem(HIDDEN_KEY));
      } catch {
        return false;
      }
    };

    const scheduleReveal = () => {
      if (alreadyHandled()) return;
      t = window.setTimeout(() => {
        if (!alreadyHandled()) setOpen(true);
      }, DELAY_MS);
    };

    if (alreadyHandled()) return;

    // Conta o minuto a partir do carregamento COMPLETO da página (imagens,
    // fontes etc.), não do momento em que este componente apenas monta —
    // evita que o aviso pareça "abrir na hora" numa página ainda pesada.
    if (document.readyState === 'complete') {
      scheduleReveal();
    } else {
      window.addEventListener('load', scheduleReveal, { once: true });
    }

    return () => {
      window.removeEventListener('load', scheduleReveal);
      if (t) window.clearTimeout(t);
    };
  }, []);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, '1');
      if (dontShowAgain) localStorage.setItem(HIDDEN_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent
        className="max-w-[360px] gap-0 overflow-hidden rounded-2xl p-0 border-primary/25"
        aria-labelledby="about-app-title"
        aria-describedby="about-app-desc"
      >
        <DialogHeader className="items-center gap-2 px-6 pb-1 pt-6 text-center">
          <BrasaoSentinela size={44} title="PlantãoPro" />
          <DialogTitle id="about-app-title" className="font-display text-base">
            Sobre o PlantãoPro
          </DialogTitle>
          <DialogDescription id="about-app-desc" className="text-xs text-muted-foreground">
            Antes de continuar, alguns pontos importantes:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 px-6 py-4">
          {POINTS.map((text) => (
            <div key={text} className="flex gap-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        <div className="mx-6 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-primary">
            Feito por agente · para agentes · Feijó/AC
          </p>
        </div>

        <div className="flex items-center gap-2 px-6 pt-4">
          <Checkbox
            id="dont-show-again"
            checked={dontShowAgain}
            onCheckedChange={(v) => setDontShowAgain(v === true)}
          />
          <label htmlFor="dont-show-again" className="cursor-pointer text-xs text-muted-foreground select-none">
            Não mostrar novamente
          </label>
        </div>

        <div className="px-6 pb-6 pt-3">
          <Button className="w-full" onClick={close}>
            Entendi, continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
