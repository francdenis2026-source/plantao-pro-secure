import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowRightLeft, Check, X, Loader2, History, Trash2, Bell, Building2, Users, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TransferRequest {
  id: string;
  agent_id: string;
  from_unit_id: string;
  to_unit_id: string;
  from_team: string;
  to_team: string;
  reason: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  agent: {
    name: string;
    cpf: string | null;
    matricula: string | null;
  };
  from_unit: {
    name: string;
    municipality: string;
  };
  to_unit: {
    name: string;
    municipality: string;
  };
}

interface TransferApprovalPanelProps {
  showHistory?: boolean;
}

export function TransferApprovalPanel({ showHistory = false }: TransferApprovalPanelProps) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [showHistory]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('transfer_requests')
        .select(`
          *,
          agent:agents(name, cpf, matricula),
          from_unit:units!transfer_requests_from_unit_id_fkey(name, municipality),
          to_unit:units!transfer_requests_to_unit_id_fkey(name, municipality)
        `)
        .order('created_at', { ascending: false });

      if (!showHistory) {
        query = query.eq('status', 'pending');
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests((data as unknown as TransferRequest[]) || []);
    } catch (error) {
      console.error('Error fetching transfer requests:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as solicitações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setProcessing(true);
    try {
      const newStatus = actionType === 'approve' ? 'approved' : 'rejected';

      // Update the transfer request
      const { error: updateError } = await supabase
        .from('transfer_requests')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'Admin',
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // If approved, update the agent's unit and team
      if (actionType === 'approve') {
        const { error: agentError } = await supabase
          .from('agents')
          .update({
            unit_id: selectedRequest.to_unit_id,
            team: selectedRequest.to_team,
          })
          .eq('id', selectedRequest.agent_id);

        if (agentError) throw agentError;
      }

      toast({
        title: actionType === 'approve' ? 'Transferência Aprovada' : 'Transferência Rejeitada',
        description: actionType === 'approve' 
          ? 'O agente foi transferido com sucesso.' 
          : 'A solicitação foi rejeitada.',
      });

      setSelectedRequest(null);
      setActionType(null);
      setNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error processing transfer:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('transfer_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Excluído',
        description: 'Solicitação de transferência excluída.',
      });

      fetchRequests();
    } catch (error) {
      console.error('Error deleting transfer request:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a solicitação.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">
            Pendente
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
            Aprovada
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/40">
            Rejeitada
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <>
      <Card className={`border-2 ${showHistory ? 'bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50' : 'bg-gradient-to-br from-slate-800/60 via-amber-900/10 to-slate-900/60 border-amber-500/40'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${showHistory ? 'bg-slate-700/50' : 'bg-gradient-to-br from-amber-500/20 to-orange-500/10'} border ${showHistory ? 'border-slate-600' : 'border-amber-500/30'}`}>
                {showHistory ? (
                  <History className="h-5 w-5 text-slate-400" />
                ) : (
                  <ArrowRightLeft className="h-5 w-5 text-amber-400" />
                )}
              </div>
              <div>
                <CardTitle className={`text-lg ${showHistory ? 'text-slate-200' : 'text-amber-200'}`}>
                  {showHistory ? 'Histórico de Transferências' : 'Solicitações Pendentes'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {showHistory 
                    ? 'Histórico completo de solicitações processadas'
                    : 'Aprovar ou rejeitar transferências de agentes'
                  }
                </CardDescription>
              </div>
            </div>
            {!showHistory && pendingCount > 0 && (
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-400" />
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-black border-0 font-bold px-3">
                  {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-3 ${showHistory ? 'bg-slate-700/50' : 'bg-amber-500/10'}`}>
                {showHistory ? (
                  <History className="h-8 w-8 text-slate-500" />
                ) : (
                  <Check className="h-8 w-8 text-emerald-500" />
                )}
              </div>
              <p className="text-muted-foreground">
                {showHistory 
                  ? 'Nenhuma transferência no histórico'
                  : 'Nenhuma solicitação pendente'
                }
              </p>
              {!showHistory && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Todas as solicitações foram processadas
                </p>
              )}
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="text-slate-400">Agente</TableHead>
                    <TableHead className="text-slate-400">Origem</TableHead>
                    <TableHead className="text-slate-400">Destino</TableHead>
                    <TableHead className="text-slate-400">Data</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id} className="border-slate-700/50 hover:bg-slate-800/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-slate-700/50">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                          </div>
                          <div>
                            <div className="font-medium text-white text-sm">{request.agent?.name || 'N/A'}</div>
                            <div className="text-[10px] text-slate-500">
                              Mat: {request.agent?.matricula || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-red-500/10">
                            <Building2 className="h-3 w-3 text-red-400" />
                          </div>
                          <div>
                            <div className="font-medium text-sm text-slate-200">{request.from_unit?.name || 'N/A'}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" />
                              {request.from_unit?.municipality} • {request.from_team}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-emerald-500/10">
                            <Building2 className="h-3 w-3 text-emerald-400" />
                          </div>
                          <div>
                            <div className="font-medium text-sm text-slate-200">{request.to_unit?.name || 'N/A'}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" />
                              {request.to_unit?.municipality} • {request.to_team}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {format(new Date(request.created_at), "dd/MM/yy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {request.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setActionType('approve');
                                }}
                                title="Aprovar transferência"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setActionType('reject');
                                }}
                                title="Negar transferência"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDeleteRequest(request.id)}
                            title="Excluir solicitação"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
        setNotes('');
      }}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className={actionType === 'approve' ? 'text-emerald-400' : 'text-red-400'}>
              {actionType === 'approve' ? '✓ Aprovar Transferência' : '✗ Rejeitar Transferência'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Ao aprovar, o agente será transferido imediatamente para a nova lotação.'
                : 'Ao rejeitar, a solicitação será arquivada e o agente permanecerá na lotação atual.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-700/50 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="text-white font-medium">{selectedRequest.agent?.name}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <p className="text-[10px] text-red-400 uppercase mb-1">Origem</p>
                    <p className="text-sm text-white font-medium">{selectedRequest.from_unit?.name}</p>
                    <p className="text-xs text-slate-400">{selectedRequest.from_team}</p>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <p className="text-[10px] text-emerald-400 uppercase mb-1">Destino</p>
                    <p className="text-sm text-white font-medium">{selectedRequest.to_unit?.name}</p>
                    <p className="text-xs text-slate-400">{selectedRequest.to_team}</p>
                  </div>
                </div>
                
                {selectedRequest.reason && (
                  <div className="p-3 bg-slate-600/30 rounded-lg">
                    <p className="text-[10px] text-slate-400 uppercase mb-1">Motivo do Agente</p>
                    <p className="text-sm text-slate-200">"{selectedRequest.reason}"</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Observações do Administrador (opcional)</Label>
                <Textarea
                  placeholder="Adicione observações sobre esta decisão..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setActionType(null);
                setNotes('');
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              className={actionType === 'approve' 
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white' 
                : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white'
              }
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : actionType === 'approve' ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar Aprovação
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Confirmar Rejeição
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
