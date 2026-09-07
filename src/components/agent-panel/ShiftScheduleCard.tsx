import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SimpleDatePicker } from '@/components/agent-panel/ShiftMiniCalendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { notify } from '@/lib/notify';
import { 
  Calendar as CalendarIcon, Plus, Loader2, RefreshCw, Check, X, 
  AlertTriangle, Palmtree, WifiOff, Settings2, Clock, ChevronDown, ChevronUp,
  Shield, Briefcase, Sun, Moon, Coffee, Star
} from 'lucide-react';
import { format, parseISO, isToday, isBefore, startOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ShiftScheduleCardProps {
  agentId: string;
}

interface AgentShift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  status: string;
  notes: string | null;
  compensation_date: string | null;
  is_vacation: boolean;
  completed_at: string | null;
}

const CACHE_KEY_PREFIX = 'shifts_cache_';
const CACHE_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

function getFromCache(agentId: string): AgentShift[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + agentId);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CACHE_KEY_PREFIX + agentId);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveToCache(agentId: string, data: AgentShift[]) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + agentId, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Ignore cache errors
  }
}

// Get icon based on shift type/time
function getShiftIcon(shift: AgentShift) {
  if (shift.is_vacation) return { icon: Palmtree, color: 'text-purple-400', bg: 'bg-purple-500/20' };
  if (shift.status === 'completed') return { icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
  if (shift.status === 'missed') return { icon: X, color: 'text-red-400', bg: 'bg-red-500/20' };
  
  // Based on time of day
  const hour = parseInt(shift.start_time?.split(':')[0] || '7');
  if (hour >= 6 && hour < 12) return { icon: Sun, color: 'text-amber-400', bg: 'bg-amber-500/20' };
  if (hour >= 12 && hour < 18) return { icon: Coffee, color: 'text-orange-400', bg: 'bg-orange-500/20' };
  if (hour >= 18 || hour < 6) return { icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-500/20' };
  
  return { icon: Briefcase, color: 'text-amber-400', bg: 'bg-amber-500/20' };
}

export function ShiftScheduleCard({ agentId }: ShiftScheduleCardProps) {
  const [shifts, setShifts] = useState<AgentShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [firstShiftDate, setFirstShiftDate] = useState<Date | undefined>();
  const [configMonth, setConfigMonth] = useState(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [selectedShift, setSelectedShift] = useState<AgentShift | null>(null);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [compensationDate, setCompensationDate] = useState<Date | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const hasFetched = useRef(false);
  const agentIdRef = useRef(agentId);

  // Fetch shifts only once on mount
  useEffect(() => {
    if (hasFetched.current && agentIdRef.current === agentId) return;
    hasFetched.current = true;
    agentIdRef.current = agentId;

    // Janela de consulta: 90 dias no passado + 6 meses no futuro. Cobre BH
    // recente e agenda futura sem trazer o histórico inteiro do agente.
    const SHIFT_COLS = 'id, shift_date, start_time, end_time, shift_type, status, notes, compensation_date, is_vacation, completed_at';
    const buildShiftRange = () => {
      const today = new Date();
      const from = new Date(today);
      from.setDate(from.getDate() - 90);
      const to = new Date(today);
      to.setMonth(to.getMonth() + 6);
      return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      };
    };

    const fetchShifts = async () => {
      setIsLoading(true);
      try {
        const range = buildShiftRange();
        const { data, error } = await supabase
          .from('agent_shifts')
          .select(SHIFT_COLS)
          .eq('agent_id', agentId)
          .gte('shift_date', range.from)
          .lte('shift_date', range.to)
          .order('shift_date', { ascending: true });

        if (!error && data) {
          setShifts(data as AgentShift[]);
          setIsFromCache(false);
          saveToCache(agentId, data as AgentShift[]);
        } else {
          // Fallback to cache
          const cached = getFromCache(agentId);
          if (cached) {
            setShifts(cached);
            setIsFromCache(true);
          }
        }
      } catch {
        const cached = getFromCache(agentId);
        if (cached) {
          setShifts(cached);
          setIsFromCache(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchShifts();
  }, [agentId]);

  const refetchShifts = async () => {
    try {
      const today = new Date();
      const from = new Date(today); from.setDate(from.getDate() - 90);
      const to = new Date(today); to.setMonth(to.getMonth() + 6);
      const { data, error } = await supabase
        .from('agent_shifts')
        .select('id, shift_date, start_time, end_time, shift_type, status, notes, compensation_date, is_vacation, completed_at')
        .eq('agent_id', agentId)
        .gte('shift_date', from.toISOString().slice(0, 10))
        .lte('shift_date', to.toISOString().slice(0, 10))
        .order('shift_date', { ascending: true });

      if (!error && data) {
        setShifts(data as AgentShift[]);
        setIsFromCache(false);
        saveToCache(agentId, data as AgentShift[]);
      }
    } catch {
      // Silent fail
    }
  };

  const generateShifts = async () => {
    if (!firstShiftDate) {
      notify.error('Selecione a data do primeiro plantão');
      return;
    }

    try {
      setIsGenerating(true);
      
      // Gerar plantões para 3 meses (padrão 24x72)
      const { data, error } = await supabase.rpc('generate_agent_shifts', {
        p_agent_id: agentId,
        p_first_shift_date: format(firstShiftDate, 'yyyy-MM-dd'),
        p_months_ahead: 3
      });

      if (error) throw error;

      notify.success(`${data} plantões gerados para os próximos 3 meses!`);
      setShowConfig(false);
      refetchShifts();
    } catch (error) {
      console.error('Error generating shifts:', error);
      notify.error('Erro ao gerar plantões');
    } finally {
      setIsGenerating(false);
    }
  };

  // Check if shifts need renewal (less than 2 weeks remaining)
  const needsRenewal = useMemo(() => {
    if (shifts.length === 0) return false;
    const futureShifts = shifts.filter(s => parseISO(s.shift_date) >= startOfDay(new Date()));
    if (futureShifts.length === 0) return true;
    
    const lastShift = futureShifts[futureShifts.length - 1];
    const daysUntilLast = differenceInDays(parseISO(lastShift.shift_date), new Date());
    return daysUntilLast <= 14; // Alert when 2 weeks or less remaining
  }, [shifts]);

  const handleShiftClick = (shift: AgentShift) => {
    setSelectedShift(shift);
    setEditStatus(shift.status);
    setEditNotes(shift.notes || '');
    setCompensationDate(shift.compensation_date ? parseISO(shift.compensation_date) : undefined);
    setShowShiftDialog(true);
  };

  const handleSaveShift = async () => {
    if (!selectedShift) return;

    try {
      setIsSaving(true);
      
      const updateData: {
        status: string;
        notes: string | null;
        compensation_date: string | null;
        is_vacation: boolean;
        updated_at: string;
        completed_at?: string;
      } = {
        status: editStatus,
        notes: editNotes || null,
        compensation_date: compensationDate ? format(compensationDate, 'yyyy-MM-dd') : null,
        is_vacation: editStatus === 'vacation',
        updated_at: new Date().toISOString()
      };

      if (editStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('agent_shifts')
        .update(updateData)
        .eq('id', selectedShift.id);

      if (error) throw error;

      notify.success('Plantão atualizado com sucesso!');
      setShowShiftDialog(false);
      refetchShifts();
    } catch (error) {
      console.error('Error updating shift:', error);
      notify.error('Erro ao atualizar plantão');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'bg-emerald-500/20', icon: Check, label: 'Cumprido', textColor: 'text-emerald-400', dotColor: 'bg-emerald-500' };
      case 'missed':
        return { color: 'bg-red-500/20', icon: X, label: 'Faltou', textColor: 'text-red-400', dotColor: 'bg-red-500' };
      case 'compensated':
        return { color: 'bg-blue-500/20', icon: RefreshCw, label: 'Compensado', textColor: 'text-blue-400', dotColor: 'bg-blue-500' };
      case 'vacation':
        return { color: 'bg-purple-500/20', icon: Palmtree, label: 'Férias', textColor: 'text-purple-400', dotColor: 'bg-purple-500' };
      default:
        return { color: 'bg-amber-500/20', icon: Star, label: 'Agendado', textColor: 'text-amber-400', dotColor: 'bg-amber-500' };
    }
  };

  const upcomingShifts = useMemo(() => 
    shifts
      .filter(s => parseISO(s.shift_date) >= startOfDay(new Date()))
      .slice(0, 6),
    [shifts]
  );

  const pastShifts = useMemo(() => 
    shifts
      .filter(s => isBefore(parseISO(s.shift_date), startOfDay(new Date())))
      .slice(-4)
      .reverse(),
    [shifts]
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="bg-slate-900/95 border border-slate-700/80 shadow-lg overflow-hidden">
        {/* Renewal Alert Banner */}
        {needsRenewal && shifts.length > 0 && (
          <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-xs text-amber-300 truncate">
                Escala terminando! Renove seus plantões.
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => setShowConfig(true)}
              className="h-6 px-2 text-[10px] bg-amber-500 hover:bg-amber-600 text-black shrink-0"
            >
              Renovar
            </Button>
          </div>
        )}
        
        {/* Header - Collapsible Trigger */}
        <CardHeader className="py-2.5 px-4 border-b border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex-1 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <CalendarIcon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">Meus Plantões</span>
                  {isFromCache && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-500/50 text-amber-400">
                      <WifiOff className="h-2 w-2 mr-0.5" />
                      offline
                    </Badge>
                  )}
                </div>
                {!isExpanded && upcomingShifts.length > 0 && (
                  <p className="text-[10px] text-slate-500 truncate">
                    {upcomingShifts.length} próximo{upcomingShifts.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div className="p-1.5 rounded-md hover:bg-slate-700/50 transition-colors">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </CollapsibleTrigger>
            
            <Dialog open={showConfig} onOpenChange={setShowConfig}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0 text-slate-400 hover:text-amber-400 hover:bg-slate-700/50 ml-1"
                >
                  {shifts.length === 0 ? (
                    <Plus className="h-4 w-4" />
                  ) : (
                    <Settings2 className="h-4 w-4" />
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 max-w-xs">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <CalendarIcon className="h-4 w-4 text-amber-500" />
                    Configurar Escala
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Selecione o primeiro plantão (24h + 72h folga).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <SimpleDatePicker
                    month={configMonth}
                    onMonthChange={setConfigMonth}
                    selected={firstShiftDate}
                    onSelect={setFirstShiftDate}
                  />

                  {firstShiftDate && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <p className="text-xs text-amber-400 font-medium">
                        {format(firstShiftDate, "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={generateShifts} 
                    disabled={!firstShiftDate || isGenerating}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-9"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      'Gerar Escala'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-3 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              </div>
            ) : shifts.length === 0 ? (
              <div className="text-center py-5">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-2">
                  <CalendarIcon className="h-6 w-6 text-slate-600" />
                </div>
                <p className="text-sm text-slate-400">Sem plantões configurados</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Clique em <Settings2 className="inline h-3 w-3" /> para configurar
                </p>
              </div>
            ) : (
              <>
            {/* Upcoming Shifts - New Timeline Design */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Próximos</h4>
              </div>
              
              <div className="space-y-1.5">
                {upcomingShifts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">Nenhum plantão agendado.</p>
                ) : (
                  upcomingShifts.map((shift) => {
                    const shiftDate = parseISO(shift.shift_date);
                    const isTodayShift = isToday(shiftDate);
                    const daysUntil = differenceInDays(shiftDate, startOfDay(new Date()));
                    
                    return (
                      <button
                        key={shift.id}
                        onClick={() => handleShiftClick(shift)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                          isTodayShift
                            ? 'bg-emerald-500/15 border border-emerald-500/40'
                            : shift.is_vacation 
                              ? 'bg-purple-500/10 border border-purple-500/30'
                              : 'bg-slate-800/60 border border-slate-700/50 hover:bg-slate-800'
                        }`}
                      >
                        {/* Visual Marker - Dot/Ring */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full ${
                            isTodayShift 
                              ? 'bg-emerald-500 ring-2 ring-emerald-400/50' 
                              : shift.is_vacation 
                                ? 'bg-purple-500'
                                : 'bg-amber-500/80'
                          }`} />
                          {isTodayShift && (
                            <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
                          )}
                        </div>

                        {/* Date Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold capitalize ${
                              isTodayShift ? 'text-emerald-400' : shift.is_vacation ? 'text-purple-400' : 'text-slate-200'
                            }`}>
                              {isTodayShift ? 'HOJE' : format(shiftDate, "EEE", { locale: ptBR })}
                            </span>
                            <span className="text-xs text-slate-500">
                              {format(shiftDate, "dd/MM", { locale: ptBR })}
                            </span>
                          </div>
                          {!isTodayShift && daysUntil > 0 && (
                            <span className="text-[10px] text-slate-500">
                              em {daysUntil} dia{daysUntil > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Time & Icons */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {shift.is_vacation && (
                            <Palmtree className="h-3.5 w-3.5 text-purple-400" />
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-mono ${
                              isTodayShift
                                ? 'text-emerald-400 border-emerald-500/50'
                                : 'text-amber-400 border-amber-500/50'
                            }`}
                          >
                            {shift.start_time?.slice(0, 5) || '07:00'}
                          </Badge>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Past Shifts - Professional "crossed off" list */}
            {pastShifts.length > 0 && (
              <div className="pt-2 border-t border-slate-700/50">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Plantões cumpridos</h4>
                  <span className="text-[9px] text-emerald-400/80 font-semibold tracking-wider">
                    ✓ {pastShifts.filter(s => s.status !== 'missed').length}/{pastShifts.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {pastShifts.map((shift) => {
                    const shiftDate = parseISO(shift.shift_date);
                    // Past shifts default to "cumprido" visually unless explicitly missed
                    const effectiveStatus = shift.status === 'scheduled' ? 'completed' : shift.status;
                    const statusInfo = getStatusInfo(effectiveStatus);
                    const StatusIcon = statusInfo.icon;
                    const isMissed = effectiveStatus === 'missed';
                    const isDone = effectiveStatus === 'completed' || effectiveStatus === 'compensated';
                    return (
                      <button
                        key={shift.id}
                        onClick={() => handleShiftClick(shift)}
                        className={`group w-full flex items-center gap-2 px-2 py-1.5 rounded-md border transition-all ${
                          isMissed
                            ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
                            : 'border-emerald-500/20 bg-emerald-500/[0.04] hover:bg-emerald-500/10'
                        }`}
                        title={`${statusInfo.label} • ${format(shiftDate, "dd/MM/yyyy", { locale: ptBR })}`}
                      >
                        <span
                          className={`inline-flex items-center justify-center h-4 w-4 rounded-full flex-shrink-0 ${
                            isMissed ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          <StatusIcon className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                        <span
                          className={`text-[11px] font-mono tabular-nums flex-1 text-left ${
                            isDone ? 'text-slate-400 line-through decoration-emerald-500/60 decoration-[1.5px]' : 'text-slate-300'
                          }`}
                        >
                          {format(shiftDate, "EEE dd/MM", { locale: ptBR })}
                          {shift.start_time && (
                            <span className="ml-1.5 text-slate-500">· {shift.start_time.slice(0, 5)}</span>
                          )}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${statusInfo.textColor} ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legend - Ultra Compact */}
            <div className="flex items-center justify-center gap-3 pt-1">
              {[
                { dot: 'bg-amber-500', label: 'Agendado' },
                { dot: 'bg-emerald-500', label: 'Cumprido' },
                { dot: 'bg-red-500', label: 'Falta' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                  <span className="text-[9px] text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
        </CardContent>
        </CollapsibleContent>

        {/* Shift Edit Dialog */}
        <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm">
                {selectedShift && format(parseISO(selectedShift.shift_date), "dd 'de' MMMM", { locale: ptBR })}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Atualize o status deste plantão
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 h-9 text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="completed">Cumprido</SelectItem>
                    <SelectItem value="missed">Faltou</SelectItem>
                    <SelectItem value="compensated">Compensado</SelectItem>
                    <SelectItem value="vacation">Férias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editStatus === 'missed' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Compensação</Label>
                  <SimpleDatePicker
                    month={compensationDate ?? new Date()}
                    onMonthChange={(m) => setCompensationDate(m)}
                    selected={compensationDate}
                    onSelect={setCompensationDate}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Observações</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Motivo, ocorrência..."
                  className="bg-slate-800 border-slate-700 min-h-[60px] text-sm"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShiftDialog(false)}
                className="h-8"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveShift}
                disabled={isSaving}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-black h-8"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </Collapsible>
  );
}
