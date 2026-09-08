import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Clock, Key, Shield, MessageSquare, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgentPasswordManager } from '@/components/admin/AgentPasswordManager';
import { cn } from '@/lib/utils';

interface PasswordRequest {
  id: string;
  agent_id: string;
  status: string;
  reason: string | null;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  agent: {
    name: string;
    cpf: string | null;
    team: string | null;
  };
}

export function PasswordRequestsManager() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<PasswordRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PasswordRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    fetchRequests();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('password-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'password_change_requests',
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('password_change_requests')
        .select(`
          *,
          agent:agents(name, cpf, team)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as PasswordRequest[]) || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: PasswordRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('password_change_requests')
        .update({
          status: 'approved',
          reviewed_by: 'Administrador',
          reviewed_at: new Date().toISOString(),
          admin_notes: 'Senha resetada pelo administrador',
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: '✅ Solicitação Aprovada',
        description: `A senha de ${request.agent.name} pode ser alterada agora.`,
      });

      setSelectedRequest(request);
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: 'Erro ao aprovar',
        description: 'Não foi possível aprovar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    setProcessingId(selectedRequest.id);
    try {
      const { error } = await supabase
        .from('password_change_requests')
        .update({
          status: 'rejected',
          reviewed_by: 'Administrador',
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || 'Solicitação rejeitada',
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: '❌ Solicitação Rejeitada',
        description: `A solicitação de ${selectedRequest.agent.name} foi rejeitada.`,
      });

      setShowRejectDialog(false);
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Erro ao rejeitar',
        description: 'Não foi possível rejeitar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (request: PasswordRequest) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40">Pendente</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border border-green-500/40">Aprovada</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border border-red-500/40">Rejeitada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card className="glass glass-border shadow-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/40">
                <Key className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Solicitações de Senha
                  {pendingCount > 0 && (
                    <Badge className="bg-red-500/80 text-white animate-pulse">
                      {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Gerencie as solicitações de troca de senha dos agentes
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRequests}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[350px] rounded-lg border border-border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="border-border">
                  <TableHead>Agente</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Carregando...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nenhuma solicitação registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id} className={cn(
                      "border-border",
                      request.status === 'pending' && "bg-amber-500/5"
                    )}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.agent?.name || 'Desconhecido'}</p>
                          <p className="text-xs text-muted-foreground">
                            {request.agent?.team || 'Sem equipe'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm max-w-[200px] truncate">
                          {request.reason || 'Não informado'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), "HH:mm", { locale: ptBR })}
                        </p>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-right">
                        {request.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                              onClick={() => handleApprove(request)}
                              disabled={processingId === request.id}
                            >
                              {processingId === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => openRejectDialog(request)}
                              disabled={processingId === request.id}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {request.reviewed_by || '---'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Reset Password Dialog after approval */}
      {selectedRequest && selectedRequest.agent?.cpf && !showRejectDialog && (
        <Dialog open={true} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-green-500/40 max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-400">
                <Shield className="h-5 w-5" />
                Solicitação Aprovada
              </DialogTitle>
              <DialogDescription>
                Defina a nova senha para <strong className="text-white">{selectedRequest.agent.name}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 flex justify-center">
              <AgentPasswordManager
                agent={{
                  id: selectedRequest.agent_id,
                  name: selectedRequest.agent.name,
                  cpf: selectedRequest.agent.cpf,
                  email: null,
                }}
                onSuccess={() => setSelectedRequest(null)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-red-500/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <X className="h-5 w-5" />
              Rejeitar Solicitação
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para o agente <strong className="text-white">{selectedRequest?.agent?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Motivo da Rejeição</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Digite o motivo da rejeição..."
                className="bg-slate-800/80 border-slate-600 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600"
              onClick={handleReject}
              disabled={processingId !== null}
            >
              {processingId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
