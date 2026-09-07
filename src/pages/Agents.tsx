import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Search, Loader2, Pencil, Trash2, ArrowRightLeft, Eye } from 'lucide-react';
import { AgentDetailsDialog } from '@/components/agents/AgentDetailsDialog';

import { TransferRequestDialog } from '@/components/agents/TransferRequestDialog';
import { formatCPF, formatMatricula, formatPhone, formatBirthDate, validateCPF, parseBirthDate, calculateAge } from '@/lib/validators';
import { fetchUnits as fetchUnitsShared } from '@/lib/units';

interface Unit {
  id: string;
  name: string;
  municipality: string;
}

interface Agent {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  department: string | null;
  is_active: boolean;
  unit_id: string | null;
  team: string | null;
  cpf: string | null;
  matricula: string | null;
  birth_date: string | null;
  age: number | null;
  address: string | null;
  unit: Unit | null;
}

const teams = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'];

export default function Agents() {
  const { user, isLoading, isAdmin, isMaster, masterSession } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedAgentForTransfer, setSelectedAgentForTransfer] = useState<Agent | null>(null);
  const [detailsAgentId, setDetailsAgentId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    matricula: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    unit_id: '',
    team: '',
    birth_date: '',
    address: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);

  // Redirect only after loading is complete
  useEffect(() => {
    if (isLoading) return;
    
    // Don't redirect if we have any valid session
    if (user || masterSession) return;
    
    // Small delay to ensure state is settled
    const timer = setTimeout(() => {
      navigate('/auth', { replace: true });
    }, 200);
    
    return () => clearTimeout(timer);
  }, [user, isLoading, masterSession, navigate]);

  useEffect(() => {
    if (user || masterSession) {
      fetchAgents();
      fetchUnits();
    }
  }, [user, masterSession]);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          unit:units(id, name, municipality)
        `)
        .order('name');

      if (error) throw error;
      setAgents((data as unknown as Agent[]) || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os agentes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    const rows = await fetchUnitsShared({ scope: 'Agents' });
    setUnits(rows as any);
  };


  const resetForm = () => {
    setFormData({
      name: '',
      cpf: '',
      matricula: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      unit_id: '',
      team: '',
      birth_date: '',
      address: '',
    });
    setFormErrors({});
    setCalculatedAge(null);
  };

  // Calculate age when birth date changes
  useEffect(() => {
    if (formData.birth_date.length === 10) {
      const date = parseBirthDate(formData.birth_date);
      if (date) {
        setCalculatedAge(calculateAge(date));
      } else {
        setCalculatedAge(null);
      }
    } else {
      setCalculatedAge(null);
    }
  }, [formData.birth_date]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    } else if (/\d/.test(formData.name)) {
      errors.name = 'Nome não pode conter números';
    }
    
    if (!formData.cpf) {
      errors.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(formData.cpf)) {
      errors.cpf = 'CPF inválido';
    }
    
    const matriculaNumbers = formData.matricula.replace(/\D/g, '');
    if (!matriculaNumbers) {
      errors.matricula = 'Matrícula é obrigatória';
    } else if (matriculaNumbers.length !== 9) {
      errors.matricula = 'Matrícula deve ter 9 dígitos';
    }
    
    if (!formData.unit_id) {
      errors.unit_id = 'Selecione uma unidade';
    }
    
    if (!formData.team) {
      errors.team = 'Selecione uma equipe';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Erro',
        description: 'Corrija os erros no formulário.',
        variant: 'destructive',
      });
      return;
    }

    // Parse birth date if provided
    let birthDate: string | null = null;
    let age: number | null = null;
    if (formData.birth_date.length === 10) {
      const date = parseBirthDate(formData.birth_date);
      if (date) {
        birthDate = date.toISOString().split('T')[0];
        age = calculateAge(date);
      }
    }

    try {
      if (editingAgent) {
        const { error } = await supabase
          .from('agents')
          .update({
            name: formData.name.toUpperCase().trim(),
            cpf: formData.cpf.replace(/\D/g, ''),
            matricula: formData.matricula,
            email: formData.email || null,
            phone: formData.phone || null,
            position: formData.position || null,
            department: formData.department || null,
            unit_id: formData.unit_id || null,
            team: formData.team || null,
            birth_date: birthDate,
            age: age,
            address: formData.address || null,
          })
          .eq('id', editingAgent.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Agente atualizado com sucesso.',
        });
      } else {
        const { error } = await supabase.from('agents').insert({
          name: formData.name.toUpperCase().trim(),
          cpf: formData.cpf.replace(/\D/g, ''),
          matricula: formData.matricula,
          email: formData.email || null,
          phone: formData.phone || null,
          position: formData.position || null,
          department: formData.department || null,
          unit_id: formData.unit_id || null,
          team: formData.team || null,
          birth_date: birthDate,
          age: age,
          address: formData.address || null,
        });

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Agente cadastrado com sucesso.',
        });
      }

      setIsDialogOpen(false);
      setEditingAgent(null);
      resetForm();
      fetchAgents();
    } catch (error: any) {
      console.error('Error saving agent:', error);
      let message = 'Não foi possível salvar o agente.';
      if (error.message?.includes('duplicate key')) {
        if (error.message.includes('cpf')) {
          message = 'CPF já cadastrado.';
        } else if (error.message.includes('matricula')) {
          message = 'Matrícula já cadastrada.';
        }
      }
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      cpf: agent.cpf ? formatCPF(agent.cpf) : '',
      matricula: agent.matricula || '',
      email: agent.email || '',
      phone: agent.phone ? formatPhone(agent.phone) : '',
      position: agent.position || '',
      department: agent.department || '',
      unit_id: agent.unit_id || '',
      team: agent.team || '',
      birth_date: agent.birth_date ? formatBirthDate(agent.birth_date.replace(/-/g, '')) : '',
      address: agent.address || '',
    });
    if (agent.age) {
      setCalculatedAge(agent.age);
    }
    setIsDialogOpen(true);
  };

  const handleTransferRequest = (agent: Agent) => {
    setSelectedAgentForTransfer(agent);
    setTransferDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agente?')) return;

    try {
      const { error } = await supabase.from('agents').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Agente excluído com sucesso.',
      });
      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o agente.',
        variant: 'destructive',
      });
    }
  };

  const debouncedSearch = useDebouncedValue(searchTerm, 200);
  const filteredAgents = useMemo(() => {
    const search = debouncedSearch.toLowerCase();
    const searchNumbers = debouncedSearch.replace(/\D/g, '');
    if (!search && !searchNumbers) return agents;
    return agents.filter((agent) =>
      agent.name.toLowerCase().includes(search) ||
      agent.email?.toLowerCase().includes(search) ||
      agent.unit?.name.toLowerCase().includes(search) ||
      agent.team?.toLowerCase().includes(search) ||
      (agent.cpf && agent.cpf.includes(searchNumbers)) ||
      (agent.matricula && agent.matricula.includes(searchNumbers))
    );
  }, [agents, debouncedSearch]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !masterSession) return null;

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-tactical text-xl font-bold tracking-[0.14em] flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  Agentes
                </h1>
                <p className="text-muted-foreground">
                  Gerencie os agentes do sistema
                </p>
              </div>

              {(isAdmin || isMaster) && (
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) {
                    setEditingAgent(null);
                    resetForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-primary hover:opacity-90">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Agente
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-lg">
                    <DialogHeader>
                      <DialogTitle>
                        {editingAgent ? 'Editar Agente' : 'Novo Agente'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                      {/* Nome */}
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/\d/g, '').toUpperCase() })}
                          placeholder="NOME COMPLETO"
                          className="bg-input uppercase"
                          required
                        />
                        {formErrors.name && <p className="text-sm text-destructive">{formErrors.name}</p>}
                      </div>
                      
                      {/* CPF e Matrícula */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cpf">CPF *</Label>
                          <Input
                            id="cpf"
                            value={formData.cpf}
                            onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                            placeholder="000.000.000-00"
                            className="bg-input"
                            maxLength={14}
                            required
                          />
                          {formErrors.cpf && <p className="text-sm text-destructive">{formErrors.cpf}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="matricula">Matrícula *</Label>
                          <Input
                            id="matricula"
                            value={formData.matricula}
                            onChange={(e) => setFormData({ ...formData, matricula: formatMatricula(e.target.value) })}
                            placeholder="000.000.000"
                            className="bg-input"
                            maxLength={11}
                            required
                          />
                          {formErrors.matricula && <p className="text-sm text-destructive">{formErrors.matricula}</p>}
                        </div>
                      </div>

                      {/* Unidade e Equipe */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Unidade *</Label>
                          <Select value={formData.unit_id} onValueChange={(value) => setFormData({ ...formData, unit_id: value })}>
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
                          {formErrors.unit_id && <p className="text-sm text-destructive">{formErrors.unit_id}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label>Equipe *</Label>
                          <Select value={formData.team} onValueChange={(value) => setFormData({ ...formData, team: value })}>
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
                          {formErrors.team && <p className="text-sm text-destructive">{formErrors.team}</p>}
                        </div>
                      </div>

                      {/* Data de Nascimento */}
                      <div className="space-y-2">
                        <Label htmlFor="birth_date">Data de Nascimento</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="birth_date"
                            value={formData.birth_date}
                            onChange={(e) => setFormData({ ...formData, birth_date: formatBirthDate(e.target.value) })}
                            placeholder="DD-MM-AAAA"
                            className="bg-input flex-1"
                            maxLength={10}
                          />
                          {calculatedAge !== null && (
                            <div className="px-3 py-2 bg-primary/10 rounded-lg text-sm font-medium text-primary whitespace-nowrap">
                              {calculatedAge} anos
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Email e Telefone */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="email@exemplo.com"
                            className="bg-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                            placeholder="(00) 00000-0000"
                            className="bg-input"
                            maxLength={15}
                          />
                        </div>
                      </div>

                      {/* Endereço */}
                      <div className="space-y-2">
                        <Label htmlFor="address">Endereço</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Endereço completo"
                          className="bg-input"
                          maxLength={255}
                        />
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90">
                          {editingAgent ? 'Salvar' : 'Cadastrar'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar agentes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input"
              />
            </div>

            {/* Table */}
            <Card className="glass glass-border shadow-card">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredAgents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchTerm ? 'Nenhum agente encontrado' : 'Nenhum agente cadastrado'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Nome</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Equipe</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Status</TableHead>
                        {(isAdmin || isMaster) && <TableHead className="w-24">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgents.map((agent) => (
                        <TableRow key={agent.id} className="border-border">
                          <TableCell className="font-medium">{agent.name}</TableCell>
                          <TableCell>
                            {agent.unit ? (
                              <div>
                                <div className="font-medium text-sm">{agent.unit.name}</div>
                                <div className="text-xs text-muted-foreground">{agent.unit.municipality}</div>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {agent.team ? (
                              <Badge variant="outline">{agent.team}</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{agent.phone || '-'}</TableCell>
                          <TableCell>{agent.position || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                              {agent.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          {(isAdmin || isMaster) && (
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setDetailsAgentId(agent.id)} title="Ver detalhes">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleTransferRequest(agent)} title="Solicitar Transferência">
                                  <ArrowRightLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(agent)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(agent.id)} className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            
            {/* Developer Credit */}
            <div className="text-center pt-4 border-t border-border/30">
              <p className="text-xs text-muted-foreground">
                Desenvolvido por <span className="text-primary font-semibold">CS FEIJÓ</span>
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Feijó, Acre • © {new Date().getFullYear()} PlantãoPro</p>
            </div>
          </div>
        </main>
      </div>

      <AgentDetailsDialog
        agentId={detailsAgentId}
        open={!!detailsAgentId}
        onClose={() => setDetailsAgentId(null)}
        canManage={isAdmin || isMaster}
        onTransferClick={(id) => {
          const a = agents.find((x) => x.id === id);
          if (a) {
            setDetailsAgentId(null);
            handleTransferRequest(a);
          }
        }}
      />

      {/* Transfer Request Dialog */}

      <TransferRequestDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        agent={selectedAgentForTransfer}
        onSuccess={fetchAgents}
      />
    </div>
  );
}
