import { useState, useEffect, useMemo } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { adminClient } from '@/lib/adminClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  UserCheck, 
  UserX, 
  Clock, 
  Shield, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Bell,
  Search,
  RefreshCw,
  Building2,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingAgent {
  id: string;
  name: string;
  cpf: string;
  matricula: string | null;
  team: string | null;
  phone: string | null;
  created_at: string;
  approval_status: string;
  unit: {
    id: string;
    name: string;
    municipality: string;
  } | null;
}

interface PendingApprovalsManagerProps {
  onApprovalChange?: () => void;
}

export function PendingApprovalsManager({ onApprovalChange }: PendingApprovalsManagerProps) {
  const [pendingAgents, setPendingAgents] = useState<PendingAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    agent: PendingAgent | null;
    reason: string;
  }>({ open: false, agent: null, reason: '' });

  const fetchPendingAgents = async () => {
    setLoading(true);
    try {
      // Use admin backend to bypass RLS
      const result = await adminClient.getPendingAgents();
      console.log('Pending agents fetched via backend:', result.agents?.length || 0);
      setPendingAgents(result.agents || []);
    } catch (error: any) {
      console.error('Error fetching pending agents:', error);
      toast.error('Erro ao carregar cadastros pendentes', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingAgents();

    // Poll for updates every 30 seconds (realtime may not work without auth)
    const interval = setInterval(fetchPendingAgents, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleApprove = async (agent: PendingAgent) => {
    setProcessing(agent.id);
    try {
      await adminClient.approveAgent({ agentId: agent.id });

      console.log('Agent approved successfully:', agent.id);
      
      toast.success(`Cadastro de ${agent.name} aprovado!`, {
        description: 'O agente agora pode acessar o sistema.',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />
      });
      
      fetchPendingAgents();
      onApprovalChange?.();
    } catch (error: any) {
      console.error('Error approving agent:', error);
      toast.error('Erro ao aprovar cadastro', {
        description: error.message
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.agent) return;
    
    setProcessing(rejectDialog.agent.id);
    try {
      await adminClient.rejectAgent({
        agentId: rejectDialog.agent.id,
        reason: rejectDialog.reason || 'Cadastro não autorizado'
      });

      toast.success(`Cadastro de ${rejectDialog.agent.name} rejeitado`, {
        icon: <XCircle className="w-5 h-5 text-red-400" />
      });
      
      setRejectDialog({ open: false, agent: null, reason: '' });
      fetchPendingAgents();
      onApprovalChange?.();
    } catch (error: any) {
      console.error('Error rejecting agent:', error);
      toast.error('Erro ao rejeitar cadastro', {
        description: error.message
      });
    } finally {
      setProcessing(null);
    }
  };

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 200);
  const filteredAgents = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase();
    if (!term) return pendingAgents;
    return pendingAgents.filter(agent =>
      agent.name.toLowerCase().includes(term) ||
      agent.cpf.includes(debouncedSearchTerm) ||
      agent.unit?.name.toLowerCase().includes(term)
    );
  }, [pendingAgents, debouncedSearchTerm]);


  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-amber-500/30 shadow-xl shadow-amber-500/5">
      <CardHeader className="border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30">
              <Bell className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-amber-400">
                Aprovação de Cadastros
              </CardTitle>
              <p className="text-sm text-slate-400 mt-0.5">
                Gerencie solicitações de novos agentes
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {pendingAgents.length > 0 && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 px-4 py-1.5 text-base">
                <AlertTriangle className="w-4 h-4 mr-2" />
                {pendingAgents.length} pendente{pendingAgents.length > 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="outline"
              size="default"
              onClick={fetchPendingAgents}
              disabled={loading}
              className="border-slate-600 hover:bg-slate-700 h-10"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Buscar por nome, CPF ou unidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 text-base bg-slate-800/50 border-slate-700"
          />
        </div>

        {/* Pending list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <p className="text-slate-400 text-base">
              {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum cadastro pendente'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className={cn(
                  "p-5 rounded-xl border transition-all duration-300",
                  "bg-gradient-to-r from-slate-800/80 to-slate-800/40",
                  "border-amber-500/20 hover:border-amber-500/40",
                  "hover:shadow-lg hover:shadow-amber-500/5"
                )}
              >
                <div className="flex items-start justify-between gap-5">
                  {/* Agent info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-700/50">
                        <Users className="w-5 h-5 text-cyan-400" />
                      </div>
                      <span className="font-bold text-white text-lg">
                        {agent.name}
                      </span>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-sm px-2.5 py-0.5">
                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                        PENDENTE
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Shield className="w-4 h-4 text-slate-500" />
                        <span>CPF: {formatCPF(agent.cpf)}</span>
                      </div>
                      {agent.matricula && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <span>Mat: {agent.matricula}</span>
                        </div>
                      )}
                      {agent.unit && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          <span>{agent.unit.name}</span>
                        </div>
                      )}
                      {agent.team && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <span>Equipe: {agent.team}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-400 col-span-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span>
                          Solicitado em: {format(new Date(agent.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    <Button
                      size="lg"
                      onClick={() => handleApprove(agent)}
                      disabled={processing === agent.id}
                      className={cn(
                        "bg-emerald-600 hover:bg-emerald-500 text-white h-11 px-5",
                        "shadow-lg shadow-emerald-500/20"
                      )}
                    >
                      <UserCheck className="w-5 h-5 mr-2" />
                      Aprovar
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setRejectDialog({ open: true, agent, reason: '' })}
                      disabled={processing === agent.id}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-11 px-5"
                    >
                      <UserX className="w-5 h-5 mr-2" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Reject Dialog */}
      <Dialog 
        open={rejectDialog.open} 
        onOpenChange={(open) => !open && setRejectDialog({ open: false, agent: null, reason: '' })}
      >
        <DialogContent className="bg-slate-900 border-red-500/30 max-w-md p-6">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30">
                <UserX className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-red-400">Rejeitar Cadastro</h3>
                <p className="text-base text-slate-400">
                  {rejectDialog.agent?.name}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-400 uppercase">
                Motivo da Rejeição (opcional)
              </label>
              <Textarea
                value={rejectDialog.reason}
                onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Informe o motivo da rejeição..."
                className="bg-slate-800/50 border-slate-700 resize-none text-base h-24"
                rows={3}
              />
            </div>

            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-300">
                <AlertTriangle className="w-5 h-5 inline mr-2" />
                O agente será notificado e não poderá acessar o sistema.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-5">
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, agent: null, reason: '' })}
              className="border-slate-600 h-11"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={processing === rejectDialog.agent?.id}
              className="bg-red-600 hover:bg-red-500 h-11"
            >
              <XCircle className="w-5 h-5 mr-2" />
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
