import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AgentRoleSelector } from '@/components/agent-panel/AgentRoleSelector';
import { NotificationsPanel } from '@/components/agent-panel/NotificationsPanel';
// getRemainingTrialDays removido — sistema gratuito
import { FontSizeControl } from '@/components/FontSizeControl';
import { cn } from '@/lib/utils';
import { TeamEmblem } from '@/components/TeamEmblem';
import panelHeaderBg_ptr from '@/assets/panel-header-bg.jpg.asset.json';
const panelHeaderBg = (panelHeaderBg_ptr as {url:string}).url;

interface Agent {
  id: string;
  name: string;
  team: string | null;
  role?: string | null;
  blood_type?: string | null;
  avatar_url?: string | null;
  unit_id?: string | null;
}

interface AgentPanelHeaderProps {
  agent: Agent;
  isOnline: boolean;
  onReactivateShiftBanner?: () => void;
  isShiftBannerDismissed?: boolean;
  compact?: boolean;
  onToggleCompact?: () => void;
}

/* ────────────────────────────────────────────────────────────────
   Inline tactical SVG icons — public-security aesthetic
   ──────────────────────────────────────────────────────────────── */

const IconShieldStar = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" />
    <path d="m12 8 1.3 2.7 2.9.4-2.1 2 .5 2.9L12 14.6l-2.6 1.4.5-2.9-2.1-2 2.9-.4L12 8Z" fill="currentColor" fillOpacity=".25" />
  </svg>
);

const IconDroplet = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
    <path d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11Z" fill="currentColor" fillOpacity=".2" />
  </svg>
);

const IconBuilding = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
    <path d="M4 21V7l8-4 8 4v14" />
    <path d="M9 21v-6h6v6" />
    <path d="M9 10h.01M12 10h.01M15 10h.01M9 13h.01M15 13h.01" strokeLinecap="round" />
  </svg>
);

const IconGift = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M5 12v9h14v-9M12 8v13" />
    <path d="M12 8s-3-5-5.5-3-1 5 2.5 3M12 8s3-5 5.5-3 1 5-2.5 3" />
  </svg>
);

const IconRefresh = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const IconPower = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v9" />
    <path d="M5.6 7.6a9 9 0 1 0 12.8 0" />
  </svg>
);

const IconBell = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 6 3 7 3 7H3s3-1 3-7Z" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </svg>
);

/* ────────────────────────────────────────────────────────────────
   Team config — tactical corps identity
   ──────────────────────────────────────────────────────────────── */

const TEAM_CONFIG: Record<string, { hex: string; accent: string; label: string }> = {
  ALFA:    { hex: '#ef4444', accent: 'rgba(239,68,68,.55)',  label: 'ALFA' },
  BRAVO:   { hex: '#3b82f6', accent: 'rgba(59,130,246,.55)', label: 'BRAVO' },
  CHARLIE: { hex: '#10b981', accent: 'rgba(16,185,129,.55)', label: 'CHARLIE' },
  DELTA:   { hex: '#f59e0b', accent: 'rgba(245,158,11,.55)', label: 'DELTA' },
};

function TeamInsignia({ team, prominent = false }: { team: string | null; prominent?: boolean }) {
  if (!team) return null;
  const cfg = TEAM_CONFIG[team.toUpperCase()] ?? { hex: '#c9a84c', accent: 'rgba(201,168,76,.55)', label: team };
  if (prominent) {
    return (
      <div
        className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-lg bg-gradient-to-br from-slate-950/90 to-slate-900/70 border-2 shadow-[0_2px_10px_-2px_rgba(0,0,0,.6)] font-['IBM_Plex_Mono',_monospace]"
        style={{ borderColor: cfg.accent }}
      >
        <TeamEmblem team={team} size="sm" />
        <div className="leading-tight">
          <div className="text-[8.5px] tracking-[0.25em] uppercase text-slate-400 font-semibold">Equipe</div>
          <div className="text-[13px] font-black tracking-[0.18em] uppercase" style={{ color: cfg.hex }}>
            {cfg.label}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className="relative flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-md bg-slate-950/70 border font-['IBM_Plex_Mono',_monospace]"
      style={{ borderColor: cfg.accent }}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none">
        <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" fill={cfg.hex} fillOpacity=".18" stroke={cfg.hex} strokeWidth="1.4" />
        <path d="M8 11h8M8 14h8M10 8h4" stroke={cfg.hex} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <span className="text-[10.5px] font-bold tracking-[0.18em] uppercase" style={{ color: cfg.hex }}>
        {cfg.label}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Online status — radar pulse
   ──────────────────────────────────────────────────────────────── */

function OnlinePulse({ isOnline }: { isOnline: boolean }) {
  const color = isOnline ? '#10b981' : '#f59e0b';
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/70 border font-['IBM_Plex_Mono',_monospace]"
      style={{ borderColor: `${color}66` }}
    >
      <svg viewBox="0 0 12 12" className="h-3 w-3">
        <circle cx="6" cy="6" r="5" fill="none" stroke={color} strokeOpacity=".35" strokeWidth="1" />
        {isOnline && <circle cx="6" cy="6" r="5" fill="none" stroke={color} strokeWidth="1" opacity=".8">
          <animate attributeName="r" from="2" to="5.5" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" from=".8" to="0" dur="1.6s" repeatCount="indefinite" />
        </circle>}
        <circle cx="6" cy="6" r="2.2" fill={color} />
      </svg>
      <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color }}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Unit badge
   ──────────────────────────────────────────────────────────────── */

function UnitBadge({ unitId, prominent = false }: { unitId: string; prominent?: boolean }) {
  const [unitName, setUnitName] = useState('');
  useEffect(() => {
    if (!unitId) return;
    supabase.from('units').select('name').eq('id', unitId).single().then(({ data }) => {
      if (data?.name) setUnitName(data.name);
    });
  }, [unitId]);
  if (!unitName) return null;
  if (prominent) {
    return (
      <div className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-lg bg-gradient-to-br from-slate-950/90 to-slate-900/70 border-2 border-amber-500/50 shadow-[0_2px_10px_-2px_rgba(0,0,0,.6)] font-['IBM_Plex_Mono',_monospace]">
        <div className="p-1 rounded-md bg-amber-500/15 border border-amber-500/40">
          <IconBuilding className="h-4 w-4 text-amber-300" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[8.5px] tracking-[0.25em] uppercase text-slate-400 font-semibold">Unidade</div>
          <div className="text-[13px] font-black text-amber-200 tracking-[0.10em] uppercase truncate max-w-[200px] md:max-w-[280px]">
            {unitName}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/70 border border-amber-500/40 font-['IBM_Plex_Mono',_monospace]">
      <IconBuilding className="h-3.5 w-3.5 text-amber-400" />
      <span className="text-[10.5px] font-bold text-amber-300 tracking-[0.15em] uppercase truncate max-w-[140px] md:max-w-[220px]">
        {unitName}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Icon action button — unified premium tactile
   ──────────────────────────────────────────────────────────────── */

function ActionButton({
  onClick, tooltip, tone = 'neutral', children,
}: {
  onClick: () => void;
  tooltip: string;
  tone?: 'neutral' | 'amber' | 'orange' | 'emerald';
  children: React.ReactNode;
}) {
  const tones = {
    neutral: 'border-slate-700/70 text-slate-300 hover:text-amber-300 hover:border-amber-500/50',
    amber:   'border-amber-500/40 text-amber-300 hover:border-amber-400/70',
    orange:  'border-orange-500/50 text-orange-300 hover:border-orange-400/70 animate-pulse',
    emerald: 'border-emerald-500/40 text-emerald-300 hover:border-emerald-400/70',
  }[tone];
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              'relative flex items-center justify-center h-10 min-w-10 px-2.5 rounded-md',
              'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border',
              'shadow-[inset_0_1px_0_rgba(255,255,255,.04)] transition-all duration-200',
              'hover:-translate-y-[1px] active:translate-y-0 [&>svg]:h-[18px] [&>svg]:w-[18px]',
              tones,
            )}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-slate-950 border-slate-700 text-slate-200 text-[11px]">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ────────────────────────────────────────────────────────────────
   Main header
   ──────────────────────────────────────────────────────────────── */

export function AgentPanelHeader({ agent, isOnline, onReactivateShiftBanner, isShiftBannerDismissed, compact = false, onToggleCompact }: AgentPanelHeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // trial removido — sistema gratuito

  const handleLogout = async () => {
    if (isLoggingOut) return; // bloqueia múltiplos cliques
    setIsLoggingOut(true);
    try {
      await Promise.race([
        signOut(),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);
    } catch {
      /* ignore */
    }
    // Hard redirect: garante que qualquer estado in-memory seja descartado
    // e evita ficar "preso" no painel após clicar em Sair (mobile/PWA).
    try {
      window.location.replace('/');
    } catch {
      window.location.href = '/';
    }
  };



  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-700/70 shadow-[0_10px_40px_-15px_rgba(0,0,0,.8)]">
      {/* background layers */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center opacity-25"
        style={{ backgroundImage: `url(${panelHeaderBg})` }}
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950" />

      {/* diagonal SVG stripes — subtle tactical texture */}
      <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="tacstripes" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="14" stroke="#c9a84c" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tacstripes)" />
      </svg>

      {/* gold top accent (chevron ribbon removed for less vertical space) */}
      <div className="relative h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

      <div className={cn('relative', compact ? 'px-2 py-1.5 md:px-2.5 md:py-1.5' : 'px-2.5 py-1.5 md:px-3 md:py-2')}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* ── Identity block ── */}
          <button
            type="button"
            onClick={() => navigate('/agent-profile')}
            className="group flex items-center gap-2.5 min-w-0 flex-shrink text-left"
          >
            {/* Avatar with SVG rank ring */}
            <div className="relative shrink-0">
              <svg viewBox="0 0 48 48" className={cn('absolute -inset-1 pointer-events-none', compact ? 'h-[48px] w-[48px] md:h-[52px] md:w-[52px]' : 'h-[52px] w-[52px] md:h-[56px] md:w-[56px]')}>
                <defs>
                  <linearGradient id="ringGold" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#f0d78c" />
                    <stop offset="100%" stopColor="#8a6a1e" />
                  </linearGradient>
                </defs>
                <circle cx="24" cy="24" r="22" fill="none" stroke="url(#ringGold)" strokeWidth="1.5" strokeDasharray="3 3" opacity=".7" />
              </svg>
              <Avatar className={cn('border-2 border-amber-500/70', compact ? 'w-9 h-9 md:w-10 md:h-10' : 'w-10 h-10 md:w-11 md:h-11')}>
                {agent.avatar_url && <AvatarImage src={agent.avatar_url} alt={agent.name} className="object-cover" />}
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-700 text-sm font-black text-slate-950">
                  {agent.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <svg viewBox="0 0 24 12" className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2.5 w-6 text-amber-400 drop-shadow">
                <path d="M2 8 L12 2 L22 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 10 L12 5 L20 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
              </svg>
            </div>

            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-1.5">
                <IconShieldStar className="h-3 w-3 text-amber-400/80" />
                <span className="text-[9px] tracking-[0.25em] uppercase text-amber-400/80 font-['IBM_Plex_Mono',_monospace]">
                  Agente
                </span>
              </div>
              <h1 className={cn(
                'font-bold text-slate-50 truncate tracking-wide font-[\'Libre_Baskerville\',_serif] group-hover:text-amber-200 transition-colors',
                compact ? 'text-[13px] md:text-sm' : 'text-sm md:text-[15px]'
              )}>
                {agent.name}
              </h1>
            </div>
          </button>

          {/* ── Right actions ── */}
          <div className="flex items-center gap-1 xs:gap-1.5 md:gap-2 flex-nowrap sm:flex-wrap justify-end shrink-0 min-w-0 overflow-x-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Itens secundários — ocultos no mobile para priorizar Home + Sair */}
            <div className="hidden md:inline-flex items-center gap-1 xs:gap-1.5 md:gap-2">
              <OnlinePulse isOnline={isOnline} />

              {agent.blood_type && (
                <div className="flex items-center gap-1 px-1.5 h-9 rounded-md bg-slate-950/70 border border-red-500/50 font-['IBM_Plex_Mono',_monospace]">
                  <IconDroplet className="h-3 w-3 text-red-400" />
                  <span className="text-[10px] font-black text-red-300">{agent.blood_type}</span>
                </div>
              )}

              <AgentRoleSelector agentId={agent.id} currentRole={agent.role || 'agent'} />
              <NotificationsPanel agentId={agent.id} />
              <FontSizeControl />

              {onToggleCompact && (
                <ActionButton
                  onClick={onToggleCompact}
                  tooltip={compact ? 'Modo confortável (expandir)' : 'Modo compacto (reduzir)'}
                  tone="neutral"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {compact ? (
                      <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
                    ) : (
                      <path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" />
                    )}
                  </svg>
                </ActionButton>
              )}

              {isShiftBannerDismissed && onReactivateShiftBanner && (
                <ActionButton onClick={onReactivateShiftBanner} tooltip="Reativar lembrete de plantão" tone="orange">
                  <IconBell className="h-4 w-4" />
                </ActionButton>
              )}

              <ActionButton onClick={() => window.location.reload()} tooltip="Atualizar dados" tone="emerald">
                <IconRefresh className="h-4 w-4" />
              </ActionButton>
            </div>

            {/* Home — prioritário no mobile */}
            <ActionButton
              onClick={() => navigate('/?home=1')}
              tooltip="Ir para a página inicial (sem sair da conta)"
              tone="amber"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
                <path d="M10 21v-6h4v6" />
              </svg>
            </ActionButton>


            {/* Logout — sempre visível, rótulo em todas as telas */}
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    aria-busy={isLoggingOut}
                    aria-label={isLoggingOut ? 'Encerrando sessão' : 'Encerrar sessão'}
                    data-testid="logout-button"
                    className={cn(
                      'group relative flex items-center justify-center gap-1.5 overflow-hidden shrink-0',
                      'h-10 min-h-[40px] px-3 sm:px-3.5 rounded-md',
                      'bg-gradient-to-b from-red-600 to-red-800 border border-red-400/50',
                      "text-white font-bold text-[12px] tracking-[0.18em] uppercase font-['IBM_Plex_Mono',_monospace]",
                      'shadow-[0_4px_14px_-4px_rgba(220,38,38,.65),inset_0_1px_0_rgba(255,255,255,.18)]',
                      'hover:from-red-500 hover:to-red-700 hover:-translate-y-[1px]',
                      'active:translate-y-0 transition-all duration-200',
                      'disabled:opacity-70 disabled:cursor-wait disabled:pointer-events-none'
                    )}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    {isLoggingOut ? (
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] relative animate-spin" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 12a9 9 0 1 1-3-6.7" />
                      </svg>
                    ) : (
                      <IconPower className="h-[18px] w-[18px] relative" />
                    )}
                    <span className="relative">{isLoggingOut ? 'Saindo…' : 'Sair'}</span>
                  </button>

                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-950 border-slate-700 text-slate-200 text-[11px]">
                  Encerrar sessão
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>


          </div>
        </div>

        {/* ── Faixa de destaque: UNIDADE + EQUIPE ── */}
        {(agent.unit_id || agent.team) && (
          <div className={cn(
            'flex flex-wrap items-center gap-1.5 border-t border-amber-500/20',
            compact ? 'mt-1 pt-1' : 'mt-1.5 pt-1.5'
          )}>
            {agent.unit_id && <UnitBadge unitId={agent.unit_id} prominent />}
            {agent.team && <TeamInsignia team={agent.team} prominent />}
          </div>
        )}

      </div>

      {/* bottom gold accent */}
      <div className="relative h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
    </div>
  );
}
