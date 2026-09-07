// Team image assets
import alfaPoster_ptr from '@/assets/teams/alfa-poster.jpg.asset.json';
const alfaPoster = (alfaPoster_ptr as {url:string}).url;
import bravoPoster_ptr from '@/assets/teams/bravo-poster.jpg.asset.json';
const bravoPoster = (bravoPoster_ptr as {url:string}).url;
import charliePoster_ptr from '@/assets/teams/charlie-poster.jpg.asset.json';
const charliePoster = (charliePoster_ptr as {url:string}).url;
import deltaPoster_ptr from '@/assets/teams/delta-poster.jpg.asset.json';
const deltaPoster = (deltaPoster_ptr as {url:string}).url;
const alfaPosterWebp = alfaPoster;
const bravoPosterWebp = bravoPoster;
const charliePosterWebp = charliePoster;
const deltaPosterWebp = deltaPoster;
import alfaEmblemAsset from '@/assets/teams/alfa-emblem.png.asset.json';
const alfaEmblem = alfaEmblemAsset.url;
import bravoEmblemAsset from '@/assets/teams/bravo-emblem.png.asset.json';
const bravoEmblem = bravoEmblemAsset.url;
import charlieEmblemAsset from '@/assets/teams/charlie-emblem.png.asset.json';
const charlieEmblem = charlieEmblemAsset.url;
import deltaEmblemAsset from '@/assets/teams/delta-emblem.png.asset.json';
const deltaEmblem = deltaEmblemAsset.url;
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
