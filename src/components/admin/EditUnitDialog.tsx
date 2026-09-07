import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { adminClient } from '@/lib/adminClient';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Users, Clock, DollarSign, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { Separator } from '@/components/ui/separator';

interface Unit {
  id: string;
  name: string;
  municipality: string;
  director_name?: string | null;
  coordinator_name?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  bh_limit_1st_default?: number | null;
  bh_limit_2nd_default?: number | null;
  bh_hourly_rate_default?: number | null;
}

interface UnitAgent {
  id: string;
  name: string;
  team: string | null;
  is_active: boolean | null;
}

interface EditUnitDialogProps {
  unit: Unit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditUnitDialog({ unit, open, onOpenChange, onSuccess }: EditUnitDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    municipality: '',
    director_name: '',
    coordinator_name: '',
    address: '',
    email: '',
    phone: '',
    bh_limit_1st_default: '70',
    bh_limit_2nd_default: '70',
    bh_hourly_rate_default: '15.75',
  });
  const [agents, setAgents] = useState<UnitAgent[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const initialDataRef = useRef<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (unit) {
      const data = {
        name: unit.name,
        municipality: unit.municipality,
        director_name: unit.director_name || '',
        coordinator_name: unit.coordinator_name || '',
        address: unit.address || '',
        email: unit.email || '',
        phone: unit.phone || '',
        bh_limit_1st_default: String(unit.bh_limit_1st_default ?? 70),
        bh_limit_2nd_default: String(unit.bh_limit_2nd_default ?? 70),
        bh_hourly_rate_default: String(unit.bh_hourly_rate_default ?? 15.75),
      };
      setFormData(data);
      initialDataRef.current = JSON.stringify(data);
      setHasChanges(false);
      fetchAgentsInUnit(unit.id);
    }
  }, [unit]);

  // Track changes
  useEffect(() => {
    if (initialDataRef.current) {
      setHasChanges(JSON.stringify(formData) !== initialDataRef.current);
    }
  }, [formData]);

  const fetchAgentsInUnit = async (unitId: string) => {
    setIsLoading(true);
    const { data } = await supabase
      .from('agents')
      .select('id, name, team, is_active')
      .eq('unit_id', unitId)
      .order('team, name');
    setAgents(data || []);
    setIsLoading(false);
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
    if (!unit) return;

    setIsSubmitting(true);

    try {
      await adminClient.updateUnit({
        unitId: unit.id,
        patch: {
          name: formData.name.toUpperCase().trim(),
          municipality: formData.municipality.toUpperCase().trim(),
          director_name: formData.director_name.toUpperCase().trim() || null,
          coordinator_name: formData.coordinator_name.toUpperCase().trim() || null,
          address: formData.address.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          bh_limit_1st_default: parseInt(formData.bh_limit_1st_default) || 70,
          bh_limit_2nd_default: parseInt(formData.bh_limit_2nd_default) || 70,
          bh_hourly_rate_default: parseFloat(formData.bh_hourly_rate_default) || 15.75,
        },
      });

      toast({
        title: 'Sucesso',
        description: 'Dados da unidade atualizados.',
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating unit:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar os dados.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const agentsByTeam = agents.reduce((acc, agent) => {
    const team = agent.team || 'SEM EQUIPE';
    if (!acc[team]) acc[team] = [];
    acc[team].push(agent);
    return acc;
  }, {} as Record<string, UnitAgent[]>);

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
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Unidade</DialogTitle>
          <DialogDescription>
            Altere as informações da unidade e visualize os agentes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Unidade</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                className="bg-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Município</Label>
              <Input
                value={formData.municipality}
                onChange={(e) => setFormData({ ...formData, municipality: e.target.value.toUpperCase() })}
                className="bg-input"
              />
            </div>
          </div>

          {/* Director and Coordinator */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Diretor</Label>
              <Input
                value={formData.director_name}
                onChange={(e) => setFormData({ ...formData, director_name: e.target.value.toUpperCase() })}
                placeholder="Nome completo do diretor"
                className="bg-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Coordenador de Segurança</Label>
              <Input
                value={formData.coordinator_name}
                onChange={(e) => setFormData({ ...formData, coordinator_name: e.target.value.toUpperCase() })}
                placeholder="Nome do coordenador"
                className="bg-input"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Endereço completo da unidade"
              className="bg-input"
            />
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email de Contato</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@unidade.gov.br"
                className="bg-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 0000-0000"
                className="bg-input"
              />
            </div>
          </div>

          {/* BH Configuration Section */}
          <Separator className="my-4" />
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-green-500" />
              <Label className="text-sm font-medium">Configuração Padrão de BH da Unidade</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Estes valores serão usados como padrão para novos agentes e agentes sem configuração individual.
            </p>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3 text-blue-400" />
                  Limite 1ª Quinz.
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="200"
                    value={formData.bh_limit_1st_default}
                    onChange={(e) => setFormData({ ...formData, bh_limit_1st_default: e.target.value })}
                    className="bg-input pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3 text-purple-400" />
                  Limite 2ª Quinz.
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="200"
                    value={formData.bh_limit_2nd_default}
                    onChange={(e) => setFormData({ ...formData, bh_limit_2nd_default: e.target.value })}
                    className="bg-input pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-green-400" />
                  Valor Hora
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.bh_hourly_rate_default}
                    onChange={(e) => setFormData({ ...formData, bh_hourly_rate_default: e.target.value })}
                    className="bg-input pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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

        {/* Agents in Unit */}
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h4 className="font-medium">Agentes nesta Unidade ({agents.length})</h4>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : agents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum agente cadastrado nesta unidade
            </p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'].map((team) => {
                const teamAgents = agentsByTeam[team] || [];
                if (teamAgents.length === 0) return null;
                
                return (
                  <div key={team} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {team}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({teamAgents.length} agentes)
                      </span>
                    </div>
                    <div className="pl-3 space-y-1">
                      {teamAgents.map((agent) => (
                        <div 
                          key={agent.id} 
                          className="flex items-center justify-between text-sm py-1"
                        >
                          <span className={agent.is_active === false ? 'text-muted-foreground line-through' : ''}>
                            {agent.name}
                          </span>
                          {agent.is_active === false && (
                            <Badge variant="secondary" className="text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
