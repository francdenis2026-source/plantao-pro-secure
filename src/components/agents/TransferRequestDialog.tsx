import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRightLeft } from 'lucide-react';

interface Unit {
  id: string;
  name: string;
  municipality: string;
}

interface Agent {
  id: string;
  name: string;
  unit_id: string | null;
  team: string | null;
  unit: Unit | null;
}

interface TransferRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
  onSuccess: () => void;
}

const teams = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'];

export function TransferRequestDialog({ 
  open, 
  onOpenChange, 
  agent,
  onSuccess 
}: TransferRequestDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [targetUnitId, setTargetUnitId] = useState('');
  const [targetTeam, setTargetTeam] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      fetchUnits();
      setTargetUnitId('');
      setTargetTeam('');
      setReason('');
    }
  }, [open]);

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('municipality, name');

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agent || !agent.unit_id || !agent.team) {
      toast({
        title: 'Erro',
        description: 'Dados do agente incompletos.',
        variant: 'destructive',
      });
      return;
    }

    if (!targetUnitId || !targetTeam) {
      toast({
        title: 'Erro',
        description: 'Selecione a unidade e equipe de destino.',
        variant: 'destructive',
      });
      return;
    }

    if (targetUnitId === agent.unit_id && targetTeam === agent.team) {
      toast({
        title: 'Erro',
        description: 'Selecione uma unidade ou equipe diferente da atual.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Transferência imediata - atualiza o agente diretamente
      const { error: updateError } = await supabase
        .from('agents')
        .update({
          unit_id: targetUnitId,
          team: targetTeam,
        })
        .eq('id', agent.id);

      if (updateError) throw updateError;

      // Registrar a transferência no histórico (opcional)
      try {
        await supabase.from('transfer_requests').insert({
          agent_id: agent.id,
          from_unit_id: agent.unit_id,
          to_unit_id: targetUnitId,
          from_team: agent.team,
          to_team: targetTeam,
          reason: reason || null,
          status: 'approved', // Já aprovada automaticamente
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'Auto-Transfer',
        });
      } catch {
        // Ignorar erro se tabela não existir
      }

      toast({
        title: '✓ Transferência Concluída!',
        description: `Você agora faz parte da equipe ${targetTeam}.`,
      });

      onSuccess();
      onOpenChange(false);

      // NÃO faz logout - apenas recarrega para atualizar dados
      window.location.reload();
    } catch (error) {
      console.error('Error submitting transfer request:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível realizar a transferência.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const targetUnit = units.find(u => u.id === targetUnitId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Solicitar Transferência
          </DialogTitle>
          <DialogDescription>
            Solicite transferência para outra unidade ou equipe
          </DialogDescription>
        </DialogHeader>

        {agent && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Location */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Lotação Atual:</p>
              <p className="font-medium">{agent.unit?.name || 'Sem unidade'}</p>
              <p className="text-sm text-muted-foreground">{agent.unit?.municipality}</p>
              <p className="text-sm">Equipe: <span className="font-medium">{agent.team || 'Sem equipe'}</span></p>
            </div>

            {/* Target Unit */}
            <div className="space-y-2">
              <Label>Unidade de Destino *</Label>
              <Select value={targetUnitId} onValueChange={setTargetUnitId}>
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name} - {unit.municipality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Team */}
            <div className="space-y-2">
              <Label>Equipe de Destino *</Label>
              <Select value={targetTeam} onValueChange={setTargetTeam}>
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Selecione a equipe" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {teams.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {targetUnit && targetTeam && (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Nova Lotação:</p>
                <p className="font-medium text-primary">{targetUnit.name}</p>
                <p className="text-sm text-muted-foreground">{targetUnit.municipality}</p>
                <p className="text-sm">Equipe: <span className="font-medium text-primary">{targetTeam}</span></p>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo da solicitação..."
                className="bg-input min-h-[80px]"
                maxLength={500}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-primary hover:opacity-90"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Solicitação'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
