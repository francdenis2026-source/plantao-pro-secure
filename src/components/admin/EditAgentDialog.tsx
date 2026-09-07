import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Clock, DollarSign } from 'lucide-react';
import { formatCPF, formatPhone, formatMatricula, getMatriculaNumbers } from '@/lib/validators';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';

interface Unit {
  id: string;
  name: string;
  municipality: string;
}

interface Agent {
  id: string;
  name: string;
  cpf: string | null;
  matricula: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  team: string | null;
  is_active: boolean | null;
  unit_id: string | null;
  bh_limit?: number | null;
  bh_hourly_rate?: number | null;
}

interface EditAgentDialogProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const teams = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'];

export function EditAgentDialog({ agent, open, onOpenChange, onSuccess }: EditAgentDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    matricula: '',
    email: '',
    phone: '',
    address: '',
    team: '',
    unit_id: '',
    is_active: true,
    bh_limit: '70',
    bh_hourly_rate: '15.75',
  });
  const [units, setUnits] = useState<Unit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const initialDataRef = useRef<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    if (agent) {
      const data = {
        name: agent.name || '',
        cpf: agent.cpf ? formatCPF(agent.cpf) : '',
        matricula: agent.matricula ? formatMatricula(agent.matricula) : '',
        email: agent.email || '',
        phone: agent.phone || '',
        address: agent.address || '',
        team: agent.team || '',
        unit_id: agent.unit_id || '',
        is_active: agent.is_active ?? true,
        bh_limit: String(agent.bh_limit ?? 70),
        bh_hourly_rate: String(agent.bh_hourly_rate ?? 15.75),
      };
      setFormData(data);
      initialDataRef.current = JSON.stringify(data);
      setHasChanges(false);
    }
  }, [agent]);

  // Track changes
  useEffect(() => {
    if (initialDataRef.current) {
      setHasChanges(JSON.stringify(formData) !== initialDataRef.current);
    }
  }, [formData]);

  const fetchUnits = async () => {
    const { data } = await supabase
      .from('units')
      .select('*')
      .order('municipality, name');
    setUnits(data || []);
  };

  const handleSafeClose = () => {
    if (hasChanges) {
      setShowUnsavedDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false);
    setHasChanges(false);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;

    setIsSubmitting(true);

    try {
      const { error } = await (supabase as any)
        .from('agents')
        .update({
          name: formData.name.toUpperCase().trim(),
          matricula: getMatriculaNumbers(formData.matricula),
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          team: formData.team,
          unit_id: formData.unit_id,
          is_active: formData.is_active,
          bh_limit: parseFloat(formData.bh_limit) || 70,
          bh_hourly_rate: parseFloat(formData.bh_hourly_rate) || 15.75,
        })
        .eq('id', agent.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Dados do agente atualizados.',
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating agent:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar os dados.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedUnit = units.find(u => u.id === formData.unit_id);

  return (
    <>
      <UnsavedChangesDialog
        hasUnsavedChanges={hasChanges}
        onDiscard={handleDiscardChanges}
        onCancel={() => setShowUnsavedDialog(false)}
        open={showUnsavedDialog}
        showSaveOption={false}
      />
      <Dialog open={open} onOpenChange={(newOpen) => !newOpen ? handleSafeClose() : onOpenChange(true)}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle>Editar Agente</DialogTitle>
          <DialogDescription>
            Altere as informações do agente abaixo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                className="bg-input"
              />
            </div>

            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={formData.cpf}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label>Matrícula</Label>
              <Input
                value={formData.matricula}
                onChange={(e) => setFormData({ ...formData, matricula: formatMatricula(e.target.value) })}
                placeholder="000.000.000"
                maxLength={11}
                className="bg-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                className="bg-input"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Endereço</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select
                value={formData.unit_id}
                onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Selecione" />
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

            <div className="space-y-2">
              <Label>Equipe</Label>
              <Select
                value={formData.team}
                onValueChange={(value) => setFormData({ ...formData, team: value })}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Selecione" />
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

            {/* BH Settings - Edição Livre */}
            <div className="col-span-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-medium">
                <Clock className="h-4 w-4" />
                <span>Configurações do Banco de Horas</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3" />
                    Limite de Horas
                  </Label>
                  <Input
                    type="number"
                    value={formData.bh_limit}
                    onChange={(e) => setFormData({ ...formData, bh_limit: e.target.value })}
                    placeholder="70"
                    min={1}
                    max={500}
                    className="bg-input"
                  />
                  <p className="text-xs text-muted-foreground">Máximo acumulado (h)</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm">
                    <DollarSign className="h-3 w-3" />
                    Valor/Hora (R$)
                  </Label>
                  <Input
                    type="number"
                    value={formData.bh_hourly_rate}
                    onChange={(e) => setFormData({ ...formData, bh_hourly_rate: e.target.value })}
                    placeholder="15.75"
                    min={0.01}
                    step={0.01}
                    className="bg-input"
                  />
                  <p className="text-xs text-muted-foreground">Valor por hora extra</p>
                </div>
              </div>
            </div>

            <div className="col-span-2 flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <Label>Status do Agente</Label>
                <p className="text-xs text-muted-foreground">
                  {formData.is_active ? 'Agente ativo no sistema' : 'Agente inativo'}
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleSafeClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
