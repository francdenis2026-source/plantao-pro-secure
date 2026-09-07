import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Clock, TrendingUp, TrendingDown, DollarSign, Loader2, History, AlertTriangle, Trash2, CalendarPlus, Edit2, Sun, Moon, Bell, BellOff, HelpCircle, BarChart3, Timer, Lock, Shield, Unlock, X, Building2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NumberStepper } from '@/components/ui/number-stepper';
import { format, endOfDay, isAfter, addDays, isBefore, startOfDay, startOfMonth, endOfMonth, getDate, subMonths, addMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface BHTrackerProps {
  agentId: string;
  compact?: boolean;
  isAdmin?: boolean;
}

interface OvertimeEntry {
  id: string;
  hours: number;
  operation_type: string;
  description: string | null;
  created_at: string;
}

const HOUR_OPTIONS = [
  { value: 6, label: '6h' },
  { value: 8, label: '8h' },
  { value: 12, label: '12h' },
  { value: 24, label: '24h' },
];

const DEFAULT_SHIFT_OPTIONS = [
  { value: 'day', label: 'Diurno', icon: Sun, startTime: '07:00', endTime: '19:00', hours: 12, color: 'text-amber-400' },
  { value: 'night', label: 'Noturno', icon: Moon, startTime: '19:00', endTime: '07:00', hours: 12, color: 'text-blue-400' },
  { value: 'full', label: 'Dia Inteiro', icon: Clock, startTime: '07:00', endTime: '07:00', hours: 24, color: 'text-green-400' },
];

// Monthly Summary by Fortnight Component - INDEPENDENT VALUES
function MonthlySummary({ 
  entries, 
  selectedMonth, 
  hourlyRate 
}: { 
  entries: OvertimeEntry[]; 
  selectedMonth: Date; 
  hourlyRate: number;
}) {
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  
  // Parse BH date from description
  const parseEntryDate = (entry: OvertimeEntry): Date | null => {
    if (entry.description) {
      const match = entry.description.match(/BH - (\d{2})\/(\d{2})\/(\d{4})/);
      if (match) {
        const [, day, month, year] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }
    return null;
  };

  // Filter entries for selected month
  const monthEntries = entries.filter(entry => {
    const entryDate = parseEntryDate(entry);
    if (!entryDate) return false;
    return entryDate >= monthStart && entryDate <= monthEnd;
  });

  // Split by fortnight - INDEPENDENT calculations
  const firstFortnight = monthEntries.filter(entry => {
    const entryDate = parseEntryDate(entry);
    return entryDate && entryDate.getDate() <= 15;
  });

  const secondFortnight = monthEntries.filter(entry => {
    const entryDate = parseEntryDate(entry);
    return entryDate && entryDate.getDate() >= 16;
  });

  // Calculate totals INDEPENDENTLY - each fortnight has its own balance
  const calcTotal = (list: OvertimeEntry[]) => 
    list.reduce((acc, e) => e.operation_type === 'credit' ? acc + Number(e.hours) : acc - Number(e.hours), 0);

  const firstTotal = calcTotal(firstFortnight);
  const secondTotal = calcTotal(secondFortnight);
  
  // Note: We show them independently, NOT summed
  const monthName = format(selectedMonth, 'MMMM yyyy', { locale: ptBR });

  return (
    <div className="p-4 bg-slate-800/50 border border-slate-600/40 rounded-xl space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-semibold text-slate-200 capitalize">Resumo de {monthName}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        {/* First Fortnight - INDEPENDENT */}
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <p className="text-xs text-emerald-400 mb-1 font-bold">1ª Quinzena</p>
          <p className="text-[10px] text-slate-500 mb-2">Dias 01-15</p>
          <p className="text-2xl font-black text-emerald-300">{firstTotal.toFixed(1)}h</p>
          <p className="text-sm font-semibold text-emerald-400/80 mt-1">R$ {(firstTotal * hourlyRate).toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-2 font-medium">{firstFortnight.length} registro(s)</p>
        </div>
        {/* Second Fortnight - INDEPENDENT */}
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
          <p className="text-xs text-cyan-400 mb-1 font-bold">2ª Quinzena</p>
          <p className="text-[10px] text-slate-500 mb-2">Dias 16-31</p>
          <p className="text-2xl font-black text-cyan-300">{secondTotal.toFixed(1)}h</p>
          <p className="text-sm font-semibold text-cyan-400/80 mt-1">R$ {(secondTotal * hourlyRate).toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-2 font-medium">{secondFortnight.length} registro(s)</p>
        </div>
      </div>
      <div className="pt-3 border-t border-slate-600/30">
        <p className="text-xs text-center text-slate-400">
          ℹ️ Cada quinzena é independente - os valores não são somados entre si
        </p>
      </div>
    </div>
  );
}

// BH Evolution Chart Component
function BHEvolutionChart({ entries, hourlyRate }: { entries: OvertimeEntry[]; hourlyRate: number }) {
  const [showChart, setShowChart] = useState(false);

  // Parse BH date from description
  const parseEntryDate = (entry: OvertimeEntry): Date | null => {
    if (entry.description) {
      const match = entry.description.match(/BH - (\d{2})\/(\d{2})\/(\d{4})/);
      if (match) {
        const [, day, month, year] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }
    return new Date(entry.created_at);
  };

  // Generate last 6 months data
  const chartData = React.useMemo(() => {
    const today = new Date();
    const months: { month: string; horas: number; valor: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, 'MMM', { locale: ptBR });

      const monthEntries = entries.filter(entry => {
        const entryDate = parseEntryDate(entry);
        if (!entryDate) return false;
        return entryDate >= monthStart && entryDate <= monthEnd;
      });

      const total = monthEntries.reduce((acc, e) => 
        e.operation_type === 'credit' ? acc + Number(e.hours) : acc - Number(e.hours), 0
      );

      months.push({
        month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        horas: Math.round(total * 10) / 10,
        valor: Math.round(total * hourlyRate * 100) / 100
      });
    }

    return months;
  }, [entries, hourlyRate]);

  const hasData = chartData.some(d => d.horas !== 0);

  if (!showChart) {
    return (
      <Button 
        variant="outline" 
        className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
        onClick={() => setShowChart(true)}
      >
        <BarChart3 className="h-4 w-4 mr-2 text-amber-500" />
        Ver Evolução Mensal
      </Button>
    );
  }

  return (
    <div className="p-3 bg-slate-700/30 border border-slate-600/50 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-slate-300">Evolução - Últimos 6 Meses</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-slate-400 hover:text-slate-300 h-6 px-2"
          onClick={() => setShowChart(false)}
        >
          Ocultar
        </Button>
      </div>
      
      {!hasData ? (
        <p className="text-center text-slate-500 text-sm py-4">
          Nenhum registro de BH nos últimos 6 meses
        </p>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#94a3b8', fontSize: 11 }} 
                axisLine={{ stroke: '#475569' }}
              />
              <YAxis 
                tick={{ fill: '#94a3b8', fontSize: 11 }} 
                axisLine={{ stroke: '#475569' }}
                tickFormatter={(value) => `${value}h`}
              />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#f1f5f9'
                }}
                formatter={(value: number, name: string) => [
                  name === 'horas' ? `${value}h` : `R$ ${value.toFixed(2)}`,
                  name === 'horas' ? 'Horas' : 'Valor'
                ]}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => <span className="text-slate-300">{value === 'horas' ? 'Horas' : 'Valor (R$)'}</span>}
              />
              <Bar dataKey="horas" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

import React from 'react';

export function BHTracker({ agentId, compact = false, isAdmin = false }: BHTrackerProps) {
  // NOTE: `balance` keeps the historical total (all-time). UI + limits are now per-fortnight (quinzena).
  const [balance, setBalance] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(15.75);
  const [bhLimitLegacy, setBhLimitLegacy] = useState(70);
  const [bhLimit1st, setBhLimit1st] = useState<number>(70);
  const [bhLimit2nd, setBhLimit2nd] = useState<number>(70);
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  
  // Track if limits are from agent-specific config or unit defaults
  const [limitSource, setLimitSource] = useState<'agent' | 'unit' | 'system'>('system');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [bhDates, setBhDates] = useState<Date[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedHours, setSelectedHours] = useState(12);
  const [customHours, setCustomHours] = useState('');
  const [useCustomHours, setUseCustomHours] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('day');
  
  // Edit state
  const [editingEntry, setEditingEntry] = useState<OvertimeEntry | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [editHours, setEditHours] = useState('');
  const [editPeriod, setEditPeriod] = useState<string>('day');
  const [isEditing, setIsEditing] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<OvertimeEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Alert state
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertDaysBefore, setAlertDaysBefore] = useState(2);
  const [fortnightAlertShown, setFortnightAlertShown] = useState(false);
  
  // State for expanded view in compact mode
  const [isExpanded, setIsExpanded] = useState(false);

  // Fortnight quick view / edit dialog (current month)
  const [fortnightDialog, setFortnightDialog] = useState<1 | 2 | null>(null);
  
  // Push notifications hook
  const { isEnabled: pushEnabled, isSupported: pushSupported, requestPermission, showNotification } = usePushNotifications();

  useEffect(() => {
    fetchBHData();
    loadAlertSettings();
  }, [agentId]);

  // Check fortnight closing and send notification
  const checkFortnightClosingAlert = useCallback(() => {
    const today = new Date();
    const todayDay = today.getDate();
    const isFirstFortnight = todayDay <= 15;
    const fortnightEndDay = isFirstFortnight ? 15 : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemaining = fortnightEndDay - todayDay;
    
    // Check if we should show alert (within alertDaysBefore days)
    if (daysRemaining <= alertDaysBefore && alertsEnabled) {
      const alertKey = `bh_fortnight_alert_${agentId}_${today.getFullYear()}_${today.getMonth()}_${isFirstFortnight ? '1' : '2'}`;
      const alreadyAlerted = localStorage.getItem(alertKey);
      
      if (!alreadyAlerted && !fortnightAlertShown) {
        // Count days without BH in current fortnight
        const fortnightStart = isFirstFortnight ? 1 : 16;
        const daysInFortnight: number[] = [];
        for (let d = fortnightStart; d <= todayDay; d++) {
          daysInFortnight.push(d);
        }
        
        const daysWithBH = bhDates.filter(bhDate => {
          const bhDay = bhDate.getDate();
          const bhMonth = bhDate.getMonth();
          const bhYear = bhDate.getFullYear();
          return bhMonth === today.getMonth() && bhYear === today.getFullYear() && bhDay >= fortnightStart && bhDay <= todayDay;
        }).map(d => d.getDate());
        
        const daysWithoutBH = daysInFortnight.filter(d => !daysWithBH.includes(d));
        
        if (daysWithoutBH.length > 0) {
          const message = daysRemaining === 0 
            ? `Último dia para lançar BH! ${daysWithoutBH.length} dia(s) sem registro.`
            : `Faltam ${daysRemaining} dia(s) para fechar a quinzena. ${daysWithoutBH.length} dia(s) sem BH registrado.`;
          
          // Show toast
          toast.warning(message, {
            duration: 8000,
            icon: <Timer className="h-4 w-4 text-amber-400" />
          });
          
          // Show push notification if enabled
          if (pushEnabled) {
            showNotification({
              title: '⏰ Quinzena fechando!',
              body: message,
              tag: 'bh-fortnight-alert',
              requireInteraction: true
            });
          }
          
          localStorage.setItem(alertKey, 'true');
          setFortnightAlertShown(true);
        }
      }
    }
  }, [agentId, alertsEnabled, alertDaysBefore, bhDates, fortnightAlertShown, pushEnabled, showNotification]);

  useEffect(() => {
    if (entries.length > 0 && alertsEnabled) {
      checkFortnightClosingAlert();
    }
  }, [entries, alertsEnabled, checkFortnightClosingAlert]);

  const loadAlertSettings = () => {
    const settings = localStorage.getItem(`bh_alerts_${agentId}`);
    if (settings) {
      const parsed = JSON.parse(settings);
      setAlertsEnabled(parsed.enabled);
      setAlertDaysBefore(parsed.daysBefore || 2);
    }
  };

  const saveAlertSettings = async (enabled: boolean, daysBefore: number) => {
    // Request push permission if enabling alerts
    if (enabled && pushSupported && !pushEnabled) {
      await requestPermission();
    }
    
    localStorage.setItem(`bh_alerts_${agentId}`, JSON.stringify({ enabled, daysBefore }));
    setAlertsEnabled(enabled);
    setAlertDaysBefore(daysBefore);
    
    if (enabled) {
      toast.success(`Alertas ativados! Você será notificado ${daysBefore} dia(s) antes do fechamento da quinzena.`);
    } else {
      toast.info('Alertas desativados');
    }
  };

  const [bhFutureMonthsAllowed, setBhFutureMonthsAllowed] = useState(0);

  const fetchBHData = async () => {
    try {
      setIsLoading(true);
      
      // Default limit is 70h per fortnight
      const DEFAULT_FORTNIGHT_LIMIT = 70;
      const DEFAULT_HOURLY_RATE = 15.75;
      
      // Fetch agent's hourly rate, limits (per fortnight), future months config, and unit_id
      const { data: agentData } = await (supabase as any)
        .from('agents')
        .select('bh_hourly_rate, bh_limit, bh_limit_1st, bh_limit_2nd, bh_future_months_allowed, unit_id')
        .eq('id', agentId)
        .maybeSingle();

      // Fetch unit defaults if agent has a unit
      let unitDefaults = {
        bh_limit_1st_default: DEFAULT_FORTNIGHT_LIMIT,
        bh_limit_2nd_default: DEFAULT_FORTNIGHT_LIMIT,
        bh_hourly_rate_default: DEFAULT_HOURLY_RATE,
      };
      
      if (agentData?.unit_id) {
        const { data: unitData } = await (supabase as any)
          .from('units')
          .select('bh_limit_1st_default, bh_limit_2nd_default, bh_hourly_rate_default')
          .eq('id', agentData.unit_id)
          .maybeSingle();
        
        if (unitData) {
          unitDefaults = {
            bh_limit_1st_default: unitData.bh_limit_1st_default ?? DEFAULT_FORTNIGHT_LIMIT,
            bh_limit_2nd_default: unitData.bh_limit_2nd_default ?? DEFAULT_FORTNIGHT_LIMIT,
            bh_hourly_rate_default: unitData.bh_hourly_rate_default ?? DEFAULT_HOURLY_RATE,
          };
        }
      }

      const legacyLimit = agentData?.bh_limit ? Number(agentData.bh_limit) : unitDefaults.bh_limit_1st_default;

      // Set hourly rate: agent > unit default > system default
      const effectiveHourlyRate = agentData?.bh_hourly_rate 
        ? Number(agentData.bh_hourly_rate) 
        : unitDefaults.bh_hourly_rate_default;
      setHourlyRate(effectiveHourlyRate);

      setBhLimitLegacy(legacyLimit > 0 ? legacyLimit : unitDefaults.bh_limit_1st_default);
      
      // Determine limit source and values
      const hasAgentSpecificLimit = (agentData?.bh_limit_1st != null && Number(agentData.bh_limit_1st) > 0) ||
                                    (agentData?.bh_limit_2nd != null && Number(agentData.bh_limit_2nd) > 0);
      const hasUnitDefaults = unitDefaults.bh_limit_1st_default !== DEFAULT_FORTNIGHT_LIMIT ||
                              unitDefaults.bh_limit_2nd_default !== DEFAULT_FORTNIGHT_LIMIT;
      
      // Use agent values if set and > 0, otherwise unit defaults, then system defaults
      const limit1st = agentData?.bh_limit_1st != null && Number(agentData.bh_limit_1st) > 0 
        ? Number(agentData.bh_limit_1st) 
        : (legacyLimit > 0 ? legacyLimit : unitDefaults.bh_limit_1st_default);
      const limit2nd = agentData?.bh_limit_2nd != null && Number(agentData.bh_limit_2nd) > 0 
        ? Number(agentData.bh_limit_2nd) 
        : (legacyLimit > 0 ? legacyLimit : unitDefaults.bh_limit_2nd_default);
      
      setBhLimit1st(limit1st);
      setBhLimit2nd(limit2nd);
      
      // Set limit source for visual indicator
      if (hasAgentSpecificLimit) {
        setLimitSource('agent');
      } else if (hasUnitDefaults) {
        setLimitSource('unit');
      } else {
        setLimitSource('system');
      }

      if (agentData?.bh_future_months_allowed !== undefined) {
        setBhFutureMonthsAllowed(Number(agentData.bh_future_months_allowed) || 0);
      }

      // Fetch overtime entries — limita a 24 meses e explicita colunas para
      // reduzir payload; agentes com muitos anos retornavam SELECT * ilimitado.
      const bhCutoff = new Date();
      bhCutoff.setMonth(bhCutoff.getMonth() - 24);
      const { data: overtimeData, error } = await supabase
        .from('overtime_bank')
        .select('id, hours, operation_type, description, created_at')
        .eq('agent_id', agentId)
        .gte('created_at', bhCutoff.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      if (overtimeData) {
        setEntries(overtimeData);
        
        // Calculate balance
        const totalBalance = overtimeData.reduce((acc, entry) => {
          return entry.operation_type === 'credit'
            ? acc + Number(entry.hours)
            : acc - Number(entry.hours);
        }, 0);
        
        setBalance(totalBalance);

        // Extract dates from entries that have date info in description
        const dates: Date[] = [];
        overtimeData.forEach(entry => {
          if (entry.description && entry.description.startsWith('BH - ')) {
            try {
              const match = entry.description.match(/BH - (\d{2})\/(\d{2})\/(\d{4})/);
              if (match) {
                const [, day, month, year] = match;
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                  dates.push(date);
                }
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        });
        setBhDates(dates);

        // Check for alerts
        checkAlerts(overtimeData);
      }
    } catch (error) {
      console.error('Error fetching BH data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFortnightLimitForDate = (date: Date) => {
    const DEFAULT_LIMIT = 70;
    const fortnight = date.getDate() <= 15 ? 1 : 2;
    const l1 = (bhLimit1st && bhLimit1st > 0) ? bhLimit1st : (bhLimitLegacy > 0 ? bhLimitLegacy : DEFAULT_LIMIT);
    const l2 = (bhLimit2nd && bhLimit2nd > 0) ? bhLimit2nd : (bhLimitLegacy > 0 ? bhLimitLegacy : DEFAULT_LIMIT);
    return fortnight === 1 ? l1 : l2;
  };

  const checkAlerts = (entries: OvertimeEntry[]) => {
    if (!alertsEnabled) return;

    // Alert is per current fortnight (quinzena), not the sum of both.
    const today = startOfDay(new Date());
    const limit = getFortnightLimitForDate(today);
    const currentFortnightBalance = getFortnightBalanceForDate(today);

    if (limit > 0 && currentFortnightBalance >= limit * 0.9) {
      toast.warning(
        `Atenção: Sua quinzena está em ${currentFortnightBalance.toFixed(1)}h (${((currentFortnightBalance / limit) * 100).toFixed(0)}% do limite)`,
        {
          duration: 5000,
          icon: <Bell className="h-4 w-4 text-amber-400" />,
        }
      );
    }
  };

  // Parse BH date from description (source of truth for quinzenas)
  const parseBHDate = (entry: OvertimeEntry): Date | null => {
    if (!entry.description) return null;
    const match = entry.description.match(/BH - (\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) return null;
    const [, day, month, year] = match;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isNaN(d.getTime()) ? null : d;
  };

  const getFortnightNumber = (date: Date) => (date.getDate() <= 15 ? 1 : 2);

  const getFortnightBalanceForDate = (date: Date) => {
    // Independent per-month/per-fortnight balance (does NOT mix quinzenas)
    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();
    const fortnight = getFortnightNumber(date);

    return entries
      .filter((e) => {
        const d = parseBHDate(e);
        if (!d) return false;
        if (d.getMonth() !== targetMonth || d.getFullYear() !== targetYear) return false;
        return fortnight === 1 ? d.getDate() <= 15 : d.getDate() >= 16;
      })
      .reduce((acc, e) => (e.operation_type === 'credit' ? acc + Number(e.hours) : acc - Number(e.hours)), 0);
  };

  // Check if a date is in a closed fortnight (quinzena)
  // UPDATED: Allow editing any day of the current month (both fortnights)
  // UPDATED (2026-01-20): Keep BH calendar fully unlocked for past dates.
  const isInClosedFortnight = (date: Date) => {
    // Admins can always edit.
    // Agents: also keep unlocked so they can lançar BH de dias anteriores.
    return false;
  };

  // Check if an entry can be edited (not in a closed fortnight, unless admin)
  const canEditEntry = (entry: OvertimeEntry) => {
    // Admins can always edit
    if (isAdmin) return true;

    const d = parseBHDate(entry) ?? new Date(entry.created_at);
    return !isInClosedFortnight(d);
  };

  // Get current fortnight info
  const getCurrentFortnightInfo = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('pt-BR', { month: 'long' });
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    if (day <= 15) {
      return {
        label: '1ª Quinzena',
        range: `01 a 15 de ${month}`,
        startDay: 1,
        endDay: 15,
      };
    } else {
      return {
        label: '2ª Quinzena',
        range: `16 a ${lastDay} de ${month}`,
        startDay: 16,
        endDay: lastDay,
      };
    }
  };

  const fortnightInfo = getCurrentFortnightInfo();

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    
    // Check if date is in a closed fortnight (only block non-admins)
    if (!isAdmin && isInClosedFortnight(date)) {
      toast.error('Esta data pertence a uma quinzena fechada. Apenas visualização permitida.');
      return;
    }
    
    // Check if this date already has BH - allow editing instead of blocking
    const dateStr = format(date, 'dd/MM/yyyy');
    const existingEntry = entries.find(e => e.description?.includes(`BH - ${dateStr}`));
    
    if (existingEntry) {
      // Open edit dialog for existing entry
      setEditingEntry(existingEntry);
      setEditHours(existingEntry.hours.toString());
      setShowEditDialog(true);
      toast.info(`Editando BH do dia ${dateStr}`);
      return;
    }

    setSelectedDate(date);
    setSelectedHours(12);
    setUseCustomHours(false);
    setCustomHours('');
    setSelectedPeriod('day');
    setShowConfirmDialog(true);
  };

  const getEffectiveHours = () => {
    if (useCustomHours && customHours) {
      const parsed = parseFloat(customHours);
      return isNaN(parsed) ? 0 : parsed;
    }
    return selectedHours;
  };

  const canAddHours = (date: Date, hours: number) => {
    const fortnightBalance = getFortnightBalanceForDate(date);
    const limit = getFortnightLimitForDate(date);
    return fortnightBalance + hours <= limit;
  };

  const handleConfirmBH = async () => {
    if (!selectedDate) return;

    const hours = getEffectiveHours();
    if (hours <= 0) {
      toast.error('Informe uma quantidade válida de horas');
      return;
    }

    if (!canAddHours(selectedDate, hours)) {
      const fortnightBalance = getFortnightBalanceForDate(selectedDate);
      const limit = getFortnightLimitForDate(selectedDate);
      toast.error(`Adicionar ${hours}h excederia o limite de ${limit}h desta quinzena (atual: ${fortnightBalance.toFixed(1)}h)`);
      return;
    }

    try {
      setIsAdding(true);
      const dateStr = format(selectedDate, 'dd/MM/yyyy');
      const shiftOption = DEFAULT_SHIFT_OPTIONS.find(p => p.value === selectedPeriod);
      const periodLabel = shiftOption?.label || '';
      const timeRange = shiftOption ? `${shiftOption.startTime} - ${shiftOption.endTime}` : '';
      
      const { error } = await supabase
        .from('overtime_bank')
        .insert({
          agent_id: agentId,
          hours: hours,
          operation_type: 'credit',
          description: `BH - ${dateStr} | ${periodLabel} (${hours}h)`
        });

      if (error) throw error;

      const value = (hours * hourlyRate).toFixed(2);
      toast.success(`${hours}h registradas! Valor: R$ ${value}`);
      setShowConfirmDialog(false);
      setSelectedDate(undefined);
      fetchBHData();
    } catch (error) {
      console.error('Error adding BH entry:', error);
      toast.error('Erro ao registrar BH');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRequestEdit = () => {
    // Close edit dialog and show confirmation
    setShowEditDialog(false);
    setShowEditConfirm(true);
  };

  const handleConfirmEdit = async () => {
    if (!editingEntry) return;

    const newHours = parseFloat(editHours);
    if (isNaN(newHours) || newHours <= 0) {
      toast.error('Informe uma quantidade válida de horas');
      return;
    }

    // Check if new value would exceed limit
    const hoursDiff = newHours - editingEntry.hours;
    if (editingEntry.operation_type === 'credit' && !canAddHours(parseBHDate(editingEntry) ?? new Date(editingEntry.created_at), hoursDiff)) {
      const limit = getFortnightLimitForDate(parseBHDate(editingEntry) ?? new Date(editingEntry.created_at));
      toast.error(`Esta alteração excederia o limite de ${limit}h desta quinzena`);
      return;
    }

    try {
      setIsEditing(true);

      // Rebuild description preserving the BH date, but applying the new period label and hours
      const shiftOption = DEFAULT_SHIFT_OPTIONS.find(p => p.value === editPeriod);
      const periodLabel = shiftOption?.label || '';
      let newDescription = editingEntry.description;
      const dateMatch = newDescription?.match(/BH - (\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        newDescription = `BH - ${dateMatch[1]} | ${periodLabel} (${newHours}h)`;
      } else if (newDescription) {
        // Fallback: swap hours only
        newDescription = newDescription.replace(/\([\d.]+h\)/, `(${newHours}h)`);
      }

      const { error } = await supabase
        .from('overtime_bank')
        .update({ 
          hours: newHours,
          description: newDescription
        })
        .eq('id', editingEntry.id);

      if (error) throw error;

      toast.success(`Registro atualizado: ${periodLabel} • ${newHours}h`);
      setShowEditConfirm(false);
      setShowEditDialog(false);
      setEditingEntry(null);
      fetchBHData();
    } catch (error) {
      console.error('Error updating BH entry:', error);
      toast.error('Erro ao atualizar registro');
    } finally {
      setIsEditing(false);
    }
  };

  const handleEditEntry = (entry: OvertimeEntry) => {
    setEditingEntry(entry);
    setEditHours(entry.hours.toString());
    // Infer current period from description label; fallback by hours
    const desc = entry.description || '';
    let inferred: string = 'day';
    if (/Noturno/i.test(desc)) inferred = 'night';
    else if (/Dia Inteiro/i.test(desc)) inferred = 'full';
    else if (/Diurno/i.test(desc)) inferred = 'day';
    else if (Number(entry.hours) >= 24) inferred = 'full';
    setEditPeriod(inferred);
    setShowEditDialog(true);
  };

  const handleRequestDelete = (entry: OvertimeEntry) => {
    setEntryToDelete(entry);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('overtime_bank')
        .delete()
        .eq('id', entryToDelete.id);

      if (error) throw error;

      toast.success('Registro removido com sucesso');
      setShowDeleteConfirm(false);
      setEntryToDelete(null);
      fetchBHData();
    } catch (error) {
      console.error('Error removing BH entry:', error);
      toast.error('Erro ao remover registro');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate value and progress (CURRENT fortnight only)
  const currentFortnightBalance = getFortnightBalanceForDate(new Date());
  const currentFortnightLimit = getFortnightLimitForDate(new Date());
  
  // Calculate BOTH fortnight balances for display
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const sixteenthOfMonth = new Date(today.getFullYear(), today.getMonth(), 16);
  const firstFortnightBalance = getFortnightBalanceForDate(firstDayOfMonth);
  const secondFortnightBalance = getFortnightBalanceForDate(sixteenthOfMonth);
  
  const totalValue = currentFortnightBalance * hourlyRate;
  const progressPercent = currentFortnightLimit > 0 ? Math.min((currentFortnightBalance / currentFortnightLimit) * 100, 100) : 0;
  const isNearLimit = currentFortnightLimit > 0 && currentFortnightBalance >= currentFortnightLimit * 0.8;
  const isAtLimit = currentFortnightLimit > 0 && currentFortnightBalance >= currentFortnightLimit;

  if (isLoading) {
    return (
      <Card className={`bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-green-900/20 border-3 border-green-500/40 shadow-lg shadow-green-500/10 ${compact ? 'col-span-1' : ''}`}>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-green-400" />
        </CardContent>
      </Card>
    );
  }


  if (compact && !isExpanded) {
    const today = new Date();
    const todayDay = today.getDate();
    const isFirstFortnight = todayDay <= 15;
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    // Check if today already has BH
    const todayStr = format(today, 'dd/MM/yyyy');
    const todayHasBH = bhDates.some(d => 
      d.getDate() === today.getDate() && 
      d.getMonth() === today.getMonth() && 
      d.getFullYear() === today.getFullYear()
    );

    const handleQuickRegisterToday = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (todayHasBH) {
        // Edit existing entry
        const existingEntry = entries.find(entry => entry.description?.includes(`BH - ${todayStr}`));
        if (existingEntry) {
          setEditingEntry(existingEntry);
          setEditHours(existingEntry.hours.toString());
          setShowEditDialog(true);
          toast.info(`Editando BH do dia ${todayStr}`);
        }
        return;
      }
      setSelectedDate(today);
      setSelectedHours(12);
      setUseCustomHours(false);
      setCustomHours('');
      setSelectedPeriod('day');
      setShowConfirmDialog(true);
    };

    return (
      <Card 
        className="card-night-green bg-gradient-to-br from-[hsl(222,60%,4%)] via-[hsl(222,55%,6%)] to-[hsl(142,40%,8%)] border-2 border-green-500/40 transition-all duration-300 hover:border-green-400/60"
      >
        <CardContent className="p-3 md:p-4 space-y-3">
          {/* Balance Header - Compact */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsExpanded(true)}>
            <div className={`relative p-2.5 md:p-3 rounded-xl transition-all duration-300 ${
              currentFortnightBalance < 0 
                ? 'bg-red-500/20 ring-2 ring-red-500/40' 
                : isAtLimit 
                  ? 'bg-red-500/20 ring-2 ring-red-500/40'
                  : isNearLimit
                    ? 'bg-amber-500/20 ring-2 ring-amber-500/40'
                    : 'bg-green-500/20 ring-2 ring-green-500/40'
            }`}>
              {currentFortnightBalance >= 0 ? (
                <TrendingUp className={`h-5 w-5 md:h-6 md:w-6 ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-green-400'}`} />
              ) : (
                <TrendingDown className="h-5 w-5 md:h-6 md:w-6 text-red-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] md:text-xs text-slate-300 font-semibold uppercase tracking-wide">Banco de Horas • {fortnightInfo.label}</p>
              <p className={`text-xl md:text-2xl font-black ${
                currentFortnightBalance < 0 ? 'text-red-400' : isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-green-400'
              }`}>
                {currentFortnightBalance >= 0 ? '+' : ''}{currentFortnightBalance.toFixed(1)}h
              </p>
            </div>
            <div className={`text-right px-3 py-1.5 rounded-xl border ${
              isAtLimit ? 'bg-red-500/15 border-red-500/30' : isNearLimit ? 'bg-amber-500/15 border-amber-500/30' : 'bg-amber-500/15 border-amber-500/30'
            }`}>
              <div className="flex items-center gap-1 mb-0.5">
                <DollarSign className={`h-3.5 w-3.5 ${isAtLimit ? 'text-red-400' : 'text-amber-400'}`} />
                <p className="text-[10px] text-slate-400 font-medium">Valor</p>
              </div>
              <p className={`text-base md:text-lg font-black ${isAtLimit ? 'text-red-400' : 'text-amber-400'}`}>R$ {totalValue.toFixed(0)}</p>
            </div>
          </div>

          {/* Progress Bar - Compact */}
          <div className="space-y-1 cursor-pointer" onClick={() => setIsExpanded(true)}>
            <div className="flex items-center justify-between text-[10px] md:text-xs">
              <span className="text-slate-400 font-medium">{currentFortnightBalance.toFixed(1)} / {currentFortnightLimit}h</span>
              <span className={`font-bold ${isNearLimit ? 'text-amber-400' : isAtLimit ? 'text-red-400' : 'text-green-400'}`}>
                {progressPercent.toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={progressPercent} 
              className={`h-2 rounded-full ${isAtLimit ? '[&>div]:bg-red-500' : isNearLimit ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
            />
          </div>

          {/* Quick Register Today Button */}
          <Button
            onClick={handleQuickRegisterToday}
            className={`w-full h-10 font-bold text-sm ${
              todayHasBH 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
            }`}
          >
            <CalendarPlus className="h-4 w-4 mr-2" />
            {todayHasBH ? `Editar BH de Hoje (${todayStr})` : `Registrar HOJE (${todayStr})`}
          </Button>

          {/* Compact Fortnight Indicators */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] font-semibold text-slate-400">Quinzenas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Badge className={`text-[9px] py-0 px-1.5 ${isFirstFortnight ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-slate-700/50 text-slate-500 border-slate-600/30'}`}>
                  1ª
                </Badge>
                <Badge className={`text-[9px] py-0 px-1.5 ${!isFirstFortnight ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-slate-700/50 text-slate-500 border-slate-600/30'}`}>
                  2ª
                </Badge>
              </div>
              <Badge 
                className="text-[8px] py-0 px-1.5 bg-slate-700/50 text-slate-400 border-slate-600/30 cursor-pointer hover:bg-slate-600/50"
                onClick={() => setIsExpanded(true)}
              >
                Ver calendário
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/60 border-slate-600/50 rounded-xl">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-slate-100">
            <div className="p-1.5 bg-emerald-500/20 rounded-md">
              <Clock className="h-4 w-4 text-emerald-400" />
            </div>
            <span>Banco de Horas</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => saveAlertSettings(!alertsEnabled, alertDaysBefore)}
              className={`h-8 w-8 p-0 ${alertsEnabled ? 'text-amber-400 hover:text-amber-300' : 'text-slate-400 hover:text-slate-300'}`}
            >
              {alertsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-8 px-2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
                <span className="text-xs ml-1">Fechar</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        {/* Alert Settings */}
        {alertsEnabled && (
          <div className="flex items-center justify-between p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-amber-400" />
              <div>
                <span className="text-xs text-amber-400">Alertas de quinzena ativados</span>
                {pushEnabled && (
                  <span className="text-[10px] text-slate-500 block leading-tight">Push notifications ativo</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Avisar</span>
              <NumberStepper
                value={alertDaysBefore}
                onChange={(days) => {
                  setAlertDaysBefore(days);
                  saveAlertSettings(true, days);
                }}
                min={1}
                max={5}
                step={1}
                size="sm"
                suffix="dias antes"
              />
            </div>
          </div>
        )}

        {/* Fortnight Summary with Independent Bars */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">Resumo por Quinzena</span>
          </div>
          
          {/* First Fortnight Bar */}
          <div 
            onClick={() => setFortnightDialog(1)}
            className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 cursor-pointer hover:bg-blue-500/20 transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-blue-300">1ª Quinzena</span>
                <span className="text-[10px] text-slate-500">(01-15)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-blue-300 tabular-nums">{firstFortnightBalance.toFixed(1)}h</span>
                <span className="text-[11px] text-blue-400/70 tabular-nums">R$ {(firstFortnightBalance * hourlyRate).toFixed(2)}</span>
              </div>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                style={{ width: `${Math.min((firstFortnightBalance / (bhLimit1st || bhLimitLegacy)) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>{firstFortnightBalance.toFixed(1)} / {bhLimit1st || bhLimitLegacy}h</span>
              <span>Toque para editar</span>
            </div>
          </div>
          
          {/* Second Fortnight Bar */}
          <div 
            onClick={() => setFortnightDialog(2)}
            className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 cursor-pointer hover:bg-purple-500/20 transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-purple-300">2ª Quinzena</span>
                <span className="text-[10px] text-slate-500">(16-31)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-purple-300 tabular-nums">{secondFortnightBalance.toFixed(1)}h</span>
                <span className="text-[11px] text-purple-400/70 tabular-nums">R$ {(secondFortnightBalance * hourlyRate).toFixed(2)}</span>
              </div>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all"
                style={{ width: `${Math.min((secondFortnightBalance / (bhLimit2nd || bhLimitLegacy)) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>{secondFortnightBalance.toFixed(1)} / {bhLimit2nd || bhLimitLegacy}h</span>
              <span>Toque para editar</span>
            </div>
          </div>
          
          {/* Hourly Rate Info */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-700/30 rounded-md">
            <span className="text-[11px] text-slate-400">Valor por hora:</span>
            <span className="text-xs font-medium text-amber-300 tabular-nums">R$ {hourlyRate.toFixed(2)}</span>
          </div>
          
          {/* Limit Source Indicator */}
          <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
            limitSource === 'agent' 
              ? 'bg-blue-500/10 border-blue-500/30' 
              : limitSource === 'unit'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-slate-700/30 border-slate-600/30'
          }`}>
            <div className="flex items-center gap-2">
              {limitSource === 'agent' ? (
                <Shield className="h-4 w-4 text-blue-400" />
              ) : limitSource === 'unit' ? (
                <Building2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Shield className="h-4 w-4 text-slate-400" />
              )}
              <div>
                <span className={`text-xs font-medium ${
                  limitSource === 'agent' 
                    ? 'text-blue-300' 
                    : limitSource === 'unit'
                      ? 'text-emerald-300'
                      : 'text-slate-300'
                }`}>
                  {limitSource === 'agent' 
                    ? 'Limites Individuais' 
                    : limitSource === 'unit'
                      ? 'Limites da Unidade'
                      : 'Limites Padrão do Sistema'}
                </span>
                <p className="text-[10px] text-slate-500">
                  {limitSource === 'agent' 
                    ? 'Configuração específica para este agente' 
                    : limitSource === 'unit'
                      ? 'Configuração definida pela unidade'
                      : 'Limites padrão: 70h por quinzena'}
                </p>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className={`h-4 w-4 cursor-help ${
                    limitSource === 'agent' 
                      ? 'text-blue-400/70' 
                      : limitSource === 'unit'
                        ? 'text-emerald-400/70'
                        : 'text-slate-400/70'
                  }`} />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-slate-800 border-slate-600 text-slate-200">
                  <p className="text-xs">
                    {limitSource === 'agent' 
                      ? 'O administrador configurou limites específicos para você que são diferentes dos limites padrão da unidade.' 
                      : limitSource === 'unit'
                        ? 'Você está usando os limites de BH definidos para toda a sua unidade pelo administrador.'
                        : 'Nenhum limite personalizado foi configurado. Usando o padrão do sistema: 70h por quinzena.'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Fortnight Scale Visual */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-slate-300">Dias com BH Registrado</span>
          </div>
          
          {/* Visual Scale - Only days with BH */}
          <div className="grid grid-cols-2 gap-2">
            {/* First Fortnight - Only programmed days - CLICKABLE */}
            {(() => {
              const today = new Date();
              const firstFortnightDays = bhDates
                .filter(d => 
                  d.getDate() <= 15 && 
                  d.getMonth() === today.getMonth() && 
                  d.getFullYear() === today.getFullYear()
                )
                .map(d => d.getDate())
                .sort((a, b) => a - b);

              return (
                <div
                   onClick={() => {
                     setFortnightDialog(1);
                   }}
                  className="p-3 rounded-lg border-2 transition-all cursor-pointer bg-blue-500/20 border-blue-500/50 ring-2 ring-blue-500/30 hover:bg-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Unlock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span className="text-xs font-semibold truncate text-blue-400">1ª Quinz.</span>
                    </div>
                    <Badge className="text-[9px] bg-blue-500/30 text-blue-300 border-blue-500/50 px-1.5 py-0 shrink-0">
                      Toque p/ editar
                    </Badge>
                  </div>

                  {firstFortnightDays.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {firstFortnightDays.map(day => {
                        const isToday = today.getDate() === day;
                        return (
                          <div
                            key={day}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isToday ? 'bg-blue-500 text-white ring-1 ring-blue-300' : 'bg-green-500/50 text-green-200'
                            }`}
                            title={`Dia ${day}${isToday ? ' (Hoje)' : ''} - BH registrado`}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-center text-slate-500 italic">Sem registros</p>
                  )}

                  <p className="text-[10px] text-center mt-1.5 text-slate-500">
                    {firstFortnightDays.length} dia{firstFortnightDays.length !== 1 ? 's' : ''}
                  </p>
                </div>
              );
            })()}

            {/* Second Fortnight - Only programmed days - CLICKABLE */}
            {(() => {
              const today = new Date();
              const secondFortnightDays = bhDates
                .filter(d => 
                  d.getDate() >= 16 && 
                  d.getMonth() === today.getMonth() && 
                  d.getFullYear() === today.getFullYear()
                )
                .map(d => d.getDate())
                .sort((a, b) => a - b);

              return (
                <div
                   onClick={() => {
                     setFortnightDialog(2);
                   }}
                  className="p-3 rounded-lg border-2 transition-all cursor-pointer bg-purple-500/20 border-purple-500/50 ring-2 ring-purple-500/30 hover:bg-purple-500/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Unlock className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span className="text-xs font-semibold truncate text-purple-400">2ª Quinz.</span>
                    </div>
                    <Badge className="text-[9px] bg-purple-500/30 text-purple-300 border-purple-500/50 px-1.5 py-0 shrink-0">
                      Toque p/ editar
                    </Badge>
                  </div>

                  {secondFortnightDays.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {secondFortnightDays.map(day => {
                        const isToday = today.getDate() === day;
                        return (
                          <div
                            key={day}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isToday ? 'bg-purple-500 text-white ring-1 ring-purple-300' : 'bg-green-500/50 text-green-200'
                            }`}
                            title={`Dia ${day}${isToday ? ' (Hoje)' : ''} - BH registrado`}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-center text-slate-500 italic">Sem registros</p>
                  )}

                  <p className="text-[10px] text-center mt-1.5 text-slate-500">
                    {secondFortnightDays.length} dia{secondFortnightDays.length !== 1 ? 's' : ''}
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Scale Legend */}
          <div className="flex items-center justify-center gap-4 text-[10px] pt-1">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-green-500/50" />
              <span className="text-slate-400">Com BH</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/30" />
              <span className="text-slate-400">Sem BH</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span className="text-slate-400">Hoje</span>
            </div>
          </div>
        </div>

        {/* Active Fortnight Alert */}
        <div className="p-3 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/30 rounded-md">
                <CalendarPlus className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-400">{fortnightInfo.label} Ativa</p>
                <p className="text-xs text-slate-400">{fortnightInfo.range}</p>
              </div>
            </div>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              Em aberto
            </Badge>
          </div>
          <div className="mt-2 pt-2 border-t border-amber-500/20">
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Quinzenas anteriores estão bloqueadas para edição
            </p>
          </div>
        </div>

        {/* Days without BH in current fortnight */}
        {(() => {
          const today = new Date();
          const todayDay = today.getDate();
          const isFirstFortnight = todayDay <= 15;
          const fortnightStart = isFirstFortnight ? 1 : 16;
          
          // Get all days from fortnightStart to today
          const daysInFortnight: number[] = [];
          for (let d = fortnightStart; d <= todayDay; d++) {
            daysInFortnight.push(d);
          }
          
          // Find which days have BH registered
          const daysWithBH = bhDates
            .filter(bhDate => {
              const bhDay = bhDate.getDate();
              const bhMonth = bhDate.getMonth();
              const bhYear = bhDate.getFullYear();
              return bhMonth === today.getMonth() && bhYear === today.getFullYear() && bhDay >= fortnightStart && bhDay <= todayDay;
            })
            .map(d => d.getDate());
          
          const daysWithoutBH = daysInFortnight.filter(d => !daysWithBH.includes(d));
          
          if (daysWithoutBH.length === 0) return null;
          
          return (
            <div className="p-3 bg-slate-700/30 border border-slate-600/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">
                  {daysWithoutBH.length} dia{daysWithoutBH.length > 1 ? 's' : ''} sem BH na quinzena
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {daysWithoutBH.map(day => (
                  <button
                    key={day}
                    onClick={() => {
                      const dateToClick = new Date(today.getFullYear(), today.getMonth(), day);
                      handleDateClick(dateToClick);
                    }}
                    disabled={isAtLimit}
                    className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Dia {day}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Clique em um dia para registrar o BH
              </p>
            </div>
          );
        })()}

        {/* Fortnight Quick View / Edit */}
        <Dialog open={fortnightDialog !== null} onOpenChange={(open) => !open && setFortnightDialog(null)}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                {fortnightDialog === 1 ? '1ª Quinzena (01-15)' : '2ª Quinzena (16+)' }
              </DialogTitle>
              <DialogDescription>
                Toque em um dia para editar; para registrar, use o calendário abaixo.
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const base = selectedMonth;
              const monthStart = startOfMonth(base);
              const monthLabel = format(base, 'MMMM yyyy', { locale: ptBR });
              const list = entries
                .map((e) => ({ e, d: parseBHDate(e) }))
                .filter(({ d }) => d && isSameMonth(d, monthStart))
                .filter(({ d }) => (fortnightDialog === 1 ? (d!.getDate() <= 15) : (d!.getDate() >= 16)))
                .sort((a, b) => (a.d!.getTime() - b.d!.getTime()));

              const total = list.reduce((acc, { e }) => (e.operation_type === 'credit' ? acc + Number(e.hours) : acc - Number(e.hours)), 0);

              return (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <p className="text-xs text-slate-400 mb-1">
                      Resumo de <span className="font-semibold capitalize text-slate-300">{monthLabel}</span>
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-black text-emerald-300">{total.toFixed(1)}h</p>
                      <span className="text-lg font-semibold text-emerald-400/70">= R$ {(total * hourlyRate).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">ℹ️ Quinzena independente (não soma com a outra)</p>
                  </div>

                  <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
                    {list.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-6">Sem registros nesta quinzena.</p>
                    ) : (
                      list.map(({ e, d }) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => {
                            setEditingEntry(e);
                            setEditHours(e.hours.toString());
                            setShowEditDialog(true);
                            setFortnightDialog(null);
                          }}
                          className="w-full flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-left hover:bg-slate-800/60"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-200">
                              Dia {format(d!, 'dd/MM', { locale: ptBR })}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[220px]">{e.description ?? ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-emerald-300">+{Number(e.hours).toFixed(1)}h</p>
                            <p className="text-[10px] text-slate-500">Editar</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Monthly Summary by Fortnight */}
        <MonthlySummary entries={entries} selectedMonth={selectedMonth} hourlyRate={hourlyRate} />

        {/* BH Evolution Chart */}
        <BHEvolutionChart entries={entries} hourlyRate={hourlyRate} />

        {/* Calendar for clicking dates */}
        <div className="space-y-2">
          {/* Today's date banner with countdown */}
          {(() => {
            const today = new Date();
            const todayDay = today.getDate();
            const isFirstFortnight = todayDay <= 15;
            const fortnightEndDay = isFirstFortnight ? 15 : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const daysRemaining = fortnightEndDay - todayDay;
            const isUrgent = daysRemaining <= 2;
            
            return (
              <div className={`p-3 border rounded-lg ${
                isUrgent 
                  ? 'bg-gradient-to-r from-amber-500/20 via-red-500/10 to-amber-500/20 border-amber-500/50' 
                  : 'bg-gradient-to-r from-blue-500/10 via-slate-700/20 to-purple-500/10 border-slate-600/50'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${isUrgent ? 'bg-amber-500/30' : 'bg-blue-500/20'}`}>
                      <Clock className={`h-4 w-4 ${isUrgent ? 'text-amber-400' : 'text-blue-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        Hoje é dia <span className={`font-bold ${isFirstFortnight ? 'text-blue-400' : 'text-purple-400'}`}>{todayDay}</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {isFirstFortnight ? (
                          <>Você pode lançar BH do dia <span className="text-blue-400 font-medium">1</span> até <span className="text-blue-400 font-medium">hoje (dia {todayDay})</span></>
                        ) : (
                          <>Você pode lançar BH do dia <span className="text-purple-400 font-medium">16</span> até <span className="text-purple-400 font-medium">hoje (dia {todayDay})</span></>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={isFirstFortnight ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-purple-500/20 text-purple-400 border-purple-500/30"}>
                      {isFirstFortnight ? "1ª Quinzena" : "2ª Quinzena"}
                    </Badge>
                    <div className={`flex items-center gap-1 text-xs ${isUrgent ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>
                      {isUrgent && <AlertTriangle className="h-3 w-3" />}
                      <span>
                        {daysRemaining === 0 
                          ? 'Último dia!' 
                          : daysRemaining === 1 
                            ? 'Falta 1 dia para fechar' 
                            : `Faltam ${daysRemaining} dias para fechar`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-slate-300">Clique na data para registrar BH</span>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-2">
            <Calendar
              mode="single"
              selected={undefined}
              month={selectedMonth}
              onMonthChange={setSelectedMonth}
              onSelect={handleDateClick}
              locale={ptBR}
              disabled={(date) => {
                // Permitir marcar dias futuros baseado na configuração bhFutureMonthsAllowed
                const today = new Date();
                const maxAllowedDate = addMonths(endOfMonth(today), bhFutureMonthsAllowed);

                // Bloquear datas após o limite permitido
                if (isAfter(startOfDay(date), startOfDay(maxAllowedDate))) return true;

                return false;
              }}
              modifiers={{
                bh: bhDates,
                closed: (date) => {
                  // Mark as closed if in closed fortnight and not a BH date
                  const isBhDate = bhDates.some(d => 
                    d.getDate() === date.getDate() && 
                    d.getMonth() === date.getMonth() && 
                    d.getFullYear() === date.getFullYear()
                  );
                  return isInClosedFortnight(date) && !isBhDate;
                },
                openFirstFortnight: (date) => {
                  const day = date.getDate();
                  const isSameMonth = date.getMonth() === selectedMonth.getMonth() && date.getFullYear() === selectedMonth.getFullYear();
                  const isBhDate = bhDates.some(d => 
                    d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()
                  );
                  // Open first fortnight: days 1-15, not closed, not a BH date, not future
                  return (
                    isSameMonth &&
                    day >= 1 &&
                    day <= 15 &&
                    !isInClosedFortnight(date) &&
                    !isBhDate &&
                    !isAfter(startOfDay(date), startOfDay(new Date()))
                  );
                },
                openSecondFortnight: (date) => {
                  const day = date.getDate();
                  const isSameMonth = date.getMonth() === selectedMonth.getMonth() && date.getFullYear() === selectedMonth.getFullYear();
                  const isBhDate = bhDates.some(d => 
                    d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()
                  );
                  // Open second fortnight: days 16+, not closed, not a BH date, not future
                  return (
                    isSameMonth &&
                    day >= 16 &&
                    !isInClosedFortnight(date) &&
                    !isBhDate &&
                    !isAfter(startOfDay(date), startOfDay(new Date()))
                  );
                },
                closedFirstFortnight: (date) => {
                  const day = date.getDate();
                  const isSameMonth = date.getMonth() === selectedMonth.getMonth() && date.getFullYear() === selectedMonth.getFullYear();
                  const isBhDate = bhDates.some(d => 
                    d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()
                  );
                  return isSameMonth && day >= 1 && day <= 15 && isInClosedFortnight(date) && !isBhDate;
                },
                closedSecondFortnight: (date) => {
                  const day = date.getDate();
                  const isSameMonth = date.getMonth() === selectedMonth.getMonth() && date.getFullYear() === selectedMonth.getFullYear();
                  const isBhDate = bhDates.some(d => 
                    d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()
                  );
                  return isSameMonth && day >= 16 && isInClosedFortnight(date) && !isBhDate;
                }
              }}
              modifiersStyles={{
                bh: {
                  backgroundColor: 'hsl(142 76% 36% / 0.4)',
                  color: 'hsl(142 71% 55%)',
                  fontWeight: 'bold',
                  borderRadius: '50%',
                  boxShadow: '0 0 0 2px hsl(142 76% 36% / 0.6), inset 0 0 6px hsl(142 76% 36% / 0.4)',
                  border: '2px solid hsl(142 71% 45%)',
                  position: 'relative' as const
                },
                closed: {
                  backgroundColor: 'hsl(215 20% 30% / 0.3)',
                  color: 'hsl(215 20% 50%)',
                  opacity: 0.6
                },
                openFirstFortnight: {
                  backgroundColor: 'hsl(217 91% 60% / 0.2)',
                  borderLeft: '3px solid hsl(217 91% 60%)'
                },
                openSecondFortnight: {
                  backgroundColor: 'hsl(271 91% 65% / 0.2)',
                  borderLeft: '3px solid hsl(271 91% 65%)'
                },
                closedFirstFortnight: {
                  backgroundColor: 'hsl(217 30% 40% / 0.15)',
                  borderLeft: '3px solid hsl(217 30% 50% / 0.4)',
                  opacity: 0.5
                },
                closedSecondFortnight: {
                  backgroundColor: 'hsl(271 30% 40% / 0.15)',
                  borderLeft: '3px solid hsl(271 30% 50% / 0.4)',
                  opacity: 0.5
                }
              }}
              className="rounded-md pointer-events-auto"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: 'hsl(142 76% 36% / 0.4)', 
                  border: '2px solid hsl(142 71% 45%)',
                  boxShadow: '0 0 0 2px hsl(142 76% 36% / 0.4)'
                }}
              >
                <Edit2 className="h-2 w-2 text-green-300" />
              </div>
              <span className="text-slate-400">BH registrado (clique para editar)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded"
                style={{
                  backgroundColor: 'hsl(217 91% 60% / 0.2)',
                  borderLeft: '3px solid hsl(217 91% 60%)'
                }}
              />
              <span className="text-blue-400">1ª Quinzena (Aberta)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded"
                style={{
                  backgroundColor: 'hsl(271 91% 65% / 0.2)',
                  borderLeft: '3px solid hsl(271 91% 65%)'
                }}
              />
              <span className="text-purple-400">2ª Quinzena (Aberta)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded opacity-60"
                style={{
                  backgroundColor: 'hsl(215 20% 30% / 0.3)',
                  borderLeft: '3px solid hsl(215 20% 50% / 0.4)'
                }}
              />
              <span className="text-slate-500">Fechada</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-slate-500 hover:text-amber-400 transition-colors">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="max-w-xs bg-slate-900 border-slate-700 text-slate-200 p-3"
                  >
                    <div className="space-y-2">
                      <p className="font-semibold text-amber-400">Sistema de Quinzenas</p>
                      <p className="text-xs leading-relaxed">
                        O mês é dividido em duas quinzenas:
                      </p>
                      <ul className="text-xs space-y-1 ml-2">
                        <li>• <strong className="text-blue-400">1ª Quinzena:</strong> Dias 1 a 15</li>
                        <li>• <strong className="text-purple-400">2ª Quinzena:</strong> Dias 16 ao final do mês</li>
                      </ul>
                      <p className="text-xs leading-relaxed pt-1 border-t border-slate-700">
                        <strong className="text-amber-400">Regra:</strong> Você só pode registrar e editar BH na quinzena atual. 
                        Quinzenas anteriores ficam bloqueadas para edição, permitindo apenas visualização.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Recent Entries - with day of week and improved display */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">Histórico de BH</span>
          </div>
          
          {entries.length === 0 ? (
            <p className="text-center text-slate-400 py-4 text-sm">
              Nenhum registro de banco de horas.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {entries.slice(0, 10).map((entry) => {
                const editable = canEditEntry(entry);
                
                // Parse date from description to show day of week
                let entryDate: Date | null = null;
                let dayOfWeek = '';
                let formattedDate = '';
                
                if (entry.description) {
                  const match = entry.description.match(/BH - (\d{2})\/(\d{2})\/(\d{4})/);
                  if (match) {
                    const [, day, month, year] = match;
                    entryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    dayOfWeek = format(entryDate, 'EEEE', { locale: ptBR });
                    formattedDate = format(entryDate, 'dd/MM/yyyy', { locale: ptBR });
                  }
                }
                
                // Extract just the shift period from description (without duplicate date)
                let shiftPeriod = '';
                if (entry.description) {
                  const periodMatch = entry.description.match(/\| ([^(]+)/);
                  if (periodMatch) {
                    shiftPeriod = periodMatch[1].trim();
                  }
                }
                
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-sm group ${
                      editable ? 'bg-slate-700/30 cursor-pointer hover:bg-slate-700/50' : 'bg-slate-700/10 border border-slate-600/30'
                    }`}
                    onClick={() => editable && handleEditEntry(entry)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {/* Day of week */}
                        {dayOfWeek && (
                          <span className="text-xs font-semibold text-amber-400 capitalize">
                            {dayOfWeek}
                          </span>
                        )}
                        {/* Date */}
                        {formattedDate && (
                          <span className="text-xs text-slate-500">
                            {formattedDate}
                          </span>
                        )}
                        {!editable && (
                          <Badge variant="outline" className="text-[9px] text-slate-500 border-slate-600 py-0">
                            Fechado
                          </Badge>
                        )}
                      </div>
                      {/* Shift period */}
                      {shiftPeriod && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {shiftPeriod}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={entry.operation_type === 'credit'
                          ? 'text-green-400 border-green-500/50'
                          : 'text-red-400 border-red-500/50'
                        }
                      >
                        {entry.operation_type === 'credit' ? '+' : '-'}{entry.hours}h
                      </Badge>
                      {editable && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            onClick={(e) => { e.stopPropagation(); handleEditEntry(entry); }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={(e) => { e.stopPropagation(); handleRequestDelete(entry); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Registrar Banco de Horas</DialogTitle>
            <DialogDescription className="text-slate-400">
              Selecione o período e as horas trabalhadas para registrar no banco de horas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedDate && (
              <div className="space-y-4">
                <p className="text-lg text-white font-medium text-center">
                  {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>

                {/* Period Selection */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Período do dia</Label>
                  <RadioGroup
                    value={selectedPeriod}
                    onValueChange={setSelectedPeriod}
                    className="grid grid-cols-3 gap-2"
                  >
                    {DEFAULT_SHIFT_OPTIONS.map((shift) => {
                      const IconComponent = shift.icon;
                      return (
                        <div key={shift.value}>
                          <RadioGroupItem
                            value={shift.value}
                            id={`period-${shift.value}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`period-${shift.value}`}
                            className={`flex flex-col items-center justify-center rounded-lg border-2 p-2 cursor-pointer transition-all text-center
                              ${selectedPeriod === shift.value 
                                ? 'border-amber-500 bg-amber-500/20' 
                                : 'border-slate-600 hover:border-slate-500'
                              }`}
                          >
                            <IconComponent className={`h-4 w-4 ${shift.color}`} />
                            <span className="text-xs mt-1 text-slate-300">{shift.label}</span>
                            <span className="text-[10px] text-slate-500">{shift.startTime} - {shift.endTime}</span>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
                
                {/* Hour Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-300">Quantidade de horas</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={useCustomHours}
                        onCheckedChange={setUseCustomHours}
                        className="data-[state=checked]:bg-amber-500"
                      />
                      <span className="text-xs text-slate-400">Personalizado</span>
                    </div>
                  </div>
                  
                    {useCustomHours ? (
                    <div className="flex justify-center">
                      <NumberStepper
                        value={parseFloat(customHours) || 0.5}
                        onChange={(val) => setCustomHours(val.toString())}
                        min={0.5}
                        max={Math.max(0, currentFortnightLimit - currentFortnightBalance)}
                        step={0.5}
                        size="lg"
                        suffix="h"
                      />
                    </div>
                  ) : (
                    <RadioGroup
                      value={selectedHours.toString()}
                      onValueChange={(value) => setSelectedHours(parseInt(value))}
                      className="grid grid-cols-4 gap-2"
                    >
                      {HOUR_OPTIONS.map((option) => {
                        const canAdd = canAddHours(selectedDate ?? new Date(), option.value);
                        return (
                          <div key={option.value}>
                            <RadioGroupItem
                              value={option.value.toString()}
                              id={`hours-${option.value}`}
                              className="peer sr-only"
                              disabled={!canAdd}
                            />
                            <Label
                              htmlFor={`hours-${option.value}`}
                              className={`flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all
                                ${!canAdd ? 'opacity-50 cursor-not-allowed border-slate-700' : 
                                  selectedHours === option.value 
                                    ? 'border-green-500 bg-green-500/20 text-green-400' 
                                    : 'border-slate-600 hover:border-slate-500 text-slate-300'
                                }`}
                            >
                              <span className="text-lg font-bold">{option.label}</span>
                              <span className="text-xs text-slate-400">
                                R$ {(option.value * hourlyRate).toFixed(0)}
                              </span>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  )}
                </div>

                {/* Summary */}
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Horas</p>
                      <p className="text-xl font-bold text-green-400">+{getEffectiveHours()}h</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Valor</p>
                      <p className="text-xl font-bold text-amber-400">
                        R$ {(getEffectiveHours() * hourlyRate).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-sm text-slate-400">
                      Turno: <span className="text-amber-400 font-medium">{DEFAULT_SHIFT_OPTIONS.find(p => p.value === selectedPeriod)?.label}</span>
                    </p>
                    <p className="text-sm text-slate-400">
                      Novo saldo (na quinzena):{' '}
                      <span className="text-green-400 font-bold">
                        {(getFortnightBalanceForDate(selectedDate ?? new Date()) + getEffectiveHours()).toFixed(1)}h
                      </span>
                    </p>
                  </div>
                </div>

                {selectedDate && !canAddHours(selectedDate, getEffectiveHours()) && getEffectiveHours() > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>Esta quantidade excede o limite de {getFortnightLimitForDate(selectedDate ?? new Date())}h</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <X className="h-4 w-4 mr-1.5" />
              Fechar
            </Button>
            <Button
              onClick={handleConfirmBH}
              disabled={isAdding || (selectedDate ? !canAddHours(selectedDate, getEffectiveHours()) : true) || getEffectiveHours() <= 0}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                `Confirmar ${getEffectiveHours()}h`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Registro de BH</DialogTitle>
            <DialogDescription className="text-slate-400">
              Altere o turno realizado e/ou a quantidade de horas deste registro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {editingEntry && (
              <>
                <div className="p-3 bg-slate-700/30 rounded-lg">
                  <p className="text-slate-300">{editingEntry.description}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {format(new Date(editingEntry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Turno realizado</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {DEFAULT_SHIFT_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const active = editPeriod === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setEditPeriod(opt.value);
                            setEditHours(String(opt.hours));
                          }}
                          className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                            active
                              ? 'bg-amber-500/15 border-amber-500/60 text-amber-300'
                              : 'bg-slate-700/40 border-slate-600/50 text-slate-300 hover:bg-slate-700/60'
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${active ? 'text-amber-400' : opt.color}`} />
                          <span className="text-xs font-semibold">{opt.label}</span>
                          <span className="text-[10px] text-slate-400">{opt.startTime}–{opt.endTime}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Quantidade de horas</Label>
                  <div className="flex justify-center pt-2">
                    <NumberStepper
                      value={parseFloat(editHours) || 0.5}
                      onChange={(val) => setEditHours(val.toString())}
                      min={0.5}
                      max={200}
                      step={0.5}
                      size="lg"
                      suffix="h"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-slate-400">
                    Valor atualizado: <span className="text-amber-400 font-bold">R$ {((parseFloat(editHours) || 0) * hourlyRate).toFixed(2)}</span>
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <X className="h-4 w-4 mr-1.5" />
              Fechar
            </Button>
            <Button
              onClick={handleRequestEdit}
              disabled={
                isEditing ||
                (parseFloat(editHours) === editingEntry?.hours &&
                  // also allow save when only the period changed
                  new RegExp(DEFAULT_SHIFT_OPTIONS.find(o => o.value === editPeriod)?.label || '', 'i').test(editingEntry?.description || ''))
              }
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Revisar Alteração
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* Edit Confirmation Dialog */}
      <AlertDialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-400" />
              Confirmar Alteração
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-slate-400">
                {editingEntry && (
                  <div className="space-y-3 mt-2">
                    <p>Revise as alterações antes de confirmar:</p>
                    
                    {/* Entry Info */}
                    <div className="p-3 bg-slate-700/30 rounded-lg">
                      <p className="text-slate-300 font-medium text-sm">{editingEntry.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(editingEntry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>

                    {/* Changes Preview */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Before */}
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-[10px] text-red-400 uppercase font-semibold mb-1">Antes</p>
                        <p className="text-xl font-bold text-red-400">{editingEntry.hours}h</p>
                        <p className="text-xs text-slate-500">
                          R$ {(editingEntry.hours * hourlyRate).toFixed(2)}
                        </p>
                      </div>
                      
                      {/* After */}
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-[10px] text-green-400 uppercase font-semibold mb-1">Depois</p>
                        <p className="text-xl font-bold text-green-400">{parseFloat(editHours) || 0}h</p>
                        <p className="text-xs text-slate-500">
                          R$ {((parseFloat(editHours) || 0) * hourlyRate).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Difference */}
                    {(() => {
                      const diff = (parseFloat(editHours) || 0) - editingEntry.hours;
                      const diffValue = diff * hourlyRate;
                      const isPositive = diff > 0;
                      return (
                        <div className={`p-2 rounded-lg text-center ${
                          isPositive ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                        }`}>
                          <p className="text-xs text-slate-400">Diferença</p>
                          <p className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{diff.toFixed(1)}h ({isPositive ? '+' : ''}R$ {diffValue.toFixed(2)})
                          </p>
                        </div>
                      );
                    })()}

                    {/* Impact on Balance */}
                    <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <p className="text-xs text-slate-400 text-center">Novo saldo após alteração</p>
                      <p className="text-center font-bold text-amber-400">
                        {(balance - editingEntry.hours + (parseFloat(editHours) || 0)).toFixed(1)}h
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => {
                setShowEditConfirm(false);
                setShowEditDialog(true);
              }}
            >
              Voltar e Editar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmEdit}
              disabled={isEditing}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Confirmar Alteração'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {entryToDelete && (
                <div className="space-y-3 mt-2">
                  <p>Tem certeza que deseja excluir este registro de BH?</p>
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-slate-300 font-medium">{entryToDelete.description}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(entryToDelete.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-red-400 border-red-500/50">
                        {entryToDelete.operation_type === 'credit' ? '+' : '-'}{entryToDelete.hours}h
                      </Badge>
                      <span className="text-xs text-amber-400">
                        (R$ {(entryToDelete.hours * hourlyRate).toFixed(2)})
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-red-400">
                    ⚠️ Esta ação não pode ser desfeita!
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Sim, Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
