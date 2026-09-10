import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getMasterToken } from '@/lib/masterSession';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Shield, Clock, LogIn, LogOut, Activity, Users, Loader2, FileDown, Filter, Trash2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type LogRow = {
  id: string;
  agent_id: string | null;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  agent?: { name?: string; team?: string; matricula?: string } | null;
};

type AgentStat = {
  agent_id: string;
  name: string;
  team: string | null;
  matricula: string | null;
  total_logins: number;
  total_logouts: number;
  last_login: string | null;
  last_activity: string | null;
  active_days: number;
  /** Soma do tempo entre cada login e o logout seguinte (sessões fechadas). */
  total_duration_ms: number;
};

/** Alvo pendente de exclusão — controla o AlertDialog de confirmação único
 * reaproveitado por todos os pontos de apagar (evento, agente, filtro, tudo). */
type DeleteTarget =
  | { kind: 'one'; id: string; label: string }
  | { kind: 'agent'; agentId: string; name: string }
  | { kind: 'filtered' }
  | { kind: 'all' }
  | null;

function formatDurationMs(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

type MasterActionPayload = Record<string, string | number | boolean | null | undefined | string[]>;

async function callMasterAdmin<T>(action: string, payload: MasterActionPayload = {}): Promise<T> {
  const token = getMasterToken();
  if (!token) throw new Error('Sessão master expirada. Faça login novamente.');

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/master-admin`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-master-token': token,
      'authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const text = await response.text();
  const result = text ? JSON.parse(text) : null;

  if (!response.ok || !result?.success) {
    throw new Error(result?.error || 'Falha ao consultar logs de acesso.');
  }

  return result.data as T;
}

export function AccessAuditPanel() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = getMasterToken();

        if (token) {
          const data = await callMasterAdmin<LogRow[]>('access_logs_list', { limit: 2000 });
          setLogs(data || []);
          return;
        }

        const { data, error } = await supabase
          .from('access_logs')
          .select('id, agent_id, action, ip_address, user_agent, created_at, agent:agents(name, team, matricula)')
          .order('created_at', { ascending: false })
          .limit(2000);
        if (error) throw error;
        setLogs((data as LogRow[]) || []);
      } catch (e) {
        console.error('[AccessAuditPanel] load error', e);
        toast.error('Falha ao carregar logs de acesso');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Unique agents & actions for filter dropdowns
  const agentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of logs) {
      if (l.agent_id && l.agent?.name) map.set(l.agent_id, l.agent.name);
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) if (l.action) set.add(l.action);
    return Array.from(set).sort();
  }, [logs]);

  // Apply filters
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (agentFilter !== 'all' && l.agent_id !== agentFilter) return false;
      if (eventFilter !== 'all' && l.action !== eventFilter) return false;
      if (dateFrom) {
        const from = new Date(dateFrom + 'T00:00:00');
        if (new Date(l.created_at) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo + 'T23:59:59');
        if (new Date(l.created_at) > to) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(l.agent?.name || '').toLowerCase().includes(q) &&
          !(l.action || '').toLowerCase().includes(q) &&
          !(l.ip_address || '').toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [logs, agentFilter, eventFilter, dateFrom, dateTo, search]);

  const stats: AgentStat[] = useMemo(() => {
    const byAgent = new Map<string, AgentStat>();
    for (const l of filteredLogs) {
      if (!l.agent_id) continue;
      const key = l.agent_id;
      const cur = byAgent.get(key) || {
        agent_id: key,
        name: l.agent?.name || 'Desconhecido',
        team: l.agent?.team ?? null,
        matricula: l.agent?.matricula ?? null,
        total_logins: 0,
        total_logouts: 0,
        last_login: null,
        last_activity: null,
        active_days: 0,
        total_duration_ms: 0,
      };
      const a = (l.action || '').toLowerCase();
      if (a.includes('login') && !a.includes('logout')) {
        cur.total_logins += 1;
        if (!cur.last_login || l.created_at > cur.last_login) cur.last_login = l.created_at;
      }
      if (a.includes('logout')) cur.total_logouts += 1;
      if (!cur.last_activity || l.created_at > cur.last_activity) cur.last_activity = l.created_at;
      byAgent.set(key, cur);
    }
    const daysByAgent = new Map<string, Set<string>>();
    for (const l of filteredLogs) {
      if (!l.agent_id) continue;
      const set = daysByAgent.get(l.agent_id) || new Set();
      set.add(l.created_at.slice(0, 10));
      daysByAgent.set(l.agent_id, set);
    }
    for (const [k, v] of daysByAgent) {
      const s = byAgent.get(k);
      if (s) s.active_days = v.size;
    }

    // Tempo na plataforma: soma o intervalo entre cada login e o próximo
    // logout do mesmo agente, em ordem cronológica (sessões ainda abertas —
    // sem logout registrado — não entram na soma, só nas fechadas).
    const eventsByAgent = new Map<string, LogRow[]>();
    for (const l of filteredLogs) {
      if (!l.agent_id) continue;
      const arr = eventsByAgent.get(l.agent_id) || [];
      arr.push(l);
      eventsByAgent.set(l.agent_id, arr);
    }
    for (const [agentId, events] of eventsByAgent) {
      const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
      let openLoginMs: number | null = null;
      let total = 0;
      for (const ev of sorted) {
        const a = (ev.action || '').toLowerCase();
        const t = new Date(ev.created_at).getTime();
        if (a.includes('login') && !a.includes('logout')) {
          openLoginMs = t;
        } else if (a.includes('logout') && openLoginMs != null) {
          total += Math.max(0, t - openLoginMs);
          openLoginMs = null;
        }
      }
      const s = byAgent.get(agentId);
      if (s) s.total_duration_ms = total;
    }

    return Array.from(byAgent.values()).sort((a, b) =>
      (b.last_activity || '').localeCompare(a.last_activity || '')
    );
  }, [filteredLogs]);

  const deleteLogs = async (ids: string[] | 'all' | { agentId: string }) => {
    setDeleting(true);
    try {
      const token = getMasterToken();
      if (token) {
        if (ids === 'all') await callMasterAdmin('access_logs_delete', { all: true });
        else if (typeof ids === 'object' && 'agentId' in ids) await callMasterAdmin('access_logs_delete', { agentId: ids.agentId });
        else await callMasterAdmin('access_logs_delete', { ids });
      } else {
        let query = supabase.from('access_logs').delete();
        if (ids === 'all') query = query.neq('id', '00000000-0000-0000-0000-000000000000');
        else if (typeof ids === 'object' && 'agentId' in ids) query = query.eq('agent_id', ids.agentId);
        else query = query.in('id', ids);
        const { error } = await query;
        if (error) throw error;
      }

      if (ids === 'all') setLogs([]);
      else if (typeof ids === 'object' && 'agentId' in ids) setLogs((prev) => prev.filter((l) => l.agent_id !== ids.agentId));
      else setLogs((prev) => prev.filter((l) => !ids.includes(l.id)));

      toast.success('Registro(s) de acesso apagado(s).');
    } catch (e: any) {
      console.error('[AccessAuditPanel] delete error', e);
      toast.error(e?.message || 'Falha ao apagar log(s) de acesso.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'one') void deleteLogs([deleteTarget.id]);
    else if (deleteTarget.kind === 'agent') void deleteLogs({ agentId: deleteTarget.agentId });
    else if (deleteTarget.kind === 'filtered') void deleteLogs(filteredLogs.map((l) => l.id));
    else if (deleteTarget.kind === 'all') void deleteLogs('all');
  };

  const clearFilters = () => {
    setSearch('');
    setAgentFilter('all');
    setEventFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const exportPDF = () => {
    if (filteredLogs.length === 0) {
      toast.error('Nenhum registro para exportar com os filtros atuais');
      return;
    }
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const now = new Date();

      // Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 22, 'F');
      doc.setTextColor(251, 191, 36); // amber-400
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('AUDITORIA DE ACESSOS — CS Plantão Pro', 10, 10);
      doc.setTextColor(203, 213, 225);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em ${format(now, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}`, 10, 16);

      // Filters summary
      const filterLines: string[] = [];
      if (agentFilter !== 'all') {
        const a = agentOptions.find((o) => o.id === agentFilter);
        filterLines.push(`Agente: ${a?.name || agentFilter}`);
      } else filterLines.push('Agente: Todos');
      if (eventFilter !== 'all') filterLines.push(`Tipo de evento: ${eventFilter}`);
      else filterLines.push('Tipo de evento: Todos');
      const de = dateFrom ? format(new Date(dateFrom + 'T00:00:00'), 'dd/MM/yyyy') : '—';
      const ate = dateTo ? format(new Date(dateTo + 'T00:00:00'), 'dd/MM/yyyy') : '—';
      filterLines.push(`Período: ${de} até ${ate}`);
      if (search.trim()) filterLines.push(`Busca: "${search.trim()}"`);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      let y = 28;
      filterLines.forEach((line) => {
        doc.text(line, 10, y);
        y += 4;
      });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total de eventos: ${filteredLogs.length}`, 10, y + 2);
      y += 8;

      // Summary by agent
      if (stats.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Agente', 'Equipe', 'Matrícula', 'Logins', 'Logouts', 'Dias ativos', 'Último login']],
          body: stats.map((s) => [
            s.name,
            s.team || '—',
            s.matricula || '—',
            String(s.total_logins),
            String(s.total_logouts),
            String(s.active_days),
            s.last_login ? format(new Date(s.last_login), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—',
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 10, right: 10 },
          didDrawPage: () => addFooter(doc),
        });
        y = (doc as any).lastAutoTable.finalY + 6;
      }

      // Events table
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      if (y > 180) {
        doc.addPage();
        y = 15;
      }
      doc.text('Eventos detalhados', 10, y);
      y += 3;

      autoTable(doc, {
        startY: y,
        head: [['Data/Hora', 'Agente', 'Equipe', 'Ação', 'IP']],
        body: filteredLogs.map((l) => [
          format(new Date(l.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
          l.agent?.name || '—',
          l.agent?.team || '—',
          l.action,
          l.ip_address || '—',
        ]),
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 41, 59], textColor: [251, 191, 36], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 10, right: 10 },
        didDrawPage: () => addFooter(doc),
      });

      const filename = `auditoria-acessos_${format(now, 'yyyyMMdd_HHmm')}.pdf`;
      doc.save(filename);
      toast.success(`Relatório exportado: ${filename}`);
    } catch (e) {
      console.error('[AccessAuditPanel] export error', e);
      toast.error('Erro ao gerar PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="glass glass-border shadow-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-400" />
              Auditoria de Acessos
            </CardTitle>
            <CardDescription>
              Histórico profissional de logins, logouts, tempo de acesso e última atividade por agente.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget({ kind: 'all' })}
              disabled={loading || logs.length === 0}
              className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Apagar tudo
            </Button>
            <Button
              onClick={exportPDF}
              disabled={exporting || loading}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-black font-bold"
            >
              {exporting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
              ) : (
                <><FileDown className="h-4 w-4 mr-2" /> Exportar PDF</>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Filter className="h-3.5 w-3.5" /> Filtros do relatório
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-slate-400">Agente</Label>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 max-h-64">
                  <SelectItem value="all" className="text-white">Todos os agentes</SelectItem>
                  {agentOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-white">{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-slate-400">Tipo de evento</Label>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 max-h-64">
                  <SelectItem value="all" className="text-white">Todos os tipos</SelectItem>
                  {actionOptions.map((a) => (
                    <SelectItem key={a} value={a} className="text-white">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-slate-400">Data inicial</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-slate-900 border-slate-700 text-white h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-slate-400">Data final</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-slate-900 border-slate-700 text-white h-9" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-slate-900 border-slate-700 text-white h-9"
                placeholder="Buscar por nome, ação ou IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {filteredLogs.length} evento{filteredLogs.length === 1 ? '' : 's'}
              </Badge>
              <Button variant="outline" size="sm" onClick={clearFilters} className="h-9">
                Limpar filtros
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget({ kind: 'filtered' })}
                disabled={filteredLogs.length === 0}
                className="h-9 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Apagar filtrados
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando registros...
          </div>
        ) : (
          <Tabs defaultValue="agents">
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="agents" className="gap-2">
                <Users className="h-4 w-4" /> Por Agente
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-2">
                <Activity className="h-4 w-4" /> Eventos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agents" className="mt-4">
              <ScrollArea className="h-[520px] pr-2">
                {stats.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">Sem registros para os filtros aplicados.</div>
                ) : (
                  <div className="grid gap-2">
                    {stats.map((s) => (
                      <Card key={s.agent_id} className="bg-slate-800/40 border-slate-700/50">
                        <CardContent className="p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-white truncate">{s.name}</span>
                                {s.team && <Badge variant="outline" className="text-[10px]">{s.team}</Badge>}
                                {s.matricula && <Badge variant="outline" className="text-[10px] font-mono">{s.matricula}</Badge>}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                                <span className="flex items-center gap-1">
                                  <LogIn className="h-3 w-3 text-emerald-400" />
                                  {s.total_logins} login{s.total_logins === 1 ? '' : 's'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <LogOut className="h-3 w-3 text-red-400" />
                                  {s.total_logouts} logout{s.total_logouts === 1 ? '' : 's'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-amber-400" />
                                  {s.active_days} dia{s.active_days === 1 ? '' : 's'} ativo{s.active_days === 1 ? '' : 's'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Timer className="h-3 w-3 text-sky-400" />
                                  {formatDurationMs(s.total_duration_ms)} na plataforma
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right text-xs">
                                <div className="text-slate-300">
                                  <span className="text-muted-foreground">Último login:</span>{' '}
                                  {s.last_login ? format(new Date(s.last_login), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—'}
                                </div>
                                <div className="text-slate-400">
                                  {s.last_activity ? `Ativo ${formatDistanceToNow(new Date(s.last_activity), { addSuffix: true, locale: ptBR })}` : '—'}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                title={`Apagar todo o histórico de ${s.name}`}
                                onClick={() => setDeleteTarget({ kind: 'agent', agentId: s.agent_id, name: s.name })}
                                className="h-8 w-8 shrink-0 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="events" className="mt-4">
              <ScrollArea className="h-[520px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Agente</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum evento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(l.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium">{l.agent?.name || '—'}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{l.action}</Badge></TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{l.ip_address || '—'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Apagar este registro"
                              onClick={() => setDeleteTarget({
                                kind: 'one',
                                id: l.id,
                                label: `${l.action} — ${l.agent?.name || 'agente desconhecido'} em ${format(new Date(l.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
                              })}
                              className="h-7 w-7 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      <AlertDialog open={deleteTarget != null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-400" />
              Apagar log{deleteTarget?.kind === 'one' ? '' : 's'} de acesso?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === 'one' && <>Isso apaga permanentemente o registro: <span className="font-medium text-foreground">{deleteTarget.label}</span>.</>}
              {deleteTarget?.kind === 'agent' && <>Isso apaga permanentemente <span className="font-medium text-foreground">todo o histórico de acessos</span> de <span className="font-medium text-foreground">{deleteTarget.name}</span>.</>}
              {deleteTarget?.kind === 'filtered' && <>Isso apaga permanentemente os <span className="font-medium text-foreground">{filteredLogs.length} evento{filteredLogs.length === 1 ? '' : 's'}</span> que correspondem aos filtros atuais.</>}
              {deleteTarget?.kind === 'all' && <>Isso apaga permanentemente <span className="font-medium text-foreground">todo o histórico de acessos</span> de todos os agentes ({logs.length} registro{logs.length === 1 ? '' : 's'}).</>}
              {' '}Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Apagando...</> : 'Apagar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function addFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const page = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Página ${page}`, pageWidth - 20, pageHeight - 6);
  doc.text('CS Plantão Pro • Auditoria confidencial • Uso restrito Master/Admin', 10, pageHeight - 6);
}

export default AccessAuditPanel;
