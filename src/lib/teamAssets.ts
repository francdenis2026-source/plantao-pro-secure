// Team image assets — pôsteres oficiais reais (fornecidos pelo usuário),
// substituindo os assets quebrados do CDN do Lovable.
import alfaPoster from '@/assets/midias/team-alfa.png';
import bravoPoster from '@/assets/midias/team-bravo.png';
import charliePoster from '@/assets/midias/team-charlie.png';
import deltaPoster from '@/assets/midias/team-delta.png';
const alfaPosterWebp = alfaPoster;
const bravoPosterWebp = bravoPoster;
const charliePosterWebp = charliePoster;
const deltaPosterWebp = deltaPoster;
// Emblemas — arquivos locais reais (não dependem do CDN do Lovable).
import alfaEmblem from '@/assets/teams/alfa-shield-v2.webp';
import bravoEmblem from '@/assets/teams/bravo-helmet-v2.webp';
import charlieEmblem from '@/assets/teams/charlie-optics-v2.webp';
import deltaEmblem from '@/assets/teams/delta-radio-v2.webp';
import panelsBgAsset from '@/assets/teams/panels-bg.png.asset.json';
const panelsBg = panelsBgAsset.url;
import homeBackgroundAsset from '@/assets/home-background.png.asset.json';
const homeBackground = homeBackgroundAsset.url;
import homeBackgroundWebp from '@/assets/home-background.webp';
import loginBackground_ptr from '@/assets/login-background.jpg.asset.json';
const loginBackground = (loginBackground_ptr as {url:string}).url;
import loginBackgroundWebp from '@/assets/login-background.webp';

export const teamPosters: Record<string, string> = {
  ALFA: alfaPoster,
  BRAVO: bravoPoster,
  CHARLIE: charliePoster,
  DELTA: deltaPoster,
};

export const teamPostersWebp: Record<string, string> = {
  ALFA: alfaPosterWebp,
  BRAVO: bravoPosterWebp,
  CHARLIE: charliePosterWebp,
  DELTA: deltaPosterWebp,
};

export const teamEmblems: Record<string, string> = {
  ALFA: alfaEmblem,
  BRAVO: bravoEmblem,
  CHARLIE: charlieEmblem,
  DELTA: deltaEmblem,
};

export const getTeamEmblem = (team: string | null): string | null => {
  if (!team) return null;
  return teamEmblems[team.toUpperCase()] || null;
};

export const teamColors: Record<string, {
  primary: string;      // Acento principal (títulos, brasão glow, borda foco)
  secondary: string;    // Tom profundo (gradientes, hover pressionado)
  glow: string;         // Sombra difusa
  onPrimary: string;    // Texto sobre cor primária (contraste AA)
  ring: string;         // Cor do anel de foco
  hover: string;        // Fundo de hover mais claro
}> = {
  ALFA: {
    // Verde esmeralda de alta luminância — contraste AA sobre fundo escuro
    primary: '#34d399',
    secondary: '#065f46',
    glow: 'rgba(52, 211, 153, 0.45)',
    onPrimary: '#052e1a',
    ring: '#6ee7b7',
    hover: '#10b981',
  },
  BRAVO: {
    // Âmbar profundo — melhor contraste que laranja puro
    primary: '#fb923c',
    secondary: '#7c2d12',
    glow: 'rgba(251, 146, 60, 0.45)',
    onPrimary: '#2a0f00',
    ring: '#fdba74',
    hover: '#f97316',
  },
  CHARLIE: {
    // Azul céu vibrante — melhor legibilidade sobre navy
    primary: '#60a5fa',
    secondary: '#1e40af',
    glow: 'rgba(96, 165, 250, 0.45)',
    onPrimary: '#08122e',
    ring: '#93c5fd',
    hover: '#3b82f6',
  },
  DELTA: {
    // Violeta elétrico — distinção máxima frente às demais equipes
    primary: '#a78bfa',
    secondary: '#4c1d95',
    glow: 'rgba(167, 139, 250, 0.5)',
    onPrimary: '#1a0b3d',
    ring: '#c4b5fd',
    hover: '#8b5cf6',
  },
};

export const getTeamPoster = (team: string | null): string | null => {
  if (!team) return null;
  return teamPosters[team.toUpperCase()] || null;
};

export const getTeamPosterWebp = (team: string | null): string | null => {
  if (!team) return null;
  return teamPostersWebp[team.toUpperCase()] || null;
};

export const getTeamColors = (team: string | null) => {
  if (!team) return teamColors.ALFA;
  return teamColors[team.toUpperCase()] || teamColors.ALFA;
};

export { panelsBg, homeBackground, homeBackgroundWebp, loginBackground, loginBackgroundWebp };
