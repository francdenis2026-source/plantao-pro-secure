import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Users, Building2, Globe, Loader2, Trash2, MoreVertical, Circle, Crown, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import chatBgTacticalPro from '@/assets/chat-bg-tactical-pro.png';
import { useBubbleTheme, BubbleTheme } from '@/hooks/useChatSettings';

// Bubble theme styles mapping
const bubbleStyles: Record<BubbleTheme, { own: string; other: string; ownText: string; nameColor: string }> = {
  amber: { own: 'bg-amber-500', other: 'bg-slate-700', ownText: 'text-black', nameColor: 'text-amber-300' },
  emerald: { own: 'bg-emerald-500', other: 'bg-slate-700', ownText: 'text-black', nameColor: 'text-emerald-300' },
  blue: { own: 'bg-blue-500', other: 'bg-slate-700', ownText: 'text-white', nameColor: 'text-blue-300' },
  purple: { own: 'bg-purple-500', other: 'bg-slate-700', ownText: 'text-white', nameColor: 'text-purple-300' },
  rose: { own: 'bg-rose-500', other: 'bg-slate-700', ownText: 'text-white', nameColor: 'text-rose-300' },
  cyan: { own: 'bg-cyan-500', other: 'bg-slate-800', ownText: 'text-black', nameColor: 'text-cyan-300' },
};

// Background is now simpler - no floating particles needed

interface OnlineUser {
  id: string;
  name: string;
  team: string | null;
  online_at: string;
  avatar_url?: string | null;
  role?: string | null;
}

interface ChatPanelProps {
  agentId: string;
  unitId: string | null;
  team: string | null;
  agentName: string;
  agentRole?: string | null;
  agentAvatarUrl?: string | null;
}

interface ChatRoom {
  id: string;
  name: string;
  type: string;
  unit_id: string | null;
  team: string | null;
}

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    name: string;
    team: string | null;
    role: string | null;
  };
}

type ChatType = 'team' | 'unit' | 'leaders' | 'all';

const getRoleLabel = (role: string | null | undefined) => {
  switch (role) {
    case 'team_leader':
      return 'Chefe de Equipe';
    case 'support':
      return 'Apoio';
    default:
      return 'Agente';
  }
};

const chatRoomConfig: Record<ChatType, { 
  icon: React.ReactNode; 
  label: string; 
  description: string;
  color: string;
}> = {
  team: {
    icon: <Users className="h-4 w-4" />,
    label: 'Equipe',
    description: 'Apenas membros da sua equipe',
    color: 'text-emerald-400',
  },
  unit: {
    icon: <Building2 className="h-4 w-4" />,
    label: 'Unidade',
    description: 'Todas as equipes da unidade',
    color: 'text-blue-500',
  },
  leaders: {
    icon: <Crown className="h-4 w-4" />,
    label: 'Liderança',
    description: 'Chefes de equipe e apoios',
    color: 'text-purple-500',
  },
  all: {
    icon: <Globe className="h-4 w-4" />,
    label: 'Sistema ISE/ACRE',
    description: 'Todas as unidades socioeducativas',
    color: 'text-green-500',
  },
};

export function ChatPanel({ agentId, unitId, team, agentName, agentRole, agentAvatarUrl }: ChatPanelProps) {
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatType, setChatType] = useState<ChatType>('team');
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<null | { id: string; scope: 'me' | 'all'; preview: string }>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { playSound, isSoundEnabled } = useSoundEffects();
  
  // Professional tactical background - unified dark security theme
  const currentBackground = chatBgTacticalPro;
  
  // Get user's preferred bubble theme
  const bubbleTheme = useBubbleTheme(agentId);
  const currentBubbleStyle = bubbleStyles[bubbleTheme];

  const isLeader = agentRole === 'team_leader' || agentRole === 'support';

  useEffect(() => {
    initializeChatRooms();
    fetchDeletedMessages();
  }, [agentId, unitId, team]);

  useEffect(() => {
    if (activeRoom) {
      fetchMessages();
      subscribeToMessages();
      subscribeToPresence();
    }

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [activeRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const subscribeToPresence = () => {
    if (!activeRoom) return;

    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
    }

    const channelName = `presence-${activeRoom.id}`;
    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.id !== agentId) {
              users.push({
                id: presence.id,
                name: presence.name,
                team: presence.team,
                online_at: presence.online_at,
                avatar_url: presence.avatar_url,
                role: presence.role,
              });
            }
          });
        });
        
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.id !== agentId) {
            toast.info(`${presence.name} entrou no chat`, { duration: 3000 });
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          if (presence.id !== agentId) {
            toast.info(`${presence.name} saiu do chat`, { duration: 3000 });
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: agentId,
            name: agentName,
            team: team,
            online_at: new Date().toISOString(),
            avatar_url: agentAvatarUrl,
            role: agentRole,
          });
        }
      });

    presenceChannelRef.current = channel;
  };

  const fetchDeletedMessages = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('deleted_messages')
        .select('message_id')
        .eq('agent_id', agentId);

      if (error) throw error;
      
      const deletedIds = new Set<string>(data?.map((d: { message_id: string }) => d.message_id) || []);
      setDeletedMessageIds(deletedIds);
    } catch (error) {
      console.error('Error fetching deleted messages:', error);
    }
  };

  const deleteMessageForMe = async (messageId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('deleted_messages')
        .insert({
          message_id: messageId,
          agent_id: agentId
        });

      if (error) throw error;

      setDeletedMessageIds(prev => new Set([...prev, messageId]));
      toast.success('Mensagem ocultada', {
        description: 'Removida apenas do seu histórico. Os demais continuam vendo.',
      });
    } catch (error) {
      console.error('Error deleting message for me:', error);
      toast.error('Erro ao ocultar', { description: 'Tente novamente em instantes.' });
    }
  };

  const deleteMessageForAll = async (messageId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Mensagem apagada', {
        description: 'Removida da conversa para todos os participantes.',
      });
    } catch (error) {
      console.error('Error deleting message for all:', error);
      toast.error('Erro ao apagar', { description: 'A mensagem não pôde ser removida.' });
    }
  };

  const confirmDeleteMessage = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.scope === 'me') {
        await deleteMessageForMe(deleteTarget.id);
      } else {
        await deleteMessageForAll(deleteTarget.id);
      }
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const clearConversationForMe = async () => {
    if (!activeRoom) return;
    const visibleIds = messages.filter(m => !deletedMessageIds.has(m.id)).map(m => m.id);
    if (visibleIds.length === 0) {
      toast.info('Sem mensagens', { description: 'Não há mensagens visíveis para limpar.' });
      return;
    }
    setIsDeleting(true);
    try {
      const rows = visibleIds.map(id => ({ message_id: id, agent_id: agentId }));
      const { error } = await (supabase as any)
        .from('deleted_messages')
        .upsert(rows, { onConflict: 'message_id,agent_id' });
      if (error) throw error;
      setDeletedMessageIds(prev => new Set([...prev, ...visibleIds]));
      toast.success('Conversa limpa', {
        description: `${visibleIds.length} mensagem(ns) ocultada(s) apenas para você.`,
      });
    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast.error('Erro ao limpar', { description: 'A operação não pôde ser concluída.' });
    } finally {
      setIsDeleting(false);
      setClearAllOpen(false);
    }
  };




  const initializeChatRooms = async () => {
    try {
      setIsLoading(true);
      
      // Build query for rooms this agent can access
      let roomQuery = `type.eq.all`;
      
      if (unitId) {
        roomQuery += `,and(type.eq.unit,unit_id.eq.${unitId})`;
        
        if (team) {
          roomQuery += `,and(type.eq.team,unit_id.eq.${unitId},team.eq.${team})`;
        }
        
        // Leaders room - only if agent is leader/support
        if (isLeader) {
          roomQuery += `,and(type.eq.leaders,unit_id.eq.${unitId})`;
        }
      }
      
      const { data: existingRooms, error } = await (supabase as any)
        .from('chat_rooms')
        .select('*')
        .or(roomQuery);

      if (error) throw error;

      let allRooms: ChatRoom[] = existingRooms || [];

      // Create team room if doesn't exist and team is assigned
      if (team && unitId) {
        const teamRoom = allRooms.find(r => r.type === 'team' && r.team === team && r.unit_id === unitId);
        if (!teamRoom) {
          const { data: newTeamRoom, error: createError } = await (supabase as any)
            .from('chat_rooms')
            .insert({
              name: `Equipe ${team}`,
              type: 'team',
              unit_id: unitId,
              team: team
            })
            .select()
            .single();

          if (!createError && newTeamRoom) {
            allRooms = [...allRooms, newTeamRoom];
          }
        }
      }

      // Create unit room if doesn't exist
      if (unitId) {
        const unitRoom = allRooms.find(r => r.type === 'unit' && r.unit_id === unitId);
        if (!unitRoom) {
          const { data: unitData } = await supabase
            .from('units')
            .select('name')
            .eq('id', unitId)
            .single();

          const { data: newUnitRoom, error: createError } = await (supabase as any)
            .from('chat_rooms')
            .insert({
              name: unitData?.name || 'Unidade',
              type: 'unit',
              unit_id: unitId,
              team: null
            })
            .select()
            .single();

          if (!createError && newUnitRoom) {
            allRooms = [...allRooms, newUnitRoom];
          }
        }

        // Create leaders room if doesn't exist (only for leaders)
        if (isLeader) {
          const leadersRoom = allRooms.find(r => r.type === 'leaders' && r.unit_id === unitId);
          if (!leadersRoom) {
            const { data: unitData } = await supabase
              .from('units')
              .select('name')
              .eq('id', unitId)
              .single();

            const { data: newLeadersRoom, error: createError } = await (supabase as any)
              .from('chat_rooms')
              .insert({
                name: `Liderança - ${unitData?.name || 'Unidade'}`,
                type: 'leaders',
                unit_id: unitId,
                team: null
              })
              .select()
              .single();

            if (!createError && newLeadersRoom) {
              allRooms = [...allRooms, newLeadersRoom];
            }
          }
        }
      }

      // Create global room if doesn't exist
      const globalRoom = allRooms.find(r => r.type === 'all');
      if (!globalRoom) {
        const { data: newGlobalRoom, error: createError } = await (supabase as any)
          .from('chat_rooms')
          .insert({
            name: 'Sistema ISE/ACRE - Todas as Unidades',
            type: 'all',
            unit_id: null,
            team: null
          })
          .select()
          .single();

        if (!createError && newGlobalRoom) {
          allRooms = [...allRooms, newGlobalRoom];
        }
      }

      setRooms(allRooms);

      // Set default active room
      const defaultRoom = allRooms.find(r => r.type === 'team') || allRooms[0];
      if (defaultRoom) {
        setActiveRoom(defaultRoom);
        setChatType(defaultRoom.type as ChatType);
      }

      // Join the rooms
      for (const room of allRooms) {
        await (supabase as any)
          .from('chat_room_members')
          .upsert({
            room_id: room.id,
            agent_id: agentId
          }, {
            onConflict: 'room_id,agent_id'
          });
      }
    } catch (error) {
      console.error('Error initializing chat rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!activeRoom) return;

    try {
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .select(`
          *,
          sender:agents!sender_id(name, team, role)
        `)
        .eq('room_id', activeRoom.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!activeRoom) return;

    const channel = supabase
      .channel(`room-${activeRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${activeRoom.id}`
        },
        async (payload) => {
          // Skip if this is our own message (already added optimistically)
          if (payload.new.sender_id === agentId) {
            return;
          }
          
          const { data: senderData } = await supabase
            .from('agents')
            .select('name, team, role')
            .eq('id', payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new as ChatMessage,
            sender: senderData
          };

          setMessages(prev => {
            // Prevent duplicates
            if (prev.some(m => m.id === newMsg.id)) {
              return prev;
            }
            return [...prev, newMsg];
          });

          // Play notification sound for incoming messages
          playSound('notification');
          const roleName = getRoleLabel(senderData?.role);
          const teamInfo = senderData?.team ? ` • Equipe ${senderData.team}` : '';
          toast.info(`Nova mensagem de ${senderData?.name || 'Agente'}`, {
            description: `${roleName}${teamInfo}`,
            duration: 3000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeRoom || isSending) return;

    const messageContent = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic update - show message immediately
    const optimisticMessage: ChatMessage = {
      id: tempId,
      room_id: activeRoom.id,
      sender_id: agentId,
      content: messageContent,
      created_at: new Date().toISOString(),
      sender: {
        name: agentName,
        team: team,
        role: agentRole || null,
      }
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    
    // Play send sound immediately
    playSound('success');

    try {
      setIsSending(true);
      
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .insert({
          room_id: activeRoom.id,
          sender_id: agentId,
          content: messageContent
        })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one (to get the real ID)
      setMessages(prev => 
        prev.map(m => m.id === tempId ? { ...m, id: data.id } : m)
      );
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const switchRoom = (type: ChatType) => {
    setChatType(type);
    const room = rooms.find(r => r.type === type);
    if (room) {
      setActiveRoom(room);
    }
  };

  const getAvailableRoomTypes = (): ChatType[] => {
    const types: ChatType[] = [];
    if (team) types.push('team');
    types.push('unit');
    if (isLeader) types.push('leaders');
    types.push('all');
    return types;
  };

  if (isLoading) {
    return (
      <Card className="bg-zinc-900/90 border border-zinc-700/60">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        </CardContent>
      </Card>
    );
  }

  const availableTypes = getAvailableRoomTypes();
  const currentConfig = chatRoomConfig[chatType];

  return (
    <Card className="bg-zinc-900/95 border border-zinc-700/60 h-[550px] flex flex-col relative overflow-hidden">
      {/* Professional tactical background - deep dark with subtle pattern */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(15, 23, 42, 0.98) 100%)',
        }}
      />
      {/* Subtle hex grid pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath fill='%23ffffff' fill-opacity='1' d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-zinc-900/50 via-transparent to-zinc-950/80" />
      
      <CardHeader className="pb-1.5 pt-2 px-2 md:pb-2 md:pt-3 md:px-3 border-b border-zinc-700/50 relative z-10">
        {/* Top Row: Title + Online Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
            <div className="p-1 md:p-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 shrink-0">
              <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-400" />
            </div>
            <span className="text-xs md:text-sm font-semibold text-zinc-100 truncate">Chat</span>
            <Badge className={`text-[9px] md:text-[10px] font-medium ${currentConfig.color} border-current/30 px-1.5 md:px-2 py-0 h-4 md:h-5 shrink-0`}>
              {currentConfig.label}
            </Badge>
          </div>

          
          <div className="flex items-center gap-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                    onClick={() => setClearAllOpen(true)}
                    aria-label="Limpar conversa para mim"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-zinc-800 border-zinc-700 text-[10px]">
                  Limpar conversa (só para mim)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Online Users - Compact */}
            <TooltipProvider>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full cursor-default">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-medium text-emerald-300">
                    {onlineUsers.length + 1}
                  </span>
                  <div className="flex -space-x-1">
                    {onlineUsers.slice(0, 2).map((user) => (
                      <Avatar key={user.id} className="h-4 w-4 border border-zinc-800">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name} className="object-cover" />
                        ) : (
                          <AvatarFallback className="text-[7px] font-bold bg-emerald-600 text-white">
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    ))}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end" className="bg-zinc-800 border-zinc-700 p-2 max-w-[200px]">
                <p className="text-[10px] font-semibold text-emerald-400 mb-1">
                  Online ({onlineUsers.length + 1})
                </p>
                <div className="space-y-1 max-h-[150px] overflow-y-auto">
                  <div className="text-[10px] text-emerald-300">• {agentName} (você)</div>
                  {onlineUsers.map((user) => (
                    <div key={user.id} className="text-[10px] text-zinc-300">
                      • {user.name}
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        
        {/* Room Buttons - Professional Modern Style */}
        <div className="mt-2 flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {availableTypes.map((type) => {
            const config = chatRoomConfig[type];
            const isActive = chatType === type;
            
            const buttonColors: Record<ChatType, { active: string; inactive: string; iconBg: string }> = {
              team: {
                active: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30',
                inactive: 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 hover:text-emerald-300 border-zinc-600',
                iconBg: 'bg-emerald-500/20'
              },
              unit: {
                active: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30',
                inactive: 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 hover:text-blue-400 border-zinc-700',
                iconBg: 'bg-blue-500/20'
              },
              leaders: {
                active: 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/30',
                inactive: 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 hover:text-purple-400 border-zinc-700',
                iconBg: 'bg-purple-500/20'
              },
              all: {
                active: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30',
                inactive: 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 hover:text-emerald-400 border-zinc-700',
                iconBg: 'bg-emerald-500/20'
              }
            };
            
            const colors = buttonColors[type];
            
            return (
              <button
                key={type}
                type="button"
                onClick={() => switchRoom(type)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  transition-all duration-200 flex-shrink-0 border
                  ${isActive ? colors.active : colors.inactive}
                `}
              >
                <span className={`p-1 rounded ${isActive ? 'bg-white/20' : colors.iconBg}`}>
                  {config.icon}
                </span>
                <span className="whitespace-nowrap">{config.label}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative z-10">
        {/* Messages Area */}
        <ScrollArea className="flex-1 px-2 py-1.5 md:px-3 md:py-2">
          <div className="space-y-1.5 md:space-y-2">

            {messages.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              messages
                .filter(msg => !deletedMessageIds.has(msg.id))
                .map((msg) => {
                const isOwn = msg.sender_id === agentId;
                const roleLabel = getRoleLabel(msg.sender?.role);
                const isLeaderRole = msg.sender?.role === 'team_leader' || msg.sender?.role === 'support';
                
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className={`h-6 w-6 md:h-7 md:w-7 flex-shrink-0 border ${
                      isLeaderRole ? 'border-amber-500/50' : 'border-zinc-600/50'
                    }`}>
                      <AvatarImage src={(msg.sender as any)?.avatar_url} />
                      <AvatarFallback className={`text-[9px] md:text-[10px] font-bold ${
                        isOwn ? `${currentBubbleStyle.own} ${currentBubbleStyle.ownText}` : 
                        isLeaderRole ? 'bg-amber-600 text-white' :
                        'bg-zinc-700 text-zinc-200'
                      }`}>
                        {(msg.sender?.name || 'A').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[82%] md:max-w-[75%] min-w-0 ${isOwn ? 'items-end' : 'items-start'}`}>

                      {!isOwn && (
                        <div className="mb-0.5 px-1 flex items-center gap-1">
                          {isLeaderRole && <Crown className="h-2.5 w-2.5 text-amber-500" />}
                          <span className="text-[10px] font-medium text-zinc-400">
                            {msg.sender?.name || 'Agente'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start gap-0.5 md:gap-1">
                        <div
                          className={`px-2 py-1 md:px-2.5 md:py-1.5 rounded-lg text-[11px] md:text-xs min-w-0 ${
                            isOwn
                              ? `${currentBubbleStyle.own} ${currentBubbleStyle.ownText} rounded-br-sm`
                              : `bg-zinc-800 text-zinc-100 rounded-bl-sm`
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>

                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-100"
                              aria-label="Opções da mensagem"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>

                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="bg-zinc-800 border-zinc-700">
                            <DropdownMenuItem 
                              onClick={() => setDeleteTarget({ id: msg.id, scope: 'me', preview: msg.content })}
                              className="text-zinc-200 hover:bg-zinc-700 cursor-pointer text-xs"
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Apagar para mim
                            </DropdownMenuItem>
                            {isOwn && (
                              <>
                                <DropdownMenuSeparator className="bg-zinc-700" />
                                <DropdownMenuItem 
                                  onClick={() => setDeleteTarget({ id: msg.id, scope: 'all', preview: msg.content })}
                                  className="text-rose-400 hover:bg-zinc-700 cursor-pointer text-xs"
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Apagar para todos
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className={`text-[9px] text-zinc-600 mt-0.5 px-1 ${isOwn ? 'text-right' : ''}`}>
                        {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input - Compact */}
        <div className="p-1.5 md:p-2 border-t border-zinc-700/50 bg-zinc-900/90">
          <div className="flex gap-1.5 md:gap-2">

            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Mensagem..."
              className="flex-1 bg-zinc-800 border-zinc-700 h-8 text-xs"
              disabled={isSending}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              size="icon"
              className="bg-amber-500 hover:bg-amber-600 text-black h-8 w-8"
            >
              {isSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Confirmação profissional — apagar uma mensagem */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 grid place-items-center h-16 w-16 rounded-full bg-gradient-to-br from-rose-500/20 to-rose-500/5 ring-1 ring-rose-500/40">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" aria-hidden="true">
                <defs>
                  <linearGradient id="trashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fda4af" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                </defs>
                <path
                  d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-8 0v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7M10 11v6M14 11v6"
                  stroke="url(#trashGrad)"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <AlertDialogTitle className="text-center text-base tracking-wide">
              {deleteTarget?.scope === 'all' ? 'Apagar para todos?' : 'Ocultar para você?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs text-zinc-400 leading-relaxed">
              {deleteTarget?.scope === 'all'
                ? 'A mensagem será removida permanentemente da conversa para todos os participantes. Esta ação não pode ser desfeita.'
                : 'A mensagem some apenas do seu histórico neste dispositivo. Os demais participantes continuam vendo normalmente.'}
            </AlertDialogDescription>
            {deleteTarget?.preview ? (
              <div className="mt-2 mx-auto max-w-full rounded-md border border-zinc-700/70 bg-zinc-800/70 px-3 py-2 text-[11px] italic text-zinc-300 line-clamp-3">
                "{deleteTarget.preview}"
              </div>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting} className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => { e.preventDefault(); confirmDeleteMessage(); }}
              className={
                deleteTarget?.scope === 'all'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-black'
              }
            >
              {isDeleting ? (
                <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Processando…</>
              ) : deleteTarget?.scope === 'all' ? (
                <><Trash2 className="h-3.5 w-3.5 mr-2" />Apagar para todos</>
              ) : (
                <><Trash2 className="h-3.5 w-3.5 mr-2" />Ocultar para mim</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação profissional — limpar toda a conversa (só para mim) */}
      <AlertDialog open={clearAllOpen} onOpenChange={(o) => !isDeleting && setClearAllOpen(o)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-3 grid place-items-center h-16 w-16 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/5 ring-1 ring-amber-500/40">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" aria-hidden="true">
                <path
                  d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                  stroke="#f59e0b"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M12 11v6" stroke="#fbbf24" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <AlertDialogTitle className="text-center text-base tracking-wide">
              Limpar esta conversa?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs text-zinc-400 leading-relaxed">
              Todas as mensagens visíveis serão ocultadas <strong>apenas no seu dispositivo</strong>.
              A conversa continua íntegra para os demais agentes. Ação irreversível para você.
            </AlertDialogDescription>
            <div className="mt-2 mx-auto text-[11px] text-zinc-300 bg-zinc-800/70 border border-zinc-700/70 rounded-md px-3 py-1.5">
              {messages.filter(m => !deletedMessageIds.has(m.id)).length} mensagem(ns) serão ocultadas
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting} className="bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => { e.preventDefault(); clearConversationForMe(); }}
              className="bg-amber-500 hover:bg-amber-400 text-black"
            >
              {isDeleting ? (
                <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Limpando…</>
              ) : (
                <><Trash2 className="h-3.5 w-3.5 mr-2" />Limpar para mim</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
