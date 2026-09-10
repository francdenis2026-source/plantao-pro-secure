import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { IncidentSeverity } from '../types';

interface IncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { type: string; severity: IncidentSeverity; description: string }) => Promise<void>;
}

const SEVERITIES: { value: IncidentSeverity; label: string }[] = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

export function IncidentDialog({ open, onOpenChange, onSubmit }: IncidentDialogProps) {
  const [type, setType] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('media');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = type.trim().length > 0 && description.trim().length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSubmit({ type: type.trim(), severity, description: description.trim() });
      setType('');
      setSeverity('media');
      setDescription('');
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Registrar ocorrência</DialogTitle>
          <DialogDescription>Vinculada à ronda atual. Fica no histórico permanentemente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="incident-type">Tipo</Label>
            <input
              id="incident-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Ex: Portão irregular, item ausente..."
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="incident-severity">Gravidade</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as IncidentSeverity)}>
              <SelectTrigger id="incident-severity"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="incident-desc">Descrição</Label>
            <Textarea id="incident-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Descreva o ocorrido..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>{saving ? 'Registrando...' : 'Registrar ocorrência'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
