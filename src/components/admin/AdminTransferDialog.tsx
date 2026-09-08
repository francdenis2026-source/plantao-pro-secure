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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Building2, Users, MapPin } from 'lucide-react';

interface Unit {
  id: string;
  name: string;
  municipality: string;
}

interface Agent {
  id: string;
  name: string;
  matricula: string | null;
  unit_id: string | null;
  unit_name: string | null;
  team: string | null;
}

interface AdminTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
  onSuccess: () => void;
}

const TEAMS = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'];

export function AdminTransferDialog({ 
  open, 
  onOpenChange, 
  agent,
  onSuccess 
}: AdminTransferDialogProps) {
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [targetUnitId, setTargetUnitId] = useState('');
  const [targetTeam, setTargetTeam] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      fetchUnits();
      // Pre-fill with current values
      setTargetUnitId(agent?.unit_id || '');
      setTargetTeam(agent?.team || '');
      setNotes('');
    }
  }, [open, agent]);

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('id, name, municipality')
        .order('municipality, name');

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const handleTransfer = async () => {
    if (!agent) return;

    if (!targetUnitId || !targetTeam) {
      toast.error('Selecione a unidade e equipe de destino');
      return;
    }

    // Check if anything changed
    if (targetUnitId === agent.unit_id && targetTeam === agent.team) {
      toast.error('Selecione uma unidade ou equipe diferente da atual');
      return;
    }

    setLoading(true);

    try {
      // Direct update - admin transfer
      const { error } = await supabase
        .from('agents')
        .update({
          unit_id: targetUnitId,
          team: targetTeam,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agent.id);

      if (error) throw error;

      // Log the transfer in transfer_requests as completed
      const fromUnit = units.find(u => u.id === agent.unit_id);
      const toUnit = units.find(u => u.id === targetUnitId);
      
      await supabase.from('transfer_requests').insert({
        agent_id: agent.id,
        from_unit_id: agent.unit_id || targetUnitId,
        to_unit_id: targetUnitId,
        from_team: agent.team || targetTeam,
        to_team: targetTeam,
        reason: notes || `Transferência direta pelo administrador`,
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      });

      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-medium">Transferência realizada!</span>
          <span className="text-xs text-slate-400">
            {agent.name} → {toUnit?.name} / Equipe {targetTeam}
          </span>
        </div>
      );

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error transferring agent:', error);
      toast.error(error.message || 'Erro ao transferir agente');
    } finally {
      setLoading(false);
    }
  };

  const targetUnit = units.find(u => u.id === targetUnitId);
  const currentUnit = units.find(u => u.id === agent?.unit_id);
  const hasChanges = targetUnitId !== agent?.unit_id || targetTeam !== agent?.team;

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
            Transferir Agente
          </DialogTitle>
          <DialogDescription>
            Transferência direta de <strong className="text-white">{agent.name}</strong>
            {agent.matricula && <span className="text-slate-500"> ({agent.matricula})</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Location */}
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-500 uppercase mb-2 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Lotação Atual
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium text-white">{currentUnit?.name || 'Sem unidade'}</p>
                <p className="text-xs text-slate-400">{currentUnit?.municipality}</p>
              </div>
              <Badge variant="outline" className="text-slate-400">
                {agent.team || 'Sem equipe'}
              </Badge>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="p-2 rounded-full bg-slate-800 border border-slate-700">
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
          </div>

          {/* Target Location */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-500" />
                Unidade de Destino
              </Label>
              <Select value={targetUnitId} onValueChange={setTargetUnitId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {units.map((unit) => (
                    <SelectItem 
                      key={unit.id} 
                      value={unit.id}
                      className="text-white hover:bg-slate-700 focus:bg-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <span>{unit.name}</span>
                        <span className="text-xs text-slate-400">- {unit.municipality}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                Equipe de Destino
              </Label>
              <Select value={targetTeam} onValueChange={setTargetTeam}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecione a equipe" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {TEAMS.map((team) => (
                    <SelectItem 
                      key={team} 
                      value={team}
                      className="text-white hover:bg-slate-700 focus:bg-slate-700"
                    >
                      Equipe {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          {hasChanges && targetUnit && targetTeam && (
            <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <p className="text-xs text-emerald-400 uppercase mb-2">Nova Lotação</p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-white">{targetUnit.name}</p>
                  <p className="text-xs text-slate-400">{targetUnit.municipality}</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  {targetTeam}
                </Badge>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-slate-300">Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo da transferência..."
              className="bg-slate-800 border-slate-700 text-white resize-none h-16"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={loading || !hasChanges}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transferindo...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Confirmar Transferência
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
