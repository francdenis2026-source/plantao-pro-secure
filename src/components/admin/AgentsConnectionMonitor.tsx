import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getMasterToken } from '@/lib/masterSession';
import { useOnlineAgents } from '@/hooks/useOnlineAgents';

async function callMasterAdmin<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const token = getMasterToken();
  if (!token) throw new Error('Sessão master ausente.');
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/master-admin`;
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-master-token': token,
      authorization: `Bearer ${anon}`,
      apikey: anon,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j?.success) throw new Error(j?.error || `Falha (${res.status}) na ação ${action}`);
  return j.data as T;
}
const hasMasterSession = () => !!getMasterToken();
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow, format, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity, Users, Wifi, WifiOff, RefreshCw, Search, Radio, FileDown,
  ShieldCheck, ShieldAlert, ShieldOff, Clock, LogIn, LogOut, TimerReset,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type AgentRow = {
  id: string;
  name: string;
  team: string | null;
  matricula: string | null;
  unit_id: string | null;
  unit_name?: string | null;
  is_active: boolean | null;
  is_frozen: boolean | null;
  approval_status: string | null;
};

type LogRow = { agent_id: string; action: string; created_at: string };

type RegStatus = 'active' | 'pending' | 'blocked';

function computeStatus(a: Pick<AgentRow, 'is_active' | 'is_frozen' | 'approval_status'>): RegStatus {
  if (a.is_frozen || a.is_active === false) return 'blocked';
  if ((a.approval_status ?? 'approved') !== 'approved') return 'pending';
  return 'active';
}

function fmtDur(seconds: number) {
  if (!seconds || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const SESSION_TIMEOUT_MIN = 60; // sessão sem logout após esse tempo é considerada "expirada"

type TimelineEvent = {
  agent_id: string;
  agent_name: string;
  type: 'login' | 'logout' | 'expired';
  at: string;
  duration_s?: number; // para logout/expired
};

export function AgentsConnectionMonitor() {
  const online = useOnlineAgents();
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [tick, setTick] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | RegStatus | 'online' | 'offline'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'agents' | 'timeline'>('agents');

  const load = async () => {
    setLoading(true);
    try {
      let agentsData: any[] | null = null;
      let logsData: any[] | null = null;
      if (hasMasterSession()) {
        const [a, l] = await Promise.all([
          callMasterAdmin<any[]>('agents_list_all'),
          callMasterAdmin<any[]>('access_logs_list', { limit: 5000 }),
        ]);
        agentsData = a;
        logsData = l;
      } else {
        const [aRes, lRes] = await Promise.all([
          supabase
            .from('agents')
            .select('id, name, team, matricula, unit_id, is_active, is_frozen, approval_status, unit:units(name)')
            .order('name'),
          supabase
            .from('access_logs')
            .select('agent_id, action, created_at')
            .order('created_at', { ascending: false })
            .limit(5000),
        ]);
        agentsData = aRes.data as any[] | null;
        logsData = lRes.data as any[] | null;
      }
      const list: AgentRow[] = (agentsData || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        team: a.team,
        matricula: a.matricula,
        unit_id: a.unit_id,
        unit_name: a.unit?.name ?? null,
        is_active: a.is_active,
        is_frozen: a.is_frozen,
        approval_status: a.approval_status,
      }));
      setAgents(list);
      setLogs((logsData as LogRow[]) || []);
    } catch (e) {
      console.error('[AgentsConnectionMonitor] load', e);
      toast.error('Falha ao carregar dados de conexão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    // Poll rápido para sincronizar login/logout mesmo quando Realtime está bloqueado por RLS.
    const i = setInterval(() => { setTick((t) => t + 1); load(); }, 10_000);
    return () => clearInterval(i);
  }, []);
  // Force re-render do relógio de "sessão ativa" a cada 30s (durações relativas).
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const agentIndex = useMemo(() => {
    const m = new Map<string, AgentRow>();
    for (const a of agents) m.set(a.id, a);
    return m;
  }, [agents]);

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    agents.forEach((a) => a.unit_name && set.add(a.unit_name));
    return Array.from(set).sort();
  }, [agents]);
  const teamOptions = useMemo(() => {
    const set = new Set<string>();
    agents.forEach((a) => a.team && set.add(a.team));
    return Array.from(set).sort();
  }, [agents]);

  // "last event" and last login per agent
  const perAgent = useMemo(() => {
    const last = new Map<string, LogRow>();
    const lastLogin = new Map<string, string>();
    for (const l of logs) {
      if (!l.agent_id) continue;
      if (!last.has(l.agent_id)) last.set(l.agent_id, l);
      if (l.action === 'login' && !lastLogin.has(l.agent_id)) lastLogin.set(l.agent_id, l.created_at);
    }
    return { last, lastLogin };
  }, [logs]);

  // Build sessions (login → logout/expired)
  const timeline: TimelineEvent[] = useMemo(() => {
    // logs are DESC; process per agent chronologically
    const byAgent = new Map<string, LogRow[]>();
    for (const l of logs) {
      if (!l.agent_id) continue;
      if (!byAgent.has(l.agent_id)) byAgent.set(l.agent_id, []);
      byAgent.get(l.agent_id)!.push(l);
    }
    const events: TimelineEvent[] = [];
    for (const [agentId, list] of byAgent) {
      const a = agentIndex.get(agentId);
      const name = a?.name ?? '—';
      const asc = [...list].sort((x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime());
      let openLoginAt: string | null = null;
      for (const ev of asc) {
        if (ev.action === 'login') {
          if (openLoginAt) {
            // previous login was never closed → expired
            events.push({
              agent_id: agentId, agent_name: name, type: 'expired', at: openLoginAt,
              duration_s: differenceInSeconds(new Date(ev.created_at), new Date(openLoginAt)),
            });
          }
          openLoginAt = ev.created_at;
          events.push({ agent_id: agentId, agent_name: name, type: 'login', at: ev.created_at });
        } else if (ev.action === 'logout') {
          if (openLoginAt) {
            events.push({
              agent_id: agentId, agent_name: name, type: 'logout', at: ev.created_at,
              duration_s: differenceInSeconds(new Date(ev.created_at), new Date(openLoginAt)),
            });
            openLoginAt = null;
          } else {
            events.push({ agent_id: agentId, agent_name: name, type: 'logout', at: ev.created_at });
          }
        }
      }
      // Dangling login? If agent is not currently online and last event too old → expired
      if (openLoginAt) {
        const isOnline = online.has(agentId);
        const ageMin = (Date.now() - new Date(openLoginAt).getTime()) / 60000;
        if (!isOnline && ageMin > SESSION_TIMEOUT_MIN) {
          events.push({
            agent_id: agentId, agent_name: name, type: 'expired', at: openLoginAt,
            duration_s: Math.floor(ageMin * 60),
          });
        }
      }
    }
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [logs, agentIndex, online, tick]);

  const filteredAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents
      .map((a) => {
        const isOnline = online.has(a.id);
        const last = perAgent.last.get(a.id);
        const loginAt = perAgent.lastLogin.get(a.id);
        return { ...a, isOnline, last, loginAt, status: computeStatus(a) };
      })
      .filter((r) => {
        if (unitFilter !== 'all' && r.unit_name !== unitFilter) return false;
        if (teamFilter !== 'all' && r.team !== teamFilter) return false;
        if (statusFilter === 'online' && !r.isOnline) return false;
        if (statusFilter === 'offline' && r.isOnline) return false;
        if (['active', 'pending', 'blocked'].includes(statusFilter) && r.status !== statusFilter) return false;
        if (q) {
          const hay = `${r.name} ${r.team ?? ''} ${r.matricula ?? ''} ${r.unit_name ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (dateFrom || dateTo) {
          if (!r.last) return false;
          const t = new Date(r.last.created_at).getTime();
          if (dateFrom && t < new Date(dateFrom + 'T00:00:00').getTime()) return false;
          if (dateTo && t > new Date(dateTo + 'T23:59:59').getTime()) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        const ax = a.last?.created_at ? new Date(a.last.created_at).getTime() : 0;
        const bx = b.last?.created_at ? new Date(b.last.created_at).getTime() : 0;
        return bx - ax;
      });
  }, [agents, online, perAgent, search, unitFilter, teamFilter, statusFilter, dateFrom, dateTo, tick]);

  const filteredTimeline = useMemo(() => {
    const visibleIds = new Set(filteredAgents.map((a) => a.id));
    return timeline.filter((ev) => {
      if (selectedAgentId && ev.agent_id !== selectedAgentId) return false;
      if (!visibleIds.has(ev.agent_id)) return false;
      if (dateFrom && new Date(ev.at).getTime() < new Date(dateFrom + 'T00:00:00').getTime()) return false;
      if (dateTo && new Date(ev.at).getTime() > new Date(dateTo + 'T23:59:59').getTime()) return false;
      return true;
    }).slice(0, 500);
  }, [timeline, filteredAgents, dateFrom, dateTo, selectedAgentId]);

  const selectedAgent = selectedAgentId ? agentIndex.get(selectedAgentId) : null;
  const selectedAgentSessions = useMemo(() => {
    if (!selectedAgentId) return [];
    return timeline.filter((e) => e.agent_id === selectedAgentId).slice(0, 100);
  }, [timeline, selectedAgentId]);

  const onlineCount = filteredAgents.filter((a) => a.isOnline).length;
  const statusCounts = useMemo(() => {
    const c = { active: 0, pending: 0, blocked: 0 };
    filteredAgents.forEach((a) => { c[a.status]++; });
    return c;
  }, [filteredAgents]);

  const fmtRel = (iso?: string | null) => {
    if (!iso) return '—';
    try { return formatDistanceToNow(new Date(iso), { locale: ptBR, addSuffix: true }); } catch { return '—'; }
  };
  const fmtAbs = (iso?: string | null) => {
    if (!iso) return '—';
    try { return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: ptBR }); } catch { return '—'; }
  };

  const clearFilters = () => {
    setSearch(''); setUnitFilter('all'); setTeamFilter('all'); setStatusFilter('all');
    setDateFrom(''); setDateTo('');
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const now = new Date();
      doc.setFontSize(16); doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Conexões e Registros de Agentes', 14, 14);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em: ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 20);
      const filterLine = [
        search && `busca: "${search}"`,
        unitFilter !== 'all' && `unidade: ${unitFilter}`,
        teamFilter !== 'all' && `equipe: ${teamFilter}`,
        statusFilter !== 'all' && `status: ${statusFilter}`,
        dateFrom && `de: ${dateFrom}`,
        dateTo && `até: ${dateTo}`,
      ].filter(Boolean).join(' • ') || 'sem filtros';
      doc.text(`Filtros: ${filterLine}`, 14, 25);
      doc.text(
        `Total: ${filteredAgents.length}  •  Online: ${onlineCount}  •  Ativos: ${statusCounts.active}  •  Pendentes: ${statusCounts.pending}  •  Bloqueados: ${statusCounts.blocked}`,
        14, 30,
      );

      autoTable(doc, {
        startY: 35,
        head: [['Agente', 'Matrícula', 'Equipe', 'Unidade', 'Cadastro', 'Presença', 'Último evento', 'Quando']],
        body: filteredAgents.map((a) => [
          a.name,
          a.matricula ?? '—',
          a.team ?? '—',
          a.unit_name ?? '—',
          a.status === 'active' ? 'Ativo' : a.status === 'pending' ? 'Pendente' : 'Bloqueado',
          a.isOnline ? 'ONLINE' : 'Offline',
          a.last?.action ?? '—',
          a.last?.created_at ? format(new Date(a.last.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—',
        ]),
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      });

      doc.addPage();
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('Linha do Tempo — Sessões (login / logout / expirado)', 14, 14);
      autoTable(doc, {
        startY: 20,
        head: [['Agente', 'Evento', 'Data / Hora', 'Duração da sessão']],
        body: filteredTimeline.map((e) => [
          e.agent_name,
          e.type === 'login' ? 'Login' : e.type === 'logout' ? 'Logout' : 'Expirado',
          format(new Date(e.at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
          e.duration_s !== undefined ? fmtDur(e.duration_s) : '—',
        ]),
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(120);
        doc.text(
          `Documento confidencial — Plantão Pro • Página ${i}/${pageCount}`,
          14, doc.internal.pageSize.getHeight() - 8,
        );
      }

      const filename = `relatorio-conexoes_${format(now, 'yyyyMMdd_HHmm')}.pdf`;
      doc.save(filename);
      toast.success('Relatório PDF exportado');
    } catch (e) {
      console.error(e); toast.error('Falha ao gerar PDF');
    } finally { setExporting(false); }
  };

  const StatusChip = ({ s }: { s: RegStatus }) => {
    if (s === 'active') return (
      <Badge className="bg-emerald-600 hover:bg-emerald-700 gap-1"><ShieldCheck className="h-3 w-3" />Ativo</Badge>
    );
    if (s === 'pending') return (
      <Badge className="bg-amber-600 hover:bg-amber-700 gap-1"><ShieldAlert className="h-3 w-3" />Pendente</Badge>
    );
    return <Badge className="bg-rose-600 hover:bg-rose-700 gap-1"><ShieldOff className="h-3 w-3" />Bloqueado</Badge>;
  };

  const PresenceDot = ({ on }: { on: boolean }) => (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-flex h-2.5 w-2.5">
        {on && <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-70 animate-ping" />}
        <span className={cn('relative h-2.5 w-2.5 rounded-full', on ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
      </span>
      <span className={cn('text-xs font-semibold', on ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
        {on ? 'Online agora' : 'Offline'}
      </span>
    </span>
  );

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-emerald-500" />
              Monitor de Conexões — Tempo Real
            </CardTitle>
            <CardDescription>
              Presença ao vivo, status de cadastro, filtros e linha do tempo de sessões.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-emerald-300 animate-ping opacity-70" />
                <span className="relative h-2 w-2 rounded-full bg-white" />
              </span>
              {onlineCount} online
            </Badge>
            <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" />{statusCounts.active} ativos</Badge>
            <Badge variant="outline" className="gap-1"><ShieldAlert className="h-3 w-3 text-amber-500" />{statusCounts.pending} pendentes</Badge>
            <Badge variant="outline" className="gap-1"><ShieldOff className="h-3 w-3 text-rose-500" />{statusCounts.blocked} bloqueados</Badge>
            <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{filteredAgents.length} total</Badge>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-1.5', loading && 'animate-spin')} />
              Atualizar
            </Button>
            <Button size="sm" onClick={exportPDF} disabled={exporting || loading}>
              <FileDown className={cn('h-4 w-4 mr-1.5', exporting && 'animate-pulse')} />
              Exportar PDF
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 p-3 rounded-md border bg-muted/30">
          <div className="lg:col-span-2">
            <Label className="text-xs">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome, matrícula, equipe, unidade…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Unidade</Label>
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {unitOptions.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Equipe</Label>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {teamOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="online">Online agora</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="active">Cadastro: Ativo</SelectItem>
                <SelectItem value="pending">Cadastro: Pendente</SelectItem>
                <SelectItem value="blocked">Cadastro: Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:col-span-1">
            <div>
              <Label className="text-xs">De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Até</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="lg:col-span-6 flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
          </div>
        </div>

        {selectedAgent && (
          <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-md border border-primary/40 bg-primary/5">
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <PresenceDot on={online.has(selectedAgent.id)} />
              <span className="font-semibold">{selectedAgent.name}</span>
              {selectedAgent.matricula && (
                <span className="text-xs text-muted-foreground font-mono">Mat. {selectedAgent.matricula}</span>
              )}
              <Badge variant="outline" className="text-[10px]">
                {selectedAgentSessions.filter((s) => s.type === 'login').length} logins registrados
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {selectedAgentSessions.filter((s) => s.type === 'logout').length} logouts
              </Badge>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedAgentId(null)}>
              Limpar seleção
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="agents"><Users className="h-3.5 w-3.5 mr-1.5" />Agentes</TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Linha do tempo{selectedAgent ? ` — ${selectedAgent.name}` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="mt-3">
            <ScrollArea className="h-[520px] rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[150px]">Presença</TableHead>
                    <TableHead>Agente</TableHead>
                    <TableHead>Equipe / Unidade</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Último evento</TableHead>
                    <TableHead>Quando</TableHead>
                    <TableHead>Sessão / Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>
                  )}
                  {!loading && filteredAgents.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum agente encontrado.</TableCell></TableRow>
                  )}
                  {!loading && filteredAgents.map((r) => {
                    const sessionInfo = r.isOnline
                      ? r.loginAt ? `há ${formatDistanceToNow(new Date(r.loginAt), { locale: ptBR })}` : 'sessão ativa'
                      : r.loginAt ? fmtAbs(r.loginAt) : '—';
                    const isSelected = selectedAgentId === r.id;
                    return (
                      <TableRow
                        key={r.id}
                        onClick={() => {
                          setSelectedAgentId(isSelected ? null : r.id);
                          if (!isSelected) setActiveTab('timeline');
                        }}
                        className={cn(
                          'cursor-pointer transition-colors',
                          r.isOnline && 'bg-emerald-500/5',
                          isSelected && 'bg-primary/10 ring-1 ring-primary/40',
                        )}
                        title="Clique para ver a linha do tempo deste agente"
                      >
                        <TableCell><PresenceDot on={r.isOnline} /></TableCell>
                        <TableCell>
                          <div className="font-medium">{r.name}</div>
                          {r.matricula && <div className="text-xs text-muted-foreground font-mono">Mat. {r.matricula}</div>}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{r.team ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{r.unit_name ?? '—'}</div>
                        </TableCell>
                        <TableCell><StatusChip s={r.status} /></TableCell>
                        <TableCell>
                          {r.last ? (
                            <Badge variant={r.last.action === 'login' ? 'default' : 'secondary'} className="capitalize">
                              <Activity className="h-3 w-3 mr-1" />{r.last.action}
                            </Badge>
                          ) : <span className="text-muted-foreground text-sm">nunca acessou</span>}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{fmtRel(r.last?.created_at)}</div>
                          <div className="text-xs text-muted-foreground">{fmtAbs(r.last?.created_at)}</div>
                        </TableCell>
                        <TableCell className="text-sm">{sessionInfo}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="timeline" className="mt-3">
            <ScrollArea className="h-[520px] rounded-md border p-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando…</div>
              ) : filteredTimeline.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhum evento no período.</div>
              ) : (
                <ol className="relative border-l-2 border-primary/20 ml-3 space-y-4">
                  {filteredTimeline.map((ev, i) => {
                    const Icon = ev.type === 'login' ? LogIn : ev.type === 'logout' ? LogOut : TimerReset;
                    const color =
                      ev.type === 'login' ? 'bg-emerald-500 border-emerald-400'
                      : ev.type === 'logout' ? 'bg-sky-500 border-sky-400'
                      : 'bg-amber-500 border-amber-400';
                    const label = ev.type === 'login' ? 'Login' : ev.type === 'logout' ? 'Logout' : 'Sessão expirada';
                    return (
                      <li key={i} className="ml-4">
                        <span className={cn('absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full border-2 ring-4 ring-background', color)}>
                          <Icon className="h-2.5 w-2.5 text-white" />
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{ev.agent_name}</span>
                          <Badge variant="outline" className="text-[10px] py-0">{label}</Badge>
                          <span className="text-xs text-muted-foreground">{fmtAbs(ev.at)} · {fmtRel(ev.at)}</span>
                          {ev.duration_s !== undefined && (
                            <Badge className="bg-slate-600 hover:bg-slate-700 text-[10px]">
                              <Clock className="h-2.5 w-2.5 mr-1" />sessão {fmtDur(ev.duration_s)}
                            </Badge>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
