import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CalendarDays, Plus, Loader2, Edit2, Trash2, Clock, FileText, Users, Bell } from 'lucide-react';
import { EmptyState } from '@/components/ui/data-states';
import { format, parseISO, isToday, isFuture, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgentEventsCardProps {
  agentId: string;
}

interface AgentEvent {
  id: string;
  event_date: string;
  title: string;
  description: string | null;
  event_type: string;
  color: string;
  is_all_day: boolean;
  start_time: string | null;
  end_time: string | null;
}

const eventTypes = [
  { value: 'note', label: 'Anotação', icon: FileText },
  { value: 'meeting', label: 'Reunião', icon: Users },
  { value: 'reminder', label: 'Lembrete', icon: Bell },
  { value: 'appointment', label: 'Compromisso', icon: Clock },
];

const colorOptions = [
  { value: 'amber', label: 'Amarelo', class: 'bg-amber-500' },
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'green', label: 'Verde', class: 'bg-green-500' },
  { value: 'red', label: 'Vermelho', class: 'bg-red-500' },
  { value: 'purple', label: 'Roxo', class: 'bg-purple-500' },
];

export function AgentEventsCard({ agentId }: AgentEventsCardProps) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgentEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'note',
    color: 'amber',
    is_all_day: true,
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    fetchEvents();
  }, [agentId]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('agent_events')
        .select('*')
        .eq('agent_id', agentId)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents((data || []) as AgentEvent[]);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    
    // Check if there's an existing event on this date
    const existingEvent = events.find(e => 
      format(parseISO(e.event_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    
    if (existingEvent) {
      setEditingEvent(existingEvent);
      setFormData({
        title: existingEvent.title,
        description: existingEvent.description || '',
        event_type: existingEvent.event_type,
        color: existingEvent.color,
        is_all_day: existingEvent.is_all_day,
        start_time: existingEvent.start_time || '',
        end_time: existingEvent.end_time || ''
      });
    } else {
      setEditingEvent(null);
      setFormData({
        title: '',
        description: '',
        event_type: 'note',
        color: 'amber',
        is_all_day: true,
        start_time: '',
        end_time: ''
      });
    }
    
    setShowEventDialog(true);
  };

  const handleSaveEvent = async () => {
    if (!formData.title.trim()) {
      toast.error('Digite um título para o evento');
      return;
    }

    if (!selectedDate) return;

    try {
      setIsSaving(true);

      const eventData = {
        agent_id: agentId,
        event_date: format(selectedDate, 'yyyy-MM-dd'),
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        event_type: formData.event_type,
        color: formData.color,
        is_all_day: formData.is_all_day,
        start_time: formData.is_all_day ? null : formData.start_time || null,
        end_time: formData.is_all_day ? null : formData.end_time || null,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('agent_events')
          .update(eventData)
          .eq('id', editingEvent.id);
        if (error) throw error;
        toast.success('Evento atualizado!');
      } else {
        const { error } = await supabase
          .from('agent_events')
          .insert(eventData);
        if (error) throw error;
        toast.success('Evento criado!');
      }

      setShowEventDialog(false);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Erro ao salvar evento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;

    try {
      const { error } = await supabase
        .from('agent_events')
        .delete()
        .eq('id', editingEvent.id);

      if (error) throw error;

      toast.success('Evento excluído!');
      setShowEventDialog(false);
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erro ao excluir evento');
    }
  };

  const getEventDates = () => {
    return events.map(e => parseISO(e.event_date));
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      amber: 'bg-amber-500/10 text-amber-200/90 border-amber-500/25',
      blue: 'bg-blue-500/10 text-blue-200/90 border-blue-500/25',
      green: 'bg-green-500/10 text-green-200/90 border-green-500/25',
      red: 'bg-red-500/10 text-red-200/90 border-red-500/25',
      purple: 'bg-purple-500/10 text-purple-200/90 border-purple-500/25',
    };
    return colorMap[color] || colorMap.amber;
  };

  const upcomingEvents = events
    .filter(e => isFuture(parseISO(e.event_date)) || isToday(parseISO(e.event_date)))
    .slice(0, 5);

  return (
    <Card className="card-night-cyan bg-gradient-to-br from-[hsl(222,60%,3%)] via-[hsl(222,55%,5%)] to-[hsl(187,40%,8%)] border-3 border-cyan-500/50 overflow-hidden transition-all duration-300 hover:border-cyan-400/70 group relative">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardHeader className="pb-2 pt-2.5 px-2.5 md:pb-3 md:pt-3 md:px-3 relative">
        <CardTitle className="flex items-center justify-between text-sm md:text-base">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="p-1 md:p-1.5 rounded-md bg-cyan-500/15 border border-cyan-500/30">
              <CalendarDays className="h-3.5 w-3.5 md:h-4 md:w-4 text-cyan-300" />
            </div>
            <span className="font-semibold text-cyan-100">
              Agenda Pessoal
            </span>
          </div>
          <Badge className="text-[10px] md:text-xs bg-cyan-500/10 text-cyan-200/90 border border-cyan-500/25 px-1.5 py-0 h-5 font-medium">
            {events.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4 relative px-2.5 pb-2.5 md:px-3 md:pb-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
          </div>
        ) : (
          <>
            {/* Calendar with events */}
            <div className="bg-slate-800/60 rounded-xl p-3 border-2 border-cyan-500/20">
              <Calendar
                mode="single"
                selected={selectedDate}
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                onSelect={handleDateClick}
                locale={ptBR}
                modifiers={{
                  event: getEventDates(),
                }}
                modifiersStyles={{
                  event: {
                    backgroundColor: 'rgba(6, 182, 212, 0.3)',
                    color: '#22d3ee',
                    fontWeight: 'bold',
                    borderRadius: '50%'
                  }
                }}
                className="rounded-md"
              />
              <p className="text-sm text-cyan-300/60 text-center mt-3 font-medium">
                Clique em uma data para adicionar ou editar eventos
              </p>
            </div>

            {/* Upcoming Events / Empty */}
            {events.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Nenhum evento na agenda"
                description="Registre reuniões, treinamentos, prazos e lembretes pessoais. Toque numa data ou crie agora."
                action={
                  <button
                    type="button"
                    onClick={() => handleDateClick(new Date())}
                    className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-300 transition-all hover:bg-cyan-500/20 hover:border-cyan-400/70 focus-ring-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar evento
                  </button>
                }
              />
            ) : upcomingEvents.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Próximos Eventos</h4>
                <div className="space-y-2">
                  {upcomingEvents.map((event) => {
                    const eventDate = parseISO(event.event_date);
                    const EventIcon = eventTypes.find(t => t.value === event.event_type)?.icon || FileText;
                    
                    return (
                      <div
                        key={event.id}
                        onClick={() => {
                          setSelectedDate(eventDate);
                          setEditingEvent(event);
                          setFormData({
                            title: event.title,
                            description: event.description || '',
                            event_type: event.event_type,
                            color: event.color,
                            is_all_day: event.is_all_day,
                            start_time: event.start_time || '',
                            end_time: event.end_time || ''
                          });
                          setShowEventDialog(true);
                        }}
                        className={`flex items-center gap-2 px-2 py-1.5 md:px-2.5 md:py-2 rounded-md cursor-pointer hover:opacity-80 transition-opacity border ${getColorClass(event.color)}`}
                      >
                        <EventIcon className="h-3.5 w-3.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs md:text-sm font-medium truncate">{event.title}</p>
                          <p className="text-[10px] md:text-[11px] opacity-70">
                            {format(eventDate, "dd/MM/yyyy", { locale: ptBR })}
                            {event.start_time && ` às ${event.start_time}`}
                          </p>
                        </div>
                        {isToday(eventDate) && (
                          <Badge className="bg-green-500/15 text-green-300 border border-green-500/25 text-[9px] px-1.5 py-0 h-4">Hoje</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 pt-2 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500/50" />
                <span className="text-xs text-slate-400">Evento</span>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingEvent ? <Edit2 className="h-5 w-5 text-amber-500" /> : <Plus className="h-5 w-5 text-amber-500" />}
              {editingEvent ? 'Editar Evento' : 'Novo Evento'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {selectedDate && (
              <div className="p-2 bg-slate-700/50 rounded-lg text-center">
                <p className="text-sm text-slate-300">
                  {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Reunião de equipe"
                className="bg-slate-700 border-slate-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${color.class}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detalhes do evento..."
                className="bg-slate-700 border-slate-600 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={handleDeleteEvent}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowEventDialog(false)}
              className="border-slate-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEvent}
              disabled={isSaving || !formData.title.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
