import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, Sun, Sunset, Moon, Check, Calendar, TrendingUp, Clock, Target, Edit2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BHReminderSettingsProps {
  agentId: string;
  onReminderHourChange?: (hour: number) => void;
}

type ReminderPeriod = 'morning' | 'afternoon' | 'night';

interface PeriodOption {
  value: ReminderPeriod;
  label: string;
  description: string;
  hour: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  {
    value: 'morning',
    label: 'Manhã',
    description: '8h - Início do dia',
    hour: 8,
    icon: Sun,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20',
  },
  {
    value: 'afternoon',
    label: 'Tarde',
    description: '14h - Após o almoço',
    hour: 14,
    icon: Sunset,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20',
  },
  {
    value: 'night',
    label: 'Noite',
    description: '18h - Fim do expediente',
    hour: 18,
    icon: Moon,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20',
  },
];

const STORAGE_KEY = 'bh_reminder_period';
const GOAL_STORAGE_KEY = 'bh_monthly_goal';

interface FortnightStats {
  first: { entries: number; totalHours: number };
  second: { entries: number; totalHours: number };
}

export function BHReminderSettings({ agentId, onReminderHourChange }: BHReminderSettingsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<ReminderPeriod>('night');
  const [stats, setStats] = useState<FortnightStats>({ 
    first: { entries: 0, totalHours: 0 }, 
    second: { entries: 0, totalHours: 0 } 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(20);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('20');

  // Calculate total monthly hours and progress
  const totalMonthlyHours = stats.first.totalHours + stats.second.totalHours;
  const progressPercentage = monthlyGoal > 0 ? Math.min((totalMonthlyHours / monthlyGoal) * 100, 100) : 0;
  const isGoalReached = totalMonthlyHours >= monthlyGoal;

  // Load saved preference, goal and fetch stats
  useEffect(() => {
    const storedPeriod = localStorage.getItem(`${STORAGE_KEY}_${agentId}`);
    if (storedPeriod) {
      const period = storedPeriod as ReminderPeriod;
      if (PERIOD_OPTIONS.some(p => p.value === period)) {
        setSelectedPeriod(period);
        const option = PERIOD_OPTIONS.find(p => p.value === period);
        if (option && onReminderHourChange) {
          onReminderHourChange(option.hour);
        }
      }
    }

    const storedGoal = localStorage.getItem(`${GOAL_STORAGE_KEY}_${agentId}`);
    if (storedGoal) {
      const goal = parseFloat(storedGoal);
      if (!isNaN(goal) && goal > 0) {
        setMonthlyGoal(goal);
        setGoalInput(goal.toString());
      }
    }

    // Fetch BH stats for current month
    fetchFortnightStats();
  }, [agentId, onReminderHourChange]);

  const fetchFortnightStats = async () => {
    if (!agentId) return;
    
    setIsLoading(true);
    try {
      const now = new Date();
      
      const { data: entries, error } = await supabase
        .from('overtime_bank')
        .select('hours, description, created_at')
        .eq('agent_id', agentId);

      if (error) throw error;

      const currentMonthStr = format(now, 'MM/yyyy');
      const firstFortnight = { entries: 0, totalHours: 0 };
      const secondFortnight = { entries: 0, totalHours: 0 };

      (entries || []).forEach((entry) => {
        if (entry.description) {
          // Match pattern "BH - DD/MM/YYYY"
          const match = entry.description.match(/BH - (\d{2})\/(\d{2}\/\d{4})/);
          if (match) {
            const day = parseInt(match[1], 10);
            const monthYear = match[2];
            
            if (monthYear === currentMonthStr) {
              if (day <= 15) {
                firstFortnight.entries++;
                firstFortnight.totalHours += entry.hours || 0;
              } else {
                secondFortnight.entries++;
                secondFortnight.totalHours += entry.hours || 0;
              }
            }
          }
        }
      });

      setStats({ first: firstFortnight, second: secondFortnight });
    } catch (error) {
      console.error('Error fetching BH stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (value: ReminderPeriod) => {
    setSelectedPeriod(value);
    localStorage.setItem(`${STORAGE_KEY}_${agentId}`, value);
    
    const option = PERIOD_OPTIONS.find(p => p.value === value);
    if (option) {
      if (onReminderHourChange) {
        onReminderHourChange(option.hour);
      }
      
      toast.success(
        <div className="flex items-center gap-2">
          <option.icon className={`h-4 w-4 ${option.color}`} />
          <span>Lembrete configurado para às <strong>{option.hour}h</strong></span>
        </div>,
        { duration: 3000 }
      );
    }
  };

  const handleSaveGoal = () => {
    const newGoal = parseFloat(goalInput);
    if (isNaN(newGoal) || newGoal <= 0) {
      toast.error('Meta deve ser maior que zero');
      return;
    }
    
    setMonthlyGoal(newGoal);
    localStorage.setItem(`${GOAL_STORAGE_KEY}_${agentId}`, newGoal.toString());
    setIsEditingGoal(false);
    toast.success(`Meta mensal definida: ${newGoal}h`);
  };

  const getProgressColor = () => {
    if (isGoalReached) return 'bg-emerald-500';
    if (progressPercentage >= 75) return 'bg-amber-500';
    if (progressPercentage >= 50) return 'bg-blue-500';
    return 'bg-slate-500';
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-500" />
          Horário do Lembrete de BH
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-slate-500 mb-3">
          Escolha quando deseja receber o lembrete diário para registrar seu BH
        </p>
        
        <RadioGroup
          value={selectedPeriod}
          onValueChange={(value) => handlePeriodChange(value as ReminderPeriod)}
          className="grid grid-cols-3 gap-2"
        >
          {PERIOD_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedPeriod === option.value;
            
            return (
              <Label
                key={option.value}
                htmlFor={`period-${option.value}`}
                className={`
                  relative flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all
                  ${isSelected ? option.bgColor + ' ring-1 ring-offset-0' : 'bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50'}
                  ${isSelected ? `ring-${option.color.split('-')[1]}-500/50` : ''}
                `}
              >
                <RadioGroupItem
                  value={option.value}
                  id={`period-${option.value}`}
                  className="sr-only"
                />
                
                {isSelected && (
                  <div className="absolute top-1 right-1">
                    <Check className={`h-3 w-3 ${option.color}`} />
                  </div>
                )}
                
                <Icon className={`h-5 w-5 mb-1 ${isSelected ? option.color : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {option.label}
                </span>
                <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {option.hour}h
                </span>
              </Label>
            );
          })}
        </RadioGroup>

        {/* Monthly Goal Section */}
        <div className="mt-4 pt-3 border-t border-slate-600/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className={`h-3.5 w-3.5 ${isGoalReached ? 'text-emerald-500' : 'text-violet-500'}`} />
              <span className="text-xs font-medium text-slate-300">
                Meta Mensal de BH
              </span>
            </div>
            {!isEditingGoal ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingGoal(true)}
                className="h-6 px-2 text-[10px] text-slate-400 hover:text-white"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Editar
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="h-6 w-16 text-xs bg-slate-700 border-slate-600 text-white"
                  min="1"
                  step="0.5"
                />
                <span className="text-[10px] text-slate-500">h</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveGoal}
                  className="h-6 px-2 text-emerald-400 hover:text-emerald-300"
                >
                  <Save className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Progress 
                value={progressPercentage} 
                className="h-3 bg-slate-700/50"
              />
              <div 
                className={`absolute inset-0 h-3 rounded-full transition-all ${getProgressColor()}`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className={`font-medium ${isGoalReached ? 'text-emerald-400' : 'text-slate-300'}`}>
                {totalMonthlyHours.toFixed(1)}h de {monthlyGoal}h
              </span>
              <span className={`font-bold ${isGoalReached ? 'text-emerald-400' : 'text-slate-400'}`}>
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            {isGoalReached && (
              <div className="flex items-center justify-center gap-1 p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400">
                  Meta atingida! 🎉
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fortnight Stats */}
        <div className="mt-4 pt-3 border-t border-slate-600/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-medium text-slate-300">
              Estatísticas do Mês ({format(new Date(), 'MMMM', { locale: ptBR })})
            </span>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="h-14 bg-slate-700/30 rounded-lg animate-pulse" />
              <div className="h-14 bg-slate-700/30 rounded-lg animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {/* First Fortnight */}
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="h-3 w-3 text-blue-400" />
                  <span className="text-[10px] font-medium text-slate-400">1ª Quinzena</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-white">{stats.first.entries}</span>
                  <span className="text-[10px] text-slate-500">registros</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5 text-slate-500" />
                  <span className="text-[10px] text-slate-400">
                    {stats.first.totalHours > 0 ? '+' : ''}{stats.first.totalHours.toFixed(1)}h
                  </span>
                </div>
              </div>
              
              {/* Second Fortnight */}
              <div className="p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="h-3 w-3 text-purple-400" />
                  <span className="text-[10px] font-medium text-slate-400">2ª Quinzena</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-white">{stats.second.entries}</span>
                  <span className="text-[10px] text-slate-500">registros</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5 text-slate-500" />
                  <span className="text-[10px] text-slate-400">
                    {stats.second.totalHours > 0 ? '+' : ''}{stats.second.totalHours.toFixed(1)}h
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 p-2 bg-slate-700/20 rounded-lg border border-slate-600/30">
          <p className="text-[10px] text-slate-400 text-center">
            📝 O lembrete só aparece se você ainda não registrou BH no dia
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook to get saved reminder hour
export function useBHReminderHour(agentId: string): number {
  const [hour, setHour] = useState(18); // Default: night (6 PM)

  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${agentId}`);
    if (stored) {
      const option = PERIOD_OPTIONS.find(p => p.value === stored);
      if (option) {
        setHour(option.hour);
      }
    }
  }, [agentId]);

  return hour;
}
