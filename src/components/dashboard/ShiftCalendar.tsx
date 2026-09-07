import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, CalendarDays, Minimize2, Maximize2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  agent: {
    name: string;
  } | null;
}

export function ShiftCalendar() {
  const [date, setDate] = useState<Date>(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isCompact, setIsCompact] = useState(() => {
    const saved = localStorage.getItem('shiftCalendarCompact');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('shiftCalendarCompact', JSON.stringify(isCompact));
  }, [isCompact]);

  useEffect(() => {
    fetchShifts();
  }, [date]);

  const fetchShifts = async () => {
    const start = format(startOfMonth(date), 'yyyy-MM-dd');
    const end = format(endOfMonth(date), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('agent_shifts')
      .select(`
        id,
        shift_date,
        start_time,
        end_time,
        shift_type,
        agent:agents(name)
      `)
      .gte('shift_date', start)
      .lte('shift_date', end);

    if (!error && data) {
      setShifts(data as unknown as Shift[]);
    }
  };

  // Derive selected date shifts reactively (fixes bug where selecting a date
  // didn't show shifts until user clicked twice or shifts arrived after selection)
  const selectedDateShifts = useMemo(() => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter((s) => s.shift_date === dateStr);
  }, [shifts, date]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) setDate(selectedDate);
  };

  const hasShifts = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return shifts.some(s => s.shift_date === dateStr);
  };

  const shiftsCount = shifts.filter(s => s.shift_date === format(date, 'yyyy-MM-dd')).length;

  return (
    <Card className="glass glass-border shadow-card h-full tactical-card relative overflow-hidden tactical-scan">
      <CardHeader className={cn("flex flex-row items-center justify-between", isCompact && "py-2 px-3")}>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className={cn("text-primary", isCompact ? "h-4 w-4" : "h-5 w-5")} />
          <span className={isCompact ? "text-sm" : ""}>Calendário de Escalas</span>
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsCompact(!isCompact)}
            title={isCompact ? "Expandir" : "Compactar"}
          >
            {isCompact ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setDate(new Date(date.setMonth(date.getMonth() - 1)))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className={cn("font-medium min-w-[100px] text-center capitalize", isCompact ? "text-xs" : "text-sm")}>
            {format(date, 'MMM yyyy', { locale: ptBR })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setDate(new Date(date.setMonth(date.getMonth() + 1)))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={isCompact ? "p-2 pt-0" : ""}>
        {isCompact ? (
          // Compact mode - inline calendar summary
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border/50">
              <div>
                <p className="text-xs text-muted-foreground">Selecionado</p>
                <p className="text-sm font-semibold">{format(date, "d 'de' MMM", { locale: ptBR })}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Plantões</p>
                <p className={cn(
                  "text-lg font-bold",
                  shiftsCount > 0 ? "text-primary" : "text-muted-foreground"
                )}>{shiftsCount}</p>
              </div>
            </div>
            {selectedDateShifts.length > 0 && (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {selectedDateShifts.slice(0, 3).map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-1.5 rounded bg-secondary/50 text-xs"
                  >
                    <span className="truncate font-medium">{shift.agent?.name || 'N/A'}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {shift.start_time?.slice(0, 5)}
                    </span>
                  </div>
                ))}
                {selectedDateShifts.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{selectedDateShifts.length - 3} mais
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          // Full mode - calendar with details
          <div className="flex flex-col lg:flex-row gap-4">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              locale={ptBR}
              className="rounded-md border-0"
              modifiers={{
                hasShifts: (day) => hasShifts(day),
              }}
              modifiersClassNames={{
                hasShifts: 'bg-primary/20 text-primary font-bold',
              }}
            />
            
            <div className="flex-1 min-w-[180px]">
              <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Plantões em {format(date, "d 'de' MMMM", { locale: ptBR })}
              </h4>
              {selectedDateShifts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum plantão agendado
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedDateShifts.map((shift, index) => (
                    <div
                      key={shift.id}
                      className="p-2 rounded-lg bg-secondary/50 border border-border tactical-card"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <p className="font-medium text-xs">
                        {shift.agent?.name || 'Agente não encontrado'}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-muted-foreground">
                          {shift.start_time} - {shift.end_time}
                        </p>
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary">
                          {shift.shift_type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
