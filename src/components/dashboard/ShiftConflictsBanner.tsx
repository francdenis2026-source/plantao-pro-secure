import { useState } from 'react';
import { ShiftConflict } from '@/hooks/useShiftConflictDetection';
import { ResolveConflictDialog } from './ResolveConflictDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Users, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Wrench 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ShiftConflictsBannerProps {
  conflicts: ShiftConflict[];
  isChecking: boolean;
  onRefresh: () => void;
  onDismiss: (conflictId: string) => void;
}

export function ShiftConflictsBanner({
  conflicts,
  isChecking,
  onRefresh,
  onDismiss,
}: ShiftConflictsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ShiftConflict | null>(null);

  if (conflicts.length === 0) return null;

  const getTeamColor = (team: string): string => {
    const colors: Record<string, string> = {
      'ALFA': 'bg-red-500/20 text-red-400 border-red-500/30',
      'BRAVO': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'CHARLIE': 'bg-green-500/20 text-green-400 border-green-500/30',
      'DELTA': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    return colors[team] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleResolveClick = (conflict: ShiftConflict) => {
    setSelectedConflict(conflict);
    setResolveDialogOpen(true);
  };

  const handleResolved = () => {
    if (selectedConflict) {
      onDismiss(selectedConflict.id);
    }
    onRefresh();
  };

  return (
    <>
      <Card className="bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5">
        <CardContent className="p-0">
          {/* Header */}
          <div 
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-amber-500/5 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/20 animate-pulse">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  Conflitos de Escalas Detectados
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    {conflicts.length}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  {conflicts.length === 1 
                    ? 'Há 1 conflito que requer atenção'
                    : `Há ${conflicts.length} conflitos que requerem atenção`
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                disabled={isChecking}
              >
                <RefreshCw className={cn("h-4 w-4", isChecking && "animate-spin")} />
              </Button>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Conflicts list */}
          {isExpanded && (
            <ScrollArea className="max-h-[250px]">
              <div className="px-3 pb-3 space-y-2">
                {conflicts.map((conflict) => (
                  <div 
                    key={conflict.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Date */}
                      <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50 min-w-[50px]">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground mb-1" />
                        <span className="text-lg font-bold text-foreground leading-none">
                          {format(new Date(conflict.shift_date + 'T12:00:00'), 'dd')}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {format(new Date(conflict.shift_date + 'T12:00:00'), 'MMM', { locale: ptBR })}
                        </span>
                      </div>

                      {/* Team and agents */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getTeamColor(conflict.team))}
                          >
                            <Users className="h-3 w-3 mr-1" />
                            {conflict.team}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {conflict.agents.length} agentes no mesmo dia
                          </span>
                        </div>
                        
                        {/* Agent avatars */}
                        <div className="flex items-center gap-1">
                          {conflict.agents.slice(0, 5).map((agent, idx) => (
                            <div key={agent.id} className="relative" style={{ marginLeft: idx > 0 ? '-8px' : 0 }}>
                              <Avatar className="h-7 w-7 border-2 border-background">
                                {agent.avatar_url && (
                                  <AvatarImage src={agent.avatar_url} alt={agent.name} />
                                )}
                                <AvatarFallback className="text-[9px] bg-muted">
                                  {getInitials(agent.name)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          ))}
                          {conflict.agents.length > 5 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              +{conflict.agents.length - 5}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-2 truncate hidden sm:inline">
                            {conflict.agents.map(a => a.name.split(' ')[0]).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolveClick(conflict);
                        }}
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Resolver</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss(conflict.id);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <ResolveConflictDialog
        open={resolveDialogOpen}
        onOpenChange={setResolveDialogOpen}
        conflict={selectedConflict}
        onResolved={handleResolved}
      />
    </>
  );
}
