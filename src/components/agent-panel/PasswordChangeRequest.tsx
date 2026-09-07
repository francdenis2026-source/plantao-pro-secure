import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Key, Loader2, Clock, Check, X, Send, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PasswordChangeRequestProps {
  agentId: string;
  agentName: string;
}

interface RequestStatus {
  id: string;
  status: string;
  reason: string | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export function PasswordChangeRequest({ agentId, agentName }: PasswordChangeRequestProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [existingRequest, setExistingRequest] = useState<RequestStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (agentId) {
      checkExistingRequest();
    }
  }, [agentId]);

  const checkExistingRequest = async () => {
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase
        .from('password_change_requests')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setExistingRequest(data as RequestStatus);
      }
    } catch (error) {
      // No existing request
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: '⚠️ Informe o motivo',
        description: 'Por favor, descreva o motivo da solicitação.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('password_change_requests')
        .insert({
          agent_id: agentId,
          reason: reason.trim(),
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: '✅ Solicitação Enviada!',
        description: 'Sua solicitação foi enviada ao administrador. Aguarde a aprovação.',
        duration: 6000,
      });

      setOpen(false);
      setReason('');
      checkExistingRequest();
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar a solicitação. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    if (!existingRequest) return null;

    switch (existingRequest.status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/40',
          label: 'Aguardando Aprovação',
          description: 'Sua solicitação está sendo analisada pelo administrador.',
        };
      case 'approved':
        return {
          icon: Check,
          color: 'text-green-400',
          bg: 'bg-green-500/10 border-green-500/40',
          label: 'Aprovada',
          description: existingRequest.admin_notes || 'Sua solicitação foi aprovada. Aguarde o contato do administrador.',
        };
      case 'rejected':
        return {
          icon: X,
          color: 'text-red-400',
          bg: 'bg-red-500/10 border-red-500/40',
          label: 'Rejeitada',
          description: existingRequest.admin_notes || 'Sua solicitação foi rejeitada.',
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();
  const hasPendingRequest = existingRequest?.status === 'pending';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 border-purple-500/40 text-purple-400 hover:bg-purple-500/10",
            hasPendingRequest && "border-amber-500/40 text-amber-400"
          )}
        >
          <Key className="h-4 w-4" />
          {hasPendingRequest ? 'Solicitação Pendente' : 'Solicitar Nova Senha'}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-purple-500/40 w-[95vw] max-w-md shadow-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-3 border-b border-slate-700/50">
          <DialogTitle className="flex items-center gap-3 text-lg font-bold text-white">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-500/10 border border-purple-500/40">
              <Key className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <span className="block">Solicitar Troca de Senha</span>
              <span className="text-sm font-normal text-purple-400">{agentName}</span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400 mt-2">
            Envie uma solicitação ao administrador para alterar sua senha de acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {checkingStatus ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            </div>
          ) : statusInfo && existingRequest ? (
            <div className={cn("p-4 rounded-xl border-2", statusInfo.bg)}>
              <div className="flex items-start gap-3">
                <statusInfo.icon className={cn("h-5 w-5 mt-0.5", statusInfo.color)} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("font-bold", statusInfo.color)}>{statusInfo.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(existingRequest.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-300">{statusInfo.description}</p>
                  {existingRequest.reason && (
                    <p className="text-xs text-slate-400 mt-2 italic">
                      Seu motivo: "{existingRequest.reason}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {(!existingRequest || existingRequest.status !== 'pending') && (
            <>
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5" />
                  <p className="text-xs text-blue-300">
                    Apenas o administrador pode alterar senhas. Após a aprovação, você receberá suas novas credenciais.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">
                  Motivo da Solicitação *
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Esqueci minha senha atual, preciso de uma nova..."
                  className="bg-slate-800/80 border-2 border-slate-600 text-white min-h-[100px] focus:border-purple-500/60"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
          {(!existingRequest || existingRequest.status !== 'pending') && (
            <Button
              onClick={handleSubmit}
              disabled={loading || !reason.trim()}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Solicitação
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
