import { useQuery } from '@tanstack/react-query';
import { History, AlertTriangle, CheckCircle2, Pause, Play, Clock3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as any;

interface PatrolEventRow {
  id: string;
  slot_id: string;
  event_type: string;
  agent_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const EVENT_ICON: Record<string, { icon: typeof History; label: string; tone: string }> = {
  started: { icon: Play, label: 'Iniciada', tone: 'text-primary' },
  paused: { icon: Pause, label: 'Pausada', tone: 'text-warning' },
  resumed: { icon: Play, label: 'Retomada', tone: 'text-primary' },
  completed: { icon: CheckCircle2, label: 'Finalizada', tone: 'text-success' },
  extended: { icon: Clock3, label: 'Estendida', tone: 'text-muted-foreground' },
  incident: { icon: AlertTriangle, label: 'Ocorrência registrada', tone: 'text-destructive' },
  late: { icon: AlertTriangle, label: 'Marcada como atraso', tone: 'text-warning' },
  reassigned: { icon: History, label: 'Reatribuída', tone: 'text-muted-foreground' },
  cancelled: { icon: History, label: 'Cancelada', tone: 'text-muted-foreground' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', timeZone: 'America/Rio_Branco' });
}

/** Histórico imutável de eventos do turno — auditoria (Seção 36/45). Nunca
 * sobrescreve; é sempre um append-only log lido em ordem cronológica reversa. */
export function RoundHistory({ shiftId }: { shiftId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['patrol-history', shiftId],
    queryFn: async (): Promise<PatrolEventRow[]> => {
      const { data: slotIds } = await sb.from('patrol_slots').select('id').eq('shift_id', shiftId);
      const ids = (slotIds ?? []).map((s: { id: string }) => s.id);
      if (ids.length === 0) return [];
      const { data: events, error } = await sb
        .from('patrol_events')
        .select('*')
        .in('slot_id', ids)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return events ?? [];
    },
    enabled: !!shiftId,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando histórico...</p>;
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>;

  return (
    <div className="space-y-1.5">
      {data.map((ev) => {
        const meta = EVENT_ICON[ev.event_type] ?? { icon: History, label: ev.event_type, tone: 'text-muted-foreground' };
        const Icon = meta.icon;
        return (
          <div key={ev.id} className="flex items-center gap-2.5 rounded-md border border-border/60 bg-card/50 px-3 py-1.5 text-sm">
            <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.tone}`} strokeWidth={2.2} />
            <span className="flex-1 text-foreground">{meta.label}</span>
            {ev.event_type === 'extended' && ev.metadata?.minutes ? (
              <span className="text-xs text-muted-foreground">+{String(ev.metadata.minutes)} min</span>
            ) : null}
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmt(ev.created_at)}</span>
          </div>
        );
      })}
    </div>
  );
}
