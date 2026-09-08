import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TransferHistory {
  id: string;
  from_unit_id: string;
  to_unit_id: string;
  from_team: string;
  to_team: string;
  reason: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  from_unit: {
    name: string;
    municipality: string;
  };
  to_unit: {
    name: string;
    municipality: string;
  };
}

interface AgentTransferHistoryProps {
  agentId: string;
  agentName: string;
}

export function AgentTransferHistory({ agentId, agentName }: AgentTransferHistoryProps) {
  const [history, setHistory] = useState<TransferHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [agentId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transfer_requests')
        .select(`
          id,
          from_unit_id,
          to_unit_id,
          from_team,
          to_team,
          reason,
          status,
          created_at,
          reviewed_at,
          from_unit:units!transfer_requests_from_unit_id_fkey(name, municipality),
          to_unit:units!transfer_requests_to_unit_id_fkey(name, municipality)
        `)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory((data as unknown as TransferHistory[]) || []);
    } catch (error) {
      console.error('Error fetching transfer history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Aprovada</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="glass glass-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-primary" />
          Histórico de Transferências
        </CardTitle>
        <CardDescription>
          Movimentações de {agentName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma transferência registrada
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-muted/30 rounded-lg border border-border/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                  {getStatusBadge(item.status)}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{item.from_unit?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.from_unit?.municipality} - {item.from_team}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 text-right">
                    <div className="font-medium">{item.to_unit?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.to_unit?.municipality} - {item.to_team}
                    </div>
                  </div>
                </div>
                {item.reason && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium">Motivo:</span> {item.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
