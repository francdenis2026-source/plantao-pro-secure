import { useEffect, useState } from 'react';
import { useBirthdayNotifications } from '@/hooks/useBirthdayNotifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Cake, ChevronDown, ChevronUp, PartyPopper } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeamMember {
  id: string;
  name: string;
  birth_date: string | null;
  team: string | null;
  avatar_url: string | null;
  daysUntil?: number;
}

interface BirthdayCardProps {
  agentId: string;
  team: string | null;
  unitId: string | null;
}

export function BirthdayCard({ agentId, team, unitId }: BirthdayCardProps) {
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const { getUpcomingBirthdays, checkBirthdays } = useBirthdayNotifications({
    agentId,
    team,
    unitId,
    enabled: true,
  });

  useEffect(() => {
    loadBirthdays();
    checkBirthdays();
  }, [team, unitId]);

  const loadBirthdays = async () => {
    setIsLoading(true);
    const birthdays = await getUpcomingBirthdays();
    setUpcomingBirthdays(birthdays);
    setIsLoading(false);
  };

  const getBirthdayThisYear = (birthDate: string): Date => {
    const date = parseISO(birthDate);
    const today = new Date();
    return new Date(today.getFullYear(), date.getMonth(), date.getDate());
  };

  if (isLoading) {
    return (
      <div className="p-2.5 bg-zinc-900/70 border border-zinc-700/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    );
  }

  if (upcomingBirthdays.length === 0) {
    return (
      <div className="p-2.5 bg-zinc-900/70 border border-zinc-700/50 rounded-lg">
        <div className="flex items-center gap-2 text-zinc-500">
          <Cake className="h-4 w-4" />
          <span className="text-xs">Nenhum aniversário próximo</span>
        </div>
      </div>
    );
  }

  const todayBirthdays = upcomingBirthdays.filter(m => m.daysUntil === 0);
  const upcomingList = upcomingBirthdays.filter(m => (m.daysUntil ?? 0) > 0);
  const displayList = upcomingList.slice(0, 4);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="bg-zinc-900/70 border border-zinc-700/50 rounded-lg overflow-hidden">
        {/* Header - Always visible */}
        <CollapsibleTrigger className="w-full px-2.5 py-2 flex items-center justify-between hover:bg-zinc-800/30 transition-colors min-h-[40px]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded bg-pink-500/15 border border-pink-500/30 shrink-0">
              <Cake className="h-3.5 w-3.5 text-pink-400" />
            </div>
            <span className="text-xs font-semibold text-zinc-200 truncate">Aniversários</span>
            {todayBirthdays.length > 0 && (
              <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30 text-[9px] px-1.5 py-0 h-4 animate-pulse shrink-0">
                <PartyPopper className="h-2.5 w-2.5 mr-0.5" />
                Hoje!
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Avatar stack preview */}
            <div className="flex -space-x-1.5">
              {upcomingBirthdays.slice(0, 3).map((member) => (
                <Avatar key={member.id} className="h-5 w-5 border border-zinc-800">
                  {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                  <AvatarFallback className="bg-pink-500/20 text-pink-300 text-[8px] font-bold">
                    {member.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {upcomingBirthdays.length > 3 && (
                <div className="h-5 w-5 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-400 border border-zinc-800">
                  +{upcomingBirthdays.length - 3}
                </div>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-2.5 pb-2 space-y-1">
            {/* Today's Birthdays */}
            {todayBirthdays.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 p-1.5 bg-pink-500/10 rounded border border-pink-500/20"
              >
                <Avatar className="h-6 w-6 border border-pink-500/40">
                  {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                  <AvatarFallback className="bg-pink-500/20 text-pink-300 text-[9px] font-bold">
                    {member.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-zinc-100 truncate block">{member.name}</span>
                </div>
                <span className="text-sm">🎉</span>
              </div>
            ))}

            {/* Upcoming */}
            {displayList.map((member) => {
              const birthday = member.birth_date ? getBirthdayThisYear(member.birth_date) : null;
              const daysUntil = member.daysUntil ?? 0;
              
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2 p-1.5 bg-zinc-800/40 rounded border border-zinc-700/40"
                >
                  <Avatar className="h-5 w-5 border border-zinc-600/50">
                    {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                    <AvatarFallback className="bg-zinc-700 text-zinc-300 text-[8px] font-bold">
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] text-zinc-300 truncate block">{member.name}</span>
                  </div>
                  {birthday && (
                    <span className="text-[9px] text-zinc-500">
                      {format(birthday, "dd/MM", { locale: ptBR })}
                    </span>
                  )}
                  <Badge className={`text-[8px] px-1 py-0 h-3.5 ${
                    daysUntil === 1 
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                      : 'bg-zinc-700/50 text-zinc-400 border-zinc-600/40'
                  }`}>
                    {daysUntil === 1 ? 'Amanhã' : `${daysUntil}d`}
                  </Badge>
                </div>
              );
            })}
            
            {upcomingList.length > 4 && (
              <p className="text-[9px] text-center text-zinc-500 pt-0.5">
                +{upcomingList.length - 4} mais
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
