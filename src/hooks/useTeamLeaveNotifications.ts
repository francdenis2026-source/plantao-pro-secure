import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export type TeamLeaveNotification = {
  id: string;
  title: string;
  content: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
};

/**
 * Subscribes to the current agent's in-app notifications and optionally
 * fires a local push notification (Web Notification) when a new one arrives.
 */
export function useTeamLeaveNotifications(agentId: string) {
  const { isEnabled, showNotification } = usePushNotifications();
  const [items, setItems] = useState<TeamLeaveNotification[]>([]);

  useEffect(() => {
    if (!agentId) return;

    let mounted = true;

    const fetchInitial = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, content, type, is_read, created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!mounted) return;
      setItems((data || []) as TeamLeaveNotification[]);
    };

    fetchInitial();

    const channel = supabase
      .channel(`notifications-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `agent_id=eq.${agentId}`,
        },
        async (payload) => {
          const n = payload.new as TeamLeaveNotification;
          if (!mounted) return;
          setItems((prev) => [n, ...prev]);

          // Only fire push for leave notifications (requested)
          if (n.type === "leave" && isEnabled) {
            await showNotification({
              title: n.title,
              body: n.content ?? "Folga registrada na equipe.",
              tag: `leave-${n.id}`,
              requireInteraction: false,
              soundType: "alert",
            });
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [agentId, isEnabled, showNotification]);

  const unreadCount = useMemo(() => items.filter((i) => !i.is_read).length, [items]);

  return { items, unreadCount };
}
