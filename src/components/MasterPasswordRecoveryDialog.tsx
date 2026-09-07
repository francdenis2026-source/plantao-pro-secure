import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, KeyRound, AlertTriangle, Mail, Phone, Copy, Check, HelpCircle } from 'lucide-react';

interface MasterPasswordRecoveryDialogProps {
  trigger?: React.ReactNode;
}

export function MasterPasswordRecoveryDialog({ trigger }: MasterPasswordRecoveryDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'info' | 'contact'>('info');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: 'Copiado!',
        description: 'Email copiado para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep('info');
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="text-xs text-amber-400/70 hover:text-amber-300 transition-colors flex items-center gap-1"
          >
            <HelpCircle className="h-3 w-3" />
            Esqueci a senha
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/30 max-w-sm">
        <DialogHeader className="pb-3 border-b border-slate-700/50">
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Shield className="h-5 w-5" />
            Recuperação de Acesso Master
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Procedimento de segurança para recuperação de credenciais
          </DialogDescription>
        </DialogHeader>

        {step === 'info' && (
          <div className="space-y-4 pt-3">
            {/* Security Warning */}
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-300/90">
                  <strong className="block mb-1">Acesso Restrito</strong>
                  Por questões de segurança, a recuperação de senha Master requer verificação de identidade através do desenvolvedor do sistema.
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-300">Procedimento:</p>
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-start gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <span className="w-5 h-5 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                  <span>Entre em contato com o desenvolvedor</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <span className="w-5 h-5 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                  <span>Forneça dados de verificação (nome da unidade, dados cadastrais)</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <span className="w-5 h-5 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                  <span>Receba as novas credenciais de forma segura</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setStep('contact')}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-900 font-semibold text-xs"
            >
              <KeyRound className="h-3.5 w-3.5 mr-1.5" />
              Ver Contatos de Recuperação
            </Button>
          </div>
        )}

        {step === 'contact' && (
          <div className="space-y-4 pt-3">
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <p className="text-xs text-blue-300 mb-2">
                <strong>Contate o desenvolvedor para recuperar seu acesso:</strong>
              </p>
            </div>

            {/* Contact Options */}
            <div className="space-y-2">
              <div className="p-3 bg-slate-800/70 rounded-lg border border-slate-600/50 group hover:border-amber-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-amber-400" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Email Principal</p>
                      <p className="text-xs text-white font-mono">plantaopro@proton.me</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-amber-400"
                    onClick={() => handleCopy('plantaopro@proton.me')}
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-slate-800/70 rounded-lg border border-slate-600/50 group hover:border-amber-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-400" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Email Alternativo</p>
                      <p className="text-xs text-white font-mono">francdenisbr@gmail.com</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-blue-400"
                    onClick={() => handleCopy('francdenisbr@gmail.com')}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Subject Hint */}
            <div className="p-2 bg-slate-900/50 rounded border border-slate-700/30 text-[10px] text-slate-400">
              <strong className="text-slate-300">Assunto sugerido:</strong><br />
              "Recuperação de Senha Master - PlantãoPro"
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setStep('info')}
                className="flex-1 text-xs text-slate-400 hover:text-white"
              >
                Voltar
              </Button>
              <Button
                onClick={handleClose}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
