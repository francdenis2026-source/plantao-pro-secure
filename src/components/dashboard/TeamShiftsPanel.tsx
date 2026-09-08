import { useState, useEffect, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Users, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  CalendarDays,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { Icon3D } from '@/components/ui/Icon3D';
import { format, addDays, startOfWeek, isSameDay, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TeamEmblem } from '@/components/TeamEmblem';

interface ShiftWithAgent {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
  shift_type: string;
  agent: {
    id: string;
    name: string;
    team: string | null;
    avatar_url: string | null;
  };
}

interface DayShifts {
  date: Date;
  shifts: ShiftWithAgent[];
}

export const TeamShiftsPanel = forwardRef<HTMLDivElement>(function TeamShiftsPanel(_props, ref) {
  const [shifts, setShifts] = useState<ShiftWithAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [teams, setTeams] = useState<string[]>([]);

  useEffect(() => {
    fetchShifts();
  }, [weekStart]);

  const fetchShifts = async () => {
    setIsLoading(true);
    try {
      const weekEnd = addDays(weekStart, 6);
      
      const { data, error } = await supabase
        .from('agent_shifts')
        .select(`
          id,
          shift_date,
          start_time,
          end_time,
          status,
          shift_type,
          agents!inner (
            id,
            name,
            team,
            avatar_url
          )
        `)
        .gte('shift_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('shift_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('shift_date', { ascending: true });

      if (error) throw error;

      const formattedShifts: ShiftWithAgent[] = (data || []).map((item: any) => ({
        id: item.id,
        shift_date: item.shift_date,
        start_time: item.start_time,
        end_time: item.end_time,
        status: item.status,
        shift_type: item.shift_type,
        agent: {
          id: item.agents.id,
          name: item.agents.name,
          team: item.agents.team,
          avatar_url: item.agents.avatar_url,
        },
      }));

      setShifts(formattedShifts);
      
      // Extract unique teams
      const uniqueTeams = [...new Set(formattedShifts.map(s => s.agent.team).filter(Boolean))] as string[];
      setTeams(uniqueTeams.sort());
    } catch (error) {
      console.error('Error fetching team shifts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setWeekStart(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  const goToCurrentWeek = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  // Generate days of the week
  const weekDays: DayShifts[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dayShifts = shifts.filter(s => {
      const shiftDate = new Date(s.shift_date + 'T00:00:00');
      const matchesTeam = !selectedTeam || s.agent.team === selectedTeam;
      return isSameDay(shiftDate, date) && matchesTeam;
    });
    return { date, shifts: dayShifts };
  });

  const filteredShifts = selectedTeam 
    ? shifts.filter(s => s.agent.team === selectedTeam)
    : shifts;

  const totalShiftsThisWeek = filteredShifts.length;
  const todayShifts = filteredShifts.filter(s => isToday(new Date(s.shift_date + 'T00:00:00')));

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getDayLabel = (date: Date): string => {
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, 'EEEE', { locale: ptBR });
  };

  const getTeamColor = (team: string | null): string => {
    const colors: Record<string, string> = {
      'ALFA': 'bg-red-500/20 text-red-400 border-red-500/30',
      'BRAVO': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'CHARLIE': 'bg-green-500/20 text-green-400 border-green-500/30',
      'DELTA': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    return colors[team || ''] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon3D name="calendar" size={22} />
            </div>
            <div>
              <CardTitle className="text-lg">Escalas da Equipe</CardTitle>
              <p className="text-xs text-muted-foreground">
                {format(weekStart, "dd 'de' MMMM", { locale: ptBR })} - {format(addDays(weekStart, 6), "dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Team filter */}
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                variant={selectedTeam === null ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedTeam(null)}
              >
                Todas
              </Button>
              {teams.map(team => (
                <Button
                  key={team}
                  variant={selectedTeam === team ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs gap-1.5 pl-1.5"
                  onClick={() => setSelectedTeam(team)}
                >
                  <TeamEmblem team={team} size="xs" />
                  {team}
                </Button>
              ))}
            </div>
            
            {/* Week navigation */}
            <div className="flex items-center gap-1 ml-2">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={goToCurrentWeek}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-semibold text-foreground">{totalShiftsThisWeek}</span>
              <span className="text-muted-foreground"> plantões na semana</span>
            </span>
          </div>
          {todayShifts.length > 0 && (
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              <span className="text-sm">
                <span className="font-semibold text-primary">{todayShifts.length}</span>
                <span className="text-muted-foreground"> de plantão hoje</span>
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Week calendar grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekDays.map(({ date, shifts: dayShifts }) => {
            const isCurrentDay = isToday(date);
            
            return (
              <div 
                key={date.toISOString()}
                className={`
                  rounded-lg border transition-all min-h-[120px]
                  ${isCurrentDay 
                    ? 'border-primary/50 bg-primary/5' 
                    : 'border-border/30 bg-muted/20 hover:bg-muted/30'
                  }
                `}
              >
                {/* Day header */}
                <div className={`
                  px-2 py-1.5 border-b text-center
                  ${isCurrentDay ? 'border-primary/30' : 'border-border/30'}
                `}>
                  <p className={`text-[10px] uppercase tracking-wide ${isCurrentDay ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                    {getDayLabel(date)}
                  </p>
                  <p className={`text-lg font-bold ${isCurrentDay ? 'text-primary' : 'text-foreground'}`}>
                    {format(date, 'dd')}
                  </p>
                </div>
                
                {/* Shifts list */}
                <ScrollArea className="h-[80px]">
                  <div className="p-1 space-y-1">
                    {dayShifts.length === 0 ? (
                      <div className="flex items-center justify-center h-12 text-muted-foreground">
                        <span className="text-[10px]">Sem plantão</span>
                      </div>
                    ) : (
                      dayShifts.map(shift => (
                        <div 
                          key={shift.id}
                          className={`
                            flex items-center gap-1 p-1 rounded text-[10px]
                            ${getTeamColor(shift.agent.team)}
                            border
                          `}
                        >
                          <Avatar className="h-4 w-4">
                            {shift.agent.avatar_url && (
                              <AvatarImage src={shift.agent.avatar_url} alt={shift.agent.name} />
                            )}
                            <AvatarFallback className="text-[6px] bg-background">
                              {getInitials(shift.agent.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate font-medium flex-1">
                            {shift.agent.name.split(' ')[0]}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/50">
          {teams.slice(0, 4).map(team => (
            <div key={team} className="flex items-center gap-1.5">
              <TeamEmblem team={team} size="xs" />
              <span className="text-[11px] font-semibold text-muted-foreground">{team}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
