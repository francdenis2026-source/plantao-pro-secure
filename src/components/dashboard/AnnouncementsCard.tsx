import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Megaphone, Plus, Loader2, Trash2, Send, Calendar, AlertTriangle, Info, CheckCircle2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Announcement {
  id: string;
  title: string;
  content: string | null;
  priority: string;
  target_type: string;
  target_unit_id: string | null;
  target_team: string | null;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

interface Unit {
  id: string;
  name: string;
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-slate-500/20 text-slate-400', icon: Info },
  normal: { label: 'Normal', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle2 },
  high: { label: 'Alta', color: 'bg-amber-500/20 text-amber-400', icon: AlertTriangle },
  urgent: { label: 'Urgente', color: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
};

export function AnnouncementsCard() {
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    priority: 'normal',
    target_type: 'all',
    target_unit_id: '',
    target_team: '',
    expires_in_days: 7,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data: announcementsData }, { data: unitsData }] = await Promise.all([
        supabase
          .from('admin_announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('units')
          .select('id, name')
          .order('name')
      ]);

      setAnnouncements(announcementsData || []);
      setUnits(unitsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!newAnnouncement.title.trim()) {
      toast({
        title: 'Erro',
        description: 'O título é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + newAnnouncement.expires_in_days);

      const { error } = await supabase
        .from('admin_announcements')
        .insert({
          title: newAnnouncement.title,
          content: newAnnouncement.content || null,
          priority: newAnnouncement.priority,
          target_type: newAnnouncement.target_type,
          target_unit_id: newAnnouncement.target_type === 'unit' ? newAnnouncement.target_unit_id : null,
          target_team: newAnnouncement.target_type === 'team' ? newAnnouncement.target_team : null,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        });

      if (error) throw error;

      await logActivity({
        action: 'create',
        resourceType: 'settings',
        details: { type: 'announcement', title: newAnnouncement.title }
      });

      toast({
        title: 'Aviso enviado!',
        description: 'O aviso foi publicado com sucesso.',
      });

      setShowCreateDialog(false);
      setNewAnnouncement({
        title: '',
        content: '',
        priority: 'normal',
        target_type: 'all',
        target_unit_id: '',
        target_team: '',
        expires_in_days: 7,
      });
      fetchData();
    } catch (err) {
      console.error('Error creating announcement:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o aviso.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('admin_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Aviso removido',
        description: 'O aviso foi excluído com sucesso.',
      });

      fetchData();
    } catch (err) {
      console.error('Error deleting:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o aviso.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from('admin_announcements')
        .update({ is_active: !announcement.is_active })
        .eq('id', announcement.id);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error toggling:', err);
    }
  };

  return (
    <Card className="glass glass-border shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-5 w-5 text-primary" />
              Avisos e Mensagens
            </CardTitle>
            <CardDescription className="text-xs">
              Envie comunicados para agentes
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 h-8">
                  <Plus className="h-3.5 w-3.5" />
                  Novo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    Novo Aviso
                  </DialogTitle>
                  <DialogDescription>
                    Crie um aviso para os agentes
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Reunião importante"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem</Label>
                    <Textarea
                      value={newAnnouncement.content}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Conteúdo do aviso..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select
                        value={newAnnouncement.priority}
                        onValueChange={(v) => setNewAnnouncement(prev => ({ ...prev, priority: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Expira em (dias)</Label>
                      <Input
                        type="number"
                        value={newAnnouncement.expires_in_days}
                        onChange={(e) => setNewAnnouncement(prev => ({ ...prev, expires_in_days: parseInt(e.target.value) || 7 }))}
                        min={1}
                        max={365}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Destinatário</Label>
                    <Select
                      value={newAnnouncement.target_type}
                      onValueChange={(v) => setNewAnnouncement(prev => ({ ...prev, target_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Agentes</SelectItem>
                        <SelectItem value="unit">Unidade Específica</SelectItem>
                        <SelectItem value="team">Equipe Específica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newAnnouncement.target_type === 'unit' && (
                    <div className="space-y-2">
                      <Label>Selecione a Unidade</Label>
                      <Select
                        value={newAnnouncement.target_unit_id}
                        onValueChange={(v) => setNewAnnouncement(prev => ({ ...prev, target_unit_id: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha uma unidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map(unit => (
                            <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {newAnnouncement.target_type === 'team' && (
                    <div className="space-y-2">
                      <Label>Selecione a Equipe</Label>
                      <Select
                        value={newAnnouncement.target_team}
                        onValueChange={(v) => setNewAnnouncement(prev => ({ ...prev, target_team: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha uma equipe" />
                        </SelectTrigger>
                        <SelectContent>
                          {['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'].map(team => (
                            <SelectItem key={team} value={team}>Equipe {team}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum aviso cadastrado
          </p>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {announcements.map((announcement) => {
                const config = priorityConfig[announcement.priority as keyof typeof priorityConfig] || priorityConfig.normal;
                const PriorityIcon = config.icon;
                const isExpired = announcement.expires_at && new Date(announcement.expires_at) < new Date();

                return (
                  <div
                    key={announcement.id}
                    className={`p-3 rounded-lg border ${
                      announcement.is_active && !isExpired
                        ? 'bg-muted/30 border-border/50'
                        : 'bg-muted/10 border-border/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{announcement.title}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                            <PriorityIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          {isExpired && (
                            <Badge variant="outline" className="text-[10px] text-red-400 border-red-400/30">
                              Expirado
                            </Badge>
                          )}
                        </div>
                        {announcement.content && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {announcement.content}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true, locale: ptBR })}
                          {announcement.target_type !== 'all' && (
                            <> • {announcement.target_type === 'unit' ? 'Unidade' : 'Equipe'}</>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={announcement.is_active}
                          onCheckedChange={() => toggleActive(announcement)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(announcement.id)}
                          disabled={deletingId === announcement.id}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        >
                          {deletingId === announcement.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
