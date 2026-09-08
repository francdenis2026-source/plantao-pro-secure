import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Clock, DollarSign, Loader2, Lock, Unlock, Save, Building2 } from 'lucide-react';

interface Unit {
  id: string;
  name: string;
  municipality: string;
  bh_hourly_rate_default: number | null;
  bh_limit_1st_default: number | null;
  bh_limit_2nd_default: number | null;
  bh_lock_agent_edit: boolean | null;
}

export function BHControlCard() {
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editedUnits, setEditedUnits] = useState<Record<string, Partial<Unit>>>({});

  const fetchUnits = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('units')
        .select('id, name, municipality, bh_hourly_rate_default, bh_limit_1st_default, bh_limit_2nd_default, bh_lock_agent_edit')
        .order('name');

      if (error) throw error;
      setUnits(data || []);
    } catch (err) {
      console.error('Error fetching units:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleChange = (unitId: string, field: keyof Unit, value: any) => {
    setEditedUnits(prev => ({
      ...prev,
      [unitId]: {
        ...prev[unitId],
        [field]: value
      }
    }));
  };

  const getValue = (unit: Unit, field: keyof Unit) => {
    if (editedUnits[unit.id] && editedUnits[unit.id][field] !== undefined) {
      return editedUnits[unit.id][field];
    }
    return unit[field];
  };

  const handleSave = async (unit: Unit) => {
    setSavingId(unit.id);
    try {
      const updates = editedUnits[unit.id];
      if (!updates) return;

      const { error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', unit.id);

      if (error) throw error;

      await logActivity({
        action: 'update',
        resourceType: 'unit',
        resourceId: unit.id,
        details: { unitName: unit.name, changes: updates }
      });

      toast({
        title: 'Configurações salvas',
        description: `Configurações de BH para ${unit.name} atualizadas.`,
      });

      // Clear edited state for this unit
      setEditedUnits(prev => {
        const updated = { ...prev };
        delete updated[unit.id];
        return updated;
      });

      fetchUnits();
    } catch (err) {
      console.error('Error saving:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  const hasChanges = (unitId: string) => {
    return editedUnits[unitId] && Object.keys(editedUnits[unitId]).length > 0;
  };

  return (
    <Card className="glass glass-border shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-primary" />
          Controle de Banco de Horas
        </CardTitle>
        <CardDescription className="text-xs">
          Configure valores e limites por unidade. Bloqueie edição pelos agentes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {units.map((unit) => {
                const isLocked = getValue(unit, 'bh_lock_agent_edit') as boolean;
                const modified = hasChanges(unit.id);

                return (
                  <div
                    key={unit.id}
                    className={`p-4 rounded-lg border ${
                      isLocked 
                        ? 'bg-amber-500/5 border-amber-500/30' 
                        : 'bg-muted/30 border-border/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{unit.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {unit.municipality}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {modified && (
                          <Button
                            size="sm"
                            onClick={() => handleSave(unit)}
                            disabled={savingId === unit.id}
                            className="h-7 text-xs gap-1"
                          >
                            {savingId === unit.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            Salvar
                          </Button>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {isLocked ? (
                            <Lock className="h-4 w-4 text-amber-400" />
                          ) : (
                            <Unlock className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Switch
                            checked={isLocked}
                            onCheckedChange={(checked) => handleChange(unit.id, 'bh_lock_agent_edit', checked)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Valor/Hora (R$)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={String(getValue(unit, 'bh_hourly_rate_default') ?? '')}
                          onChange={(e) => handleChange(unit.id, 'bh_hourly_rate_default', parseFloat(e.target.value) || null)}
                          className="h-8 text-sm"
                          placeholder="15.75"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">
                          Limite 1ª Quinzena (h)
                        </Label>
                        <Input
                          type="number"
                          value={String(getValue(unit, 'bh_limit_1st_default') ?? '')}
                          onChange={(e) => handleChange(unit.id, 'bh_limit_1st_default', parseInt(e.target.value) || null)}
                          className="h-8 text-sm"
                          placeholder="70"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">
                          Limite 2ª Quinzena (h)
                        </Label>
                        <Input
                          type="number"
                          value={String(getValue(unit, 'bh_limit_2nd_default') ?? '')}
                          onChange={(e) => handleChange(unit.id, 'bh_limit_2nd_default', parseInt(e.target.value) || null)}
                          className="h-8 text-sm"
                          placeholder="70"
                        />
                      </div>
                    </div>

                    {isLocked && (
                      <p className="text-[10px] text-amber-400 mt-2 flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Agentes não podem alterar configurações de BH
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
