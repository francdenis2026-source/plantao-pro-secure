import { useCallback, useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PendingApprovalsManager } from '@/components/admin/PendingApprovalsManager';
import { RecentRegistrationsAudit } from '@/components/admin/RecentRegistrationsAudit';
import { adminClient } from '@/lib/adminClient';
import { UserCheck, ShieldAlert, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onChange?: () => void;
}

/**
 * Painel unificado "Cadastros & Aprovações".
 *
 * Exibe um contador vivo de pendentes ao lado da sub-aba "Pendentes",
 * alimentado por adminClient.getPendingAgents(). O contador é revalidado:
 *  - no mount
 *  - a cada 30s (polling leve)
 *  - imediatamente após qualquer aprovação/rejeição (callback do filho)
 */
export function CadastrosAprovacoesPanel({ onChange }: Props) {
  const [tab, setTab] = useState<'pending' | 'recent'>('pending');
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPendingCount = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await adminClient.getPendingAgents();
      setPendingCount(result.agents?.length ?? 0);
    } catch (err) {
      console.error('[CadastrosAprovacoesPanel] falha ao contar pendentes:', err);
      // Mantém o valor anterior; não zera para não enganar o operador.
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
    const interval = window.setInterval(fetchPendingCount, 30_000);
    return () => window.clearInterval(interval);
  }, [fetchPendingCount]);

  // Encadeia atualização do contador + callback do painel-pai (Master.fetchData)
  const handleChildChange = useCallback(() => {
    fetchPendingCount();
    onChange?.();
  }, [fetchPendingCount, onChange]);

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as 'pending' | 'recent')} className="space-y-3">
      <TabsList className="h-9 p-0.5 bg-slate-900/60 border border-slate-800/80">
        <TabsTrigger value="pending" className="gap-2 h-8 text-xs uppercase tracking-wider">
          <UserCheck className="h-3.5 w-3.5" />
          Pendentes
          {pendingCount !== null && (
            <Badge
              variant="outline"
              className={cn(
                'ml-1 h-5 min-w-5 px-1.5 text-[10px] font-mono tabular-nums leading-none',
                pendingCount > 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : 'bg-slate-700/40 text-slate-400 border-slate-600/40'
              )}
              aria-label={`${pendingCount} cadastros pendentes`}
            >
              {refreshing ? (
                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
              ) : (
                pendingCount
              )}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="recent" className="gap-2 h-8 text-xs uppercase tracking-wider">
          <ShieldAlert className="h-3.5 w-3.5" />
          Recentes (30d)
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-0">
        <PendingApprovalsManager onApprovalChange={handleChildChange} />
      </TabsContent>

      <TabsContent value="recent" className="mt-0">
        <RecentRegistrationsAudit daysWindow={30} onChange={handleChildChange} />
      </TabsContent>
    </Tabs>
  );
}
