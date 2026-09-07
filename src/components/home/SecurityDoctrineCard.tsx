import { useState } from 'react';
import { Shield, Lock, KeyRound, Users2, ShieldCheck, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Doctrina de segurança — versão compacta.
 * Barra única com chips (tooltip on hover) + botão "Expandir detalhes"
 * que revela grade completa com título e descrição de cada regra.
 * Renderizada só para administradores.
 */
export function SecurityDoctrineCard({ color }: { color: string }) {
  const [expanded, setExpanded] = useState(false);

  const rules = [
    {
      Icon: Shield,
      label: 'RLS 100%',
      title: 'RLS ativo em 100% das tabelas',
      body: 'Toda leitura/escrita passa por Row-Level Security. Agentes só enxergam dados da própria unidade e equipe.',
    },
    {
      Icon: Lock,
      label: 'Anti brute-force',
      title: 'Bloqueio de força bruta',
      body: 'Após tentativas sucessivas com falha, a autenticação é temporariamente bloqueada e o evento é auditado.',
    },
    {
      Icon: KeyRound,
      label: 'Sessão 72h · CPF',
      title: 'Sessão e identidade',
      body: 'Sessões expiram em 72h. Login por CPF com senha forte. Master usa token isolado com escopo administrativo.',
    },
    {
      Icon: Users2,
      label: 'Equipes segregadas',
      title: 'Isolamento por equipe',
      body: 'ALFA · BRAVO · CHARLIE · DELTA operam em canais segregados. Trocas exigem aprovação formal.',
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="mt-2 rounded-md border bg-card/50"
        style={{ borderColor: `${color}2e` }}
        role="note"
        aria-label="Doutrina de segurança institucional"
      >
        {/* Barra compacta */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-2.5 py-1.5">
          {/* Header inline */}
          <div className="flex items-center gap-1.5 pr-2 mr-0.5 border-r border-border/40">
            <ShieldCheck className="h-3 w-3" style={{ color }} />
            <span
              className="font-mono text-[9.5px] uppercase tracking-[0.22em] whitespace-nowrap"
              style={{ color, opacity: 0.9 }}
            >
              Doutrina · Admin
            </span>
          </div>

          {/* Chips */}
          {rules.map(({ Icon, label, title, body }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <div
                  role="note"
                  aria-label={`${title}. ${body}`}
                  className="inline-flex items-center gap-1 rounded-sm border border-border/50 bg-muted/30 px-1.5 py-0.5 cursor-default select-none"
                >
                  <Icon className="h-3 w-3 shrink-0" aria-hidden="true" style={{ color }} />
                  <span className="text-[10.5px] font-medium text-foreground/90 whitespace-nowrap">
                    {label}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[260px]">
                <div className="text-[11px] font-semibold mb-0.5" style={{ color }}>{title}</div>
                <p className="text-[10.5px] leading-snug text-muted-foreground">{body}</p>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Toggle expandir */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls="security-doctrine-details"
            className="ml-auto inline-flex items-center gap-1 rounded-sm border border-border/50 bg-muted/20 hover:bg-muted/50 hover:border-border transition-colors px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            style={{ ['--tw-ring-color' as string]: color }}
          >
            {expanded ? 'Ocultar' : 'Expandir detalhes'}
            <ChevronDown
              className={cn('h-3 w-3 transition-transform duration-200', expanded && 'rotate-180')}
            />
          </button>
        </div>

        {/* Painel expandido */}
        <div
          id="security-doctrine-details"
          className={cn(
            'grid transition-all duration-300 ease-out',
            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border/40 px-2.5 py-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {rules.map(({ Icon, title, body }) => (
                <div
                  key={title}
                  className="flex items-start gap-2 rounded-sm border border-border/40 bg-muted/15 px-2 py-1.5"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color }} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-foreground/95 leading-tight">
                      {title}
                    </div>
                    <p className="text-[10.5px] leading-snug text-muted-foreground mt-0.5">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
              <div className="sm:col-span-2 flex items-center justify-end pt-0.5">
                <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
                  Auditoria contínua · RLS · Anti-brute-force
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
