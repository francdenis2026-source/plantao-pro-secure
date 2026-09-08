import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, Loader2, CheckCircle } from 'lucide-react';
import { formatCPF } from '@/lib/validators';

export function ForgotPasswordDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [cpf, setCpf] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      toast({
        title: 'CPF Inválido',
        description: 'Digite um CPF válido com 11 dígitos.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: fpRows } = await (supabase as any)
        .rpc('lookup_agent_for_login', { _cpf: cleanCpf });
      const agent = Array.isArray(fpRows) && fpRows.length
        ? { id: fpRows[0].id, name: fpRows[0].name }
        : null;


      if (!agent) {
        toast({
          title: 'CPF não encontrado',
          description: 'Não existe agente cadastrado com este CPF.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Verifica se já existe pedido pendente
      const { data: existing } = await supabase
        .from('password_change_requests')
        .select('id')
        .eq('agent_id', agent.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        toast({
          title: 'Solicitação já enviada',
          description: 'Você já possui um pedido pendente. Aguarde o administrador.',
        });
        setStep('success');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('password_change_requests').insert({
        agent_id: agent.id,
        status: 'pending',
        reason: reason.trim() || 'Solicitação de redefinição de senha via tela de login.',
      });

      if (error) throw error;

      setStep('success');
    } catch (error: any) {
      console.error('Error creating password request:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível registrar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setStep('form');
      setCpf('');
      setReason('');
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="link" className="text-amber-400 hover:text-amber-300 p-0 h-auto text-sm">
          Esqueceu sua senha?
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            Solicitar Redefinição
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 'form'
              ? 'Sua solicitação será enviada ao administrador da unidade.'
              : 'Solicitação registrada com sucesso.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-slate-300">CPF</Label>
              <Input
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                className="bg-slate-700/50 border-slate-600 text-white text-center"
                maxLength={14}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Motivo (opcional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: esqueci minha senha após troca de plantão."
                className="bg-slate-700/50 border-slate-600 text-white min-h-[80px]"
                maxLength={300}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando solicitação...
                </>
              ) : (
                <>
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Enviar ao Administrador
                </>
              )}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              O administrador irá analisar e definir uma nova senha temporária para você.
            </p>
          </form>
        )}

        {step === 'success' && (
          <div className="space-y-4 pt-2 text-center">
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <div className="space-y-2">
              <p className="text-white font-medium">Solicitação registrada</p>
              <p className="text-slate-400 text-sm">
                O administrador da sua unidade foi notificado e entrará em contato para liberar o acesso.
              </p>
              <p className="text-slate-500 text-xs mt-4">
                Você pode acompanhar o status pela sua unidade ou pelo canal interno de suporte.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full bg-slate-700 hover:bg-slate-600 text-white">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
