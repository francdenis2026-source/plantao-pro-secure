import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Calendar, Clock, AlertCircle, Check, Loader2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface NotificationsPanelProps {
  agentId: string;
}

type SourceTable = 'shift_alerts' | 'notifications';

interface UnifiedItem {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  source: SourceTable;
}

export function NotificationsPanel({ agentId }: NotificationsPanelProps) {
  const { isEnabled, showNotification } = usePushNotifications();
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    fetchAll();
    const cleanup = subscribe();
    return cleanup;
  }, [agentId]);

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  const fetchAll = async () => {
    try {
      setIsLoading(true);

      const [shiftRes, notifRes] = await Promise.all([
        supabase
          .from('shift_alerts')
          .select('id, alert_type, title, message, is_read, created_at')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('notifications')
          .select('id, type, title, content, is_read, created_at')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const shiftItems: UnifiedItem[] = ((shiftRes.data || []) as any[]).map((a) => ({
        id: a.id,
        type: a.alert_type,
        title: a.title,
        message: a.message ?? '',
        is_read: !!a.is_read,
        created_at: a.created_at,
        source: 'shift_alerts',
      }));

      const notifItems: UnifiedItem[] = ((notifRes.data || []) as any[]).map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.content ?? '',
        is_read: !!n.is_read,
        created_at: n.created_at,
        source: 'notifications',
      }));

      const merged = [...shiftItems, ...notifItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setItems(merged.slice(0, 30));
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribe = () => {
    const ch1 = supabase
      .channel(`shift_alerts-${agentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shift_alerts', filter: `agent_id=eq.${agentId}` },
        (payload) => {
          const a: any = payload.new;
          const newItem: UnifiedItem = {
            id: a.id,
            type: a.alert_type,
            title: a.title,
            message: a.message ?? '',
            is_read: !!a.is_read,
            created_at: a.created_at,
            source: 'shift_alerts',
          };
          setItems((prev) => [newItem, ...prev].slice(0, 30));
        }
      )
      .subscribe();

    const ch2 = supabase
      .channel(`notifications-${agentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `agent_id=eq.${agentId}` },
        async (payload) => {
          const n: any = payload.new;
          const newItem: UnifiedItem = {
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.content ?? '',
            is_read: !!n.is_read,
            created_at: n.created_at,
            source: 'notifications',
          };

          setItems((prev) => [newItem, ...prev].slice(0, 30));

          // Requested: push notification when a teammate registers an approved leave
          if (n.type === 'leave' && isEnabled) {
            await showNotification({
              title: n.title,
              body: n.content ?? 'Folga registrada na equipe.',
              tag: `leave-${n.id}`,
              requireInteraction: false,
              soundType: 'alert',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  };

  const markAsRead = async (item: UnifiedItem) => {
    try {
      if (item.source === 'shift_alerts') {
        const { error } = await supabase.from('shift_alerts').update({ is_read: true }).eq('id', item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', item.id);
        if (error) throw error;
      }

      setItems((prev) => prev.map((n) => (n.id === item.id && n.source === item.source ? { ...n, is_read: true } : n)));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const [e1, e2] = await Promise.all([
        supabase.from('shift_alerts').update({ is_read: true }).eq('agent_id', agentId).eq('is_read', false),
        supabase.from('notifications').update({ is_read: true }).eq('agent_id', agentId).eq('is_read', false),
      ]);
      if (e1.error) throw e1.error;
      if (e2.error) throw e2.error;

      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'shift_reminder':
      case 'shift':
        return <Calendar className="h-4 w-4 text-green-400" />;
      case 'bh_reminder':
      case 'bh':
        return <Clock className="h-4 w-4 text-amber-400" />;
      case 'leave':
        return <Users className="h-4 w-4 text-blue-400" />;
      case 'conflict':
      case 'alert':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Bell className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0 text-slate-400 hover:text-white">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 bg-slate-800 border-slate-700" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
          <h4 className="text-sm font-semibold text-white">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 px-2 text-[11px] text-amber-400 hover:text-amber-300"
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[260px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
              <Bell className="h-7 w-7 mb-1.5 opacity-50" />
              <p className="text-xs">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/70">
              {items.map((item) => (
                <div
                  key={`${item.source}:${item.id}`}
                  onClick={() => !item.is_read && markAsRead(item)}
                  className={`px-3 py-2 hover:bg-slate-700/50 cursor-pointer transition-colors ${!item.is_read ? 'bg-slate-700/30' : ''}`}
                >
                  <div className="flex gap-2.5">
                    <div className="flex-shrink-0 mt-0.5">{getAlertIcon(item.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-[13px] font-medium truncate leading-tight ${item.is_read ? 'text-slate-300' : 'text-white'}`}>{item.title}</p>
                        {!item.is_read && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />}
                      </div>
                      {item.message && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-snug">{item.message}</p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {format(new Date(item.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
