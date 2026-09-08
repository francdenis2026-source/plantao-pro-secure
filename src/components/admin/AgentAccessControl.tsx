import { useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Shield, 
  Users, 
  Search, 
  Lock, 
  Unlock, 
  UserX, 
  UserCheck,
  MoreVertical,
  Ban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCPF } from '@/lib/validators';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Agent {
  id: string;
  name: string;
  cpf: string | null;
  team: string | null;
  is_active: boolean;
  is_frozen?: boolean | null;
  license_status?: string | null;
  license_expires_at?: string | null;
  unit?: {
    name: string;
    municipality: string;
  } | null;
}

interface AgentAccessControlProps {
  agents: Agent[];
  onRefresh: () => void;
}

type FilterStatus = 'all' | 'active' | 'inactive' | 'frozen' | 'expired';

export function AgentAccessControl({ agents, onRefresh }: AgentAccessControlProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [processingAgent, setProcessingAgent] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'activate' | 'deactivate' | 'freeze' | 'unfreeze';
    agent: Agent;
  } | null>(null);
  const { toast } = useToast();

  const isLicenseExpired = (agent: Agent) => {
    if (!agent.license_expires_at) return false;
    return new Date(agent.license_expires_at) < new Date();
  };

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 200);
  const filteredAgents = agents.filter(agent => {
    // Search filter (debounced)
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      const cpfNumbers = debouncedSearchTerm.replace(/\D/g, '');
      const matchesName = agent.name.toLowerCase().includes(term);
      const matchesCpf = cpfNumbers && agent.cpf?.includes(cpfNumbers);
      if (!matchesName && !matchesCpf) return false;
    }


    
    // Status filter
    switch (filterStatus) {
      case 'active':
        return agent.is_active && !agent.is_frozen;
      case 'inactive':
        return !agent.is_active;
      case 'frozen':
        return agent.is_frozen;
      case 'expired':
        return isLicenseExpired(agent);
      default:
        return true;
    }
  });

  const handleToggleActive = async (agent: Agent, activate: boolean) => {
    setProcessingAgent(agent.id);
    try {
      const { error } = await supabase
        .from('agents')
        .update({ is_active: activate })
        .eq('id', agent.id);

      if (error) throw error;

      // Log the action
      await supabase.from('access_logs').insert({
        agent_id: agent.id,
        action: activate ? 'activated_by_admin' : 'deactivated_by_admin',
      });

      // Send notification to agent
      await supabase.from('notifications').insert({
        agent_id: agent.id,
        title: activate ? '✅ Acesso Ativado' : '⚠️ Acesso Desativado',
        content: activate 
          ? 'Seu acesso ao sistema foi ativado pelo administrador. Você pode acessar normalmente.'
          : 'Seu acesso ao sistema foi desativado pelo administrador. Entre em contato para mais informações.',
        type: 'access_change',
      });

      toast({
        title: 'Sucesso',
        description: `Agente ${activate ? 'ativado' : 'desativado'} com sucesso. Notificação enviada.`,
      });
      onRefresh();
    } catch (error) {
      console.error('Error toggling agent status:', error);
      toast({ title: 'Erro', description: 'Falha ao alterar status.', variant: 'destructive' });
    } finally {
      setProcessingAgent(null);
      setConfirmAction(null);
    }
  };

  const handleToggleFreeze = async (agent: Agent, freeze: boolean) => {
    setProcessingAgent(agent.id);
    try {
      const { error } = await supabase
        .from('agents')
        .update({ 
          is_frozen: freeze,
          frozen_at: freeze ? new Date().toISOString() : null,
          license_status: freeze ? 'frozen' : 'active'
        })
        .eq('id', agent.id);

      if (error) throw error;

      // Log the action
      await supabase.from('access_logs').insert({
        agent_id: agent.id,
        action: freeze ? 'frozen_by_admin' : 'unfrozen_by_admin',
      });

      // Send notification to agent
      await supabase.from('notifications').insert({
        agent_id: agent.id,
        title: freeze ? '🔒 Acesso Bloqueado' : '🔓 Acesso Desbloqueado',
        content: freeze 
          ? 'Seu acesso ao sistema foi bloqueado pelo administrador. Entre em contato para regularizar sua situação.'
          : 'Seu acesso ao sistema foi desbloqueado! Você pode acessar normalmente agora.',
        type: 'access_change',
      });

      toast({
        title: 'Sucesso',
        description: `Acesso ${freeze ? 'bloqueado' : 'desbloqueado'} com sucesso. Notificação enviada.`,
      });
      onRefresh();
    } catch (error) {
      console.error('Error toggling freeze:', error);
      toast({ title: 'Erro', description: 'Falha ao alterar bloqueio.', variant: 'destructive' });
    } finally {
      setProcessingAgent(null);
      setConfirmAction(null);
    }
  };

  const handleBulkAction = async (action: 'activate_all' | 'deactivate_expired') => {
    const targetAgents = action === 'activate_all' 
      ? agents.filter(a => !a.is_active && !a.is_frozen)
      : agents.filter(a => isLicenseExpired(a) && a.is_active);

    if (targetAgents.length === 0) {
      toast({ title: 'Info', description: 'Nenhum agente para processar.' });
      return;
    }

    try {
      for (const agent of targetAgents) {
        await supabase
          .from('agents')
          .update({ is_active: action === 'activate_all' })
          .eq('id', agent.id);
      }

      toast({
        title: 'Sucesso',
        description: `${targetAgents.length} agentes processados.`,
      });
      onRefresh();
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast({ title: 'Erro', description: 'Falha na operação em lote.', variant: 'destructive' });
    }
  };

  const getStatusBadge = (agent: Agent) => {
    if (agent.is_frozen) {
      return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" /> Bloqueado</Badge>;
    }
    if (!agent.is_active) {
      return <Badge variant="secondary" className="gap-1"><UserX className="h-3 w-3" /> Inativo</Badge>;
    }
    if (isLicenseExpired(agent)) {
      return <Badge variant="outline" className="gap-1 border-amber-500 text-amber-500"><Clock className="h-3 w-3" /> Expirado</Badge>;
    }
    return <Badge className="gap-1 bg-green-500/20 text-green-500 border-0"><CheckCircle2 className="h-3 w-3" /> Ativo</Badge>;
  };

  const stats = {
    total: agents.length,
    active: agents.filter(a => a.is_active && !a.is_frozen).length,
    inactive: agents.filter(a => !a.is_active).length,
    frozen: agents.filter(a => a.is_frozen).length,
    expired: agents.filter(a => isLicenseExpired(a)).length,
  };

  return (
    <>
      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Ação
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'activate' && `Deseja ATIVAR o acesso de ${confirmAction.agent.name}?`}
              {confirmAction?.type === 'deactivate' && `Deseja DESATIVAR o acesso de ${confirmAction.agent.name}? O agente não poderá mais acessar o sistema.`}
              {confirmAction?.type === 'freeze' && `Deseja BLOQUEAR ${confirmAction.agent.name}? O acesso será negado imediatamente.`}
              {confirmAction?.type === 'unfreeze' && `Deseja DESBLOQUEAR ${confirmAction.agent.name}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.type === 'activate' || confirmAction.type === 'deactivate') {
                  handleToggleActive(confirmAction.agent, confirmAction.type === 'activate');
                } else {
                  handleToggleFreeze(confirmAction.agent, confirmAction.type === 'freeze');
                }
              }}
              className={cn(
                confirmAction?.type === 'deactivate' || confirmAction?.type === 'freeze'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              )}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="glass glass-border shadow-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Controle de Acesso
              </CardTitle>
              <CardDescription>
                Ativar, desativar e bloquear agentes
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Atualizar
              </Button>
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="grid grid-cols-5 gap-2 mt-4">
            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                "p-2 rounded-lg text-center transition-colors",
                filterStatus === 'all' ? "bg-primary/20 border border-primary/50" : "bg-muted/30 hover:bg-muted/50"
              )}
            >
              <div className="text-lg font-bold">{stats.total}</div>
              <div className="text-[10px] text-muted-foreground">Total</div>
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={cn(
                "p-2 rounded-lg text-center transition-colors",
                filterStatus === 'active' ? "bg-green-500/20 border border-green-500/50" : "bg-muted/30 hover:bg-muted/50"
              )}
            >
              <div className="text-lg font-bold text-green-500">{stats.active}</div>
              <div className="text-[10px] text-muted-foreground">Ativos</div>
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={cn(
                "p-2 rounded-lg text-center transition-colors",
                filterStatus === 'inactive' ? "bg-slate-500/20 border border-slate-500/50" : "bg-muted/30 hover:bg-muted/50"
              )}
            >
              <div className="text-lg font-bold text-slate-400">{stats.inactive}</div>
              <div className="text-[10px] text-muted-foreground">Inativos</div>
            </button>
            <button
              onClick={() => setFilterStatus('frozen')}
              className={cn(
                "p-2 rounded-lg text-center transition-colors",
                filterStatus === 'frozen' ? "bg-red-500/20 border border-red-500/50" : "bg-muted/30 hover:bg-muted/50"
              )}
            >
              <div className="text-lg font-bold text-red-500">{stats.frozen}</div>
              <div className="text-[10px] text-muted-foreground">Bloqueados</div>
            </button>
            <button
              onClick={() => setFilterStatus('expired')}
              className={cn(
                "p-2 rounded-lg text-center transition-colors",
                filterStatus === 'expired' ? "bg-amber-500/20 border border-amber-500/50" : "bg-muted/30 hover:bg-muted/50"
              )}
            >
              <div className="text-lg font-bold text-amber-500">{stats.expired}</div>
              <div className="text-[10px] text-muted-foreground">Expirados</div>
            </button>
          </div>
          
          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-input"
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Agente</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Licença</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum agente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgents.map(agent => (
                  <TableRow key={agent.id} className="border-border">
                    <TableCell>
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {agent.cpf ? formatCPF(agent.cpf) : '-'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {agent.unit ? (
                        <div>
                          <div className="text-sm">{agent.unit.name}</div>
                          <div className="text-xs text-muted-foreground">{agent.unit.municipality}</div>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {agent.team ? <Badge variant="outline">{agent.team}</Badge> : '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(agent)}
                    </TableCell>
                    <TableCell>
                      {agent.license_expires_at ? (
                        <div className={cn(
                          "text-xs",
                          isLicenseExpired(agent) ? "text-red-500" : "text-muted-foreground"
                        )}>
                          {format(new Date(agent.license_expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        {processingAgent === agent.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border w-48">
                              {agent.is_active ? (
                                <DropdownMenuItem 
                                  onClick={() => setConfirmAction({ type: 'deactivate', agent })}
                                  className="text-amber-500 focus:text-amber-500 focus:bg-amber-500/10"
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Desativar Agente
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => setConfirmAction({ type: 'activate', agent })}
                                  className="text-green-500 focus:text-green-500 focus:bg-green-500/10"
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Ativar Agente
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuSeparator className="bg-border" />
                              
                              {agent.is_frozen ? (
                                <DropdownMenuItem 
                                  onClick={() => setConfirmAction({ type: 'unfreeze', agent })}
                                  className="text-blue-500 focus:text-blue-500 focus:bg-blue-500/10"
                                >
                                  <Unlock className="h-4 w-4 mr-2" />
                                  Desbloquear Acesso
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => setConfirmAction({ type: 'freeze', agent })}
                                  className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Bloquear Acesso
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
