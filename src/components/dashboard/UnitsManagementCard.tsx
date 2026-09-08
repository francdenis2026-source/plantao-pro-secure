import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Building2, Pencil, Loader2, User, Shield, MapPin, Phone, Mail, RefreshCw, Users } from 'lucide-react';
import { Icon3DAction } from '@/components/ui/Icon3D';
import icon3dTypography from '@/assets/icon-3d-typography.png';

interface Unit {
  id: string;
  name: string;
  municipality: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  director_name: string | null;
  coordinator_name: string | null;
  president_name: string | null;
  security_coordinator_name: string | null;
  bh_hourly_rate_default: number | null;
  bh_limit_1st_default: number | null;
  bh_limit_2nd_default: number | null;
}

export function UnitsManagementCard() {
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Unit>>({});

  const fetchUnits = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('units')
        .select('*')
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

  const handleEdit = (unit: Unit) => {
    setSelectedUnit(unit);
    setEditForm({
      name: unit.name,
      municipality: unit.municipality,
      address: unit.address,
      phone: unit.phone,
      email: unit.email,
      director_name: unit.director_name,
      coordinator_name: unit.coordinator_name,
      president_name: unit.president_name,
      security_coordinator_name: unit.security_coordinator_name,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedUnit) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('units')
        .update(editForm)
        .eq('id', selectedUnit.id);

      if (error) throw error;

      // Log activity
      await logActivity({
        action: 'update',
        resourceType: 'unit',
        resourceId: selectedUnit.id,
        details: { unitName: editForm.name }
      });

      toast({
        title: 'Unidade atualizada',
        description: 'As informações foram salvas com sucesso.',
      });

      setIsEditing(false);
      setSelectedUnit(null);
      fetchUnits();
    } catch (err) {
      console.error('Error updating unit:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a unidade.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="glass glass-border shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5 text-primary" />
                Gestão de Unidades
              </CardTitle>
              <CardDescription className="text-xs">
                Editar nomes, coordenadores e informações
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchUnits} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-3">
                {units.map((unit) => (
                  <div
                    key={unit.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{unit.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {unit.municipality}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(unit)}
                      className="shrink-0"
                    >
                      <Icon3DAction name="edit" alt="Editar unidade" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Editar Unidade
            </DialogTitle>
            <DialogDescription>
              Atualize as informações da unidade
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Unidade</Label>
                <Input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da unidade"
                />
              </div>
              <div className="space-y-2">
                <Label>Município</Label>
                <Input
                  value={editForm.municipality || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, municipality: e.target.value }))}
                  placeholder="Município"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço
              </Label>
              <Input
                value={editForm.address || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Endereço completo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone
                </Label>
                <Input
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-mail
                </Label>
                <Input
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@unidade.gov.br"
                />
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 mt-4">
              <p className="text-sm font-medium mb-3">Responsáveis</p>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-amber-400">
                    <User className="h-4 w-4" />
                    Presidente
                  </Label>
                  <Input
                    value={editForm.president_name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, president_name: e.target.value }))}
                    placeholder="Nome do presidente"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-blue-400">
                    <User className="h-4 w-4" />
                    Diretor
                  </Label>
                  <Input
                    value={editForm.director_name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, director_name: e.target.value }))}
                    placeholder="Nome do diretor"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-green-400">
                    <Users className="h-4 w-4" />
                    Coordenador Geral
                  </Label>
                  <Input
                    value={editForm.coordinator_name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, coordinator_name: e.target.value }))}
                    placeholder="Nome do coordenador"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-red-400">
                    <Shield className="h-4 w-4" />
                    Coordenador de Segurança
                  </Label>
                  <Input
                    value={editForm.security_coordinator_name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, security_coordinator_name: e.target.value }))}
                    placeholder="Nome do coordenador de segurança"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
