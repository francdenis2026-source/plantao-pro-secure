import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useConfirm } from '@/components/ui/confirm-provider';
import { Calendar as CalendarIcon, Plus, Trash2, Pencil, Clock, Repeat, Timer, Play, Pause, Zap } from 'lucide-react';

type Mode = 'once' | 'recurring' | 'interval';

interface Unit { id: string; name: string; }

interface ScheduledRound {
  id: string;
  unit_id: string | null;
  team: string;
  name: string;
  mode: Mode;
  scheduled_at: string | null;
  recur_times: string[];
  recur_weekdays: number[];
  interval_minutes: number | null;
  active_from: string | null;
  active_until: string | null;
  ronda_duration_min: number;
  round_mode: string;
  round_start_time: string;
  round_end_time: string;
  round_interval_min: number;
  require_confirmation_to_stop: boolean;
  is_enabled: boolean;
  next_trigger_at: string | null;
  last_triggered_at: string | null;
  notes: string | null;
}

const TEAMS = ['ALL', 'ALFA', 'BRAVO', 'CHARLIE', 'DELTA'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const emptyForm = (): Partial<ScheduledRound> => ({
  unit_id: null,
  team: 'ALL',
  name: '',
  mode: 'once' as Mode,
  scheduled_at: null,
  recur_times: [],
  recur_weekdays: [0, 1, 2, 3, 4, 5, 6],
  interval_minutes: 60,
  active_from: null,
  active_until: null,
  ronda_duration_min: 60,
  round_mode: 'interval',
  round_start_time: '07:00',
  round_end_time: '19:00',
  round_interval_min: 60,
  require_confirmation_to_stop: true,
  is_enabled: true,
  notes: '',
});

function formatBR(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { timeZone: 'America/Rio_Branco' });
}

export function ScheduledRoundsManager() {
  const [rows, setRows] = useState<ScheduledRound[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Partial<ScheduledRound>>(emptyForm());
  const [newTime, setNewTime] = useState('08:00');
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    const [{ data: sr }, { data: us }] = await Promise.all([
      supabase.from('scheduled_rounds').select('*').order('created_at', { ascending: false }),
      supabase.from('units').select('id, name').order('name'),
    ]);
    setRows((sr as any) || []);
    setUnits((us as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(emptyForm());
    setOpenForm(true);
  };

  const openEdit = (r: ScheduledRound) => {
    setEditing({ ...r });
    setOpenForm(true);
  };

  const save = async () => {
    const e = editing;
    if (!e.name?.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' }); return;
    }
    if (e.mode === 'once' && !e.scheduled_at) {
      toast({ title: 'Defina data/hora do disparo', variant: 'destructive' }); return;
    }
    if (e.mode === 'recurring' && (!e.recur_times || e.recur_times.length === 0)) {
      toast({ title: 'Adicione pelo menos 1 horário', variant: 'destructive' }); return;
    }
    if (e.mode === 'interval' && (!e.interval_minutes || e.interval_minutes < 1)) {
      toast({ title: 'Intervalo inválido', variant: 'destructive' }); return;
    }

    const payload: any = {
      unit_id: e.unit_id || null,
      team: e.team || 'ALL',
      name: e.name,
      mode: e.mode,
      scheduled_at: e.scheduled_at,
      recur_times: e.recur_times || [],
      recur_weekdays: e.recur_weekdays || [0,1,2,3,4,5,6],
      interval_minutes: e.mode === 'interval' ? e.interval_minutes : null,
      active_from: e.active_from,
      active_until: e.active_until,
      ronda_duration_min: e.ronda_duration_min || 60,
      round_mode: e.round_mode || 'interval',
      round_start_time: e.round_start_time || '07:00',
      round_end_time: e.round_end_time || '19:00',
      round_interval_min: e.round_interval_min || 60,
      require_confirmation_to_stop: e.require_confirmation_to_stop ?? true,
      is_enabled: e.is_enabled ?? true,
      notes: e.notes,
    };

    let error;
    if (e.id) {
      ({ error } = await supabase.from('scheduled_rounds').update(payload).eq('id', e.id));
    } else {
      const { data: userRes } = await supabase.auth.getUser();
      payload.created_by = userRes.user?.id;
      ({ error } = await supabase.from('scheduled_rounds').insert(payload));
    }

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Agendamento salvo' });
    setOpenForm(false);
    load();
  };

  const remove = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir agendamento?',
      description: 'Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from('scheduled_rounds').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Agendamento removido' });
    load();
  };

  const toggleEnabled = async (r: ScheduledRound) => {
    const { error } = await supabase.from('scheduled_rounds').update({ is_enabled: !r.is_enabled }).eq('id', r.id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    load();
  };

  const [firingId, setFiringId] = useState<string | null>(null);
  const fireNow = async (r: ScheduledRound) => {
    const ok = await confirm({
      title: '⚡ Disparar ronda agora?',
      description: `Uma ronda "${r.name}" será criada IMEDIATAMENTE para os agentes da equipe ${r.team}${r.team === 'ALL' ? '' : ''} e disparará notificações. Confirme para acionar manualmente.`,
      confirmText: 'Sim, disparar agora',
      cancelText: 'Cancelar',
      destructive: true,
      requireText: 'DISPARAR',
    });
    if (!ok) return;
    setFiringId(r.id);
    try {
      // Marca como vencido para permitir disparo imediato mesmo se estava pausado
      const { error: upErr } = await supabase
        .from('scheduled_rounds')
        .update({ next_trigger_at: new Date().toISOString(), is_enabled: true })
        .eq('id', r.id);
      if (upErr) throw upErr;

      // Invoca a Edge Function que processa agendamentos vencidos
      const { data, error: fnErr } = await supabase.functions.invoke('trigger-scheduled-rounds', {
        body: { manual: true, id: r.id },
      });
      if (fnErr) throw fnErr;

      const triggered = (data as any)?.triggered ?? 0;
      toast({
        title: 'Disparo manual executado',
        description: triggered > 0
          ? `Ronda criada para ${triggered} agente(s).`
          : 'Nenhum agente elegível encontrado no momento.',
      });
      load();
    } catch (e: any) {
      toast({ title: 'Falha ao disparar', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setFiringId(null);
    }
  };

  const addTime = () => {
    if (!/^\d{2}:\d{2}$/.test(newTime)) return;
    const cur = editing.recur_times || [];
    if (cur.includes(newTime)) return;
    setEditing({ ...editing, recur_times: [...cur, newTime].sort() });
  };

  const removeTime = (t: string) => {
    setEditing({ ...editing, recur_times: (editing.recur_times || []).filter(x => x !== t) });
  };

  const toggleWeekday = (idx: number) => {
    const cur = editing.recur_weekdays || [];
    setEditing({
      ...editing,
      recur_weekdays: cur.includes(idx) ? cur.filter(x => x !== idx) : [...cur, idx].sort(),
    });
  };

  const modeLabel = (m: Mode) => m === 'once' ? 'Uma vez' : m === 'recurring' ? 'Recorrente' : 'Intervalo';
  const modeIcon = (m: Mode) => m === 'once' ? <Clock className="h-3.5 w-3.5" /> : m === 'recurring' ? <Repeat className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />;

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <CalendarIcon className="h-5 w-5 text-amber-400" />
            Agendamento de Rondas
          </CardTitle>
          <CardDescription>
            Programe o disparo automático de rondas por unidade e equipe — ou use <strong className="text-amber-300">Disparar agora</strong> para acionar manualmente sem esperar o agendamento.
          </CardDescription>
        </div>
        <Button onClick={openNew} className="bg-amber-600 hover:bg-amber-700 text-slate-950 font-semibold">
          <Plus className="h-4 w-4 mr-2" />
          Novo agendamento
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-slate-400 text-sm">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="text-slate-400 text-sm py-8 text-center">Nenhum agendamento cadastrado.</div>
        ) : (
          <div className="space-y-2">
            {rows.map(r => {
              const unit = units.find(u => u.id === r.unit_id);
              return (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-700/60 overflow-hidden">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-100 truncate max-w-full">{r.name}</span>
                      <Badge variant="outline" className="border-amber-500/40 text-amber-300 gap-1">
                        {modeIcon(r.mode)} {modeLabel(r.mode)}
                      </Badge>
                      <Badge variant="outline" className="border-blue-500/40 text-blue-300">
                        Equipe {r.team}
                      </Badge>
                      {unit && <Badge variant="outline" className="border-slate-600 text-slate-300">{unit.name}</Badge>}
                      {!r.is_enabled && <Badge variant="destructive">Desativado</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-slate-400 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-0.5 min-w-0">
                      {r.mode === 'once' && <span className="min-w-0 break-words">Disparo: {formatBR(r.scheduled_at)}</span>}
                      {r.mode === 'recurring' && <span className="min-w-0 break-words">Horários: {r.recur_times.join(', ')} · Dias: {r.recur_weekdays.map(d => WEEKDAYS[d]).join('/')}</span>}
                      {r.mode === 'interval' && <span className="min-w-0 break-words">A cada {r.interval_minutes} min</span>}
                      <span className="min-w-0 break-words">Próximo: {formatBR(r.next_trigger_at)}</span>
                      <span className="min-w-0 break-words">Último: {formatBR(r.last_triggered_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 shrink-0 self-end sm:self-start">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fireNow(r)}
                      disabled={firingId === r.id}
                      className="h-8 gap-1 border-amber-500/50 text-amber-300 hover:bg-amber-500/10"
                      title="Disparar agora (programação manual)"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {firingId === r.id ? 'Disparando...' : 'Disparar agora'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleEnabled(r)} title={r.is_enabled ? 'Pausar' : 'Ativar'}>
                      {r.is_enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="top-2 bottom-2 translate-y-0 h-auto max-h-none w-[min(96vw,1240px)] max-w-none bg-slate-900 border-slate-700 text-slate-100 p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-4 sm:px-5 py-2.5 border-b border-slate-800 shrink-0">
            <DialogTitle className="text-sm sm:text-base leading-tight">{editing.id ? 'Editar agendamento' : 'Novo agendamento'}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-5 py-3">
            <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-3 xl:gap-5">
              {/* Coluna esquerda: identificação + modo */}
              <div className="space-y-2.5 min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input
                      value={editing.name || ''}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      placeholder="Ex: Ronda noturna"
                      className="bg-slate-800 border-slate-700 h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Equipe</Label>
                    <Select value={editing.team} onValueChange={(v) => setEditing({ ...editing, team: v })}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TEAMS.map(t => <SelectItem key={t} value={t}>{t === 'ALL' ? 'Todas as equipes' : t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Unidade</Label>
                  <Select
                    value={editing.unit_id || 'all'}
                    onValueChange={(v) => setEditing({ ...editing, unit_id: v === 'all' ? null : v })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as unidades</SelectItem>
                      {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Modo de agendamento</Label>
                  <Tabs value={editing.mode} onValueChange={(v) => setEditing({ ...editing, mode: v as Mode })}>
                    <TabsList className="grid grid-cols-3 w-full bg-slate-800 h-auto min-h-9 p-1">
                      <TabsTrigger value="once" className="text-[11px] sm:text-xs px-1.5 py-1.5 whitespace-nowrap"><Clock className="h-3.5 w-3.5 mr-1 shrink-0" /> Uma vez</TabsTrigger>
                      <TabsTrigger value="recurring" className="text-[11px] sm:text-xs px-1.5 py-1.5 whitespace-nowrap"><Repeat className="h-3.5 w-3.5 mr-1 shrink-0" /> Recorrente</TabsTrigger>
                      <TabsTrigger value="interval" className="text-[11px] sm:text-xs px-1.5 py-1.5 whitespace-nowrap"><Timer className="h-3.5 w-3.5 mr-1 shrink-0" /> Intervalo</TabsTrigger>
                    </TabsList>

                    <TabsContent value="once" className="pt-2 mt-0">
                      <Label className="text-xs">Data e hora</Label>
                      <Input
                        type="datetime-local"
                        value={editing.scheduled_at ? new Date(editing.scheduled_at).toISOString().slice(0, 16) : ''}
                        onChange={(e) => setEditing({ ...editing, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        className="bg-slate-800 border-slate-700 h-9"
                      />
                    </TabsContent>

                    <TabsContent value="recurring" className="pt-2 mt-0 space-y-2">
                      <div>
                        <Label className="text-xs">Horários (HH:MM)</Label>
                        <div className="flex flex-wrap gap-2">
                          <Input
                            type="time"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                            className="bg-slate-800 border-slate-700 w-28 h-9"
                          />
                          <Button type="button" size="sm" onClick={addTime} variant="outline">Adicionar</Button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2 min-h-[24px]">
                          {(editing.recur_times || []).map(t => (
                            <Badge key={t} variant="outline" className="gap-1 border-amber-500/40 text-amber-300">
                              {t}
                              <button onClick={() => removeTime(t)} className="ml-1 hover:text-red-400">×</button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Dias da semana</Label>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {WEEKDAYS.map((d, i) => {
                            const active = (editing.recur_weekdays || []).includes(i);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => toggleWeekday(i)}
                                className={`w-9 h-9 rounded-md text-xs font-semibold border transition ${
                                  active ? 'bg-amber-600 text-slate-950 border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >{d}</button>
                            );
                          })}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="interval" className="pt-2 mt-0">
                      <Label className="text-xs">Intervalo (minutos)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={editing.interval_minutes || 60}
                        onChange={(e) => setEditing({ ...editing, interval_minutes: parseInt(e.target.value) || 60 })}
                        className="bg-slate-800 border-slate-700 w-32 h-9"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Uma ronda a cada N minutos dentro da vigência.</p>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* Coluna direita: vigência + config ronda + switches */}
              <div className="space-y-2.5 min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-xs">Vigência início (opcional)</Label>
                    <Input
                      type="datetime-local"
                      value={editing.active_from ? new Date(editing.active_from).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditing({ ...editing, active_from: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="bg-slate-800 border-slate-700 h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Vigência fim (opcional)</Label>
                    <Input
                      type="datetime-local"
                      value={editing.active_until ? new Date(editing.active_until).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditing({ ...editing, active_until: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="bg-slate-800 border-slate-700 h-9"
                    />
                  </div>
                </div>

                <div className="border border-slate-700 rounded-lg p-2.5 bg-slate-800/40">
                  <div className="text-xs font-semibold text-slate-200 mb-2 uppercase tracking-wide">Configuração da ronda gerada</div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <div>
                      <Label className="text-[11px]">Início</Label>
                      <Input type="time" value={editing.round_start_time} onChange={e => setEditing({ ...editing, round_start_time: e.target.value })} className="bg-slate-800 border-slate-700 h-9" />
                    </div>
                    <div>
                      <Label className="text-[11px]">Fim</Label>
                      <Input type="time" value={editing.round_end_time} onChange={e => setEditing({ ...editing, round_end_time: e.target.value })} className="bg-slate-800 border-slate-700 h-9" />
                    </div>
                    <div>
                      <Label className="text-[11px]">Intervalo (min)</Label>
                      <Input type="number" min={1} value={editing.round_interval_min} onChange={e => setEditing({ ...editing, round_interval_min: parseInt(e.target.value) || 60 })} className="bg-slate-800 border-slate-700 h-9" />
                    </div>
                    <div>
                      <Label className="text-[11px]">Duração (min)</Label>
                      <Input type="number" min={1} value={editing.ronda_duration_min} onChange={e => setEditing({ ...editing, ronda_duration_min: parseInt(e.target.value) || 60 })} className="bg-slate-800 border-slate-700 h-9" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-md border border-slate-700 bg-slate-800/40 cursor-pointer min-w-0">
                    <Switch
                      checked={editing.require_confirmation_to_stop ?? true}
                      onCheckedChange={(v) => setEditing({ ...editing, require_confirmation_to_stop: v })}
                    />
                    <span className="text-xs text-slate-200 leading-tight">Confirmação p/ encerrar</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-md border border-slate-700 bg-slate-800/40 cursor-pointer min-w-0">
                    <Switch
                      checked={editing.is_enabled ?? true}
                      onCheckedChange={(v) => setEditing({ ...editing, is_enabled: v })}
                    />
                    <span className="text-xs text-slate-200">Ativado</span>
                  </label>
                </div>

                <div>
                  <Label className="text-xs">Observações</Label>
                  <Textarea
                    value={editing.notes || ''}
                    onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                    placeholder="Opcional"
                    rows={1}
                    className="bg-slate-800 border-slate-700 resize-none min-h-[38px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-4 sm:px-5 py-2.5 border-t border-slate-800 shrink-0 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700 text-slate-950 font-semibold" onClick={save}>
              Salvar agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default ScheduledRoundsManager;
