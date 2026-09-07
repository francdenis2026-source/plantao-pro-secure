import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TeamEmblem } from '@/components/TeamEmblem';
import { useWelcomeHintEnabled } from '@/hooks/useWelcomeHintEnabled';
import { PanelHeroHUD } from '@/components/panel/PanelHeroHUD';
import hudPageBg_ptr from '@/assets/hero-tactical-ops.jpg.asset.json';
const hudPageBg = (hudPageBg_ptr as {url:string}).url;
import {
  Loader2,
  MapPin,
  Users,
  Shield,
  Sword,
  Target,
  Calendar,
  Building2,
  User,
  Clock,
  History,
  ArrowLeft,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';


interface Unit {
  id: string;
  name: string;
  municipality: string;
}

interface Agent {
  id: string;
  name: string;
  team: string | null;
  is_active: boolean | null;
  matricula: string | null;
}

interface TeamStats {
  name: string;
  agents: Agent[];
  icon: any;
  color: string;
  bgColor: string;
}

const teamConfigs: Record<string, { icon: any; color: string; bgColor: string }> = {
  ALFA: { icon: Shield, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  BRAVO: { icon: Sword, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  CHARLIE: { icon: Target, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  DELTA: { icon: Users, color: 'text-violet-400', bgColor: 'bg-violet-500/20' },
};

interface UnitHistoryEntry {
  id: string;
  action: string;
  agent_name: string | null;
  details: any;
  created_at: string;
}

export default function UnitDashboard() {
  const { unitId } = useParams<{ unitId: string }>();
  const { user, isLoading: authLoading, masterSession, isAdmin } = useAuth();
  const { agent: currentAgent } = useAgentProfile();
  const navigate = useNavigate();

  const [unit, setUnit] = useState<Unit | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [history, setHistory] = useState<UnitHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const canSeeHistory = !!masterSession || isAdmin;


  // Redirect only after loading is complete
  useEffect(() => {
    if (authLoading) return;
    
    // Don't redirect if we have any valid session
    if (user || masterSession) return;
    
    // Small delay to ensure state is settled
    const timer = setTimeout(() => {
      navigate('/auth', { replace: true });
    }, 200);
    
    return () => clearTimeout(timer);
  }, [user, authLoading, masterSession, navigate]);

  // Check for first access welcome dialog
  const { enabled: welcomeHintEnabled, loading: welcomeHintLoading } = useWelcomeHintEnabled();

  useEffect(() => {
    if (welcomeHintLoading || !welcomeHintEnabled) return;
    const firstAccessData = localStorage.getItem('plantaopro_first_access');
    if (firstAccessData) {
      try {
        const data = JSON.parse(firstAccessData);
        if (!data.shown) {
          const timeSinceRegistration = Date.now() - data.timestamp;
          const DELAY_MS = 60 * 1000; // 1 minute
          
          if (timeSinceRegistration >= DELAY_MS) {
            // Show immediately if 1 minute has passed
            setWelcomeName(data.name);
            setShowWelcomeDialog(true);
            localStorage.setItem('plantaopro_first_access', JSON.stringify({ ...data, shown: true }));
          } else {
            // Schedule to show after remaining time
            const remainingTime = DELAY_MS - timeSinceRegistration;
            const timer = setTimeout(() => {
              setWelcomeName(data.name);
              setShowWelcomeDialog(true);
              localStorage.setItem('plantaopro_first_access', JSON.stringify({ ...data, shown: true }));
            }, remainingTime);
            return () => clearTimeout(timer);
          }
        }
      } catch (e) {
        console.error('Error parsing first access data:', e);
      }
    }
  }, [welcomeHintEnabled, welcomeHintLoading]);

  useEffect(() => {
    if (unitId && (user || masterSession)) {
      fetchUnitData();
    }
  }, [unitId, user, masterSession]);

  const fetchUnitData = async () => {
    try {
      setIsLoading(true);

      // Fetch unit info
      const { data: unitData, error: unitError } = await supabase
        .from('units')
        .select('*')
        .eq('id', unitId)
        .single();

      if (unitError) throw unitError;
      setUnit(unitData);

      // Fetch agents for this unit
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, name, team, is_active, matricula')
        .eq('unit_id', unitId)
        .eq('is_active', true)
        .order('team, name');

      if (agentsError) throw agentsError;

      // Group agents by team
      const teams = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'];
      const stats: TeamStats[] = teams.map(team => ({
        name: team,
        agents: agentsData?.filter(a => a.team === team) || [],
        ...teamConfigs[team],
      }));

      setTeamStats(stats);
    } catch (error) {
      console.error('Error fetching unit data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Histórico de alterações (admin/master apenas)
  useEffect(() => {
    if (!unitId || !canSeeHistory) return;
    let cancelled = false;
    (async () => {
      try {
        setHistoryLoading(true);
        // Busca logs relacionados a esta unidade (resource_type='unit' + detalhes contendo unit_id)
        const { data, error } = await supabase
          .from('activity_logs')
          .select('id, action, agent_name, details, created_at')
          .or(`and(resource_type.eq.unit,resource_id.eq.${unitId}),details->>unit_id.eq.${unitId}`)
          .order('created_at', { ascending: false })
          .limit(30);
        if (error) throw error;
        if (!cancelled) setHistory((data || []) as UnitHistoryEntry[]);
      } catch (e) {
        console.error('Error fetching unit history:', e);
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [unitId, canSeeHistory]);

  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      unit_created: 'Unidade criada',
      unit_updated: 'Unidade atualizada',
      unit_deleted: 'Unidade removida',
      agent_transferred: 'Agente transferido',
      agent_created: 'Agente cadastrado',
      agent_updated: 'Agente atualizado',
      agent_deleted: 'Agente excluído',
    };
    return map[action] || action.replace(/_/g, ' ');
  };


  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user && !masterSession) {
    return null;
  }

  const totalAgents = teamStats.reduce((acc, team) => acc + team.agents.length, 0);

  return (
    <div className="min-h-screen flex bg-slate-900 hud-scope hud-page-bg" style={{ ['--hud-bg-url' as any]: `url(${hudPageBg})` }}>
      {/* WelcomeTrialDialog removido — sistema gratuito */}

      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 p-3 md:p-5 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
            {canSeeHistory && (
              <button
                type="button"
                onClick={() => navigate('/units')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-amber-300 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Unidades
              </button>
            )}
            <PanelHeroHUD
              variant="units"
              icon="building"
              eyebrow={unit?.municipality || 'Unidade'}
              title={unit?.name || 'Unidade Socioeducativa'}
              subtitle={`${totalAgents} agentes ativos • ${teamStats.length} equipes operacionais`}
              right={
                <span className="hud-chip">
                  <MapPin className="h-3.5 w-3.5" /> {unit?.municipality}
                </span>
              }
            />

            {/* Welcome Card for Current Agent - Compact */}
            {currentAgent && currentAgent.unit_id === unitId && (
              <div className="hud-card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[rgba(201,168,76,0.15)] flex items-center justify-center shrink-0 border border-[rgba(201,168,76,0.3)]">
                  <User className="h-5 w-5 text-[rgb(240,215,140)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">Bem-vindo(a),</p>
                  <h2 className="text-base md:text-lg font-bold text-white truncate hud-display">{currentAgent.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {currentAgent.team && (
                      <Badge className={`${teamConfigs[currentAgent.team]?.bgColor} ${teamConfigs[currentAgent.team]?.color} text-[10px] px-1.5 py-0`}>
                        {currentAgent.team}
                      </Badge>
                    )}
                    <span className="text-[10px] text-slate-500">Mat: {currentAgent.matricula}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Cards - Compact with tactical animations */}
            <div className="grid grid-cols-4 gap-2">
              {teamStats.map((team, index) => (
                <Card 
                  key={team.name} 
                  className={`${team.bgColor} border-slate-700/50 hover:border-slate-600 transition-all tactical-card hover:scale-105`}
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <CardContent className="p-2 md:p-3 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                    <team.icon className={`h-4 w-4 ${team.color} mx-auto mb-1`} />
                    <div className="text-lg md:text-xl font-bold text-white">{team.agents.length}</div>
                    <p className="text-[9px] md:text-[10px] text-slate-400 truncate">{team.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Teams Grid - Compact with tactical animations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teamStats.map((team, index) => (
                <Card 
                  key={team.name} 
                  className="bg-slate-800/40 border-slate-700/50 tactical-card relative overflow-hidden"
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <TeamEmblem team={team.name} size="sm" />
                      <span className="text-white text-sm">Equipe {team.name}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] h-5">
                        {team.agents.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {team.agents.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-3">
                        Nenhum agente
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {team.agents.map((agent) => (
                          <div 
                            key={agent.id}
                            className="flex items-center gap-2 p-2 rounded bg-slate-900/40 hover:bg-slate-900/60 transition-colors cursor-pointer"
                            onClick={() => navigate(`/agents/${agent.id}`)}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className={`${team.bgColor} ${team.color} text-[10px]`}>
                                {agent.name.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white truncate">
                                {agent.name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {agent.matricula || 'N/A'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions - Compact with tactical animations */}
            <div className="grid grid-cols-2 gap-2">
              <Card 
                className="bg-slate-800/40 border-slate-700/50 hover:border-amber-500/40 cursor-pointer transition-all group tactical-card hover:scale-[1.02]"
                onClick={() => navigate('/overtime')}
                style={{ animationDelay: '0.7s' }}
              >
                <CardContent className="p-3 flex items-center gap-2.5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="p-1.5 rounded bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">Banco de Horas</p>
                    <p className="text-[10px] text-slate-400">Ver saldo BH</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className="bg-slate-800/40 border-slate-700/50 hover:border-amber-500/40 cursor-pointer transition-all group tactical-card hover:scale-[1.02]"
                onClick={() => navigate('/agents')}
                style={{ animationDelay: '0.8s' }}
              >
                <CardContent className="p-3 flex items-center gap-2.5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">Agentes</p>
                    <p className="text-[10px] text-slate-400">Gerenciar equipe</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Histórico de alterações — Admin/Master */}
            {canSeeHistory && (
              <Card className="bg-slate-800/40 border-slate-700/50 tactical-card relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-white">
                    <History className="h-4 w-4 text-amber-400" />
                    Histórico de alterações
                    <Badge variant="secondary" className="ml-auto text-[10px] h-5">
                      {history.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-6 space-y-1">
                      <p className="text-xs text-slate-400">Nenhuma alteração registrada para esta unidade.</p>
                      <p className="text-[10px] text-slate-500">
                        Ações administrativas (edições, transferências, cadastros) aparecerão aqui automaticamente.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {history.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-start gap-2 p-2 rounded bg-slate-900/40 border border-slate-800/60 text-xs"
                        >
                          <div className="h-6 w-6 shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                            <History className="h-3 w-3 text-amber-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-slate-100 font-medium truncate">{actionLabel(h.action)}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {h.agent_name || 'Sistema'} · {formatDistanceToNow(new Date(h.created_at), { locale: ptBR, addSuffix: true })}
                            </p>
                            {h.details && typeof h.details === 'object' && (
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                {Object.entries(h.details)
                                  .filter(([k]) => !['unit_id', 'agent_id'].includes(k))
                                  .slice(0, 3)
                                  .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
                                  .join(' · ')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
