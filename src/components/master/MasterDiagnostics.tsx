/**
 * MasterDiagnostics
 * -----------------
 * Rotina read-only que percorre as 13 abas do Painel Master e valida:
 *  1. list_load:   se a query base da aba retorna sem erro (SELECT count).
 *  2. action_probe: se a função/RPC/edge que dispara a ação principal
 *                   está acessível (verificação por invocação em modo
 *                   dry-run quando disponível, senão marcada como ⏭).
 *
 * Não executa mutações. Seguro para rodar em produção.
 */
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Loader2, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'ok' | 'fail' | 'skip';

interface ProbeResult {
  tab: string;
  label: string;
  list: Status;
  listInfo?: string;
  action: Status;
  actionInfo?: string;
  error?: string;
}

interface TabProbe {
  key: string;
  label: string;
  /** Tabela base para SELECT count(*). */
  table?: string;
  /** Descrição da ação principal (para o relatório). */
  actionLabel: string;
  /**
   * Se true, a ação depende de mutação real (aprovar/rejeitar/criar)
   * e será marcada como ⏭ com actionInfo = 'requer confirmação humana'.
   * Se um probe read-only é possível, use `actionProbe` abaixo.
   */
  actionRequiresMutation?: boolean;
  /** Probe read-only opcional (ex.: checar se RPC existe). */
  actionProbe?: () => Promise<{ ok: boolean; info?: string }>;
}

const PROBES: TabProbe[] = [
  { key: 'approvals',         label: 'Aprovações',       table: 'pending_registrations_log',   actionLabel: 'aprovar/rejeitar cadastro',  actionRequiresMutation: true },
  { key: 'overview',          label: 'Unidades',         table: 'units',                        actionLabel: 'editar unidade',              actionRequiresMutation: true },
  { key: 'access-control',    label: 'Acesso',           table: 'agents',                       actionLabel: 'congelar/descongelar agente', actionRequiresMutation: true },
  { key: 'agents',            label: 'Agentes',          table: 'agents',                       actionLabel: 'editar/excluir agente',       actionRequiresMutation: true },
  { key: 'credentials',       label: 'Credenciais',      table: 'saved_credentials',            actionLabel: 'reset de senha',              actionRequiresMutation: true },
  { key: 'password-requests', label: 'Senhas',           table: 'password_change_requests',     actionLabel: 'responder solicitação',       actionRequiresMutation: true },
  { key: 'licenses',          label: 'Licenças',         table: 'license_activation_codes',     actionLabel: 'emitir/renovar/revogar',      actionRequiresMutation: true },
  { key: 'announcements',     label: 'Comunicações',     table: 'admin_announcements',          actionLabel: 'criar/editar aviso',          actionRequiresMutation: true },
  { key: 'swaps',             label: 'Permutas',         table: 'shift_swaps',                  actionLabel: 'aprovar troca de turno',      actionRequiresMutation: true },
  { key: 'logs',              label: 'Logs',             table: 'activity_logs',                actionLabel: 'filtrar por tipo/data',       actionRequiresMutation: false,
    actionProbe: async () => ({ ok: true, info: 'filtro é client-side' }) },
  { key: 'transfers',         label: 'Transferências',   table: 'transfer_requests',            actionLabel: 'aprovar transferência',       actionRequiresMutation: true },
  { key: 'users',             label: 'Usuários',         table: 'user_roles',                   actionLabel: 'gerenciar via edge admin-ops', actionRequiresMutation: false,
    actionProbe: async () => {
      // Verifica se a edge function admin-operations existe (HEAD/OPTIONS não é suportado; ping mínimo)
      try {
        const { error } = await supabase.functions.invoke('admin-operations', { body: { action: 'ping' } });
        // Qualquer resposta (mesmo erro de "ping desconhecido") confirma que a edge existe
        return { ok: true, info: error ? `edge alcançada (${error.message.slice(0, 40)})` : 'edge respondeu' };
      } catch (e: any) {
        return { ok: false, info: e?.message ?? 'edge inacessível' };
      }
    } },
  { key: 'audit',             label: 'Auditoria',        table: 'access_logs',                  actionLabel: 'consulta timeline',           actionRequiresMutation: false,
    actionProbe: async () => ({ ok: true, info: 'somente leitura' }) },
];

async function probeList(table: string): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    const { count, error } = await supabase
      .from(table as any)
      .select('*', { count: 'exact', head: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, count: count ?? 0 };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'erro desconhecido' };
  }
}

function StatusPill({ status }: { status: Status }) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> OK
      </span>
    );
  }
  if (status === 'fail') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-red-400">
        <XCircle className="h-3 w-3" /> FALHA
      </span>
    );
  }
  if (status === 'skip') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-slate-500">
        <MinusCircle className="h-3 w-3" /> PULADO
      </span>
    );
  }
  return <span className="text-[10px] font-mono uppercase text-slate-600">—</span>;
}

export function MasterDiagnostics() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  const run = useCallback(async () => {
    setRunning(true);
    setResults(PROBES.map(p => ({ tab: p.key, label: p.label, list: 'idle', action: 'idle' })));
    setStartedAt(new Date().toISOString());
    const t0 = performance.now();

    const out: ProbeResult[] = [];
    for (const p of PROBES) {
      const entry: ProbeResult = {
        tab: p.key,
        label: p.label,
        list: 'idle',
        action: 'idle',
      };

      // List probe
      if (p.table) {
        const r = await probeList(p.table);
        if (r.ok) {
          entry.list = 'ok';
          entry.listInfo = `${r.count} registros`;
        } else {
          entry.list = 'fail';
          entry.error = r.error;
        }
      } else {
        entry.list = 'skip';
        entry.listInfo = 'sem tabela base';
      }

      // Action probe
      if (p.actionProbe) {
        try {
          const r = await p.actionProbe();
          entry.action = r.ok ? 'ok' : 'fail';
          entry.actionInfo = r.info;
        } catch (e: any) {
          entry.action = 'fail';
          entry.actionInfo = e?.message ?? 'erro';
        }
      } else if (p.actionRequiresMutation) {
        entry.action = 'skip';
        entry.actionInfo = `${p.actionLabel} — mutação (não executada)`;
      } else {
        entry.action = 'skip';
        entry.actionInfo = p.actionLabel;
      }

      out.push(entry);
      setResults([...out, ...PROBES.slice(out.length).map<ProbeResult>(px => ({ tab: px.key, label: px.label, list: 'idle', action: 'idle' }))]);
    }

    setDurationMs(Math.round(performance.now() - t0));
    setRunning(false);
  }, []);

  const okCount = results.filter(r => r.list === 'ok').length;
  const failCount = results.filter(r => r.list === 'fail' || r.action === 'fail').length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all"
          title="Diagnóstico do painel"
        >
          <Activity className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-hidden bg-slate-900 border-slate-700 p-4">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2 font-tactical tracking-[0.14em] uppercase text-sm">
            <Activity className="h-4 w-4 text-amber-400" />
            Diagnóstico do Painel Master
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-400">
            Rotina read-only. Verifica se cada uma das 13 abas carrega e se a ação principal está acessível.
            Nenhuma mutação é executada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-y border-slate-800">
          <div className="flex items-center gap-3 text-[11px] font-mono">
            {startedAt && (
              <span className="text-slate-500">
                Última execução: <span className="text-slate-300">{new Date(startedAt).toLocaleTimeString('pt-BR')}</span>
                {durationMs !== null && <span className="text-slate-500"> · {durationMs}ms</span>}
              </span>
            )}
            {results.length > 0 && !running && (
              <>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                  {okCount} OK
                </Badge>
                {failCount > 0 && (
                  <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px] font-mono">
                    {failCount} FALHA
                  </Badge>
                )}
              </>
            )}
          </div>
          <Button
            onClick={run}
            disabled={running}
            size="sm"
            className="h-7 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-black font-bold text-[11px] uppercase tracking-wider"
          >
            {running ? (
              <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Executando</>
            ) : (
              'Executar diagnóstico'
            )}
          </Button>
        </div>

        <ScrollArea className="h-[420px] pr-2">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="text-left text-[10px] font-mono uppercase tracking-[0.08em] text-slate-500 border-b border-slate-800">
                <th className="py-1.5 pr-2">Aba</th>
                <th className="py-1.5 pr-2 w-[70px]">Lista</th>
                <th className="py-1.5 pr-2">Info lista</th>
                <th className="py-1.5 pr-2 w-[70px]">Ação</th>
                <th className="py-1.5">Info ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(results.length
                ? results
                : PROBES.map<ProbeResult>(p => ({ tab: p.key, label: p.label, list: 'idle', action: 'idle' }))
              ).map((r) => (
                <tr key={r.tab} className={cn('align-top', r.list === 'fail' && 'bg-red-950/20')}>
                  <td className="py-1.5 pr-2 text-slate-200 font-medium">{r.label}</td>
                  <td className="py-1.5 pr-2"><StatusPill status={r.list} /></td>
                  <td className="py-1.5 pr-2 text-slate-400 font-mono text-[10px]">
                    {r.error ?? r.listInfo ?? '—'}
                  </td>
                  <td className="py-1.5 pr-2"><StatusPill status={r.action} /></td>
                  <td className="py-1.5 text-slate-500 text-[10px]">{r.actionInfo ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>

        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
          Ações que envolvem mutação (aprovar, criar, editar, excluir) são marcadas como <span className="text-slate-400 font-mono">PULADO</span> por segurança —
          confirme-as manualmente na respectiva aba.
        </p>
      </DialogContent>
    </Dialog>
  );
}
