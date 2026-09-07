import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AgentDetailsDialog } from '@/components/agents/AgentDetailsDialog';
import { useOnlineAgents } from '@/hooks/useOnlineAgents';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { toast } from '@/hooks/use-toast';
import { Users, Search, Eye, Circle, Shield, Snowflake, Filter, UserPlus, FilterX } from 'lucide-react';
import { EmptyState } from '@/components/ui/data-states';
import { cn } from '@/lib/utils';

interface AgentRow {
  id: string;
  name: string;
  team: string | null;
  position: string | null;
  role: string | null;
  matricula: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_frozen: boolean | null;
  approval_status: string | null;
  license_status: string | null;
  unit: { name: string } | null;
}

const teamColors: Record<string, string> = {
  ALFA: 'bg-red-500/15 text-red-300 border-red-500/40',
  BRAVO: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  CHARLIE: 'bg-green-500/15 text-green-300 border-green-500/40',
  DELTA: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
};

export type DirectoryScope = 'team' | 'unit' | 'system';

export function AgentsDirectoryCard({
  currentAgentId,
  scope = 'team',
  title,
  description,
}: {
  currentAgentId?: string;
  scope?: DirectoryScope;
  title?: string;
  description?: string;
}) {
  const { agent: myAgent, isLoading: profileLoading } = useAgentProfile();
  const myUnitId = (myAgent as any)?.unit_id ?? null;
  const myTeam = (myAgent as any)?.team ?? null;

  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // Em escopo 'team' o filtro fica travado na equipe do agente e o select some.
  // Em 'unit' começa em "todas equipes" mas o usuário pode filtrar.
  // Em 'system' começa em "todas equipes" (mostra todas as unidades também).
  const [teamFilter, setTeamFilter] = useState<string>(scope === 'team' && myTeam ? myTeam : 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 200);
  const onlineIds = useOnlineAgents();

  // Sincroniza o filtro travado quando a equipe do agente aparece após hidratação
  useEffect(() => {
    if (scope === 'team' && myTeam) setTeamFilter(myTeam);
  }, [scope, myTeam]);

  useEffect(() => {
    // Aguarda a hidratação completa do perfil antes de decidir.
    if (profileLoading) return;
    if (!myAgent) return;

    if (scope !== 'system' && !myUnitId) {
      const msg = 'Diretório indisponível: seu cadastro não possui unidade vinculada.';
      console.error('[AgentsDirectory] missing unit_id on caller agent', { myAgent });
      setError(msg);
      setLoading(false);
      toast({ title: 'Diretório indisponível', description: msg, variant: 'destructive' });
      return;
    }

    (async () => {
      try {
        setError(null);
        setLoading(true);
        const rpcName =
          scope === 'system' ? 'list_agents_system'
          : scope === 'team' ? 'list_agents_same_team'
          : 'list_agents_same_unit';
        const { data, error } = await supabase.rpc(rpcName as any);
        if (error) {
          console.error(`[AgentsDirectory] rpc ${rpcName} failed`, error);
          throw error;
        }
        const mapped: AgentRow[] = (data || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          team: r.team,
          position: r.position,
          role: r.role ?? null,
          matricula: r.matricula,
          avatar_url: r.avatar_url,
          is_active: !!r.is_active,
          is_frozen: r.is_frozen,
          approval_status: r.approval_status,
          license_status: r.license_status,
          unit: r.unit_name ? { name: r.unit_name } : null,
        }));
        console.info('[AgentsDirectory] loaded', { scope, count: mapped.length, unit_id: myUnitId });
        setAgents(mapped);
      } catch (e) {
        console.error('Failed to load agents directory', e);
        setError('Falha ao carregar diretório.');
      } finally {
        setLoading(false);
      }
    })();
  }, [myUnitId, myAgent, profileLoading, scope]);


  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return agents.filter((a) => {
      if (teamFilter !== 'all' && (a.team || '') !== teamFilter) return false;
      if (statusFilter === 'active' && !(a.is_active && a.approval_status === 'approved')) return false;
      if (statusFilter === 'inactive' && a.is_active && a.approval_status === 'approved') return false;
      if (statusFilter === 'online' && !onlineIds.has(a.id)) return false;
      if (statusFilter === 'frozen' && !a.is_frozen) return false;
      if (!term) return true;
      return (
        a.name.toLowerCase().includes(term) ||
        (a.matricula || '').toLowerCase().includes(term) ||
        (a.position || '').toLowerCase().includes(term) ||
        (a.team || '').toLowerCase().includes(term) ||
        (a.unit?.name || '').toLowerCase().includes(term)
      );
    });
  }, [agents, debouncedSearch, teamFilter, statusFilter, onlineIds]);

  const totalActive = filtered.filter((a) => a.is_active && a.approval_status === 'approved').length;
  const totalOnline = filtered.filter((a) => onlineIds.has(a.id)).length;

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <Card className="tactical-cards border-amber-500/25 bg-slate-900/70 backdrop-blur-xl">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <div className="p-1 rounded-md bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/40">
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                </div>
                {title ?? (scope === 'team' ? `Equipe ${myTeam ?? '—'}` : scope === 'system' ? 'Diretório do Sistema' : 'Diretório de Agentes')}
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5 leading-tight">
                {description ?? (scope === 'team' ? 'Somente agentes da sua equipe' : scope === 'system' ? 'Agentes ativos de todas as unidades' : 'Agentes da sua unidade')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <Badge variant="outline" className="h-5 px-1.5 border-emerald-500/40 text-emerald-300 bg-emerald-500/10">
                <Circle className="h-1.5 w-1.5 mr-1 fill-emerald-400 text-emerald-400" />
                {totalOnline} on
              </Badge>
              <Badge variant="outline" className="h-5 px-1.5 border-amber-500/40 text-amber-200 bg-amber-500/10">
                <Shield className="h-2.5 w-2.5 mr-1" /> {totalActive}/{filtered.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3">
          <div className="flex flex-col sm:flex-row gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nome, matrícula, cargo..."
                className="pl-8 bg-slate-800/60 border-slate-700 h-8 text-xs"
                autoComplete="new-password"
              />
            </div>
            <div className="flex gap-1.5">
              {scope !== 'team' && (
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-[110px] h-8 text-xs bg-slate-800/60 border-slate-700">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas equipes</SelectItem>
                    <SelectItem value="ALFA">ALFA</SelectItem>
                    <SelectItem value="BRAVO">BRAVO</SelectItem>
                    <SelectItem value="CHARLIE">CHARLIE</SelectItem>
                    <SelectItem value="DELTA">DELTA</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[110px] h-8 text-xs bg-slate-800/60 border-slate-700">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="online">Online agora</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                  
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="h-[340px] rounded-lg border border-slate-700/60 bg-slate-950/40">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                <div className="h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-2" />
                Carregando agentes...
              </div>
            ) : error ? (
              <div className="text-center py-12 px-4 text-xs text-red-300">
                {error}
              </div>
            ) : filtered.length === 0 ? (
              agents.length === 0 ? (
                <EmptyState
                  icon={UserPlus}
                  title="Nenhum agente cadastrado"
                  description="Sua unidade ainda não tem agentes registrados. Convide o primeiro agente para começar."
                  action={
                    <a
                      href="/"
                      className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-amber-300 transition-all hover:bg-amber-500/20 hover:border-amber-400/70 focus-ring-primary"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Cadastrar primeiro agente
                    </a>
                  }
                />
              ) : (
                <EmptyState
                  icon={Search}
                  title="Nenhum agente encontrado"
                  description={
                    debouncedSearch
                      ? `Nenhum resultado para "${debouncedSearch}" com os filtros atuais.`
                      : 'Ajuste os filtros para ampliar a busca.'
                  }
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setTeamFilter('all');
                        setStatusFilter('all');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-500/50 bg-slate-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 transition-all hover:bg-slate-500/20 focus-ring-primary"
                    >
                      <FilterX className="h-3.5 w-3.5" />
                      Limpar filtros
                    </button>
                  }
                />
              )
            ) : (
              <ul className="divide-y divide-slate-800/70">
                {filtered.map((a) => {
                  const isOnline = onlineIds.has(a.id);
                  const isActive = a.is_active && a.approval_status === 'approved';
                  const isMe = a.id === currentAgentId;
                  return (
                    <li
                      key={a.id}
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-amber-500/5 transition-colors',
                        isMe && 'bg-amber-500/10'
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-8 w-8 border border-slate-700">
                          <AvatarImage src={a.avatar_url || undefined} alt={a.name} />
                          <AvatarFallback className="bg-slate-800 text-amber-300 text-[10px] font-bold">
                            {initials(a.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950',
                            isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
                          )}
                          aria-label={isOnline ? 'Online' : 'Offline'}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-[13px] text-zinc-100 truncate leading-tight">
                            {a.name}
                            {isMe && (
                              <span className="ml-1.5 text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                                (você)
                              </span>
                            )}
                          </p>
                          {a.is_frozen && (
                            <Badge variant="outline" className="h-3.5 px-1 text-[9px] border-cyan-500/40 text-cyan-300 bg-cyan-500/10">
                              <Snowflake className="h-2 w-2 mr-0.5" /> Congelado
                            </Badge>
                          )}
                          {!isActive && !a.is_frozen && (
                            <Badge variant="outline" className="h-3.5 px-1 text-[9px] border-rose-500/40 text-rose-300 bg-rose-500/10">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0 text-[10px] text-muted-foreground flex-wrap leading-tight">
                          {a.matricula && <span className="font-mono">Mat. {a.matricula}</span>}
                          {a.position && <span>• {a.position}</span>}
                          {a.unit?.name && <span className="hidden sm:inline">• {a.unit.name}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {a.team ? (
                          <Badge className={cn('border text-[9px] font-bold h-5 px-1.5', teamColors[a.team] || 'bg-slate-500/20 border-slate-500/40 text-slate-300')}>
                            {a.team}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:bg-amber-500/20 hover:text-amber-300"
                          onClick={() => setSelectedAgent(a.id)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>

          <div className="text-[10px] text-muted-foreground text-center">
            Mostrando {filtered.length} de {agents.length} agentes
          </div>
        </CardContent>
      </Card>

      <AgentDetailsDialog
        agentId={selectedAgent}
        open={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
    </>
  );
}
