import { useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { adminClient } from '@/lib/adminClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Building2, 
  MapPin, 
  Users, 
  User2, 
  Shield, 
  Phone, 
  Mail, 
  Pencil, 
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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

interface Agent {
  id: string;
  name: string;
  team: string | null;
  is_active: boolean;
}

interface UnitsManagementCardProps {
  units: Unit[];
  agents: { id: string; name: string; team: string | null; unit_id: string | null; is_active: boolean }[];
  onEditUnit: (unit: Unit) => void;
  onRefresh: () => void;
}

export function UnitsManagementCard({ units, agents, onEditUnit, onRefresh }: UnitsManagementCardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [newUnitOpen, setNewUnitOpen] = useState(false);
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [newUnitData, setNewUnitData] = useState({
    name: '',
    municipality: '',
    director_name: '',
    coordinator_name: '',
    phone: '',
    email: '',
  });
  const { toast } = useToast();

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 200);
  const filteredUnits = useMemo(() => units.filter(unit => {
    if (!debouncedSearchTerm) return true;
    const term = debouncedSearchTerm.toLowerCase();
    return (
      unit.name.toLowerCase().includes(term) ||
      unit.municipality.toLowerCase().includes(term) ||
      unit.director_name?.toLowerCase().includes(term) ||
      unit.coordinator_name?.toLowerCase().includes(term)
    );
  }), [units, debouncedSearchTerm]);



  const getAgentsForUnit = (unitId: string) => {
    return agents.filter(a => a.unit_id === unitId);
  };

  const getAgentCountByTeam = (unitId: string) => {
    const unitAgents = getAgentsForUnit(unitId);
    const counts: Record<string, { total: number; active: number }> = {};
    
    ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'].forEach(team => {
      const teamAgents = unitAgents.filter(a => a.team === team);
      counts[team] = {
        total: teamAgents.length,
        active: teamAgents.filter(a => a.is_active).length
      };
    });
    
    return counts;
  };

  const handleCreateUnit = async () => {
    if (!newUnitData.name || !newUnitData.municipality) {
      toast({ title: 'Erro', description: 'Nome e município são obrigatórios.', variant: 'destructive' });
      return;
    }

    setCreatingUnit(true);
    try {
      await adminClient.createUnit({
        data: {
          name: newUnitData.name.toUpperCase().trim(),
          municipality: newUnitData.municipality.toUpperCase().trim(),
          director_name: newUnitData.director_name.toUpperCase().trim() || null,
          coordinator_name: newUnitData.coordinator_name.toUpperCase().trim() || null,
          phone: newUnitData.phone.trim() || null,
          email: newUnitData.email.trim() || null,
        },
      });

      toast({ title: 'Sucesso', description: 'Unidade criada com sucesso!' });
      setNewUnitOpen(false);
      setNewUnitData({ name: '', municipality: '', director_name: '', coordinator_name: '', phone: '', email: '' });
      onRefresh();
    } catch (error: any) {
      console.error('Error creating unit:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível criar a unidade.', variant: 'destructive' });
    } finally {
      setCreatingUnit(false);
    }
  };

  return (
    <Card className="glass glass-border shadow-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Gestão de Unidades ({units.length})
            </CardTitle>
            <CardDescription>
              Unidades, diretores e coordenadores de segurança
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar unidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-48 bg-input"
              />
            </div>
            
            <Dialog open={newUnitOpen} onOpenChange={setNewUnitOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500">
                  <Plus className="h-4 w-4 mr-1" />
                  Nova
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Nova Unidade
                  </DialogTitle>
                  <DialogDescription>
                    Cadastre uma nova unidade de segurança
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome da Unidade *</Label>
                      <Input
                        placeholder="Ex: CS Feijó"
                        value={newUnitData.name}
                        onChange={(e) => setNewUnitData({ ...newUnitData, name: e.target.value })}
                        className="bg-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Município *</Label>
                      <Input
                        placeholder="Ex: Feijó"
                        value={newUnitData.municipality}
                        onChange={(e) => setNewUnitData({ ...newUnitData, municipality: e.target.value })}
                        className="bg-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Diretor</Label>
                      <Input
                        placeholder="Nome do diretor"
                        value={newUnitData.director_name}
                        onChange={(e) => setNewUnitData({ ...newUnitData, director_name: e.target.value })}
                        className="bg-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Coordenador</Label>
                      <Input
                        placeholder="Nome do coordenador"
                        value={newUnitData.coordinator_name}
                        onChange={(e) => setNewUnitData({ ...newUnitData, coordinator_name: e.target.value })}
                        className="bg-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        placeholder="(00) 0000-0000"
                        value={newUnitData.phone}
                        onChange={(e) => setNewUnitData({ ...newUnitData, phone: e.target.value })}
                        className="bg-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        placeholder="email@unidade.gov.br"
                        value={newUnitData.email}
                        onChange={(e) => setNewUnitData({ ...newUnitData, email: e.target.value })}
                        className="bg-input"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewUnitOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateUnit} disabled={creatingUnit}>
                    {creatingUnit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Criar Unidade
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {filteredUnits.map((unit) => {
            const isExpanded = expandedUnit === unit.id;
            const unitAgents = getAgentsForUnit(unit.id);
            const teamCounts = getAgentCountByTeam(unit.id);
            const activeCount = unitAgents.filter(a => a.is_active).length;
            
            return (
              <div key={unit.id} className="group">
                {/* Unit Row */}
                <div 
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 cursor-pointer hover:bg-muted/30 transition-colors",
                    isExpanded && "bg-muted/20"
                  )}
                  onClick={() => setExpandedUnit(isExpanded ? null : unit.id)}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{unit.name}</span>
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {unit.municipality}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Team badges */}
                    <div className="flex gap-1">
                      {['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'].map(team => {
                        const count = teamCounts[team];
                        if (count.total === 0) return null;
                        return (
                          <Badge 
                            key={team} 
                            variant="outline" 
                            className={cn(
                              "text-[10px] px-1.5",
                              count.active === count.total ? "border-green-500/50 text-green-500" : "border-amber-500/50 text-amber-500"
                            )}
                          >
                            {team.charAt(0)}: {count.active}/{count.total}
                          </Badge>
                        );
                      })}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/20 text-primary border-0">
                        <Users className="h-3 w-3 mr-1" />
                        {activeCount}/{unitAgents.length}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditUnit(unit);
                        }}
                        className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 bg-muted/10 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      {/* Contact Info */}
                      <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">CONTATO</h4>
                        <div className="space-y-1 text-sm">
                          {unit.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-green-500" />
                              <span>{unit.phone}</span>
                            </div>
                          )}
                          {unit.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-blue-500" />
                              <span className="truncate">{unit.email}</span>
                            </div>
                          )}
                          {!unit.phone && !unit.email && (
                            <span className="text-muted-foreground text-xs">Sem contato cadastrado</span>
                          )}
                        </div>
                      </div>
                      
                      
                      {/* Stats */}
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <h4 className="text-xs font-semibold text-primary mb-2">ESTATÍSTICAS</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <span className="ml-1 font-bold">{unitAgents.length}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ativos:</span>
                            <span className="ml-1 font-bold text-green-500">{activeCount}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Inativos:</span>
                            <span className="ml-1 font-bold text-red-500">{unitAgents.length - activeCount}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Equipes:</span>
                            <span className="ml-1 font-bold">4</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Agents by Team */}
                    {unitAgents.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'].map(team => {
                          const teamAgents = unitAgents.filter(a => a.team === team);
                          if (teamAgents.length === 0) return (
                            <div key={team} className="p-2 rounded-lg bg-muted/30 border border-border/30">
                              <Badge variant="outline" className="text-xs mb-2">{team}</Badge>
                              <p className="text-xs text-muted-foreground">Sem agentes</p>
                            </div>
                          );
                          
                          return (
                            <div key={team} className="p-2 rounded-lg bg-muted/30 border border-border/30">
                              <Badge variant="outline" className="text-xs mb-2">{team}</Badge>
                              <div className="space-y-0.5 max-h-24 overflow-y-auto">
                                {teamAgents.map(agent => (
                                  <div 
                                    key={agent.id}
                                    className={cn(
                                      "text-xs truncate",
                                      !agent.is_active && "text-muted-foreground line-through"
                                    )}
                                  >
                                    {agent.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredUnits.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? 'Nenhuma unidade encontrada' : 'Nenhuma unidade cadastrada'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
