import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Shield, AlertTriangle, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PendingApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  agentName?: string;
}

export function PendingApprovalDialog({ open, onClose, agentName }: PendingApprovalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-amber-500/30 w-[94vw] max-w-lg p-0 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-amber-500/5 blur-3xl animate-pulse" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
        </div>

        <div className="relative p-6 sm:p-8 space-y-6">
          {/* Header with animated icon */}
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="relative">
              {/* Outer ring - pulsing */}
              <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" 
                   style={{ animationDuration: '2s' }} />
              
              {/* Middle ring */}
              <div className="absolute inset-2 rounded-full bg-amber-500/30 animate-pulse" />
              
              {/* Inner icon container */}
              <div className={cn(
                "relative w-24 h-24 rounded-full flex items-center justify-center",
                "bg-gradient-to-br from-amber-500/40 to-amber-600/20",
                "border-2 border-amber-500/50 shadow-xl shadow-amber-500/20"
              )}>
                <Clock className="w-12 h-12 text-amber-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-amber-400">
                Cadastro Pendente
              </h2>
              <p className="text-base sm:text-lg text-slate-300">
                Aguardando aprovação do administrador
              </p>
            </div>
          </div>

          {/* Status card */}
          <div className={cn(
            "p-5 rounded-xl space-y-4",
            "bg-gradient-to-r from-amber-500/10 to-transparent",
            "border-2 border-amber-500/20"
          )}>
            <div className="flex items-center gap-4">
              <Shield className="w-7 h-7 text-amber-400" />
              <div>
                <p className="text-lg font-semibold text-white">
                  {agentName || 'Agente'}
                </p>
                <p className="text-sm text-slate-400">
                  Seu cadastro foi recebido com sucesso
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-amber-300/80">
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-medium">Status: Aguardando revisão</span>
            </div>
          </div>

          {/* Info box */}
          <div className={cn(
            "p-5 rounded-xl",
            "bg-slate-800/50 border-2 border-slate-700/50"
          )}>
            <div className="flex gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-3 text-sm text-slate-300">
                <p className="leading-relaxed">
                  Por motivos de segurança, todos os novos cadastros precisam ser 
                  <span className="text-amber-400 font-semibold"> aprovados por um administrador</span>.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Você receberá uma notificação assim que seu acesso for liberado. 
                  Este processo geralmente leva até 24 horas.
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Processo de Aprovação
            </p>
            <div className="space-y-3">
              {[
                { label: 'Cadastro enviado', done: true },
                { label: 'Análise do administrador', done: false, current: true },
                { label: 'Acesso liberado', done: false }
              ].map((step, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    step.done 
                      ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/30" 
                      : step.current
                        ? "bg-amber-500/20 text-amber-400 border-2 border-amber-500/30 animate-pulse"
                        : "bg-slate-700/50 text-slate-500 border-2 border-slate-600"
                  )}>
                    {index + 1}
                  </div>
                  <span className={cn(
                    "text-base font-medium",
                    step.done ? "text-emerald-400" : step.current ? "text-amber-400" : "text-slate-500"
                  )}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          <Button
            onClick={onClose}
            className={cn(
              "w-full h-14 text-lg",
              "bg-gradient-to-r from-amber-600 to-amber-500",
              "hover:from-amber-500 hover:to-amber-400",
              "text-white font-bold shadow-lg shadow-amber-500/20"
            )}
          >
            <Home className="w-5 h-5 mr-2" />
            Voltar para Início
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
