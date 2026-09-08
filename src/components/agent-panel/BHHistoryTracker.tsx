import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  History,
  Calendar,
  TrendingUp,
  TrendingDown,
  Trash2,
  RefreshCw,
  Clock,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Archive,
  BarChart3,
} from 'lucide-react';

interface BHHistoryCycle {
  id: string;
  agent_id: string;
  year: number;
  month: number;
  total_hours: number;
  total_entries: number;
  credit_hours: number;
  debit_hours: number;
  fortnight_1_hours: number;
  fortnight_2_hours: number;
  hourly_rate: number | null;
  estimated_value: number | null;
  closed_at: string | null;
  created_at: string;
}

interface BHHistoryTrackerProps {
  agentId: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function BHHistoryTracker({ agentId }: BHHistoryTrackerProps) {
  const [cycles, setCycles] = useState<BHHistoryCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<'all' | 'year' | 'single' | null>(null);
  const [deleteCycleId, setDeleteCycleId] = useState<string | null>(null);

  // Generate available years (last 5 years)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const fetchCycles = useCallback(async () => {
    if (!agentId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bh_monthly_cycles')
        .select('*')
        .eq('agent_id', agentId)
        .eq('year', selectedYear)
        .order('month', { ascending: false });

      if (error) throw error;
      setCycles((data as BHHistoryCycle[]) || []);
    } catch (error) {
      console.error('Error fetching BH cycles:', error);
      toast.error('Erro ao carregar histórico de BH');
    } finally {
      setIsLoading(false);
    }
  }, [agentId, selectedYear]);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  // Sync current month's data
  const syncCurrentMonth = async () => {
    if (!agentId) return;

    setIsSyncing(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      // Call the database function to close/sync the month
      const { data, error } = await supabase.rpc('close_bh_month', {
        p_agent_id: agentId,
        p_year: year,
        p_month: month,
      });

      if (error) throw error;

      toast.success('Ciclo atualizado com sucesso!');
      fetchCycles();
    } catch (error) {
      console.error('Error syncing BH month:', error);
      toast.error('Erro ao sincronizar ciclo');
    } finally {
      setIsSyncing(false);
    }
  };

  // Generate cycles for all past months (batch sync)
  const syncAllPastMonths = async () => {
    if (!agentId) return;

    setIsSyncing(true);
    try {
      const now = new Date();
      const fiveYearsAgo = subYears(now, 5);
      let synced = 0;

      // Loop through each month from 5 years ago to current
      let currentDate = new Date(fiveYearsAgo.getFullYear(), fiveYearsAgo.getMonth(), 1);
      
      while (currentDate <= now) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        await supabase.rpc('close_bh_month', {
          p_agent_id: agentId,
          p_year: year,
          p_month: month,
        });

        synced++;
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      toast.success(`${synced} ciclos sincronizados!`);
      fetchCycles();
    } catch (error) {
      console.error('Error syncing all months:', error);
      toast.error('Erro ao sincronizar histórico');
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete history
  const handleDeleteHistory = async () => {
    if (!agentId) return;

    try {
      let query = supabase.from('bh_monthly_cycles').delete();

      if (deleteTarget === 'single' && deleteCycleId) {
        query = query.eq('id', deleteCycleId);
      } else if (deleteTarget === 'year') {
        query = query.eq('agent_id', agentId).eq('year', selectedYear);
      } else if (deleteTarget === 'all') {
        query = query.eq('agent_id', agentId);
      }

      const { error } = await query;

      if (error) throw error;

      const message = deleteTarget === 'all' 
        ? 'Todo o histórico foi apagado'
        : deleteTarget === 'year'
        ? `Histórico de ${selectedYear} apagado`
        : 'Ciclo apagado';

      toast.success(message);
      setDeleteTarget(null);
      setDeleteCycleId(null);
      fetchCycles();
    } catch (error) {
      console.error('Error deleting history:', error);
      toast.error('Erro ao apagar histórico');
    }
  };

  // Calculate year totals
  const yearTotals = cycles.reduce(
    (acc, cycle) => ({
      totalHours: acc.totalHours + (cycle.total_hours || 0),
      totalEntries: acc.totalEntries + (cycle.total_entries || 0),
      creditHours: acc.creditHours + (cycle.credit_hours || 0),
      debitHours: acc.debitHours + (cycle.debit_hours || 0),
      estimatedValue: acc.estimatedValue + (cycle.estimated_value || 0),
    }),
    { totalHours: 0, totalEntries: 0, creditHours: 0, debitHours: 0, estimatedValue: 0 }
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-medium text-slate-200 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10">
              <History className="h-4 w-4 text-purple-400" />
            </div>
            Histórico de BH
            <Badge variant="secondary" className="text-[10px] bg-slate-700/50">
              5 anos
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-[100px] h-8 text-xs bg-slate-800/50 border-slate-700/50">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={syncCurrentMonth}
              disabled={isSyncing}
              className="h-8 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Year Summary */}
        {!isLoading && cycles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <Clock className="h-3 w-3" />
                Total de Horas
              </div>
              <div className={`text-lg font-bold ${yearTotals.totalHours >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {yearTotals.totalHours >= 0 ? '+' : ''}{yearTotals.totalHours.toFixed(1)}h
              </div>
            </div>

            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <FileText className="h-3 w-3" />
                Registros
              </div>
              <div className="text-lg font-bold text-slate-200">
                {yearTotals.totalEntries}
              </div>
            </div>

            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                Créditos
              </div>
              <div className="text-lg font-bold text-emerald-400">
                +{yearTotals.creditHours.toFixed(1)}h
              </div>
            </div>

            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                <DollarSign className="h-3 w-3 text-amber-400" />
                Valor Estimado
              </div>
              <div className="text-lg font-bold text-amber-400">
                {formatCurrency(yearTotals.estimatedValue)}
              </div>
            </div>
          </div>
        )}

        {/* Monthly Cycles */}
        <ScrollArea className="h-[300px] pr-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full bg-slate-700/30" />
              ))}
            </div>
          ) : cycles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Archive className="h-12 w-12 text-slate-600 mb-3" />
              <p className="text-sm text-slate-400 mb-1">Nenhum ciclo encontrado para {selectedYear}</p>
              <p className="text-xs text-slate-500 mb-4">
                Clique em "Atualizar" para sincronizar seus dados
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={syncAllPastMonths}
                disabled={isSyncing}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Sincronizar Histórico Completo
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {cycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className={`bg-slate-800/40 rounded-lg border transition-all ${
                    expandedCycle === cycle.id
                      ? 'border-purple-500/30'
                      : 'border-slate-700/30 hover:border-slate-600/50'
                  }`}
                >
                  {/* Cycle Header */}
                  <button
                    onClick={() => setExpandedCycle(expandedCycle === cycle.id ? null : cycle.id)}
                    className="w-full p-3 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                        cycle.total_hours >= 0
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {MONTH_NAMES[cycle.month - 1]?.slice(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-slate-200">
                          {MONTH_NAMES[cycle.month - 1]} {cycle.year}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {cycle.total_entries} {cycle.total_entries === 1 ? 'registro' : 'registros'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`font-bold text-sm ${
                          cycle.total_hours >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {cycle.total_hours >= 0 ? '+' : ''}{cycle.total_hours.toFixed(1)}h
                        </div>
                        {cycle.estimated_value && (
                          <div className="text-[10px] text-amber-400">
                            {formatCurrency(cycle.estimated_value)}
                          </div>
                        )}
                      </div>
                      {expandedCycle === cycle.id ? (
                        <ChevronUp className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      )}
                    </div>
                  </button>

                  {/* Cycle Details */}
                  {expandedCycle === cycle.id && (
                    <div className="px-3 pb-3 pt-0 border-t border-slate-700/30">
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="bg-slate-900/40 rounded p-2">
                          <div className="text-[10px] text-slate-500">1ª Quinzena</div>
                          <div className={`font-medium text-sm ${
                            cycle.fortnight_1_hours >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {cycle.fortnight_1_hours >= 0 ? '+' : ''}{cycle.fortnight_1_hours.toFixed(1)}h
                          </div>
                        </div>
                        <div className="bg-slate-900/40 rounded p-2">
                          <div className="text-[10px] text-slate-500">2ª Quinzena</div>
                          <div className={`font-medium text-sm ${
                            cycle.fortnight_2_hours >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {cycle.fortnight_2_hours >= 0 ? '+' : ''}{cycle.fortnight_2_hours.toFixed(1)}h
                          </div>
                        </div>
                        <div className="bg-slate-900/40 rounded p-2">
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
                            Créditos
                          </div>
                          <div className="font-medium text-sm text-emerald-400">
                            +{cycle.credit_hours.toFixed(1)}h
                          </div>
                        </div>
                        <div className="bg-slate-900/40 rounded p-2">
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <TrendingDown className="h-2.5 w-2.5 text-rose-400" />
                            Débitos
                          </div>
                          <div className="font-medium text-sm text-rose-400">
                            -{cycle.debit_hours.toFixed(1)}h
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/20">
                        <div className="text-[10px] text-slate-500">
                          Taxa: R$ {(cycle.hourly_rate || 0).toFixed(2)}/h
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                              onClick={() => {
                                setDeleteTarget('single');
                                setDeleteCycleId(cycle.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Apagar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-900 border-slate-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2 text-rose-400">
                                <AlertTriangle className="h-5 w-5" />
                                Apagar Ciclo
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja apagar o ciclo de{' '}
                                <strong>{MONTH_NAMES[cycle.month - 1]} {cycle.year}</strong>?
                                <br />
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteHistory}
                                className="bg-rose-600 hover:bg-rose-700"
                              >
                                Apagar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Delete Options */}
        {cycles.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
            <span className="text-xs text-slate-500">
              Dados armazenados por até 5 anos
            </span>
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-slate-400 hover:text-rose-400"
                    onClick={() => setDeleteTarget('year')}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Apagar {selectedYear}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-900 border-slate-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-rose-400">
                      <AlertTriangle className="h-5 w-5" />
                      Apagar Ano
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja apagar todo o histórico de{' '}
                      <strong>{selectedYear}</strong>?
                      <br />
                      Todos os {cycles.length} ciclos serão removidos permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteHistory}
                      className="bg-rose-600 hover:bg-rose-700"
                    >
                      Apagar Tudo de {selectedYear}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-rose-400 hover:text-rose-300"
                    onClick={() => setDeleteTarget('all')}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Apagar Tudo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-900 border-slate-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-rose-400">
                      <AlertTriangle className="h-5 w-5" />
                      Apagar Todo Histórico
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      <strong className="text-rose-400">ATENÇÃO:</strong> Esta ação irá apagar
                      todo o seu histórico de BH dos últimos 5 anos.
                      <br /><br />
                      Esta ação é <strong>irreversível</strong>. Tem certeza?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteHistory}
                      className="bg-rose-600 hover:bg-rose-700"
                    >
                      Sim, Apagar Todo Histórico
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
