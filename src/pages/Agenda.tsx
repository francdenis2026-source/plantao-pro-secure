import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ThemedPanelBackground } from '@/components/ThemedPanelBackground';
import { BackButton } from '@/components/BackButton';
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, Bell, 
  Shield, Palmtree, RefreshCw, Briefcase, Star, Loader2,
  Trash2, Edit2
} from 'lucide-react';

type AlarmCategory = 'plantao' | 'bh' | 'folga' | 'permuta' | 'ferias' | 'reuniao' | 'personalizado';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  category: AlarmCategory;
  source: 'shift' | 'leave' | 'swap' | 'event' | 'custom';
}

const categoryConfig: Record<AlarmCategory, { color: string; icon: React.ReactNode; label: string }> = {
  plantao: { color: 'from-cyan-500 to-blue-600', icon: <Shield className="h-4 w-4" />, label: 'Plantão' },
  bh: { color: 'from-amber-500 to-orange-600', icon: <Clock className="h-4 w-4" />, label: 'Banco de Horas' },
  folga: { color: 'from-green-500 to-emerald-600', icon: <Palmtree className="h-4 w-4" />, label: 'Folga' },
  permuta: { color: 'from-yellow-500 to-amber-600', icon: <RefreshCw className="h-4 w-4" />, label: 'Permuta' },
  ferias: { color: 'from-purple-500 to-violet-600', icon: <Briefcase className="h-4 w-4" />, label: 'Férias' },
  reuniao: { color: 'from-slate-500 to-zinc-600', icon: <Bell className="h-4 w-4" />, label: 'Reunião' },
  personalizado: { color: 'from-rose-500 to-pink-600', icon: <Star className="h-4 w-4" />, label: 'Personalizado' },
};

export default function Agenda() {
  const { user, isLoading: authLoading } = useAuth();
  const { agent, isLoading: agentLoading } = useAgentProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  useBackNavigation({ fallbackPath: '/agent-panel' });

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '09:00',
    endTime: '',
    category: 'personalizado' as AlarmCategory,
    reminderMinutes: 60,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (agent?.id) {
      fetchEvents();
    }
  }, [agent?.id, currentMonth]);

  const fetchEvents = async () => {
    if (!agent?.id) return;
    
    setIsLoading(true);
    try {
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const calendarEvents: CalendarEvent[] = [];

      // Fetch shifts
      const { data: shifts } = await supabase
        .from('agent_shifts')
        .select('id, shift_date, start_time, end_time, status, is_vacation, notes')
        .eq('agent_id', agent.id)
        .gte('shift_date', monthStart)
        .lte('shift_date', monthEnd);

      shifts?.forEach(shift => {
        calendarEvents.push({
          id: `shift-${shift.id}`,
          title: shift.is_vacation ? 'Férias' : 'Plantão',
          description: shift.notes || undefined,
          date: parseISO(shift.shift_date),
          startTime: shift.start_time,
          endTime: shift.end_time,
          category: shift.is_vacation ? 'ferias' : 'plantao',
          source: 'shift',
        });
      });

      // Fetch leaves
      const { data: leaves } = await supabase
        .from('agent_leaves')
        .select('id, start_date, end_date, leave_type, status, reason')
        .eq('agent_id', agent.id)
        .gte('start_date', monthStart)
        .lte('start_date', monthEnd);

      leaves?.forEach(leave => {
        const category: AlarmCategory = leave.leave_type === 'vacation' ? 'ferias' : 'folga';
        calendarEvents.push({
          id: `leave-${leave.id}`,
          title: categoryConfig[category].label,
          description: leave.reason || undefined,
          date: parseISO(leave.start_date),
          category,
          source: 'leave',
        });
      });

      // Fetch events (custom)
      const { data: customEvents } = await supabase
        .from('agent_events')
        .select('*')
        .eq('agent_id', agent.id)
        .gte('event_date', monthStart)
        .lte('event_date', monthEnd);

      customEvents?.forEach(event => {
        const category: AlarmCategory = event.event_type === 'meeting' ? 'reuniao' : 'personalizado';
        calendarEvents.push({
          id: `event-${event.id}`,
          title: event.title,
          description: event.description || undefined,
          date: parseISO(event.event_date),
          startTime: event.start_time || undefined,
          endTime: event.end_time || undefined,
          category,
          source: 'event',
        });
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!agent?.id || !newEvent.title || !newEvent.date) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('agent_events').insert({
        agent_id: agent.id,
        title: newEvent.title,
        description: newEvent.description || null,
        event_date: newEvent.date,
        start_time: newEvent.startTime || null,
        end_time: newEvent.endTime || null,
        event_type: newEvent.category === 'reuniao' ? 'meeting' : 'custom',
        reminder_before: newEvent.reminderMinutes,
        color: null,
      });

      if (error) throw error;

      toast({ title: 'Evento criado!', description: 'Alarme configurado automaticamente.' });
      setShowAddDialog(false);
      setNewEvent({
        title: '',
        description: '',
        date: '',
        startTime: '09:00',
        endTime: '',
        category: 'personalizado',
        reminderMinutes: 60,
      });
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const realId = eventId.replace('event-', '');
    try {
      await supabase.from('agent_events').delete().eq('id', realId);
      toast({ title: 'Evento removido' });
      fetchEvents();
    } catch (error) {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startDay = startOfMonth(currentMonth).getDay();
  const paddingDays = Array(startDay).fill(null);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.date, day));
  };

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  if (authLoading || agentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <ThemedPanelBackground />
      
      <div className="relative z-10 p-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BackButton fallbackPath="/agent-panel" />
            <div>
              <h1 className="font-tactical text-xl font-bold tracking-[0.14em] text-foreground flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                Agenda
              </h1>
              <p className="text-sm text-muted-foreground">Compromissos e Alarmes</p>
            </div>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Evento</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Criar Alarme Personalizado
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Ex: Reunião com coordenação"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Detalhes do evento..."
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Input
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={newEvent.category}
                      onValueChange={(v) => setNewEvent({ ...newEvent, category: v as AlarmCategory })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personalizado">⭐ Personalizado</SelectItem>
                        <SelectItem value="reuniao">📋 Reunião</SelectItem>
                        <SelectItem value="bh">⏱️ Banco de Horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Alarme antes</Label>
                    <Select
                      value={String(newEvent.reminderMinutes)}
                      onValueChange={(v) => setNewEvent({ ...newEvent, reminderMinutes: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                        <SelectItem value="1440">1 dia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button onClick={handleSaveEvent} className="w-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
                  Criar com Alarme
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Calendar Grid */}
        <Card className="mb-6 border-primary/20 bg-card/80 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-lg font-bold capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {paddingDays.map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}
              {daysInMonth.map(day => {
                const dayEvents = getEventsForDay(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const today = isToday(day);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "aspect-square rounded-lg p-1 flex flex-col items-center justify-start transition-all relative overflow-hidden",
                      "hover:bg-primary/10 border border-transparent",
                      isSelected && "bg-primary/20 border-primary/50",
                      today && !isSelected && "bg-accent/50",
                      !isSameMonth(day, currentMonth) && "opacity-40"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-medium",
                      today && "text-primary font-bold",
                      isSelected && "text-primary"
                    )}>
                      {format(day, 'd')}
                    </span>
                    
                    {/* Event indicators */}
                    {dayEvents.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                        {dayEvents.slice(0, 3).map((event, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full bg-gradient-to-r",
                              categoryConfig[event.category].color
                            )}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Events */}
        {selectedDate && (
          <Card className="border-primary/20 bg-card/80 backdrop-blur animate-fade-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="capitalize">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </span>
                {isToday(selectedDate) && (
                  <Badge variant="outline" className="text-primary border-primary/50">Hoje</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum compromisso neste dia
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(event => {
                    const config = categoryConfig[event.category];
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all",
                          "bg-gradient-to-r from-muted/50 to-muted/30 border-border/50 hover:border-primary/30"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 bg-gradient-to-br",
                          config.color
                        )}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{event.title}</p>
                          {event.startTime && (
                            <p className="text-xs text-muted-foreground">
                              {event.startTime}{event.endTime && ` - ${event.endTime}`}
                            </p>
                          )}
                          {event.description && (
                            <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {config.label}
                        </Badge>
                        {event.source === 'event' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {Object.entries(categoryConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded-full bg-gradient-to-r", config.color)} />
              <span className="text-xs text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
