import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CalendarClock, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ShiftSetupPromptProps {
  agentId: string;
  agentName: string;
  hasShifts: boolean;
  onComplete: () => void;
}

export function ShiftSetupPrompt({ agentId, agentName, hasShifts, onComplete }: ShiftSetupPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [firstShiftDate, setFirstShiftDate] = useState<Date | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (hasShifts || dismissed) {
      setShowPrompt(false);
      return;
    }

    // Show prompt immediately if no shifts configured (changed from 2 minutes delay)
    setShowPrompt(true);
  }, [hasShifts, dismissed]);

  const generateShifts = async () => {
    if (!firstShiftDate) {
      toast.error('Selecione a data do primeiro plantão');
      return;
    }

    try {
      setIsGenerating(true);
      
      const { data, error } = await supabase.rpc('generate_agent_shifts', {
        p_agent_id: agentId,
        p_first_shift_date: format(firstShiftDate, 'yyyy-MM-dd'),
        p_months_ahead: 6
      });

      if (error) throw error;

      toast.success(`${data} plantões gerados com sucesso!`);
      setShowPrompt(false);
      onComplete();
    } catch (error) {
      console.error('Error generating shifts:', error);
      toast.error('Erro ao gerar plantões');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
  };

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="bg-slate-800 border-amber-500/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <CalendarClock className="h-5 w-5" />
            Configure Sua Escala
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Informe a data do seu primeiro plantão para gerar sua escala automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-amber-400 font-medium">
                Olá, {agentName.split(' ')[0]}!
              </p>
              <p className="text-sm text-slate-300 mt-1">
                Notamos que você ainda não configurou sua escala de plantões. 
                Configure agora para visualizar seus próximos turnos e receber lembretes.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quando é seu primeiro plantão?</Label>
            <p className="text-xs text-slate-400">
              O sistema gerará automaticamente os próximos plantões no padrão 24h/72h.
            </p>
            <Calendar
              mode="single"
              selected={firstShiftDate}
              onSelect={setFirstShiftDate}
              locale={ptBR}
              className="rounded-md border border-slate-600 bg-slate-700/50"
            />
          </div>

          {firstShiftDate && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-400">
                <strong>Primeiro plantão:</strong> {format(firstShiftDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="flex-1 border-slate-600 hover:bg-slate-700"
            >
              Depois
            </Button>
            <Button
              onClick={generateShifts}
              disabled={!firstShiftDate || isGenerating}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                'Configurar Escala'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
