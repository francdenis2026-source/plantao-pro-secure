import { 
  Shield, Cpu, Monitor, Flame, Snowflake,
  Crown, Swords, Crosshair, Target, Binary, Orbit, Hexagon, Atom,
  Skull, Zap, AlertTriangle, Diamond, Sparkles, Waves,
  BadgeCheck, Gem, Award, Radio, Siren, Lock,
  Cloud, Compass, Navigation, Network, Globe, Database, Server, Wifi
} from 'lucide-react';
import type { ThemeType } from '@/contexts/ThemeContext';
import type { LucideIcon } from 'lucide-react';

export interface BackgroundEffect {
  type: 'particles' | 'grid' | 'radar' | 'matrix' | 'hexagons' | 'scanlines' | 'frost' | 'flames' | 'dots' | 'waves' | 'orbs' | 'circuits' | 'golden';
  intensity: 'low' | 'medium' | 'high';
  primaryColor: string;
  secondaryColor?: string;
  animated: boolean;
  particleCount?: number;
  speed?: 'slow' | 'medium' | 'fast';
}

export interface ThemeAssets {
  mainIcon: LucideIcon;
  decorativeIcons: LucideIcon[];
  teamIcons: {
    ALFA: LucideIcon;
    BRAVO: LucideIcon;
    CHARLIE: LucideIcon;
    DELTA: LucideIcon;
  };
  teamColors: {
    ALFA: { color: string; bgGradient: string; borderColor: string; glowColor: string };
    BRAVO: { color: string; bgGradient: string; borderColor: string; glowColor: string };
    CHARLIE: { color: string; bgGradient: string; borderColor: string; glowColor: string };
    DELTA: { color: string; bgGradient: string; borderColor: string; glowColor: string };
  };
  teamDescriptions: {
    ALFA: { description: string; slogan: string };
    BRAVO: { description: string; slogan: string };
    CHARLIE: { description: string; slogan: string };
    DELTA: { description: string; slogan: string };
  };
  logoStyle: {
    gradient: string;
    textShadow: string;
  };
  subtitle: string;
  backgroundEffects: BackgroundEffect[];
  ambientGlow: {
    primary: string;
    secondary: string;
    tertiary?: string;
  };
  cornerAccents: {
    style: 'tactical' | 'tech' | 'military' | 'minimal' | 'frost' | 'flame' | 'royal' | 'matrix' | 'none';
    color: string;
  };
}

export const themeAssets: Record<ThemeType, ThemeAssets> = {
  tactical: {
    mainIcon: Shield,
    decorativeIcons: [Radio, Siren, Lock],
    teamIcons: {
      ALFA: Crown,
      BRAVO: Swords,
      CHARLIE: Crosshair,
      DELTA: Target,
    },
    teamColors: {
      ALFA: { color: 'text-amber-400', bgGradient: 'from-amber-950/95 via-orange-900/80 to-slate-950', borderColor: 'border-amber-500/60', glowColor: 'shadow-amber-500/40' },
      BRAVO: { color: 'text-orange-400', bgGradient: 'from-orange-950/95 via-red-900/80 to-slate-950', borderColor: 'border-orange-500/60', glowColor: 'shadow-orange-500/40' },
      CHARLIE: { color: 'text-yellow-400', bgGradient: 'from-yellow-950/95 via-amber-900/80 to-slate-950', borderColor: 'border-yellow-500/60', glowColor: 'shadow-yellow-500/40' },
      DELTA: { color: 'text-amber-300', bgGradient: 'from-amber-900/95 via-yellow-900/80 to-slate-950', borderColor: 'border-amber-400/60', glowColor: 'shadow-amber-400/40' },
    },
    teamDescriptions: {
      ALFA: { description: 'Primeira Linha de Defesa', slogan: 'Alerta Máximo' },
      BRAVO: { description: 'Força de Resposta Rápida', slogan: 'Ação Imediata' },
      CHARLIE: { description: 'Operações Especializadas', slogan: 'Precisão Total' },
      DELTA: { description: 'Suporte e Coordenação', slogan: 'Visão Estratégica' },
    },
    logoStyle: {
      gradient: 'from-amber-400 via-orange-500 to-amber-400',
      textShadow: '0 0 40px rgba(251, 191, 36, 0.6)',
    },
    subtitle: 'Sistema Tático de Escalas',
    backgroundEffects: [
      { type: 'grid', intensity: 'high', primaryColor: 'rgba(251, 191, 36, 0.2)', animated: true, speed: 'slow' },
      { type: 'scanlines', intensity: 'medium', primaryColor: 'rgba(251, 191, 36, 0.5)', animated: true, speed: 'medium' },
      { type: 'particles', intensity: 'high', primaryColor: 'rgba(251, 191, 36, 0.7)', animated: true, particleCount: 50, speed: 'slow' },
    ],
    ambientGlow: { primary: 'rgba(251, 191, 36, 0.2)', secondary: 'rgba(249, 115, 22, 0.15)', tertiary: 'rgba(234, 179, 8, 0.1)' },
    cornerAccents: { style: 'tactical', color: 'border-amber-500/40' },
  },
  cyber: {
    mainIcon: Cpu,
    decorativeIcons: [Zap, Binary, Orbit],
    teamIcons: {
      ALFA: Binary,
      BRAVO: Orbit,
      CHARLIE: Hexagon,
      DELTA: Atom,
    },
    teamColors: {
      ALFA: { color: 'text-cyan-400', bgGradient: 'from-cyan-950/95 via-blue-900/80 to-slate-950', borderColor: 'border-cyan-500/60', glowColor: 'shadow-cyan-500/40' },
      BRAVO: { color: 'text-purple-400', bgGradient: 'from-purple-950/95 via-violet-900/80 to-slate-950', borderColor: 'border-purple-500/60', glowColor: 'shadow-purple-500/40' },
      CHARLIE: { color: 'text-pink-400', bgGradient: 'from-pink-950/95 via-fuchsia-900/80 to-slate-950', borderColor: 'border-pink-500/60', glowColor: 'shadow-pink-500/40' },
      DELTA: { color: 'text-blue-400', bgGradient: 'from-blue-950/95 via-indigo-900/80 to-slate-950', borderColor: 'border-blue-500/60', glowColor: 'shadow-blue-500/40' },
    },
    teamDescriptions: {
      ALFA: { description: 'Unidade de Sistemas', slogan: 'Código Ativo' },
      BRAVO: { description: 'Inteligência Artificial', slogan: 'Neural Link' },
      CHARLIE: { description: 'Criptografia Avançada', slogan: 'Zero Breach' },
      DELTA: { description: 'Infraestrutura Core', slogan: 'Uptime 100%' },
    },
    logoStyle: {
      gradient: 'from-cyan-400 via-purple-500 to-pink-400',
      textShadow: '0 0 40px rgba(6, 182, 212, 0.6)',
    },
    subtitle: 'Sistema Cyber de Operações',
    backgroundEffects: [
      { type: 'matrix', intensity: 'high', primaryColor: 'rgba(6, 182, 212, 0.6)', animated: true, speed: 'fast' },
      { type: 'hexagons', intensity: 'medium', primaryColor: 'rgba(168, 85, 247, 0.3)', animated: true, speed: 'medium' },
      { type: 'particles', intensity: 'high', primaryColor: 'rgba(236, 72, 153, 0.6)', secondaryColor: 'rgba(6, 182, 212, 0.6)', animated: true, particleCount: 60, speed: 'fast' },
    ],
    ambientGlow: { primary: 'rgba(6, 182, 212, 0.2)', secondary: 'rgba(168, 85, 247, 0.15)', tertiary: 'rgba(236, 72, 153, 0.12)' },
    cornerAccents: { style: 'tech', color: 'border-cyan-500/50' },
  },
  crimson: {
    mainIcon: Flame,
    decorativeIcons: [AlertTriangle, Skull, Zap],
    teamIcons: {
      ALFA: Skull,
      BRAVO: Flame,
      CHARLIE: Zap,
      DELTA: AlertTriangle,
    },
    teamColors: {
      ALFA: { color: 'text-red-400', bgGradient: 'from-red-950/95 via-rose-900/80 to-slate-950', borderColor: 'border-red-500/60', glowColor: 'shadow-red-500/40' },
      BRAVO: { color: 'text-orange-500', bgGradient: 'from-orange-950/95 via-red-900/80 to-slate-950', borderColor: 'border-orange-500/60', glowColor: 'shadow-orange-500/40' },
      CHARLIE: { color: 'text-yellow-500', bgGradient: 'from-yellow-950/95 via-orange-900/80 to-slate-950', borderColor: 'border-yellow-500/60', glowColor: 'shadow-yellow-500/40' },
      DELTA: { color: 'text-rose-400', bgGradient: 'from-rose-950/95 via-pink-900/80 to-slate-950', borderColor: 'border-rose-500/60', glowColor: 'shadow-rose-500/40' },
    },
    teamDescriptions: {
      ALFA: { description: 'Força de Choque', slogan: 'Fogo e Fúria' },
      BRAVO: { description: 'Esquadrão Explosivo', slogan: 'Impacto Máximo' },
      CHARLIE: { description: 'Resposta de Crise', slogan: 'Alerta Vermelho' },
      DELTA: { description: 'Contenção Especial', slogan: 'Zona de Risco' },
    },
    logoStyle: {
      gradient: 'from-red-400 via-orange-500 to-yellow-400',
      textShadow: '0 0 40px rgba(239, 68, 68, 0.6)',
    },
    subtitle: 'Sistema de Força Especial',
    backgroundEffects: [
      { type: 'flames', intensity: 'high', primaryColor: 'rgba(239, 68, 68, 0.5)', secondaryColor: 'rgba(249, 115, 22, 0.4)', animated: true, speed: 'fast' },
      { type: 'particles', intensity: 'high', primaryColor: 'rgba(239, 68, 68, 0.7)', animated: true, particleCount: 50, speed: 'fast' },
      { type: 'scanlines', intensity: 'high', primaryColor: 'rgba(239, 68, 68, 0.6)', animated: true, speed: 'fast' },
    ],
    ambientGlow: { primary: 'rgba(239, 68, 68, 0.25)', secondary: 'rgba(249, 115, 22, 0.2)', tertiary: 'rgba(234, 179, 8, 0.12)' },
    cornerAccents: { style: 'flame', color: 'border-red-500/50' },
  },
  arctic: {
    mainIcon: Snowflake,
    decorativeIcons: [Cloud, Compass, Navigation],
    teamIcons: {
      ALFA: Diamond,
      BRAVO: Sparkles,
      CHARLIE: Waves,
      DELTA: Snowflake,
    },
    teamColors: {
      ALFA: { color: 'text-sky-400', bgGradient: 'from-sky-950/95 via-blue-900/80 to-slate-950', borderColor: 'border-sky-500/60', glowColor: 'shadow-sky-500/40' },
      BRAVO: { color: 'text-cyan-400', bgGradient: 'from-cyan-950/95 via-teal-900/80 to-slate-950', borderColor: 'border-cyan-500/60', glowColor: 'shadow-cyan-500/40' },
      CHARLIE: { color: 'text-teal-400', bgGradient: 'from-teal-950/95 via-cyan-900/80 to-slate-950', borderColor: 'border-teal-500/60', glowColor: 'shadow-teal-500/40' },
      DELTA: { color: 'text-blue-300', bgGradient: 'from-blue-950/95 via-sky-900/80 to-slate-950', borderColor: 'border-blue-400/60', glowColor: 'shadow-blue-400/40' },
    },
    teamDescriptions: {
      ALFA: { description: 'Operações Árticas', slogan: 'Gelo e Precisão' },
      BRAVO: { description: 'Navegação Polar', slogan: 'Norte Verdadeiro' },
      CHARLIE: { description: 'Orientação Extrema', slogan: 'Rumo Glacial' },
      DELTA: { description: 'Cobertura Aérea', slogan: 'Tempestade Branca' },
    },
    logoStyle: {
      gradient: 'from-sky-400 via-cyan-500 to-blue-400',
      textShadow: '0 0 40px rgba(56, 189, 248, 0.6)',
    },
    subtitle: 'Sistema Ártico de Operações',
    backgroundEffects: [
      { type: 'frost', intensity: 'high', primaryColor: 'rgba(56, 189, 248, 0.4)', secondaryColor: 'rgba(6, 182, 212, 0.3)', animated: true, speed: 'slow' },
      { type: 'particles', intensity: 'high', primaryColor: 'rgba(255, 255, 255, 0.9)', animated: true, particleCount: 80, speed: 'slow' },
      { type: 'orbs', intensity: 'medium', primaryColor: 'rgba(56, 189, 248, 0.2)', animated: true, speed: 'slow' },
    ],
    ambientGlow: { primary: 'rgba(56, 189, 248, 0.2)', secondary: 'rgba(6, 182, 212, 0.15)', tertiary: 'rgba(255, 255, 255, 0.1)' },
    cornerAccents: { style: 'frost', color: 'border-sky-400/40' },
  },
  // NEW: Sovereign - Premium Gold/Bronze institutional theme
  sovereign: {
    mainIcon: Crown,
    decorativeIcons: [BadgeCheck, Gem, Award],
    teamIcons: {
      ALFA: Crown,
      BRAVO: Shield,
      CHARLIE: Award,
      DELTA: Gem,
    },
    teamColors: {
      ALFA: { color: 'text-yellow-400', bgGradient: 'from-yellow-950/95 via-amber-900/85 to-stone-950', borderColor: 'border-yellow-500/60', glowColor: 'shadow-yellow-500/40' },
      BRAVO: { color: 'text-amber-400', bgGradient: 'from-amber-950/95 via-yellow-900/80 to-stone-950', borderColor: 'border-amber-500/60', glowColor: 'shadow-amber-500/40' },
      CHARLIE: { color: 'text-orange-300', bgGradient: 'from-orange-950/95 via-amber-900/80 to-stone-950', borderColor: 'border-orange-400/60', glowColor: 'shadow-orange-400/40' },
      DELTA: { color: 'text-yellow-300', bgGradient: 'from-yellow-900/95 via-stone-900/80 to-stone-950', borderColor: 'border-yellow-400/60', glowColor: 'shadow-yellow-400/40' },
    },
    teamDescriptions: {
      ALFA: { description: 'Comando Soberano', slogan: 'Autoridade Máxima' },
      BRAVO: { description: 'Elite Institucional', slogan: 'Honra e Dever' },
      CHARLIE: { description: 'Excelência Operacional', slogan: 'Mérito Supremo' },
      DELTA: { description: 'Legado e Tradição', slogan: 'Glória Eterna' },
    },
    logoStyle: {
      gradient: 'from-yellow-400 via-amber-500 to-yellow-600',
      textShadow: '0 0 50px rgba(234, 179, 8, 0.7)',
    },
    subtitle: 'Sistema Governamental Premium',
    backgroundEffects: [
      { type: 'golden', intensity: 'medium', primaryColor: 'rgba(234, 179, 8, 0.3)', secondaryColor: 'rgba(180, 130, 20, 0.2)', animated: true, speed: 'slow' },
      { type: 'particles', intensity: 'low', primaryColor: 'rgba(234, 179, 8, 0.5)', animated: true, particleCount: 30, speed: 'slow' },
    ],
    ambientGlow: { primary: 'rgba(234, 179, 8, 0.2)', secondary: 'rgba(180, 130, 20, 0.15)', tertiary: 'rgba(255, 215, 0, 0.1)' },
    cornerAccents: { style: 'royal', color: 'border-yellow-500/50' },
  },
  // NEW: Nexus - Matrix green futuristic network theme
  nexus: {
    mainIcon: Network,
    decorativeIcons: [Globe, Database, Server],
    teamIcons: {
      ALFA: Network,
      BRAVO: Globe,
      CHARLIE: Database,
      DELTA: Wifi,
    },
    teamColors: {
      ALFA: { color: 'text-emerald-400', bgGradient: 'from-emerald-950/95 via-green-900/85 to-slate-950', borderColor: 'border-emerald-500/60', glowColor: 'shadow-emerald-500/40' },
      BRAVO: { color: 'text-green-400', bgGradient: 'from-green-950/95 via-emerald-900/80 to-slate-950', borderColor: 'border-green-500/60', glowColor: 'shadow-green-500/40' },
      CHARLIE: { color: 'text-teal-400', bgGradient: 'from-teal-950/95 via-green-900/80 to-slate-950', borderColor: 'border-teal-500/60', glowColor: 'shadow-teal-500/40' },
      DELTA: { color: 'text-lime-400', bgGradient: 'from-lime-950/95 via-emerald-900/80 to-slate-950', borderColor: 'border-lime-500/60', glowColor: 'shadow-lime-500/40' },
    },
    teamDescriptions: {
      ALFA: { description: 'Nó Central', slogan: 'Conectado 24/7' },
      BRAVO: { description: 'Rede Global', slogan: 'Alcance Total' },
      CHARLIE: { description: 'Banco de Dados', slogan: 'Zero Latência' },
      DELTA: { description: 'Sinal Forte', slogan: 'Full Stack' },
    },
    logoStyle: {
      gradient: 'from-emerald-400 via-green-500 to-teal-400',
      textShadow: '0 0 45px rgba(34, 197, 94, 0.7)',
    },
    subtitle: 'Sistema Neural de Rede',
    backgroundEffects: [
      { type: 'matrix', intensity: 'high', primaryColor: 'rgba(34, 197, 94, 0.6)', animated: true, speed: 'fast' },
      { type: 'circuits', intensity: 'medium', primaryColor: 'rgba(16, 185, 129, 0.4)', animated: true, speed: 'medium' },
      { type: 'particles', intensity: 'high', primaryColor: 'rgba(34, 197, 94, 0.7)', animated: true, particleCount: 70, speed: 'medium' },
    ],
    ambientGlow: { primary: 'rgba(34, 197, 94, 0.25)', secondary: 'rgba(16, 185, 129, 0.18)', tertiary: 'rgba(20, 184, 166, 0.12)' },
    cornerAccents: { style: 'matrix', color: 'border-emerald-500/50' },
  },
  // NEW: Ember theme - inspired by PlantãoPro logo
  ember: {
    mainIcon: Shield,
    decorativeIcons: [Flame, Crown, Swords],
    teamIcons: {
      ALFA: Shield,
      BRAVO: Flame,
      CHARLIE: Target,
      DELTA: Crosshair,
    },
    teamColors: {
      ALFA: { color: 'text-orange-400', bgGradient: 'from-orange-950/95 via-red-900/80 to-black', borderColor: 'border-orange-500/60', glowColor: 'shadow-orange-500/50' },
      BRAVO: { color: 'text-red-400', bgGradient: 'from-red-950/95 via-orange-900/80 to-black', borderColor: 'border-red-500/60', glowColor: 'shadow-red-500/50' },
      CHARLIE: { color: 'text-amber-400', bgGradient: 'from-amber-950/95 via-orange-900/80 to-black', borderColor: 'border-amber-500/60', glowColor: 'shadow-amber-500/50' },
      DELTA: { color: 'text-yellow-400', bgGradient: 'from-yellow-950/95 via-red-900/80 to-black', borderColor: 'border-yellow-500/60', glowColor: 'shadow-yellow-500/50' },
    },
    teamDescriptions: {
      ALFA: { description: 'Escudo Supremo', slogan: 'Proteção Total' },
      BRAVO: { description: 'Força Operacional', slogan: 'Intensidade Máxima' },
      CHARLIE: { description: 'Elite Tática', slogan: 'Precisão de Fogo' },
      DELTA: { description: 'Comando Especial', slogan: 'Líder Estratégico' },
    },
    logoStyle: {
      gradient: 'from-orange-400 via-red-500 to-amber-400',
      textShadow: '0 0 50px rgba(234, 88, 12, 0.8)',
    },
    subtitle: 'Sistema Operacional de Elite',
    backgroundEffects: [
      { type: 'flames', intensity: 'high', primaryColor: 'rgba(234, 88, 12, 0.5)', secondaryColor: 'rgba(220, 38, 38, 0.3)', animated: true, speed: 'medium' },
      { type: 'particles', intensity: 'high', primaryColor: 'rgba(234, 88, 12, 0.7)', animated: true, particleCount: 60, speed: 'medium' },
      { type: 'golden', intensity: 'medium', primaryColor: 'rgba(234, 179, 8, 0.3)', animated: true, speed: 'slow' },
    ],
    ambientGlow: { primary: 'rgba(234, 88, 12, 0.3)', secondary: 'rgba(220, 38, 38, 0.2)', tertiary: 'rgba(234, 179, 8, 0.15)' },
    cornerAccents: { style: 'flame', color: 'border-orange-500/60' },
  },
  system: {
    mainIcon: Monitor,
    decorativeIcons: [Radio, Siren, Lock],
    teamIcons: {
      ALFA: Crown,
      BRAVO: Swords,
      CHARLIE: Crosshair,
      DELTA: Target,
    },
    teamColors: {
      ALFA: { color: 'text-amber-400', bgGradient: 'from-amber-950/95 via-orange-900/80 to-slate-950', borderColor: 'border-amber-500/60', glowColor: 'shadow-amber-500/40' },
      BRAVO: { color: 'text-orange-400', bgGradient: 'from-orange-950/95 via-red-900/80 to-slate-950', borderColor: 'border-orange-500/60', glowColor: 'shadow-orange-500/40' },
      CHARLIE: { color: 'text-yellow-400', bgGradient: 'from-yellow-950/95 via-amber-900/80 to-slate-950', borderColor: 'border-yellow-500/60', glowColor: 'shadow-yellow-500/40' },
      DELTA: { color: 'text-amber-300', bgGradient: 'from-amber-900/95 via-yellow-900/80 to-slate-950', borderColor: 'border-amber-400/60', glowColor: 'shadow-amber-400/40' },
    },
    teamDescriptions: {
      ALFA: { description: 'Primeira Linha de Defesa', slogan: 'Alerta Máximo' },
      BRAVO: { description: 'Força de Resposta Rápida', slogan: 'Ação Imediata' },
      CHARLIE: { description: 'Operações Especializadas', slogan: 'Precisão Total' },
      DELTA: { description: 'Suporte e Coordenação', slogan: 'Visão Estratégica' },
    },
    logoStyle: {
      gradient: 'from-amber-400 via-orange-500 to-amber-400',
      textShadow: '0 0 40px rgba(251, 191, 36, 0.6)',
    },
    subtitle: 'Sistema de Escalas',
    backgroundEffects: [
      { type: 'grid', intensity: 'medium', primaryColor: 'rgba(251, 191, 36, 0.15)', animated: true, speed: 'slow' },
      { type: 'particles', intensity: 'medium', primaryColor: 'rgba(251, 191, 36, 0.6)', animated: true, particleCount: 40, speed: 'slow' },
    ],
    ambientGlow: { primary: 'rgba(251, 191, 36, 0.15)', secondary: 'rgba(249, 115, 22, 0.1)' },
    cornerAccents: { style: 'tactical', color: 'border-amber-500/30' },
  },
};

export function getThemeAssets(theme: ThemeType, resolvedTheme: Exclude<ThemeType, 'system'>): ThemeAssets {
  if (theme === 'system') {
    return themeAssets[resolvedTheme];
  }
  return themeAssets[theme];
}