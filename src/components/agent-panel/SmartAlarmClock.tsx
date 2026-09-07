import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartAlarms, UpcomingAlarm, AlarmCategory, categoryConfig } from '@/hooks/useSmartAlarms';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Bell, BellRing, Clock, ChevronDown, ChevronUp, 
  Volume2, VolumeX, Calendar, Zap, AlertTriangle,
  Plus, ExternalLink, Loader2, Star
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useServerTime } from '@/hooks/useServerTime';

interface SmartAlarmClockProps {
  agentId: string;
}

export function SmartAlarmClock({ agentId }: SmartAlarmClockProps) {
  const { alarms, isLoading, nextAlarm, playCategorySound, refreshAlarms } = useSmartAlarms({ agentId });
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentTime = useServerTime(1000);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newAlarm, setNewAlarm] = useState({
    title: '',
    date: '',
    time: '09:00',
    category: 'personalizado' as AlarmCategory,
  });


  const testSound = (category: AlarmCategory) => {
    if (isSoundEnabled) {
      playCategorySound(category);
    }
  };

  const handleSaveAlarm = async () => {
    if (!newAlarm.title || !newAlarm.date) {
      toast({ title: 'Preencha título e data', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('agent_events').insert({
        agent_id: agentId,
        title: newAlarm.title,
        event_date: newAlarm.date,
        start_time: newAlarm.time,
        event_type: newAlarm.category === 'reuniao' ? 'meeting' : 'custom',
        reminder_before: 60,
      });

      if (error) throw error;

      toast({ title: 'Alarme criado!', description: 'Notificação configurada.' });
      setShowAddDialog(false);
      setNewAlarm({ title: '', date: '', time: '09:00', category: 'personalizado' });
      refreshAlarms();
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const hours = format(currentTime, 'HH');
  const minutes = format(currentTime, 'mm');
  const seconds = format(currentTime, 'ss');
  const dayOfWeek = format(currentTime, 'EEEE', { locale: ptBR });
  const dateStr = format(currentTime, "dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-900 border border-zinc-700/60 shadow-2xl">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Rotating Glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] opacity-20"
          style={{
            background: 'conic-gradient(from 0deg, transparent, rgba(6,182,212,0.3), transparent, rgba(168,85,247,0.3), transparent)',
            animation: 'spin 20s linear infinite',
          }}
        />
        
        {/* Pulse rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-40 h-40 rounded-full border border-cyan-500/20 animate-ping" style={{ animationDuration: '3s' }} />
        </div>
        
      </div>

      <div className="relative z-10 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
                <BellRing className={cn(
                  "h-5 w-5 text-cyan-400",
                  nextAlarm?.isUrgent && "animate-bounce"
                )} />
              </div>
              {alarms.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-rose-500/40">
                  {alarms.length}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Alarmes Inteligentes</h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Sistema de Alertas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Add Alarm Button */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm bg-slate-900 border-zinc-700">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-white">
                    <Star className="h-5 w-5 text-amber-400" />
                    Criar Alarme Rápido
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Título</Label>
                    <Input
                      value={newAlarm.title}
                      onChange={(e) => setNewAlarm({ ...newAlarm, title: e.target.value })}
                      placeholder="Ex: Lembrete importante"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Data</Label>
                      <Input
                        type="date"
                        value={newAlarm.date}
                        onChange={(e) => setNewAlarm({ ...newAlarm, date: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Hora</Label>
                      <Input
                        type="time"
                        value={newAlarm.time}
                        onChange={(e) => setNewAlarm({ ...newAlarm, time: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Categoria</Label>
                    <Select
                      value={newAlarm.category}
                      onValueChange={(v) => setNewAlarm({ ...newAlarm, category: v as AlarmCategory })}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="personalizado">⭐ Personalizado</SelectItem>
                        <SelectItem value="reuniao">📋 Reunião</SelectItem>
                        <SelectItem value="bh">⏱️ Banco de Horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={handleSaveAlarm} 
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
                    Criar Alarme
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                    className="h-8 w-8 p-0 text-zinc-400 hover:text-cyan-400"
                  >
                    {isSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isSoundEnabled ? 'Desativar sons' : 'Ativar sons'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Main Clock Display */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-1">
            {/* Hours */}
            <div className="relative">
              <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-300 tabular-nums tracking-tight">
                {hours}
              </div>
              <div className="absolute inset-0 blur-xl bg-cyan-500/30" />
            </div>
            
            {/* Separator */}
            <div className="flex flex-col gap-1.5 mx-1">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            
            {/* Minutes */}
            <div className="relative">
              <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-100 to-purple-300 tabular-nums tracking-tight">
                {minutes}
              </div>
              <div className="absolute inset-0 blur-xl bg-purple-500/30" />
            </div>
            
            {/* Seconds */}
            <div className="text-2xl font-bold text-zinc-500 tabular-nums self-end mb-2 ml-1">
              :{seconds}
            </div>
          </div>
          
          {/* Date */}
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">
              {dayOfWeek}
            </span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span className="text-xs text-zinc-400">
              {dateStr}
            </span>
          </div>
        </div>

        {/* Next Alarm Highlight */}
        {nextAlarm && (
          <div className={cn(
            "p-3 rounded-xl border mb-4 transition-all",
            nextAlarm.isUrgent
              ? "bg-gradient-to-r from-rose-500/20 to-orange-500/15 border-rose-500/40 animate-pulse"
              : "bg-gradient-to-r from-zinc-800/80 to-zinc-700/50 border-zinc-600/40"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                `bg-gradient-to-br ${nextAlarm.color}`
              )}>
                {nextAlarm.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white truncate">{nextAlarm.title}</span>
                  {nextAlarm.isUrgent && (
                    <AlertTriangle className="h-4 w-4 text-rose-400 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-zinc-400 truncate">{nextAlarm.description}</p>
              </div>
              <div className="text-right shrink-0">
                <div className={cn(
                  "text-lg font-black tabular-nums",
                  nextAlarm.isUrgent ? "text-rose-400" : "text-cyan-400"
                )}>
                  {nextAlarm.timeUntil}
                </div>
                <span className="text-[10px] text-zinc-500 uppercase">restante</span>
              </div>
            </div>
          </div>
        )}

        {/* Category Sound Test */}
        <div className="mb-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 text-center">
            Sons por Categoria (toque para testar)
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {(Object.keys(categoryConfig) as AlarmCategory[]).map((category) => {
              const config = categoryConfig[category];
              return (
                <TooltipProvider key={category}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => testSound(category)}
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all",
                          "bg-gradient-to-br border hover:scale-110 active:scale-95",
                          config.color,
                          "border-white/20 shadow-lg"
                        )}
                      >
                        {config.icon}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-zinc-800 border-zinc-700">
                      <p className="text-xs font-semibold">{config.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>

        {/* Expandable Alarm List */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full h-8 text-xs text-zinc-400 hover:text-white border border-zinc-700/50 hover:border-zinc-600"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
                  Ocultar agenda
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
                  Ver {alarms.length} compromissos
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-3 space-y-2 animate-fade-in">
            {alarms.length === 0 ? (
              <div className="text-center py-4 text-zinc-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Nenhum compromisso próximo</p>
              </div>
            ) : (
              alarms.slice(0, 5).map((alarm, index) => (
                <div
                  key={alarm.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border transition-all",
                    alarm.isUrgent
                      ? "bg-rose-500/10 border-rose-500/30"
                      : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0",
                    `bg-gradient-to-br ${alarm.color}`
                  )}>
                    {alarm.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{alarm.title}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{alarm.description}</p>
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[10px] shrink-0",
                    alarm.isUrgent
                      ? "border-rose-500/50 text-rose-400"
                      : "border-cyan-500/50 text-cyan-400"
                  )}>
                    {alarm.timeUntil}
                  </Badge>
                </div>
              ))
            )}
            
            {/* Link to full agenda */}
            <Button
              variant="ghost"
              className="w-full mt-2 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
              onClick={() => navigate('/agenda')}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Abrir Agenda Completa
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-rose-500 opacity-60" />

      <style>{`
        @keyframes spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
