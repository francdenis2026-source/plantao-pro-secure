import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { generateSlotPreview } from '../api';
import type { DistributionStrategy, PatrolAgentAssignment, PatrolSector } from '../types';

interface ShiftDividerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startAt: Date;
  endAt: Date;
  intervalMinutes: number;
  agents: PatrolAgentAssignment[];
  sectors: PatrolSector[];
  onConfirm: (input: { strategy: DistributionStrategy; agentIds: string[]; sectorIds: string[] }) => Promise<void>;
}

const STRATEGIES: { value: DistributionStrategy; label: string; hint: string }[] = [
  { value: 'blocks', label: 'Blocos', hint: 'Cada agente cobre um bloco contínuo do turno' },
  { value: 'rotative', label: 'Rotativo', hint: 'Os agentes se revezam a cada quarto de hora' },
  { value: 'manual', label: 'Manual', hint: 'Cria a grade de horários; você atribui agente depois' },
];

/** Divide o turno em quartos de hora e distribui agentes. Mostra preview
 * antes de gravar (Seção 25). */
export function ShiftDivider({ open, onOpenChange, startAt, endAt, intervalMinutes, agents, sectors, onConfirm }: ShiftDividerProps) {
  const [strategy, setStrategy] = useState<DistributionStrategy>('blocks');
  const [selectedAgents, setSelectedAgents] = useState<string[]>(agents.map((a) => a.agent_id));
  const [selectedSectors, setSelectedSectors] = useState<string[]>(sectors.map((s) => s.id));
  const [saving, setSaving] = useState(false);

  const preview = useMemo(
    () => generateSlotPreview({ shiftId: '', startAt, endAt, intervalMinutes, sectorIds: selectedSectors, agentIds: selectedAgents, strategy }),
    [startAt, endAt, intervalMinutes, selectedSectors, selectedAgents, strategy],
  );

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm({ strategy, agentIds: selectedAgents, sectorIds: selectedSectors });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dividir turno</DialogTitle>
          <DialogDescription>Gera os quartos de hora e distribui os agentes escalados.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Estratégia</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as DistributionStrategy)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STRATEGIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{STRATEGIES.find((s) => s.value === strategy)?.hint}</p>
          </div>

          {agents.length > 0 && (
            <div className="space-y-1.5">
              <Label>Agentes ({selectedAgents.length} selecionados)</Label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {agents.map((a) => (
                  <label key={a.agent_id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={selectedAgents.includes(a.agent_id)} onCheckedChange={() => toggle(selectedAgents, setSelectedAgents, a.agent_id)} />
                    {a.agent?.name ?? a.agent_id}
                  </label>
                ))}
              </div>
            </div>
          )}

          {sectors.length > 0 && (
            <div className="space-y-1.5">
              <Label>Setores ({selectedSectors.length} selecionados)</Label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {sectors.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={selectedSectors.includes(s.id)} onCheckedChange={() => toggle(selectedSectors, setSelectedSectors, s.id)} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="font-semibold text-foreground">{preview.length}</span> slots serão criados
            {preview.length > 0 && (
              <span className="text-muted-foreground">
                {' '}({preview[0].scheduled_start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} até{' '}
                {preview[preview.length - 1].scheduled_end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving || preview.length === 0}>{saving ? 'Gerando...' : `Gerar ${preview.length} slots`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
