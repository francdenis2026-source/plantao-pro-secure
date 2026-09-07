import { useState, useEffect } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock,
  DollarSign,
  Edit3,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  Wallet,
  History,
  Filter,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Agent {
  id: string;
  name: string;
  matricula: string | null;
  team: string | null;
  unit_id: string | null;
  unit_name: string | null;
  bh_hourly_rate: number | null;
  bh_limit: number | null;
  bh_limit_1st: number | null;
  bh_limit_2nd: number | null;
  bh_future_months_allowed: number | null;
}

interface BHEntry {
  id: string;
  agent_id: string;
  agent_name: string;
  hours: number;
  operation_type: string;
  description: string | null;
  created_at: string;
}

interface AgentBHSummary {
  agent: Agent;
  balance: number;
  totalCredits: number;
  totalDebits: number;
  lastEntry: string | null;
  estimatedValue: number;
  daysWithBH: number[];
}

interface Props {
  onDataChange?: () => void;
}

export function AgentBHManagement({ onDataChange }: Props) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [bhEntries, setBhEntries] = useState<BHEntry[]>([]);
  const [summaries, setSummaries] = useState<AgentBHSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  
  // Dialog states
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form states
  const [newBalance, setNewBalance] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Agent config states
  const [editHourlyRate, setEditHourlyRate] = useState('');
  const [editBhLimit, setEditBhLimit] = useState('');
  const [editBhLimit1st, setEditBhLimit1st] = useState('');
  const [editBhLimit2nd, setEditBhLimit2nd] = useState('');
  const [editFutureMonths, setEditFutureMonths] = useState('0');

  // Bulk update states
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkTeam, setBulkTeam] = useState('');
  const [bulkLimit1st, setBulkLimit1st] = useState('');
  const [bulkLimit2nd, setBulkLimit2nd] = useState('');
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [agentsRes, unitsRes, bhRes] = await Promise.all([
        (supabase as any).from('agents').select('id, name, matricula, team, unit_id, bh_hourly_rate, bh_limit, bh_limit_1st, bh_limit_2nd, bh_future_months_allowed').eq('is_active', true),
        supabase.from('units').select('id, name'),
        supabase.from('overtime_bank').select('*').order('created_at', { ascending: false }),
      ]);

      const agentsWithUnits: Agent[] = (agentsRes.data || []).map(agent => ({
        ...agent,
        unit_name: unitsRes.data?.find(u => u.id === agent.unit_id)?.name || null,
      }));
      setAgents(agentsWithUnits);

      const entriesWithNames: BHEntry[] = (bhRes.data || []).map(entry => ({
        ...entry,
        agent_name: agentsRes.data?.find(a => a.id === entry.agent_id)?.name || 'Desconhecido',
      }));
      setBhEntries(entriesWithNames);

      // Calculate summaries
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      const agentSummaries: AgentBHSummary[] = agentsWithUnits.map(agent => {
        const agentEntries = entriesWithNames.filter(e => e.agent_id === agent.id);
        const credits = agentEntries.filter(e => e.operation_type === 'credit').reduce((sum, e) => sum + Number(e.hours), 0);
        const debits = agentEntries.filter(e => e.operation_type === 'debit').reduce((sum, e) => sum + Math.abs(Number(e.hours)), 0);
        const balance = credits - debits;
        const lastEntry = agentEntries[0]?.created_at || null;
        const rate = agent.bh_hourly_rate || 15;
        
        // Extract days with BH in current month
        const daysWithBH: number[] = [];
        agentEntries.forEach(entry => {
          if (entry.description) {
            const match = entry.description.match(/BH - (\d{2})\/(\d{2})\/(\d{4})/);
            if (match) {
              const [, day, month, year] = match;
              if (parseInt(month) - 1 === currentMonth && parseInt(year) === currentYear) {
                const dayNum = parseInt(day);
                if (!daysWithBH.includes(dayNum)) {
                  daysWithBH.push(dayNum);
                }
              }
            }
          }
        });
        
        return {
          agent,
          balance,
          totalCredits: credits,
          totalDebits: debits,
          lastEntry,
          estimatedValue: balance * rate,
          daysWithBH: daysWithBH.sort((a, b) => a - b),
        };
      });
      
      setSummaries(agentSummaries);
    } catch (error) {
      console.error('Error fetching BH data:', error);
      toast.error('Erro ao carregar dados de BH');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (agent: Agent, currentBalance: number) => {
    setSelectedAgent(agent);
    setNewBalance(currentBalance.toFixed(1));
    setAdjustmentReason('');
    setEditHourlyRate((agent.bh_hourly_rate || 15).toString());
    setEditBhLimit((agent.bh_limit || 70).toString());
    const legacyLimit = agent.bh_limit || 70;
    setEditBhLimit1st((agent.bh_limit_1st !== null && agent.bh_limit_1st !== undefined ? agent.bh_limit_1st : legacyLimit).toString());
    setEditBhLimit2nd((agent.bh_limit_2nd !== null && agent.bh_limit_2nd !== undefined ? agent.bh_limit_2nd : legacyLimit).toString());
    setEditFutureMonths((agent.bh_future_months_allowed || 0).toString());
    setDialogOpen(true);
  };

  const handleSaveBalance = async () => {
    if (!selectedAgent) return;
    
    try {
      setIsSaving(true);
      
      const newBalanceValue = parseFloat(newBalance);
      if (isNaN(newBalanceValue)) {
        toast.error('Informe um valor válido');
        return;
      }
      
      const hourlyRateValue = parseFloat(editHourlyRate);
      const bhLimitValue = parseFloat(editBhLimit);
      const futureMonthsValue = parseInt(editFutureMonths) || 0;
      
      if (isNaN(hourlyRateValue) || hourlyRateValue <= 0) {
        toast.error('Valor por hora inválido');
        return;
      }
      
      if (isNaN(bhLimitValue) || bhLimitValue <= 0) {
        toast.error('Limite de horas inválido');
        return;
      }
      
      const limit1stValue = parseFloat(editBhLimit1st);
      const limit2ndValue = parseFloat(editBhLimit2nd);

      if (isNaN(limit1stValue) || limit1stValue < 0) {
        toast.error('Limite 1ª Quinzena inválido');
        return;
      }
      if (isNaN(limit2ndValue) || limit2ndValue < 0) {
        toast.error('Limite 2ª Quinzena inválido');
        return;
      }
      
      // Update agent's config including per-fortnight limits
      const { error: updateError } = await (supabase as any)
        .from('agents')
        .update({
          bh_hourly_rate: hourlyRateValue,
          bh_limit: bhLimitValue, // legacy fallback
          bh_limit_1st: limit1stValue,
          bh_limit_2nd: limit2ndValue,
          bh_future_months_allowed: futureMonthsValue
        })
        .eq('id', selectedAgent.id);
        
      if (updateError) throw updateError;
      
      // Get current balance
      const currentSummary = summaries.find(s => s.agent.id === selectedAgent.id);
      const currentBalance = currentSummary?.balance || 0;
      const difference = newBalanceValue - currentBalance;
      
      if (difference !== 0) {
        // Create adjustment entry
        const { error } = await supabase
          .from('overtime_bank')
          .insert({
            agent_id: selectedAgent.id,
            hours: Math.abs(difference),
            operation_type: difference > 0 ? 'credit' : 'debit',
            description: `Ajuste Admin: ${adjustmentReason || 'Correção de saldo'}`,
          });
          
        if (error) throw error;
      }
      
      toast.success(`Configurações de ${selectedAgent.name} atualizadas!`);
      setDialogOpen(false);
      fetchData();
      onDataChange?.();
    } catch (error) {
      console.error('Error saving balance:', error);
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter summaries
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 200);
  const filteredSummaries = summaries.filter(s => {
    const term = debouncedSearchTerm.toLowerCase();
    const matchesSearch = !term ||
      s.agent.name.toLowerCase().includes(term) ||
      s.agent.matricula?.toLowerCase().includes(term);
    const matchesTeam = filterTeam === 'all' || s.agent.team === filterTeam;
    return matchesSearch && matchesTeam;
  });


  // Stats
  const totalBalance = summaries.reduce((sum, s) => sum + s.balance, 0);
  const totalValue = summaries.reduce((sum, s) => sum + s.estimatedValue, 0);
  const agentsWithBH = summaries.filter(s => s.balance > 0).length;

  const teams = [...new Set(agents.map(a => a.team).filter(Boolean))];

  const handleBulkUpdate = async () => {
    if (!bulkTeam || (!bulkLimit1st && !bulkLimit2nd)) {
      toast.error('Selecione uma equipe e informe pelo menos um limite');
      return;
    }
    try {
      setIsBulkSaving(true);
      const updates: Record<string, number> = {};
      if (bulkLimit1st) {
        const val = parseFloat(bulkLimit1st);
        if (isNaN(val) || val < 0) {
          toast.error('Limite 1ª Quinzena inválido');
          return;
        }
        updates.bh_limit_1st = val;
      }
      if (bulkLimit2nd) {
        const val = parseFloat(bulkLimit2nd);
        if (isNaN(val) || val < 0) {
          toast.error('Limite 2ª Quinzena inválido');
          return;
        }
        updates.bh_limit_2nd = val;
      }
      const { error } = await (supabase as any)
        .from('agents')
        .update(updates)
        .eq('team', bulkTeam);
      if (error) throw error;

      const affectedCount = agents.filter(a => a.team === bulkTeam).length;
      toast.success(`Limites atualizados para ${affectedCount} agentes da equipe ${bulkTeam}`);
      setBulkDialogOpen(false);
      setBulkTeam('');
      setBulkLimit1st('');
      setBulkLimit2nd('');
      fetchData();
      onDataChange?.();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar em lote');
    } finally {
      setIsBulkSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-slate-800/60 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Clock className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Saldo Total</p>
                <p className="text-xl font-bold text-emerald-400">{totalBalance.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-cyan-500/10 to-slate-800/60 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <DollarSign className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Valor Total</p>
                <p className="text-xl font-bold text-cyan-400">R$ {totalValue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-slate-800/60 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Com Saldo</p>
                <p className="text-xl font-bold text-blue-400">{agentsWithBH}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar agente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-700/50 border-slate-600"
              />
            </div>
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="w-full md:w-40 bg-slate-700/50 border-slate-600">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Equipes</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team} value={team!}>{team}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData} className="border-slate-600">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(true)}
              className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
            >
              <Users className="h-4 w-4 mr-1" />
              Alterar Lote
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agents Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Banco de Horas - Todos os Agentes
          </CardTitle>
          <CardDescription>
            Visualize e ajuste o saldo de BH de cada agente
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[450px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400">Agente</TableHead>
                  <TableHead className="text-slate-400">Equipe</TableHead>
                  <TableHead className="text-slate-400 text-center">Saldo Atual</TableHead>
                  <TableHead className="text-slate-400 text-center">Valor Est.</TableHead>
                  <TableHead className="text-slate-400 text-center">Dias c/ BH (Mês)</TableHead>
                  <TableHead className="text-slate-400 text-right">Editar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummaries.map((summary) => (
                  <TableRow key={summary.agent.id} className="border-slate-700/50 hover:bg-slate-800/30">
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{summary.agent.name}</p>
                        {summary.agent.matricula && (
                          <p className="text-xs text-slate-500">{summary.agent.matricula}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {summary.agent.team ? (
                        <Badge variant="outline" className={`text-xs ${
                          summary.agent.team === 'ALFA' ? 'text-red-400 border-red-500/30' :
                          summary.agent.team === 'BRAVO' ? 'text-blue-400 border-blue-500/30' :
                          summary.agent.team === 'CHARLIE' ? 'text-green-400 border-green-500/30' :
                          'text-amber-400 border-amber-500/30'
                        }`}>
                          {summary.agent.team}
                        </Badge>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`font-mono ${
                        summary.balance > 0 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : summary.balance < 0 
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                      }`}>
                        {summary.balance > 0 ? '+' : ''}{summary.balance.toFixed(1)}h
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-medium ${
                        summary.estimatedValue > 0 ? 'text-cyan-400' : 
                        summary.estimatedValue < 0 ? 'text-red-400' : 'text-slate-400'
                      }`}>
                        R$ {summary.estimatedValue.toFixed(0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {summary.daysWithBH.length > 0 ? (
                        <div className="flex flex-wrap gap-0.5 justify-center max-w-[120px] mx-auto">
                          {summary.daysWithBH.slice(0, 8).map(day => (
                            <span 
                              key={day} 
                              className="px-1 py-0.5 text-[9px] font-bold bg-green-500/30 text-green-300 rounded"
                            >
                              {day}
                            </span>
                          ))}
                          {summary.daysWithBH.length > 8 && (
                            <span className="text-[9px] text-slate-400">+{summary.daysWithBH.length - 8}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(summary.agent, summary.balance)}
                        className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                        title="Editar Saldo"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <History className="h-5 w-5 text-purple-500" />
            Registros Recentes de BH
          </CardTitle>
          <CardDescription>
            Últimos 30 registros de banco de horas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[250px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700/50 hover:bg-transparent">
                  <TableHead className="text-slate-400">Data/Hora</TableHead>
                  <TableHead className="text-slate-400">Agente</TableHead>
                  <TableHead className="text-slate-400">Tipo</TableHead>
                  <TableHead className="text-slate-400">Horas</TableHead>
                  <TableHead className="text-slate-400">Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bhEntries.slice(0, 30).map((entry) => (
                  <TableRow key={entry.id} className="border-slate-700/50 hover:bg-slate-800/30">
                    <TableCell className="text-slate-400 text-sm">
                      {format(new Date(entry.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium text-white text-sm">{entry.agent_name}</TableCell>
                    <TableCell>
                      {entry.operation_type === 'credit' ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          -
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={`font-mono font-medium text-sm ${
                      entry.operation_type === 'credit' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {Math.abs(Number(entry.hours)).toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs max-w-[200px] truncate">
                      {entry.description || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-amber-400" />
              Ajustar Saldo de BH
            </DialogTitle>
            <DialogDescription>
              Agente: <span className="text-white font-medium">{selectedAgent?.name}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Novo Saldo (horas)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 24.5"
                value={newBalance}
                onChange={(e) => {
                  // Allow only valid decimal input
                  const value = e.target.value.replace(/[^0-9.,\-]/g, '').replace(',', '.');
                  setNewBalance(value);
                }}
                className="bg-slate-700/50 border-slate-600 text-lg font-mono"
              />
              <p className="text-xs text-slate-500">
                O sistema calculará automaticamente a diferença e criará o registro de ajuste.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <DollarSign className="h-3 w-3 text-amber-400" />
                  Valor por Hora (R$)
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 15.75"
                  value={editHourlyRate}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                    setEditHourlyRate(value);
                  }}
                  className="bg-slate-700/50 border-slate-600 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Clock className="h-3 w-3 text-cyan-400" />
                  Limite Legado (fallback)
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 70"
                  value={editBhLimit}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setEditBhLimit(value);
                  }}
                  className="bg-slate-700/50 border-slate-600 font-mono"
                />
              </div>
            </div>

            {/* Per-Fortnight Limits */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-3">
              <p className="text-sm font-medium text-blue-300">Limites por Quinzena</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3 text-blue-400" />
                    1ª Quinzena (1-15)
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 70"
                    value={editBhLimit1st}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setEditBhLimit1st(value);
                    }}
                    className="bg-slate-700/50 border-slate-600 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3 text-purple-400" />
                    2ª Quinzena (16+)
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 70"
                    value={editBhLimit2nd}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setEditBhLimit2nd(value);
                    }}
                    className="bg-slate-700/50 border-slate-600 font-mono"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Calendar className="h-3 w-3 text-purple-400" />
                Meses Futuros Permitidos
              </Label>
              <Select value={editFutureMonths} onValueChange={setEditFutureMonths}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="0">Apenas mês atual</SelectItem>
                  <SelectItem value="1">+1 mês futuro</SelectItem>
                  <SelectItem value="2">+2 meses futuros</SelectItem>
                  <SelectItem value="3">+3 meses futuros</SelectItem>
                  <SelectItem value="6">+6 meses futuros</SelectItem>
                  <SelectItem value="12">+12 meses futuros</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Define até quando o agente pode registrar BH antecipadamente.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Motivo do Ajuste (saldo)</Label>
              <Textarea
                placeholder="Ex: Correção de cálculo, compensação..."
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="bg-slate-700/50 border-slate-600 resize-none"
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-600">
              Cancelar
            </Button>
            <Button
              onClick={handleSaveBalance}
              disabled={isSaving}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {isSaving ? 'Salvando...' : 'Salvar Ajuste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-400" />
              Alterar Limites em Lote
            </DialogTitle>
            <DialogDescription>
              Defina os limites de BH por quinzena para toda uma equipe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Equipe</Label>
              <Select value={bulkTeam} onValueChange={setBulkTeam}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600">
                  <SelectValue placeholder="Selecione a equipe" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {teams.map((t) => (
                    <SelectItem key={t} value={t!}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3 text-blue-400" />
                  Limite 1ª Quinzena
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 70"
                  value={bulkLimit1st}
                  onChange={(e) => setBulkLimit1st(e.target.value.replace(/[^0-9]/g, ''))}
                  className="bg-slate-700/50 border-slate-600 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3 text-purple-400" />
                  Limite 2ª Quinzena
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 70"
                  value={bulkLimit2nd}
                  onChange={(e) => setBulkLimit2nd(e.target.value.replace(/[^0-9]/g, ''))}
                  className="bg-slate-700/50 border-slate-600 font-mono"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Deixe em branco para manter o valor atual. Serão alterados {agents.filter(a => a.team === bulkTeam).length} agente(s).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)} className="border-slate-600">
              Cancelar
            </Button>
            <Button
              onClick={handleBulkUpdate}
              disabled={isBulkSaving || !bulkTeam}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isBulkSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
              {isBulkSaving ? 'Salvando...' : 'Aplicar em Lote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
