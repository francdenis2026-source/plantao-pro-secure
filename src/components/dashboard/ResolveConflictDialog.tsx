import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShiftConflict } from '@/hooks/useShiftConflictDetection';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TeamEmblem } from '@/components/TeamEmblem';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CalendarDays, 
  ArrowRight, 
  Loader2, 
  CheckCircle2,
  AlertTriangle,
  Users,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResolveConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ShiftConflict | null;
  onResolved: () => void;
}

export function ResolveConflictDialog({
  open,
  onOpenChange,
  conflict,
  onResolved,
}: ResolveConflictDialogProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [action, setAction] = useState<'reschedule' | 'remove'>('reschedule');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!conflict) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getTeamColor = (team: string): string => {
    const colors: Record<string, string> = {
      'ALFA': 'bg-red-500/20 text-red-400 border-red-500/30',
      'BRAVO': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'CHARLIE': 'bg-green-500/20 text-green-400 border-green-500/30',
      'DELTA': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    return colors[team] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const originalDate = parseISO(conflict.shift_date);
  
  // Disable the original conflict date and past dates
  const disabledDays = [
    { before: new Date() },
    originalDate,
  ];

  const handleResolve = async () => {
    if (!selectedAgentId) {
      toast.error('Selecione um agente para remanejar');
      return;
    }

    if (action === 'reschedule' && !newDate) {
      toast.error('Selecione uma nova data para o plantão');
      return;
    }

    setIsSubmitting(true);

    try {
      if (action === 'reschedule') {
        // Update the shift to the new date
        const { error } = await supabase
          .from('agent_shifts')
          .update({ 
            shift_date: format(newDate!, 'yyyy-MM-dd'),
            notes: `Remanejado de ${format(originalDate, 'dd/MM/yyyy')} devido a conflito de escalas`
          })
          .eq('agent_id', selectedAgentId)
          .eq('shift_date', conflict.shift_date);

        if (error) throw error;

        const selectedAgent = conflict.agents.find(a => a.id === selectedAgentId);
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-semibold">Conflito Resolvido!</p>
              <p className="text-sm text-muted-foreground">
                Plantão de {selectedAgent?.name.split(' ')[0]} remanejado para {format(newDate!, "dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
        );
      } else {
        // Remove the shift
        const { error } = await supabase
          .from('agent_shifts')
          .delete()
          .eq('agent_id', selectedAgentId)
          .eq('shift_date', conflict.shift_date);

        if (error) throw error;

        const selectedAgent = conflict.agents.find(a => a.id === selectedAgentId);
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-semibold">Plantão Removido</p>
              <p className="text-sm text-muted-foreground">
                Plantão de {selectedAgent?.name.split(' ')[0]} em {format(originalDate, "dd 'de' MMMM", { locale: ptBR })} foi removido
              </p>
            </div>
          </div>
        );
      }

      onResolved();
      onOpenChange(false);
      
      // Reset state
      setSelectedAgentId(null);
      setNewDate(undefined);
      setAction('reschedule');
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error('Erro ao resolver conflito. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Resolver Conflito de Escalas
          </DialogTitle>
          <DialogDescription>
            Selecione um agente e escolha como resolver o conflito
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Conflict Info */}
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <CalendarDays className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="font-medium">
                    {format(originalDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`${getTeamColor(conflict.team)} gap-1.5 pl-1`}>
                      <TeamEmblem team={conflict.team} size="xs" />
                      Equipe {conflict.team}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {conflict.agents.length} agentes em conflito
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Select Agent to Move */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Selecione o agente a remanejar:</Label>
              <RadioGroup value={selectedAgentId || ''} onValueChange={setSelectedAgentId}>
                <div className="space-y-2">
                  {conflict.agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                        selectedAgentId === agent.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedAgentId(agent.id)}
                    >
                      <RadioGroupItem value={agent.id} id={agent.id} />
                      <Avatar className="h-9 w-9">
                        {agent.avatar_url && (
                          <AvatarImage src={agent.avatar_url} alt={agent.name} />
                        )}
                        <AvatarFallback className="text-xs bg-muted">
                          {getInitials(agent.name)}
                        </AvatarFallback>
                      </Avatar>
                      <Label htmlFor={agent.id} className="flex-1 cursor-pointer font-medium">
                        {agent.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Action Selection */}
            {selectedAgentId && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Ação:</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={action === 'reschedule' ? 'default' : 'outline'}
                    className="justify-start h-auto py-3"
                    onClick={() => setAction('reschedule')}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <p className="font-medium">Remanejar</p>
                      <p className="text-xs opacity-80">Mover para outra data</p>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={action === 'remove' ? 'destructive' : 'outline'}
                    className="justify-start h-auto py-3"
                    onClick={() => setAction('remove')}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <p className="font-medium">Remover</p>
                      <p className="text-xs opacity-80">Excluir plantão</p>
                    </div>
                  </Button>
                </div>
              </div>
            )}

            {/* Date Picker for Reschedule */}
            {selectedAgentId && action === 'reschedule' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Nova data do plantão:</Label>
                <div className="flex justify-center border rounded-lg p-2 bg-muted/30">
                  <Calendar
                    mode="single"
                    selected={newDate}
                    onSelect={setNewDate}
                    disabled={disabledDays}
                    locale={ptBR}
                    className="rounded-md"
                    defaultMonth={addDays(originalDate, 1)}
                  />
                </div>
                {newDate && (
                  <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <span className="text-sm text-muted-foreground">
                      {format(originalDate, 'dd/MM/yyyy')}
                    </span>
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      {format(newDate, 'dd/MM/yyyy')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleResolve}
            disabled={!selectedAgentId || (action === 'reschedule' && !newDate) || isSubmitting}
            variant={action === 'remove' ? 'destructive' : 'default'}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : action === 'remove' ? (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Remover Plantão
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Remanejamento
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
