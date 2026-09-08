import { Lock, Users, Radio } from 'lucide-react';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useOperationalMetrics } from '@/hooks/useOperationalMetrics';
import { useOnlineAgents } from '@/hooks/useOnlineAgents';
import { useVisitorPresence } from '@/hooks/useVisitorPresence';

const fmt2 = (n: number) => n.toString().padStart(2, '0');

/**
 * Barra de status operacional — versão institucional simples.
 * Logado: mostra agente, unidade e equipe. Público: mostra indicadores
 * operacionais gerais (efetivo, presença, criptografia).
 */
export function OperationalStatusRibbon() {
  const { agent } = useAgentProfile();
  const metrics = useOperationalMetrics();
  const onlineAgents = Math.max(useOnlineAgents().size, useVisitorPresence());

  const isLogged = Boolean(agent?.id);
  const teamKey = (agent?.team ?? '').toUpperCase();
  const unitName = agent?.unit?.name ?? '';
  const municipality = agent?.unit?.municipality ?? '';
  const agentShort = (agent?.name ?? '').split(' ').slice(0, 2).join(' ');
  const matricula = agent?.matricula ?? '—';
  const efetivoTotal = metrics.loading ? '—' : fmt2(metrics.agentsActive);
  const onlineNow = fmt2(onlineAgents);

  const items = isLogged
    ? [
        { label: 'Agente', value: agentShort || '—', sub: `Matrícula ${matricula}` },
        { label: 'Unidade', value: unitName || '—', sub: (municipality || '').toUpperCase() },
        { label: 'Equipe', value: teamKey || '—', sub: 'Operação ativa' },
      ]
    : [
        { label: 'Efetivo ativo', value: efetivoTotal, sub: 'Agentes cadastrados', icon: Users },
        { label: 'Online agora', value: onlineNow, sub: 'Presença em tempo real', icon: Radio, live: true },
        { label: 'Segurança', value: 'AES-256', sub: 'Dados criptografados', icon: Lock },
      ];

  return (
    <div
      role="status"
      aria-label={isLogged ? `Painel operacional — ${unitName}` : 'Status operacional'}
      className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border"
    >
      {items.map((item) => (
        <div key={item.label} className="bg-card/95 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {'icon' in item && item.icon ? <item.icon className="h-3 w-3" strokeWidth={2.2} /> : null}
            {'live' in item && item.live ? (
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-success/60 animate-ping" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-success" />
              </span>
            ) : null}
            {item.label}
          </div>
          <div className="mt-1 truncate text-sm font-bold text-foreground sm:text-base">{item.value}</div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.sub}</div>
        </div>
      ))}
    </div>
  );
}
