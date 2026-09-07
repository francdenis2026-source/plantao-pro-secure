import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNetworkStatus } from '@/hooks/useOfflineCache';
import { useServerTime } from '@/hooks/useServerTime';

/**
 * Tela institucional exibida quando a conexão cai.
 * Arte SVG temática do Sistema Socioeducativo: escudo institucional,
 * unidade sob vigilância, livro aberto (educação/reintegração),
 * silhueta de agente e correntes rompidas simbolizando a proposta pedagógica.
 */
export function OfflineFullScreen() {
  const { isOnline } = useNetworkStatus();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(!isOnline);
  const [retrying, setRetrying] = useState(false);
  const nowDate = useServerTime(1000);
  const now = nowDate.toLocaleTimeString('pt-BR', { timeZone: 'America/Rio_Branco' });

  useEffect(() => {
    if (!isOnline) setVisible(true);
    else if (visible) {
      const t = setTimeout(() => setVisible(false), 600);
      return () => clearTimeout(t);
    }
  }, [isOnline, visible]);


  if (!visible) return null;

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => window.location.reload(), 400);
  };

  const go = (path: string) => {
    setVisible(false);
    setTimeout(() => navigate(path), 50);
  };

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Sem conexão — Modo tático offline do Sistema Socioeducativo"
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-[#04070d] backdrop-blur-sm animate-fade-in overflow-y-auto"
    >
      {/* ================= Background institutional SVG scene ================= */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          {/* Sky/ambient */}
          <radialGradient id="ofs-sky" cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#0f2038" />
            <stop offset="45%" stopColor="#070f1c" />
            <stop offset="100%" stopColor="#02040a" />
          </radialGradient>
          {/* Gold */}
          <linearGradient id="ofs-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
          {/* Concrete tone (walls) */}
          <linearGradient id="ofs-concrete" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0b1220" />
          </linearGradient>
          {/* Warm floor light */}
          <radialGradient id="ofs-glow" cx="50%" cy="100%" r="70%">
            <stop offset="0%" stopColor="rgba(245,158,11,0.30)" />
            <stop offset="65%" stopColor="rgba(245,158,11,0)" />
          </radialGradient>
          <pattern id="ofs-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M60 0H0V60" fill="none" stroke="#132033" strokeWidth="1" opacity="0.55" />
          </pattern>
          <filter id="ofs-blur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sky + ground */}
        <rect width="1600" height="1000" fill="url(#ofs-sky)" />
        <rect width="1600" height="1000" fill="url(#ofs-grid)" opacity="0.4" />
        <rect x="0" y="700" width="1600" height="300" fill="url(#ofs-glow)" />

        {/* Distant fence silhouette */}
        <g opacity="0.35" stroke="#243447" strokeWidth="2">
          {Array.from({ length: 32 }).map((_, i) => (
            <line key={i} x1={20 + i * 50} y1="640" x2={20 + i * 50} y2="740" />
          ))}
          <line x1="0" y1="640" x2="1600" y2="640" />
          <line x1="0" y1="700" x2="1600" y2="700" />
        </g>

        {/* Institutional unit — silhouette (socioeducative center) */}
        <g transform="translate(200 470)" fill="url(#ofs-concrete)" stroke="#1e293b" strokeWidth="1.5">
          {/* Left wing */}
          <rect x="0" y="60" width="260" height="200" />
          {/* Central tower */}
          <rect x="240" y="0" width="180" height="260" />
          {/* Right wing */}
          <rect x="400" y="80" width="240" height="180" />
          {/* Roof line */}
          <path d="M240 0 L330 -40 L420 0 Z" fill="#0b1220" />
          {/* Windows — small squares with dim warm light */}
          <g fill="#f59e0b" opacity="0.55">
            {[0,1,2,3].map((r) =>
              [0,1,2,3,4].map((c) => (
                <rect key={`l-${r}-${c}`} x={20 + c * 46} y={80 + r * 42} width="18" height="22" opacity={((r + c) % 3 === 0) ? 0.75 : 0.25} />
              ))
            )}
            {[0,1,2,3,4].map((r) =>
              [0,1].map((c) => (
                <rect key={`t-${r}-${c}`} x={266 + c * 60} y={30 + r * 42} width="24" height="26" opacity={((r + c) % 2 === 0) ? 0.85 : 0.35} />
              ))
            )}
            {[0,1,2,3].map((r) =>
              [0,1,2,3,4].map((c) => (
                <rect key={`r-${r}-${c}`} x={420 + c * 44} y={100 + r * 38} width="18" height="22" opacity={((r + c) % 4 === 0) ? 0.7 : 0.25} />
              ))
            )}
          </g>
          {/* Central entrance */}
          <rect x="310" y="200" width="40" height="60" fill="#020617" />
          {/* Antenna / flag pole */}
          <line x1="330" y1="-40" x2="330" y2="-120" stroke="url(#ofs-gold)" strokeWidth="2" />
          <path d="M330 -120 L370 -110 L330 -100 Z" fill="url(#ofs-gold)" opacity="0.9" />
        </g>

        {/* Watchtower / observation post */}
        <g transform="translate(1050 400)" fill="url(#ofs-concrete)" stroke="#1e293b" strokeWidth="1.5">
          <rect x="30" y="120" width="30" height="200" />
          <rect x="60" y="120" width="30" height="200" />
          <rect x="0" y="80" width="120" height="60" />
          <path d="M0 80 L60 30 L120 80 Z" fill="#0b1220" />
          <rect x="45" y="95" width="30" height="30" fill="#fde68a" opacity="0.85">
            <animate attributeName="opacity" values="0.85;0.4;0.85" dur="2.8s" repeatCount="indefinite" />
          </rect>
        </g>

        {/* Guard silhouette walking */}
        <g transform="translate(900 640)" fill="#020617" opacity="0.92">
          <ellipse cx="0" cy="80" rx="26" ry="4" fill="#000" opacity="0.5" />
          {/* helmet */}
          <path d="M-14 -60 Q0 -74 14 -60 L14 -48 L-14 -48 Z" />
          <rect x="-15" y="-50" width="30" height="4" />
          {/* torso with vest */}
          <path d="M-20 -44 L20 -44 L26 30 L-26 30 Z" />
          {/* vest highlight */}
          <path d="M-18 -40 L18 -40 L22 26 L-22 26 Z" fill="#0f172a" />
          <rect x="-8" y="-24" width="16" height="10" fill="url(#ofs-gold)" opacity="0.65" />
          {/* arms */}
          <path d="M-22 -40 L-32 20 L-24 24 L-14 -22 Z" />
          <path d="M22 -40 L34 18 L26 26 L14 -22 Z" />
          {/* legs */}
          <path d="M-16 30 L-20 80 L-8 80 L-4 30 Z" />
          <path d="M16 30 L20 80 L8 80 L4 30 Z" />
        </g>

        {/* Broken signal arcs (top-right) */}
        <g transform="translate(1350 220)" stroke="url(#ofs-gold)" fill="none" strokeLinecap="round" opacity="0.75">
          <path d="M -110 40 A 110 110 0 0 1 -40 -80" strokeWidth="5" />
          <path d="M 40 -80 A 110 110 0 0 1 110 40" strokeWidth="5" />
          <path d="M -75 30 A 75 75 0 0 1 -30 -55" strokeWidth="4" opacity="0.6" />
          <path d="M 30 -55 A 75 75 0 0 1 75 30" strokeWidth="4" opacity="0.6" />
          <circle r="8" fill="url(#ofs-gold)" />
          {/* red slash */}
          <line x1="-90" y1="-70" x2="90" y2="70" stroke="#ef4444" strokeWidth="7" opacity="0.9" />
        </g>

        {/* Central emblem — shield with chevron + open book */}
        <g transform="translate(800 320)" filter="url(#ofs-blur)">
          {/* halo */}
          <circle r="150" fill="rgba(245,158,11,0.05)" />
          {/* shield */}
          <path
            d="M0 -120 L92 -88 V-16 C92 44 52 92 0 112 C-52 92 -92 44 -92 -16 V-88 Z"
            fill="rgba(15,23,42,0.9)"
            stroke="url(#ofs-gold)"
            strokeWidth="3"
          />
          {/* chevrons */}
          <path d="M-48 34 L0 10 L48 34" stroke="url(#ofs-gold)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M-48 60 L0 36 L48 60" stroke="url(#ofs-gold)" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.75" />
          {/* open book */}
          <g transform="translate(0 -46)">
            <path d="M-48 0 Q-24 -14 0 -8 Q24 -14 48 0 L48 22 Q24 8 0 14 Q-24 8 -48 22 Z" fill="url(#ofs-gold)" opacity="0.95" />
            <path d="M0 -8 L0 14" stroke="#78350f" strokeWidth="1.5" />
            <path d="M-38 4 L-8 -2 M-38 12 L-8 6" stroke="#78350f" strokeWidth="1" opacity="0.7" />
            <path d="M8 -2 L38 4 M8 6 L38 12" stroke="#78350f" strokeWidth="1" opacity="0.7" />
          </g>
          {/* broken chain — symbol of reintegration */}
          <g transform="translate(0 82)" stroke="url(#ofs-gold)" strokeWidth="2.5" fill="none">
            <ellipse cx="-24" cy="0" rx="10" ry="6" />
            <ellipse cx="-8" cy="0" rx="10" ry="6" opacity="0.55" />
            <ellipse cx="14" cy="0" rx="10" ry="6" opacity="0.55" />
            <ellipse cx="30" cy="0" rx="10" ry="6" />
            <line x1="-2" y1="-10" x2="8" y2="10" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>

        {/* Corner tactical brackets */}
        <g stroke="#f59e0b" strokeWidth="4" fill="none" opacity="0.55">
          <path d="M40 40 H130 M40 40 V130" />
          <path d="M1560 40 H1470 M1560 40 V130" />
          <path d="M40 960 H130 M40 960 V870" />
          <path d="M1560 960 H1470 M1560 960 V870" />
        </g>

        {/* Scanline sweep */}
        <rect x="0" y="0" width="1600" height="2" fill="url(#ofs-gold)" opacity="0.35">
          <animate attributeName="y" values="0;1000;0" dur="8s" repeatCount="indefinite" />
        </rect>
      </svg>

      {/* ============================ Content overlay ============================ */}
      <div className="relative z-10 w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-10 text-center">
        {/* Classified strip */}
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-slate-950/70 px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.32em] text-amber-300 backdrop-blur">
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-70" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-red-500" />
          </span>
          Sinal Perdido · Modo Tático Offline
        </div>

        <h1
          className="mt-5 text-white tracking-tight"
          style={{
            fontFamily: '"Libre Baskerville", "Playfair Display", Georgia, serif',
            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
            fontWeight: 700,
            textShadow: '0 2px 12px rgba(0,0,0,0.85)',
          }}
        >
          Sistema <span className="italic text-amber-300">Socioeducativo</span> · Modo Offline
        </h1>

        <p className="mt-3 text-sm sm:text-base text-slate-300/95 leading-relaxed max-w-xl mx-auto">
          A conexão com o servidor foi interrompida. A operação segue em contingência
          tática — recursos essenciais para agentes socioeducativos permanecem
          disponíveis com os dados sincronizados anteriormente.
        </p>

        {/* Offline tools grid */}
        <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left">
          <OfflineTool
            label="Escala"
            hint="Turnos salvos"
            onClick={() => go('/agent-panel')}
            icon={<path d="M4 5h16M4 9h16M4 13h10M4 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
          />
          <OfflineTool
            label="Equipe"
            hint="Contatos cache"
            onClick={() => go('/agent-panel')}
            icon={
              <>
                <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" fill="none" />
                <circle cx="17" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" fill="none" />
                <path d="M3 19c0-3 3-5 6-5s6 2 6 5M15 19c0-2 2-3.5 4-3.5s3 1 3 3" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </>
            }
          />
          <OfflineTool
            label="Protocolos"
            hint="Consulta local"
            onClick={() => go('/agent-panel')}
            icon={
              <>
                <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" fill="none" />
                <path d="M14 3v4h4M8 12h8M8 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </>
            }
          />
          <OfflineTool
            label="Diagnóstico"
            hint="Rede & cache"
            onClick={() => go('/install')}
            icon={<path d="M3 12h4l2-5 4 10 2-5h6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          />
        </div>

        {/* Actions */}
        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-400 disabled:opacity-70 disabled:cursor-wait text-slate-950 font-bold tracking-wider uppercase text-[13px] px-6 py-3 transition-all shadow-[0_10px_30px_-8px_rgba(245,158,11,0.55)] active:scale-[0.98]"
          >
            {retrying ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                Reconectando…
              </>
            ) : (
              'Tentar Reconectar'
            )}
          </button>
          <button
            type="button"
            onClick={() => go('/')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/15 text-amber-200 font-semibold tracking-wider uppercase text-[13px] px-6 py-3 transition-colors"
          >
            Ir para o Painel
          </button>
        </div>

        {/* Telemetry footer */}
        <div className="mt-8 pt-4 border-t border-amber-500/15 flex items-center justify-between gap-4 text-[10px] font-mono uppercase tracking-[0.28em] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-emerald-500" />
            Cache OK
          </span>
          <span className="text-amber-300/80 tabular-nums">{now}</span>
          <span className="flex items-center gap-1.5">
            <span className={`h-1 w-1 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {isOnline ? 'Uplink' : 'Uplink N/A'}
          </span>
        </div>

        <p className="mt-3 text-[9px] font-mono tracking-[0.32em] uppercase text-slate-600">
          ISE · Acre · PlantãoPro
        </p>
      </div>
    </div>
  );
}

function OfflineTool({
  label,
  hint,
  icon,
  onClick,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-2.5 rounded-lg border border-amber-500/25 bg-slate-950/70 hover:border-amber-400/70 hover:bg-slate-900 px-3 py-2.5 text-left backdrop-blur transition-all active:scale-[0.98]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-300 group-hover:text-amber-200">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          {icon}
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold text-slate-100">{label}</span>
        <span className="block truncate text-[9.5px] font-mono uppercase tracking-wider text-slate-500">{hint}</span>
      </span>
    </button>
  );
}
