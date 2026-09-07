import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Megaphone, Bell, AlertCircle, AlertTriangle, X, 
  Check, Clock, ChevronDown, ChevronUp 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string | null;
  priority: string;
  created_at: string;
  expires_at: string | null;
  target_type: string;
  target_unit_id: string | null;
  target_team: string | null;
}

interface AdminAnnouncementsPanelProps {
  agentId: string;
  agentUnitId?: string | null;
  agentTeam?: string | null;
  className?: string;
}

export function AdminAnnouncementsPanel({ 
  agentId, 
  agentUnitId, 
  agentTeam, 
  className 
}: AdminAnnouncementsPanelProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Load read announcements from localStorage
    const storedRead = localStorage.getItem(`announcements_read_${agentId}`);
    if (storedRead) {
      setReadIds(new Set(JSON.parse(storedRead)));
    }
  }, [agentId]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const now = new Date().toISOString();
        
        const { data, error } = await supabase
          .from('admin_announcements')
          .select('*')
          .eq('is_active', true)
          .lte('starts_at', now)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Filter by target
        const filtered = (data || []).filter(ann => {
          if (ann.target_type === 'all') return true;
          if (ann.target_type === 'unit' && ann.target_unit_id === agentUnitId) return true;
          if (ann.target_type === 'team' && ann.target_team === agentTeam) return true;
          return false;
        });

        setAnnouncements(filtered);
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin_announcements_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_announcements' },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, agentUnitId, agentTeam]);

  const markAsRead = (announcementId: string) => {
    const newReadIds = new Set(readIds);
    newReadIds.add(announcementId);
    setReadIds(newReadIds);
    localStorage.setItem(
      `announcements_read_${agentId}`, 
      JSON.stringify([...newReadIds])
    );
  };

  const markAllAsRead = () => {
    const allIds = new Set(announcements.map(a => a.id));
    setReadIds(allIds);
    localStorage.setItem(
      `announcements_read_${agentId}`, 
      JSON.stringify([...allIds])
    );
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
      markAsRead(id);
    }
    setExpandedIds(newExpanded);
  };

  const unreadCount = announcements.filter(a => !readIds.has(a.id)).length;
  const urgentCount = announcements.filter(a => a.priority === 'urgent' && !readIds.has(a.id)).length;

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          label: 'URGENTE',
          badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
          cardClass: 'border-red-500/50 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent',
          iconClass: 'text-red-400',
          animate: true,
        };
      case 'high':
        return {
          icon: <Bell className="h-4 w-4" />,
          label: 'IMPORTANTE',
          badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          cardClass: 'border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent',
          iconClass: 'text-amber-400',
          animate: true,
        };
      case 'normal':
        return {
          icon: <Megaphone className="h-4 w-4" />,
          label: 'NORMAL',
          badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          cardClass: 'border-blue-500/30 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent',
          iconClass: 'text-blue-400',
          animate: false,
        };
      default:
        return {
          icon: <Megaphone className="h-4 w-4" />,
          label: 'INFO',
          badgeClass: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
          cardClass: 'border-slate-500/30 bg-gradient-to-r from-slate-500/5 via-transparent to-transparent',
          iconClass: 'text-slate-400',
          animate: false,
        };
    }
  };

  if (isLoading || announcements.length === 0) {
    return null;
  }

  return (
    <Card className={cn("glass glass-border shadow-card overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="relative">
              <Megaphone className="h-5 w-5 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            Avisos Administrativos
            {urgentCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar lidos
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="pt-0">
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {announcements.map((announcement) => {
                const config = getPriorityConfig(announcement.priority);
                const isRead = readIds.has(announcement.id);
                const isExpanded = expandedIds.has(announcement.id);

                return (
                  <div
                    key={announcement.id}
                    className={cn(
                      "relative rounded-lg border p-3 transition-all duration-300 cursor-pointer",
                      config.cardClass,
                      !isRead && config.animate && "animate-pulse",
                      isRead && "opacity-70"
                    )}
                    onClick={() => toggleExpanded(announcement.id)}
                  >
                    {/* Unread indicator */}
                    {!isRead && (
                      <div className="absolute top-2 right-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5", config.iconClass)}>
                        {config.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px] px-1.5 py-0", config.badgeClass)}
                          >
                            {config.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(announcement.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        
                        <h4 className="font-semibold text-sm text-foreground leading-tight">
                          {announcement.title}
                        </h4>
                        
                        {announcement.content && (
                          <p className={cn(
                            "text-xs text-muted-foreground mt-1 transition-all duration-300",
                            isExpanded ? "" : "line-clamp-2"
                          )}>
                            {announcement.content}
                          </p>
                        )}

                        {announcement.expires_at && (
                          <div className="mt-2 text-[10px] text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Expira em {format(new Date(announcement.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        )}
                      </div>

                      {isRead && (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}