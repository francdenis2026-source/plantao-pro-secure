import type { PatrolAgentAssignment } from '../types';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<PatrolAgentAssignment['status'], { label: string; dot: string }> = {
  in_round: { label: 'Em ronda', dot: 'bg-primary' },
  available: { label: 'Disponível', dot: 'bg-success' },
  standby: { label: 'Em espera', dot: 'bg-warning' },
  unavailable: { label: 'Indisponível', dot: 'bg-muted-foreground' },
};

export function RoundAgentList({ agents }: { agents: PatrolAgentAssignment[] }) {
  if (agents.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum agente escalado neste turno.</p>;
  }
  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {agents.map((a) => {
        const status = STATUS_LABEL[a.status];
        return (
          <div key={a.id} className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              {a.agent?.name?.slice(0, 2).toUpperCase() ?? '--'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{a.agent?.name ?? 'Agente'}</div>
              {a.position && <div className="truncate text-xs text-muted-foreground">{a.position}</div>}
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
              {status.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
