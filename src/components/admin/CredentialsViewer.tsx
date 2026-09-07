import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { adminClient, AdminClientError } from '@/lib/adminClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Search, Eye, EyeOff, Copy, Shield, Users, Key, Building2, RefreshCw, Download, FileJson, FileText, Clock } from 'lucide-react';
import { AgentPasswordManager } from '@/components/admin/AgentPasswordManager';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  cpf: string | null;
  team: string | null;
  is_active: boolean;
  unit: { name: string; municipality: string } | null;
}

export function CredentialsViewer() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number; raw?: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [showCpfs, setShowCpfs] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const dash = await adminClient.listDashboardData();
      const mapped: Agent[] = (dash.agents || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        cpf: a.cpf ?? null,
        team: a.team ?? null,
        is_active: !!a.is_active,
        unit: a.unit ? { name: a.unit.name, municipality: a.unit.municipality } : null,
      }));
      setAgents(mapped);
      setLastUpdatedAt(new Date());
    } catch (err: any) {
      const msg = err?.message || 'Não foi possível carregar a lista de agentes.';
      console.error('Error fetching agents:', err);
      let rawStr: string | undefined;
      if (err instanceof AdminClientError && err.raw !== undefined) {
        try {
          rawStr = typeof err.raw === 'string' ? err.raw : JSON.stringify(err.raw, null, 2);
        } catch {
          rawStr = String(err.raw);
        }
      }
      const status = err instanceof AdminClientError ? err.status : undefined;
      setError({ message: msg, status, raw: rawStr });
      toast({
        title: 'Erro ao carregar agentes',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCpf = (cpf: string, show: boolean) => {
    if (!cpf) return '---';
    if (!show) return cpf.replace(/\d/g, '•');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: '📋 Copiado!',
        description: `${label} copiado para a área de transferência.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar.',
        variant: 'destructive',
      });
    }
  };

  const toggleShowCpf = (id: string) => {
    setShowCpfs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 200);

  const availableTeams = useMemo(
    () => Array.from(new Set(agents.map(a => a.team).filter(Boolean))).sort() as string[],
    [agents]
  );
  const availableUnits = useMemo(
    () => Array.from(new Set(agents.map(a => a.unit?.name).filter(Boolean))).sort() as string[],
    [agents]
  );

  const filteredAgents = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase();
    const numbers = debouncedSearchTerm.replace(/\D/g, '');
    return agents.filter(agent => {
      if (teamFilter !== 'all' && agent.team !== teamFilter) return false;
      if (unitFilter !== 'all' && agent.unit?.name !== unitFilter) return false;
      if (statusFilter === 'active' && !agent.is_active) return false;
      if (statusFilter === 'inactive' && agent.is_active) return false;
      if (!term && !numbers) return true;
      return (
        agent.name.toLowerCase().includes(term) ||
        (numbers && agent.cpf?.includes(numbers)) ||
        (agent.team?.toLowerCase().includes(term) ?? false) ||
        (agent.unit?.name.toLowerCase().includes(term) ?? false) ||
        (agent.unit?.municipality.toLowerCase().includes(term) ?? false)
      );
    });
  }, [agents, debouncedSearchTerm, teamFilter, statusFilter, unitFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedAgents = useMemo(
    () => filteredAgents.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredAgents, currentPage, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, teamFilter, statusFilter, unitFilter, pageSize]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setTeamFilter('all');
    setStatusFilter('all');
    setUnitFilter('all');
  };

  const activeFilterCount =
    (searchTerm ? 1 : 0) +
    (teamFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (unitFilter !== 'all' ? 1 : 0);

  const exportJSON = () => {
    try {
      setExporting(true);
      const payload = {
        exported_at: new Date().toISOString(),
        total: filteredAgents.length,
        filters: {
          search: searchTerm || null,
          team: teamFilter,
          status: statusFilter,
          unit: unitFilter,
        },
        agents: filteredAgents.map(a => ({
          id: a.id,
          name: a.name,
          cpf: a.cpf,
          team: a.team,
          is_active: a.is_active,
          unit_name: a.unit?.name ?? null,
          unit_municipality: a.unit?.municipality ?? null,
        })),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credenciais-agentes-${format(new Date(), 'yyyyMMdd-HHmmss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'JSON exportado', description: `${filteredAgents.length} agente(s) exportado(s).` });
    } catch (e: any) {
      toast({ title: 'Erro na exportação', description: e?.message || 'Falha ao gerar JSON.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    try {
      setExporting(true);
      const { default: jsPDF } = await import('jspdf');
      const autoTableMod: any = await import('jspdf-autotable');
      const autoTable = autoTableMod.default || autoTableMod;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const now = new Date();

      doc.setFontSize(14);
      doc.text('Credenciais dos Agentes', 40, 40);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        `Gerado em ${format(now, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })} • ${filteredAgents.length} registro(s)`,
        40,
        56
      );

      autoTable(doc, {
        startY: 74,
        head: [['Nome', 'CPF', 'Equipe', 'Unidade', 'Município', 'Status']],
        body: filteredAgents.map(a => [
          a.name,
          a.cpf ? a.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '---',
          a.team ?? '---',
          a.unit?.name ?? '---',
          a.unit?.municipality ?? '---',
          a.is_active ? 'Ativo' : 'Inativo',
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [88, 28, 135], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 243, 255] },
      });

      doc.save(`credenciais-agentes-${format(now, 'yyyyMMdd-HHmmss')}.pdf`);
      toast({ title: 'PDF exportado', description: `${filteredAgents.length} agente(s) exportado(s).` });
    } catch (e: any) {
      console.error('exportPDF error', e);
      toast({ title: 'Erro na exportação', description: e?.message || 'Falha ao gerar PDF.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const teamColors: Record<string, string> = {
    'ALFA': 'bg-red-500/20 text-red-400 border-red-500/40',
    'BRAVO': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    'CHARLIE': 'bg-green-500/20 text-green-400 border-green-500/40',
    'DELTA': 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  };

  return (
    <Card className="glass glass-border shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-500/10 border border-purple-500/40">
                <Key className="h-5 w-5 text-purple-400" />
              </div>
              Credenciais dos Agentes
            </CardTitle>
            <CardDescription>
              Visualize e gerencie as credenciais de acesso de todos os agentes
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exporting || filteredAgents.length === 0}
                  className="gap-2"
                  title="Exportar lista filtrada"
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
                <DropdownMenuItem onClick={exportJSON} className="gap-2 cursor-pointer">
                  <FileJson className="h-4 w-4" />
                  JSON ({filteredAgents.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportPDF} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  PDF ({filteredAgents.length})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAgents}
              disabled={loading}
              className="gap-2"
              title="Atualizar lista de agentes"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              {loading ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </div>
        {lastUpdatedAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <Clock className="h-3 w-3" />
            Última atualização: {format(lastUpdatedAt, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive space-y-2">
            <div className="font-semibold">
              Falha ao carregar agentes via edge function
              {error.status !== undefined && (
                <span className="ml-2 font-mono text-xs opacity-70">[HTTP {error.status}]</span>
              )}
            </div>
            <div className="font-mono text-xs opacity-90 break-all">{error.message}</div>
            {error.raw && (
              <details className="text-xs">
                <summary className="cursor-pointer opacity-80 hover:opacity-100">
                  Ver resposta bruta do edge function `admin-operations`
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded bg-black/40 p-2 text-[11px] leading-tight whitespace-pre-wrap break-all">
{error.raw}
                </pre>
              </details>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAgents}
            >
              Tentar novamente
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, CPF, equipe, unidade ou município..."
              className="pl-10 bg-slate-800/50 border-slate-700"
            />
          </div>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="bg-slate-800/50 border-slate-700">
              <SelectValue placeholder="Equipe" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">Todas as equipes</SelectItem>
              {availableTeams.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="bg-slate-800/50 border-slate-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Somente ativos</SelectItem>
              <SelectItem value="inactive">Somente inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="bg-slate-800/50 border-slate-700 lg:col-span-2">
              <SelectValue placeholder="Unidade" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">Todas as unidades</SelectItem>
              {availableUnits.map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="bg-slate-800/50 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {[10, 25, 50, 100].map(n => (
                <SelectItem key={n} value={String(n)}>{n} por página</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{filteredAgents.length} de {agents.length} agentes</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            <span>{filteredAgents.filter(a => a.is_active).length} ativos</span>
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 px-2 text-xs"
            >
              Limpar filtros ({activeFilterCount})
            </Button>
          )}
          <div className="ml-auto text-xs">
            Página {currentPage} de {totalPages}
          </div>
        </div>


        <ScrollArea className="h-[400px] rounded-lg border border-border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow className="border-border">
                <TableHead className="w-[200px]">Agente</TableHead>
                <TableHead>CPF (Usuário)</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`} className="border-border">
                    <TableCell colSpan={5} className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
                        <div className="h-3 w-40 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-24 rounded bg-muted animate-pulse ml-auto" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredAgents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12">
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <div className="p-3 rounded-full bg-muted/40 border border-border">
                        <Users className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {agents.length === 0 ? 'Nenhum agente cadastrado' : 'Nenhum resultado encontrado'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {agents.length === 0
                            ? 'Cadastre agentes no painel para visualizar suas credenciais aqui.'
                            : 'Ajuste os termos da busca ou limpe o filtro para ver todos os agentes.'}
                        </div>
                      </div>
                      {agents.length === 0 ? (
                        <Button variant="outline" size="sm" onClick={fetchAgents} className="gap-2 mt-1">
                          <RefreshCw className="h-3.5 w-3.5" />
                          Atualizar lista
                        </Button>
                      ) : searchTerm ? (
                        <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')} className="mt-1">
                          Limpar busca
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAgents.map((agent) => (
                  <TableRow key={agent.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          agent.is_active ? "bg-green-500" : "bg-red-500"
                        )} />
                        <span className="truncate max-w-[150px]">{agent.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-slate-800/60 rounded text-sm font-mono">
                          {formatCpf(agent.cpf || '', showCpfs[agent.id] || false)}
                        </code>
                        {agent.cpf && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => toggleShowCpf(agent.id)}
                            >
                              {showCpfs[agent.id] ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => copyToClipboard(agent.cpf!, 'CPF')}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {agent.team ? (
                        <Badge className={cn("border", teamColors[agent.team] || 'bg-slate-500/20')}>
                          {agent.team}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">---</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {agent.unit ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate max-w-[120px]">{agent.unit.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">---</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {agent.cpf && (
                        <AgentPasswordManager
                          agent={{ id: agent.id, name: agent.name, cpf: agent.cpf, email: null }}
                          onSuccess={fetchAgents}
                        />
                      )}
                    </TableCell>

                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {filteredAgents.length > pageSize && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredAgents.length)} de {filteredAgents.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
