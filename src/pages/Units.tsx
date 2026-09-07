import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Loader2, Users, Building2, ChevronRight, Shield, Sword, Target, Phone, Mail, MapPinned, Search, X } from 'lucide-react';
import { PanelHeroHUD, HUDIcon3D } from '@/components/panel/PanelHeroHUD';
import hudPageBg_ptr from '@/assets/hero-tactical-ops.jpg.asset.json';
const hudPageBg = (hudPageBg_ptr as {url:string}).url;


interface Unit {
  id: string;
  name: string;
  municipality: string;
  director_name?: string;
  coordinator_name?: string;
  address?: string;
  email?: string;
  phone?: string;
}

interface UnitStats {
  unit_id: string;
  total: number;
  alfa: number;
  bravo: number;
  charlie: number;
  delta: number;
}

const teamConfigs = {
  ALFA: { icon: Shield, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  BRAVO: { icon: Sword, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  CHARLIE: { icon: Target, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  DELTA: { icon: Users, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
};

export default function Units() {
  const { user, isLoading, masterSession, isAdmin } = useAuth();
  const { agent, isLoading: isLoadingAgent } = useAgentProfile();
  const navigate = useNavigate();
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitStats, setUnitStats] = useState<Record<string, UnitStats>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'with' | 'without'>('all');

  // Check if user is admin or master (can see all units)
  const canSeeAllUnits = isAdmin || !!masterSession;


  // Redirect only after loading is complete
  useEffect(() => {
    if (isLoading) return;
    
    // Don't redirect if we have any valid session
    if (user || masterSession) return;
    
    // Small delay to ensure state is settled
    const timer = setTimeout(() => {
      navigate('/auth', { replace: true });
    }, 200);
    
    return () => clearTimeout(timer);
  }, [user, isLoading, masterSession, navigate]);

  useEffect(() => {
    if ((user || masterSession) && !isLoadingAgent) {
      fetchUnitsAndStats();
    }
  }, [user, masterSession, isLoadingAgent, agent]);

  const fetchUnitsAndStats = async () => {
    try {
      // If agent (not admin/master), only fetch their own unit
      if (!canSeeAllUnits && agent?.unit_id) {
        const { data: unitData, error: unitError } = await supabase
          .from('units')
          .select('*')
          .eq('id', agent.unit_id)
          .single();

        if (unitError) throw unitError;
        setUnits(unitData ? [unitData] : []);

        // Fetch agents for this unit
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select('unit_id, team')
          .eq('unit_id', agent.unit_id)
          .eq('is_active', true);

        if (agentsError) throw agentsError;

        // Calculate stats for this unit
        const stats: Record<string, UnitStats> = {};
        if (unitData) {
          stats[unitData.id] = {
            unit_id: unitData.id,
            total: 0,
            alfa: 0,
            bravo: 0,
            charlie: 0,
            delta: 0,
          };

          (agentsData || []).forEach(agentItem => {
            if (agentItem.unit_id && stats[agentItem.unit_id]) {
              stats[agentItem.unit_id].total++;
              if (agentItem.team === 'ALFA') stats[agentItem.unit_id].alfa++;
              else if (agentItem.team === 'BRAVO') stats[agentItem.unit_id].bravo++;
              else if (agentItem.team === 'CHARLIE') stats[agentItem.unit_id].charlie++;
              else if (agentItem.team === 'DELTA') stats[agentItem.unit_id].delta++;
            }
          });
        }
        setUnitStats(stats);
      } else {
        // Admin/Master: fetch all units
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('*')
          .order('municipality, name');

        if (unitsError) throw unitsError;
        setUnits(unitsData || []);

        // Fetch all agents to calculate stats
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select('unit_id, team')
          .eq('is_active', true);

        if (agentsError) throw agentsError;

        // Calculate stats per unit
        const stats: Record<string, UnitStats> = {};
        
        (unitsData || []).forEach(unit => {
          stats[unit.id] = {
            unit_id: unit.id,
            total: 0,
            alfa: 0,
            bravo: 0,
            charlie: 0,
            delta: 0,
          };
        });

        (agentsData || []).forEach(agentItem => {
          if (agentItem.unit_id && stats[agentItem.unit_id]) {
            stats[agentItem.unit_id].total++;
            if (agentItem.team === 'ALFA') stats[agentItem.unit_id].alfa++;
            else if (agentItem.team === 'BRAVO') stats[agentItem.unit_id].bravo++;
            else if (agentItem.team === 'CHARLIE') stats[agentItem.unit_id].charlie++;
            else if (agentItem.team === 'DELTA') stats[agentItem.unit_id].delta++;
          }
        });

        setUnitStats(stats);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  // Lista única de municípios (para o filtro)
  const cityOptions = useMemo(() => {
    const set = new Set(units.map((u) => u.municipality).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [units]);

  // Aplica busca + filtros
  const filteredUnits = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return units.filter((u) => {
      if (cityFilter !== 'all' && u.municipality !== cityFilter) return false;
      const total = unitStats[u.id]?.total ?? 0;
      if (statusFilter === 'with' && total <= 0) return false;
      if (statusFilter === 'without' && total > 0) return false;
      if (!term) return true;
      const haystack = [
        u.name,
        u.municipality,
        u.director_name,
        u.coordinator_name,
        u.address,
        u.email,
        u.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [units, unitStats, searchTerm, cityFilter, statusFilter]);

  // Group filtered units by municipality
  const groupedUnits = filteredUnits.reduce((acc, unit) => {
    if (!acc[unit.municipality]) acc[unit.municipality] = [];
    acc[unit.municipality].push(unit);
    return acc;
  }, {} as Record<string, Unit[]>);

  const hasActiveFilters = !!searchTerm || cityFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => {
    setSearchTerm('');
    setCityFilter('all');
    setStatusFilter('all');
  };


  if (isLoading || isLoadingAgent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !masterSession) return null;

  // For regular agents - show a more detailed view of their own unit
  if (!canSeeAllUnits && units.length === 1) {
    const myUnit = units[0];
    const stats = unitStats[myUnit.id] || { total: 0, alfa: 0, bravo: 0, charlie: 0, delta: 0 };

    return (
      <div className="min-h-screen flex bg-slate-900">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
              {/* Page Header */}
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-amber-500" />
                <div>
                  <h1 className="font-tactical text-xl font-bold tracking-[0.14em] text-white">Minha Unidade</h1>
                  <p className="text-slate-400">{myUnit.name}</p>
                </div>
              </div>

              {/* Unit Details Card */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-400">
                    <Building2 className="h-5 w-5" />
                    {myUnit.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Location */}
                  <div className="flex items-center gap-3 text-slate-300">
                    <MapPin className="h-5 w-5 text-amber-500" />
                    <span>{myUnit.municipality}</span>
                  </div>


                  {/* Address */}
                  {myUnit.address && (
                    <div className="flex items-center gap-3 text-slate-300">
                      <MapPinned className="h-5 w-5 text-purple-400" />
                      <span>{myUnit.address}</span>
                    </div>
                  )}

                  {/* Contact */}
                  <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-700">
                    {myUnit.phone && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Phone className="h-4 w-4 text-amber-400" />
                        <span className="text-sm">{myUnit.phone}</span>
                      </div>
                    )}
                    {myUnit.email && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Mail className="h-4 w-4 text-amber-400" />
                        <span className="text-sm">{myUnit.email}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Team Stats Card */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-amber-500" />
                      Equipes
                    </span>
                    <Badge className="bg-amber-500/20 text-amber-400">
                      {stats.total} Agentes
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'] as const).map((team) => {
                      const config = teamConfigs[team];
                      const count = team === 'ALFA' ? stats.alfa : 
                                   team === 'BRAVO' ? stats.bravo : 
                                   team === 'CHARLIE' ? stats.charlie : stats.delta;
                      const isMyTeam = agent?.team === team;
                      
                      return (
                        <div 
                          key={team} 
                          className={`flex flex-col items-center p-4 rounded-xl ${config.bgColor} ${isMyTeam ? 'ring-2 ring-amber-500' : ''}`}
                        >
                          <config.icon className={`h-8 w-8 ${config.color}`} />
                          <span className={`text-lg font-bold mt-2 ${config.color}`}>{team}</span>
                          <span className="text-2xl font-bold text-white mt-1">{count}</span>
                          <span className="text-xs text-slate-400">agentes</span>
                          {isMyTeam && (
                            <Badge className="mt-2 bg-amber-500 text-black text-xs">
                              Sua Equipe
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Developer Credit */}
              <p className="text-center text-xs text-muted-foreground">
                Desenvolvido por <span className="text-primary font-medium">CS FEIJÓ</span>
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Admin/Master view - show all units
  return (
    <div className="min-h-screen flex bg-slate-900 hud-scope hud-page-bg" style={{ ['--hud-bg-url' as any]: `url(${hudPageBg})` }}>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-fade-in">
            <PanelHeroHUD
              variant="units"
              icon="building"
              eyebrow="Rede Socioeducativa"
              title="Unidades Socioeducativas"
              subtitle="Selecione uma unidade para acessar equipes, agentes e operações."
              right={
                <span className="hud-chip">
                  <Building2 className="h-3.5 w-3.5" /> {units.length} unidades
                </span>
              }
            />

            {/* Barra de busca + filtros — sticky em mobile para ficar sempre acessível */}
            <div className="sticky top-0 z-20 -mx-3 md:mx-0 px-3 md:px-0 py-2 md:py-0 bg-slate-900/85 md:bg-transparent backdrop-blur md:backdrop-blur-0 border-b md:border-b-0 border-slate-800/60">
              <div className="hud-card p-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome, cidade, diretor, e-mail…"
                    className="h-11 pl-9 pr-9 bg-slate-900/60 border-slate-700 text-sm text-white placeholder:text-slate-500"
                    autoComplete="new-password"
                    inputMode="search"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-800 text-slate-400"
                      aria-label="Limpar busca"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:flex md:items-center gap-2">
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger className="h-11 md:w-[190px] bg-slate-900/60 border-slate-700 text-sm text-white">
                      <MapPin className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                      <SelectValue placeholder="Cidade" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                      <SelectItem value="all">Todas as cidades</SelectItem>
                      {cityOptions.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                    <SelectTrigger className="h-11 md:w-[170px] bg-slate-900/60 border-slate-700 text-sm text-white">
                      <Users className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="with">Com agentes ativos</SelectItem>
                      <SelectItem value="without">Sem agentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 md:h-11 text-xs text-slate-300 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Limpar
                  </Button>
                )}
              </div>

              <p className="mt-2 text-[11px] text-slate-400 tabular-nums px-1">
                Exibindo <span className="text-amber-300 font-semibold">{filteredUnits.length}</span> de {units.length} unidades
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="hud-card p-8 text-center space-y-2">
                <Building2 className="h-10 w-10 mx-auto text-slate-500" />
                <p className="text-sm text-slate-300">Nenhuma unidade encontrada com os filtros atuais.</p>
                <Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>
              </div>
            ) : (
              <div className="space-y-6 md:space-y-8">
                {Object.entries(groupedUnits).map(([municipality, municipalityUnits]) => (
                  <div key={municipality}>
                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                      <MapPin className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
                      <h2 className="text-base md:text-lg font-semibold text-white truncate">{municipality}</h2>
                      <Badge variant="secondary" className="ml-1 text-[10px]">
                        {municipalityUnits.length} {municipalityUnits.length === 1 ? 'unidade' : 'unidades'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      {municipalityUnits.map((unit) => {
                        const stats = unitStats[unit.id] || { total: 0, alfa: 0, bravo: 0, charlie: 0, delta: 0 };

                        return (
                          <Card
                            key={unit.id}
                            className="hud-card cursor-pointer group border-0 active:scale-[0.98] transition-transform"
                            onClick={() => navigate(`/unit/${unit.id}`)}
                          >
                            <div className="hud-scan" />
                            <CardHeader className="pb-2 md:pb-3 p-3 md:p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <HUDIcon3D name="building" className="!w-10 !h-10 md:!w-11 md:!h-11 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <CardTitle className="hud-display text-sm md:text-base text-white leading-tight line-clamp-2 break-words">
                                      {unit.name}
                                    </CardTitle>
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                      {unit.municipality}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-[rgb(201,168,76)]/60 group-hover:text-[rgb(240,215,140)] transition-colors shrink-0 mt-1" />
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2.5 p-3 md:p-4 pt-0">
                              {/* Total Agents */}
                              <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Users className="h-4 w-4 text-slate-400 shrink-0" />
                                  <span className="text-xs md:text-sm text-slate-300 truncate">Agentes ativos</span>
                                </div>
                                <Badge className={`shrink-0 ${stats.total > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}>
                                  {stats.total}
                                </Badge>
                              </div>

                              {/* Team Stats */}
                              <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                                {(['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'] as const).map((team) => {
                                  const config = teamConfigs[team];
                                  const count = team === 'ALFA' ? stats.alfa :
                                               team === 'BRAVO' ? stats.bravo :
                                               team === 'CHARLIE' ? stats.charlie : stats.delta;
                                  return (
                                    <div
                                      key={team}
                                      className={`flex flex-col items-center justify-center p-1.5 rounded-lg ${config.bgColor}`}
                                    >
                                      <config.icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${config.color}`} />
                                      <span className="text-[9px] md:text-[10px] text-slate-300 mt-0.5 tracking-wider">{team[0]}</span>
                                      <span className={`text-sm md:text-base font-bold tabular-nums ${config.color}`}>{count}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-9 text-xs md:text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/unit/${unit.id}`);
                                }}
                              >
                                Ver painel da unidade
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}


            {/* Developer Credit */}
            <p className="text-center text-xs text-muted-foreground">
              Desenvolvido por <span className="text-primary font-medium">CS FEIJÓ</span>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
