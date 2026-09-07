import { useState, useEffect, useMemo, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getServerDate } from '@/hooks/useServerTime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radar, Users, Activity, Wifi, Building2, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnlineAgents } from '@/hooks/useOnlineAgents';
import { AgentDetailsDialog } from '@/components/agents/AgentDetailsDialog';
import radarBg from '@/assets/radar-bg.jpg';



interface AgentBlip {
  id: string;
  name: string;
  team: string | null;
  isActive: boolean;
  position: { angle: number; distance: number };
  lastActivity?: string;
}

interface TacticalRadarProps {
  unitId?: string;
  unitName?: string;
  className?: string;
  compact?: boolean;
}

export const TacticalRadar = forwardRef<HTMLDivElement, TacticalRadarProps>(function TacticalRadar({ unitId, unitName, className, compact = false }, ref) {
  const [agents, setAgents] = useState<AgentBlip[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(() => getServerDate());
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const onlineIds = useOnlineAgents();


  // Fetch agents ONLY from the same unit - each unit is independent
  useEffect(() => {
    const fetchAgents = async () => {
      if (!unitId) {
        setAgents([]);
        return;
      }

      const { data, error } = await supabase
        .from('agents')
        .select('id, name, team, is_active, updated_at')
        .eq('is_active', true)
        .eq('unit_id', unitId)
        .limit(20);

      if (!error && data) {
        const blips: AgentBlip[] = data.map((agent, index) => ({
          id: agent.id,
          name: agent.name,
          team: agent.team,
          isActive: agent.is_active ?? true,
          position: {
            angle: (360 / data.length) * index + Math.random() * 30,
            distance: 20 + Math.random() * 60,
          },
          lastActivity: agent.updated_at,
        }));
        setAgents(blips);
        setLastUpdate(getServerDate());
      }
    };

    fetchAgents();
    const interval = setInterval(fetchAgents, 30000);

    return () => clearInterval(interval);
  }, [unitId]);

  const teamColors: Record<string, { bg: string; glow: string }> = {
    ALFA: { bg: 'bg-sky-400', glow: 'shadow-sky-400/60' },
    BRAVO: { bg: 'bg-rose-400', glow: 'shadow-rose-400/60' },
    CHARLIE: { bg: 'bg-emerald-400', glow: 'shadow-emerald-400/60' },
    DELTA: { bg: 'bg-violet-400', glow: 'shadow-violet-400/60' },
    default: { bg: 'bg-amber-400', glow: 'shadow-amber-400/60' },
  };

  const rings = useMemo(() => [25, 50, 75], []);

  const [viewportSmall, setViewportSmall] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth < 480 : false);
  useEffect(() => {
    const onResize = () => setViewportSmall(window.innerWidth < 480);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const radarSize = compact ? (viewportSmall ? 96 : 120) : (viewportSmall ? 128 : 160);
  const centerX = radarSize / 2;
  const centerY = radarSize / 2;

  // If no unitId, show a message
  if (!unitId) {
    return (
      <Card ref={ref} className={cn("bg-zinc-900/80 border border-zinc-700/50", className)}>
        <CardContent className="flex items-center justify-center py-6 text-center">
          <div className="text-zinc-500">
            <Building2 className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
            <p className="text-xs">Selecione uma unidade</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card ref={ref} className={cn(
      "relative bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-800/80 border border-zinc-700/60 backdrop-blur-sm overflow-hidden",
      className
    )}>
      {/* Professional radar backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18] bg-center bg-cover mix-blend-screen"
        style={{ backgroundImage: `url(${radarBg})` }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-transparent to-zinc-950/70" />

      <CardHeader className={cn("relative pb-1", compact ? "p-2.5" : "p-3")}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-cyan-500/15 border border-cyan-500/30">
              <Signal className={cn("text-cyan-400", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
            </div>
            <div className="flex flex-col">
              <span className={cn("font-semibold text-zinc-100", compact ? "text-xs" : "text-sm")}>Radar</span>
              {unitName && (
                <span className="text-[9px] text-zinc-500 font-normal truncate max-w-[100px]">
                  {unitName}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0 h-5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
              {agents.filter((a) => onlineIds.has(a.id)).length} ONLINE
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("relative flex flex-col items-center gap-2", compact ? "p-2.5 pt-0" : "p-3 pt-1")}>
        {/* Radar Display - with pro backdrop */}
        <div
          className="relative rounded-full bg-zinc-950/80 border border-zinc-700/50 overflow-hidden"
          style={{ width: radarSize, height: radarSize }}
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-center bg-cover opacity-40"
            style={{ backgroundImage: `url(${radarBg})` }}
          />
          <div aria-hidden className="absolute inset-0 bg-zinc-950/50" />

          {/* Grid rings */}
          {rings.map((ring) => (
            <div
              key={ring}
              className="absolute rounded-full border border-zinc-700/40"
              style={{
                width: `${ring}%`,
                height: `${ring}%`,
                top: `${(100 - ring) / 2}%`,
                left: `${(100 - ring) / 2}%`,
              }}
            />
          ))}

          {/* Cross lines */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-full h-[1px] bg-zinc-700/30" />
            <div className="absolute h-full w-[1px] bg-zinc-700/30" />
          </div>

          {/* Sweep animation */}
          <div 
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0deg, rgba(34,211,238,0.15) 20deg, transparent 40deg)',
              animation: 'spin 3s linear infinite',
            }}
          />

          {/* Center point */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 z-10" />

          {/* Agent blips */}
          {agents.map((agent) => {
            const radians = (agent.position.angle * Math.PI) / 180;
            const x = centerX + Math.cos(radians) * (agent.position.distance * centerX / 100) - 3;
            const y = centerY + Math.sin(radians) * (agent.position.distance * centerY / 100) - 3;
            const colors = teamColors[agent.team || 'default'] || teamColors.default;
            const isOnline = onlineIds.has(agent.id);

            return (
              <div
                key={agent.id}
                className="absolute z-20 cursor-pointer"
                style={{ left: x - 2, top: y - 2 }}
                onClick={() => setSelectedAgentId(agent.id)}
                title={`${agent.name}${agent.team ? ` - ${agent.team}` : ''} • ${isOnline ? 'ONLINE' : 'offline'}`}
              >
                {isOnline && (
                  <span
                    className={cn(
                      "absolute inset-0 rounded-full opacity-70 animate-ping",
                      colors.bg
                    )}
                    style={{ width: 10, height: 10 }}
                  />
                )}
                <span
                  className={cn(
                    "relative block rounded-full transition-transform duration-200 hover:scale-[2] shadow-lg",
                    isOnline ? cn(colors.bg, colors.glow) : "bg-zinc-600/70 border border-zinc-500/50"
                  )}
                  style={{ width: 10, height: 10 }}
                />
              </div>
            );
          })}
        </div>

        {/* Stats - Compact row */}
        <div className="flex items-center justify-between w-full text-[10px] text-zinc-500 px-1">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span className="font-mono text-cyan-400">{agents.length}</span>
            <span>ativos</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3 text-emerald-500" />
            <span>{lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Rio_Branco' })}</span>
          </div>
        </div>

        {/* Connected agents roster */}
        {agents.length > 0 && (
          <div className="w-full mt-1 rounded-md border border-zinc-700/50 bg-zinc-950/60 overflow-hidden">
            <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-700/40 bg-zinc-900/60">
              <div className="flex items-center gap-1.5">
                <Wifi className="h-3 w-3 text-cyan-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
                  Conectados
                </span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">
                {agents.filter((a) => onlineIds.has(a.id)).length}/{agents.length}
              </span>

            </div>
            <ul
              className="max-h-40 overflow-y-auto divide-y divide-zinc-800/60"
              role="list"
              aria-label="Agentes conectados"
            >
              {[...agents]
                .sort((a, b) => {
                  const ao = onlineIds.has(a.id) ? 1 : 0;
                  const bo = onlineIds.has(b.id) ? 1 : 0;
                  if (ao !== bo) return bo - ao;
                  return a.name.localeCompare(b.name);
                })
                .map((agent) => {
                  const colors = teamColors[agent.team || 'default'] || teamColors.default;
                  const isOnline = onlineIds.has(agent.id);
                  return (
                    <li
                      key={agent.id}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-zinc-800/40 transition-colors cursor-pointer"
                      title={`${agent.name}${agent.team ? ` • ${agent.team}` : ''} — clique para detalhes`}
                      onClick={() => setSelectedAgentId(agent.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedAgentId(agent.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="relative flex h-2 w-2 shrink-0">
                          {isOnline && (
                            <span className={cn(
                              "absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping",
                              colors.bg
                            )} />
                          )}
                          <span className={cn(
                            "relative inline-flex rounded-full h-2 w-2",
                            isOnline ? colors.bg : "bg-zinc-600"
                          )} />
                        </span>
                        <span className={cn(
                          "text-[11px] font-medium truncate",
                          isOnline ? "text-zinc-100" : "text-zinc-500"
                        )}>
                          {agent.name}
                        </span>
                      </div>
                      {agent.team && (
                        <span className={cn(
                          "text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border shrink-0",
                          isOnline
                            ? "text-zinc-100 border-zinc-600/70 bg-zinc-800/70"
                            : "text-zinc-500 border-zinc-700/50 bg-zinc-900/50"
                        )}>
                          {agent.team}
                        </span>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        )}

        <AgentDetailsDialog
          agentId={selectedAgentId}
          open={!!selectedAgentId}
          onClose={() => setSelectedAgentId(null)}
        />


        {/* Team legend - Compact */}
        {!compact && !viewportSmall && (
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[9px] text-zinc-400">
            {Object.entries(teamColors).filter(([k]) => k !== 'default').map(([team, colors]) => (
              <div key={team} className="flex items-center gap-1">
                <div className={cn("w-1.5 h-1.5 rounded-full", colors.bg)} />
                <span>{team}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
