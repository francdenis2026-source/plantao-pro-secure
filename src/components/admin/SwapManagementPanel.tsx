import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ArrowRightLeft,
  Loader2,
  Check,
  X,
  Clock,
  Eye,
  FileText,
  Download,
  RefreshCw,
  Users,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SwapRequest {
  id: string;
  requester_id: string;
  target_id: string;
  requester_shift_id: string;
  target_shift_id: string | null;
  status: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
  requester?: { name: string; matricula?: string; phone?: string; team?: string };
  target?: { name: string; matricula?: string; phone?: string; team?: string };
  requester_shift?: { shift_date: string; start_time: string; end_time: string };
  target_shift?: { shift_date: string; start_time: string; end_time: string };
}

interface SwapManagementPanelProps {
  onDataChange?: () => void;
}

export function SwapManagementPanel({ onDataChange }: SwapManagementPanelProps) {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSwap, setSelectedSwap] = useState<SwapRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('pending');

  const fetchSwapRequests = useCallback(async () => {
    try {
      setIsLoading(true);

      const { data, error } = await (supabase as any)
        .from('shift_swaps')
        .select(`
          *,
          requester:agents!requester_id(name, matricula, phone, team),
          target:agents!target_id(name, matricula, phone, team),
          requester_shift:agent_shifts!requester_shift_id(shift_date, start_time, end_time),
          target_shift:agent_shifts!target_shift_id(shift_date, start_time, end_time)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSwapRequests((data || []) as SwapRequest[]);
    } catch (error) {
      console.error('Error fetching swap requests:', error);
      toast.error('Erro ao carregar permutas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSwapRequests();
  }, [fetchSwapRequests]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-swaps')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_swaps',
        },
        () => {
          fetchSwapRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSwapRequests]);

  const handleAdminAction = async (swapId: string, status: 'accepted' | 'rejected') => {
    try {
      setIsProcessing(true);

      const { error } = await (supabase as any)
        .from('shift_swaps')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', swapId);

      if (error) throw error;

      // Create notifications for both parties
      const swap = swapRequests.find((s) => s.id === swapId);
      if (swap) {
        const notificationTitle =
          status === 'accepted' ? 'Permuta aprovada pelo Admin' : 'Permuta rejeitada pelo Admin';
        const notificationContent =
          status === 'accepted'
            ? 'Sua solicitação de permuta foi aprovada pelo administrador'
            : 'Sua solicitação de permuta foi rejeitada pelo administrador';

        // Notify requester
        await (supabase as any).from('notifications').insert({
          agent_id: swap.requester_id,
          type: 'swap',
          title: notificationTitle,
          content: notificationContent,
        });

        // Notify target
        await (supabase as any).from('notifications').insert({
          agent_id: swap.target_id,
          type: 'swap',
          title: notificationTitle,
          content: notificationContent,
        });
      }

      toast.success(status === 'accepted' ? 'Permuta aprovada!' : 'Permuta rejeitada');
      setShowDetailsDialog(false);
      fetchSwapRequests();
      onDataChange?.();
    } catch (error) {
      console.error('Error processing swap:', error);
      toast.error('Erro ao processar permuta');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportAllSwaps = async () => {
    setIsExporting(true);
    try {
      const now = new Date();
      const content = `
RELATÓRIO DE PERMUTAS DE PLANTÃO
================================
PlantãoPro - Sistema de Escalas Operacionais
Gerado em: ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}

RESUMO GERAL
------------
Total de Permutas: ${swapRequests.length}
Pendentes: ${swapRequests.filter((s) => s.status === 'pending').length}
Aceitas: ${swapRequests.filter((s) => s.status === 'accepted').length}
Recusadas: ${swapRequests.filter((s) => s.status === 'rejected').length}

DETALHAMENTO DAS PERMUTAS
-------------------------
${swapRequests
  .map(
    (swap, idx) => `
${idx + 1}. PERMUTA #${swap.id.slice(0, 8)}
   Status: ${swap.status === 'pending' ? 'PENDENTE' : swap.status === 'accepted' ? 'ACEITA' : 'RECUSADA'}
   Data da Solicitação: ${format(parseISO(swap.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
   
   SOLICITANTE:
   - Nome: ${swap.requester?.name || 'N/A'}
   - Matrícula: ${swap.requester?.matricula || 'N/A'}
   - Equipe: ${swap.requester?.team || 'N/A'}
   - Telefone: ${swap.requester?.phone || 'N/A'}
   - Plantão: ${swap.requester_shift?.shift_date ? format(parseISO(swap.requester_shift.shift_date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
   - Horário: ${swap.requester_shift?.start_time || '07:00'} às ${swap.requester_shift?.end_time || '07:00'}
   
   DESTINATÁRIO:
   - Nome: ${swap.target?.name || 'N/A'}
   - Matrícula: ${swap.target?.matricula || 'N/A'}
   - Equipe: ${swap.target?.team || 'N/A'}
   - Telefone: ${swap.target?.phone || 'N/A'}
   
   MOTIVO: ${swap.reason || 'Não informado'}
`
  )
  .join('\n' + '='.repeat(50) + '\n')}

================================
Documento gerado automaticamente pelo PlantãoPro
© ${now.getFullYear()} - Desenvolvido por FRANC D'NIS
`.trim();

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_permutas_${format(now, 'yyyy-MM-dd_HHmm')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting swaps:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'accepted':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <Check className="h-3 w-3 mr-1" />
            Aceita
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <X className="h-3 w-3 mr-1" />
            Recusada
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRequests = swapRequests.filter((s) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  const pendingCount = swapRequests.filter((s) => s.status === 'pending').length;

  return (
    <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-500/20 border border-orange-500/40">
              <ArrowRightLeft className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                Gestão de Permutas
                {pendingCount > 0 && (
                  <Badge className="bg-red-500 text-white border-0">{pendingCount}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Visualize e gerencie todas as solicitações de permuta
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSwapRequests}
              disabled={isLoading}
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAllSwaps}
              disabled={isExporting || swapRequests.length === 0}
              className="border-slate-600 text-slate-300"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              Exportar
            </Button>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mt-4">
          {(['all', 'pending', 'accepted', 'rejected'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={
                filter === f
                  ? 'bg-orange-500 hover:bg-orange-600 text-black'
                  : 'border-slate-600 text-slate-300'
              }
            >
              {f === 'all' && 'Todas'}
              {f === 'pending' && `Pendentes (${swapRequests.filter((s) => s.status === 'pending').length})`}
              {f === 'accepted' && 'Aceitas'}
              {f === 'rejected' && 'Recusadas'}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <ArrowRightLeft className="h-12 w-12 mb-3 opacity-30" />
            <p>Nenhuma permuta encontrada</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400">Data</TableHead>
                  <TableHead className="text-slate-400">Solicitante</TableHead>
                  <TableHead className="text-slate-400">Destinatário</TableHead>
                  <TableHead className="text-slate-400">Plantão</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((swap) => (
                  <TableRow key={swap.id} className="border-slate-700/50 hover:bg-slate-700/20">
                    <TableCell className="text-slate-300 text-sm">
                      {format(parseISO(swap.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-white text-sm font-medium">{swap.requester?.name}</p>
                        <p className="text-slate-500 text-xs">
                          {swap.requester?.team} • {swap.requester?.matricula}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-white text-sm font-medium">{swap.target?.name}</p>
                        <p className="text-slate-500 text-xs">
                          {swap.target?.team} • {swap.target?.matricula}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">
                      {swap.requester_shift?.shift_date
                        ? format(parseISO(swap.requester_shift.shift_date), 'dd/MM/yy', { locale: ptBR })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{getStatusBadge(swap.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSwap(swap);
                            setAdminNotes('');
                            setShowDetailsDialog(true);
                          }}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {swap.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAdminAction(swap.id, 'accepted')}
                              disabled={isProcessing}
                              className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAdminAction(swap.id, 'rejected')}
                              disabled={isProcessing}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <FileText className="h-5 w-5 text-orange-400" />
              Detalhes da Permuta
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Visualize e gerencie esta solicitação de permuta
            </DialogDescription>
          </DialogHeader>

          {selectedSwap && (
            <div className="space-y-4 pt-2">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Status atual:</span>
                {getStatusBadge(selectedSwap.status)}
              </div>

              {/* Requester Info */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-400 text-xs font-semibold uppercase">Solicitante</span>
                </div>
                <p className="text-white font-medium">{selectedSwap.requester?.name}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-400">
                  <span>Mat: {selectedSwap.requester?.matricula || 'N/A'}</span>
                  <span>Equipe: {selectedSwap.requester?.team || 'N/A'}</span>
                  <span>Tel: {selectedSwap.requester?.phone || 'N/A'}</span>
                </div>
              </div>

              {/* Target Info */}
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-purple-400" />
                  <span className="text-purple-400 text-xs font-semibold uppercase">Destinatário</span>
                </div>
                <p className="text-white font-medium">{selectedSwap.target?.name}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-400">
                  <span>Mat: {selectedSwap.target?.matricula || 'N/A'}</span>
                  <span>Equipe: {selectedSwap.target?.team || 'N/A'}</span>
                  <span>Tel: {selectedSwap.target?.phone || 'N/A'}</span>
                </div>
              </div>

              {/* Shift Info */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-400 text-xs font-semibold uppercase">Plantão</span>
                </div>
                <p className="text-white font-medium">
                  {selectedSwap.requester_shift?.shift_date
                    ? format(parseISO(selectedSwap.requester_shift.shift_date), "dd 'de' MMMM 'de' yyyy (EEEE)", { locale: ptBR })
                    : 'Data não informada'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Horário: {selectedSwap.requester_shift?.start_time || '07:00'} às{' '}
                  {selectedSwap.requester_shift?.end_time || '07:00'}
                </p>
              </div>

              {/* Reason */}
              {selectedSwap.reason && (
                <div className="p-3 bg-slate-700/30 border border-slate-600/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-400 text-xs font-semibold uppercase">Motivo</span>
                  </div>
                  <p className="text-white text-sm">{selectedSwap.reason}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex justify-between text-xs text-slate-500">
                <span>
                  Criada: {format(parseISO(selectedSwap.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                </span>
                {selectedSwap.updated_at !== selectedSwap.created_at && (
                  <span>
                    Atualizada: {format(parseISO(selectedSwap.updated_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
              className="border-slate-600 text-slate-300"
            >
              Fechar
            </Button>
            {selectedSwap?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => selectedSwap && handleAdminAction(selectedSwap.id, 'rejected')}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <X className="h-4 w-4 mr-1.5" />}
                  Rejeitar
                </Button>
                <Button
                  onClick={() => selectedSwap && handleAdminAction(selectedSwap.id, 'accepted')}
                  disabled={isProcessing}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
                  Aprovar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
