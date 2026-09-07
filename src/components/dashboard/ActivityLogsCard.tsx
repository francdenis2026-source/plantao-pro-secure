import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Loader2, RefreshCw, User, Building2, Calendar, Clock, Shield, FileText, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityLog {
  id: string;
  agent_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  created_at: string;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  login: { label: 'Login', color: 'bg-green-500/20 text-green-400' },
  logout: { label: 'Logout', color: 'bg-slate-500/20 text-slate-400' },
  create: { label: 'Criou', color: 'bg-blue-500/20 text-blue-400' },
  update: { label: 'Atualizou', color: 'bg-amber-500/20 text-amber-400' },
  delete: { label: 'Removeu', color: 'bg-red-500/20 text-red-400' },
  view: { label: 'Visualizou', color: 'bg-purple-500/20 text-purple-400' },
  approve: { label: 'Aprovou', color: 'bg-emerald-500/20 text-emerald-400' },
  reject: { label: 'Rejeitou', color: 'bg-rose-500/20 text-rose-400' },
  transfer: { label: 'Transferiu', color: 'bg-cyan-500/20 text-cyan-400' },
  activate: { label: 'Ativou', color: 'bg-green-500/20 text-green-400' },
  deactivate: { label: 'Desativou', color: 'bg-orange-500/20 text-orange-400' },
};

const resourceIcons: Record<string, typeof User> = {
  agent: User,
  unit: Building2,
  shift: Calendar,
  leave: Clock,
  overtime: Clock,
  license: Shield,
  transfer: FileText,
  settings: Shield,
  credentials: Shield,
  chat: MessageSquare,
};

const resourceLabels: Record<string, string> = {
  agent: 'Agente',
  unit: 'Unidade',
  shift: 'Plantão',
  leave: 'Folga',
  overtime: 'Banco de Horas',
  license: 'Licença',
  transfer: 'Transferência',
  settings: 'Configurações',
  credentials: 'Credenciais',
  chat: 'Chat',
};

export function ActivityLogsCard() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionInfo = (action: string) => {
    return actionLabels[action] || { label: action, color: 'bg-slate-500/20 text-slate-400' };
  };

  const ResourceIcon = ({ type }: { type: string }) => {
    const Icon = resourceIcons[type] || Activity;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Card className="glass glass-border shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-primary" />
              Log de Atividades
            </CardTitle>
            <CardDescription className="text-xs">
              Histórico de ações no sistema
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma atividade registrada
          </p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => {
                const actionInfo = getActionInfo(log.action);
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      <ResourceIcon type={log.resource_type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {log.agent_name || 'Sistema'}
                        </span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${actionInfo.color}`}>
                          {actionInfo.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {resourceLabels[log.resource_type] || log.resource_type}
                        </span>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {JSON.stringify(log.details).slice(0, 100)}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
