import { useEffect, useState } from 'react';
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
import { NumberStepper } from '@/components/ui/number-stepper';
import { useToast } from '@/hooks/use-toast';
import { Clock, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BackButton } from '@/components/BackButton';
import { useBackNavigation } from '@/hooks/useBackNavigation';

interface Agent {
  id: string;
  name: string;
}

interface OvertimeEntry {
  id: string;
  agent_id: string;
  hours: number;
  description: string | null;
  operation_type: string;
  created_at: string;
  agent: Agent | null;
}

export default function Overtime() {
  const { user, isLoading, isAdmin, masterSession } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Enable ESC key navigation
  useBackNavigation();

  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    agent_id: '',
    hours: '',
    operation_type: 'credit',
    description: '',
  });

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
      fetchEntries();
      fetchAgents();
    }
  }, [user, masterSession]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('overtime_bank')
        .select(`
          *,
          agent:agents(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data as unknown as OvertimeEntry[]);
    } catch (error) {
      console.error('Error fetching overtime:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o banco de horas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    const { data } = await supabase
      .from('agents')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (data) setAgents(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agent_id || !formData.hours) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('overtime_bank').insert({
        agent_id: formData.agent_id,
        hours: parseFloat(formData.hours),
        operation_type: formData.operation_type,
        description: formData.description || null,
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Registro de horas adicionado com sucesso.',
      });

      setIsDialogOpen(false);
      setFormData({
        agent_id: '',
        hours: '',
        operation_type: 'credit',
        description: '',
      });
      fetchEntries();
    } catch (error) {
      console.error('Error saving overtime:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o registro.',
        variant: 'destructive',
      });
    }
  };

  // Calculate balance per agent
  const calculateBalance = (agentId: string) => {
    return entries
      .filter((e) => e.agent_id === agentId)
      .reduce((acc, item) => {
        return item.operation_type === 'credit'
          ? acc + Number(item.hours)
          : acc - Number(item.hours);
      }, 0);
  };

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
            {/* Back Button */}
            <BackButton />

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="font-tactical text-xl font-bold tracking-[0.14em] flex items-center gap-2">
                  <Clock className="h-6 w-6 text-primary" />
                  Banco de Horas
                </h1>
                <p className="text-muted-foreground">
                  Gerencie o banco de horas dos agentes
                </p>
              </div>

              {isAdmin && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-primary hover:opacity-90">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Registro
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle>Novo Registro de Horas</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Agente *</Label>
                        <Select
                          value={formData.agent_id}
                          onValueChange={(value) => setFormData({ ...formData, agent_id: value })}
                        >
                          <SelectTrigger className="bg-input">
                            <SelectValue placeholder="Selecione um agente" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            {agents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="hours">Horas *</Label>
                          <div className="pt-1">
                            <NumberStepper
                              value={parseFloat(formData.hours) || 0.5}
                              onChange={(val) => setFormData({ ...formData, hours: val.toString() })}
                              min={0.5}
                              max={24}
                              step={0.5}
                              suffix="h"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo *</Label>
                          <Select
                            value={formData.operation_type}
                            onValueChange={(value) => setFormData({ ...formData, operation_type: value })}
                          >
                            <SelectTrigger className="bg-input">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                              <SelectItem value="credit">Crédito (+)</SelectItem>
                              <SelectItem value="debit">Débito (-)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Motivo do registro"
                          className="bg-input"
                        />
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90">
                          Registrar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Table */}
            <Card className="glass glass-border shadow-card">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum registro de horas encontrado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Agente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Saldo Atual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id} className="border-border">
                          <TableCell className="font-medium">
                            {entry.agent?.name || 'Agente não encontrado'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className={entry.operation_type === 'credit' ? 'text-success' : 'text-destructive'}>
                            {entry.operation_type === 'credit' ? '+' : '-'}{entry.hours}h
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.operation_type === 'credit' ? 'default' : 'destructive'}>
                              {entry.operation_type === 'credit' ? 'Crédito' : 'Débito'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {entry.description || '-'}
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {calculateBalance(entry.agent_id).toFixed(1)}h
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
