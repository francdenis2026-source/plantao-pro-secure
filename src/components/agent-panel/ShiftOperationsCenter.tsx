import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Radar, Shield, ShieldAlert, ShieldCheck, ClipboardCheck,
  FileDown, VolumeX, Volume2, Sparkles, Zap, Users, Clock,
} from 'lucide-react';
import {
  addHours, differenceInSeconds, format, isWithinInterval, parseISO, subDays,
} from 'date-fns';
import { isShiftActive } from '@/lib/shiftTime';

import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLowMotion } from '@/hooks/useLowMotion';

interface Props {
  agentId: string;
  agentName: string;
  agentTeam?: string | null;
  unitId?: string | null;
}

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface TeamMember {
  id: string;
  name: string;
  team: string | null;
  role?: string | null;
}

const DEFAULT_CHECKLIST = [
  { id: 'access', label: 'Acesso liberado à unidade' },
  { id: 'scale', label: 'Escala confirmada com o chefe' },
  { id: 'radio', label: 'Rádio / comunicação operacional' },
  { id: 'uniform', label: 'Fardamento e EPI conforme' },
  { id: 'briefing', label: 'Briefing/passagem recebida' },
  { id: 'ready', label: 'Status operacional: PRONTO' },
];

// ---------- tactical beep via WebAudio (no assets) ----------
function beep(freq = 880, ms = 120, gain = 0.08) {
  try {
    const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g).connect(ctx.destination);
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, ms);
  } catch { /* silent */ }
}

// ---------- Full-screen HUD 3-2-1 ----------
function ShiftStartHUD({ onDone, silent }: { onDone: () => void; silent: boolean }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (!silent) beep(660, 140);
    const id = setInterval(() => {
      setCount((c) => {
        const next = c - 1;
        if (next <= 0) {
          clearInterval(id);
          if (!silent) beep(1200, 400, 0.12);
          setTimeout(onDone, 700);
          return 0;
        }
        if (!silent) beep(660 + (3 - next) * 120, 140);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onDone, silent]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent_60%)]" />
      </div>

      <div className="relative flex flex-col items-center gap-6 px-6 text-center">
        <div className="flex items-center gap-3 text-emerald-400">
          <Shield className="h-7 w-7 animate-pulse" />
          <span className="font-mono text-sm tracking-[0.4em] uppercase">Inicializando Plantão</span>
        </div>

        <div key={count} className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-2xl animate-ping" />
          <div className="relative flex items-center justify-center h-48 w-48 md:h-64 md:w-64 rounded-full border-4 border-emerald-500/60 bg-slate-950/80 shadow-[0_0_60px_rgba(16,185,129,0.5)]">
            <span className="font-mono text-8xl md:text-9xl font-black text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]">
              {count > 0 ? count : 'GO'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-emerald-300">EM SERVIÇO — {format(new Date(), 'HH:mm:ss')}</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Animated Radar ----------
function OperationsRadar({ members, myId, lowMotion }: { members: TeamMember[]; myId: string; lowMotion: boolean }) {
  return (
    <div className="relative aspect-square w-full max-w-[280px] mx-auto">
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <defs>
          <radialGradient id="ops-radar-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(142 76% 45%)" stopOpacity="0.35" />
            <stop offset="70%" stopColor="hsl(142 76% 45%)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="hsl(142 76% 45%)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ops-radar-sweep" x1="50%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="hsl(142 76% 55%)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(142 76% 55%)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <circle cx="100" cy="100" r="96" fill="url(#ops-radar-glow)" />
        {[92, 68, 42, 20].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="hsl(142 76% 45%)" strokeOpacity="0.25" strokeWidth="0.8" />
        ))}
        <line x1="4" y1="100" x2="196" y2="100" stroke="hsl(142 76% 45%)" strokeOpacity="0.18" strokeWidth="0.6" />
        <line x1="100" y1="4" x2="100" y2="196" stroke="hsl(142 76% 45%)" strokeOpacity="0.18" strokeWidth="0.6" />

        {!lowMotion && (
          <g style={{ transformOrigin: '100px 100px', animation: 'ops-radar-spin 3.2s linear infinite' }}>
            <path d="M100 100 L196 100 A96 96 0 0 0 148 16 Z" fill="url(#ops-radar-sweep)" />
          </g>
        )}

        {/* Blips for members */}
        {members.slice(0, 8).map((m, i) => {
          const angle = (i / Math.max(members.length, 1)) * Math.PI * 2;
          const radius = 28 + (i % 3) * 22;
          const cx = 100 + Math.cos(angle) * radius;
          const cy = 100 + Math.sin(angle) * radius;
          const isMe = m.id === myId;
          return (
            <g key={m.id}>
              <circle cx={cx} cy={cy} r={isMe ? 4 : 2.6} fill={isMe ? 'hsl(48 96% 60%)' : 'hsl(142 76% 55%)'}>
                {!lowMotion && (
                  <animate attributeName="opacity" values="1;0.35;1" dur="1.8s" repeatCount="indefinite" />
                )}
              </circle>
              {isMe && (
                <circle cx={cx} cy={cy} r="7" fill="none" stroke="hsl(48 96% 60%)" strokeOpacity="0.5">
                  {!lowMotion && (
                    <animate attributeName="r" values="7;12;7" dur="2s" repeatCount="indefinite" />
                  )}
                </circle>
              )}
            </g>
          );
        })}

        <circle cx="100" cy="100" r="3" fill="hsl(142 76% 55%)" />
      </svg>

      <style>{`@keyframes ops-radar-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ---------- Main Component ----------
export function ShiftOperationsCenter({ agentId, agentName, agentTeam, unitId }: Props) {
  const { lowMotion, toggle: toggleLowMotion } = useLowMotion();
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [showHUD, setShowHUD] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [observations, setObservations] = useState('');
  const [signature, setSignature] = useState('');
  const [elapsed, setElapsed] = useState({ h: 0, m: 0, s: 0 });

  const shiftKey = currentShift?.id ?? '';
  const checklistStorageKey = shiftKey ? `shift_checklist_${agentId}_${shiftKey}` : '';
  const obsStorageKey = shiftKey ? `shift_obs_${agentId}_${shiftKey}` : '';
  const hudShownKey = shiftKey ? `shift_hud_${agentId}_${shiftKey}` : '';

  // Fetch current/next shift
  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('agent_shifts')
        .select('*')
        .eq('agent_id', agentId)
        .gte('shift_date', yesterday)
        .neq('status', 'vacation')
        .order('shift_date', { ascending: true })
        .limit(3);
      const list = (data || []) as Shift[];
      // Só habilita durante a janela REAL do plantão do próprio agente
      // (respeita end_time, inclusive turnos noturnos que viram meia-noite).
      const active = list.find((s) => isShiftActive({
        shift_date: s.shift_date,
        start_time: s.start_time,
        end_time: s.end_time,
      })) || null;
      setCurrentShift(active);
      setIsOnDuty(!!active);

    })();
  }, [agentId]);

  // Fetch team members
  useEffect(() => {
    if (!agentTeam || !unitId) return;
    (async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, name, team, role')
        .eq('unit_id', unitId)
        .eq('team', agentTeam)
        .eq('is_active', true)
        .limit(20);
      setMembers((data || []) as TeamMember[]);
    })();
  }, [agentTeam, unitId]);

  // Load persisted checklist & obs
  useEffect(() => {
    if (!checklistStorageKey) return;
    try {
      const c = localStorage.getItem(checklistStorageKey);
      if (c) setChecklist(JSON.parse(c));
      const o = localStorage.getItem(obsStorageKey);
      if (o) setObservations(o);
    } catch { /* noop */ }
  }, [checklistStorageKey, obsStorageKey]);

  // Trigger HUD on first entry to duty (per-shift)
  useEffect(() => {
    if (!isOnDuty || !hudShownKey) return;
    if (localStorage.getItem(hudShownKey) === '1') return;
    setShowHUD(true);
    localStorage.setItem(hudShownKey, '1');
  }, [isOnDuty, hudShownKey]);

  // Elapsed timer
  useEffect(() => {
    if (!currentShift || !isOnDuty) return;
    const start = parseISO(`${currentShift.shift_date}T${currentShift.start_time}`);
    const tick = () => {
      const sec = Math.max(0, differenceInSeconds(new Date(), start));
      setElapsed({ h: Math.floor(sec / 3600), m: Math.floor((sec % 3600) / 60), s: sec % 60 });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentShift, isOnDuty]);

  const checklistProgress = useMemo(() => {
    const total = DEFAULT_CHECKLIST.length;
    const done = DEFAULT_CHECKLIST.filter((i) => checklist[i.id]).length;
    return { total, done, pct: Math.round((done / total) * 100) };
  }, [checklist]);

  const toggleCheck = (id: string) => {
    const next = { ...checklist, [id]: !checklist[id] };
    setChecklist(next);
    if (checklistStorageKey) localStorage.setItem(checklistStorageKey, JSON.stringify(next));
  };

  const saveObs = (v: string) => {
    setObservations(v);
    if (obsStorageKey) localStorage.setItem(obsStorageKey, v);
  };

  const exportPDF = async () => {
    if (!currentShift) {
      toast.error('Nenhum plantão em curso para exportar.');
      return;
    }
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE PLANTÃO', pageW / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Agente: ${agentName}`, 14, 30);
    doc.text(`Equipe: ${agentTeam || '-'}`, 14, 36);
    doc.text(`Data: ${format(parseISO(currentShift.shift_date), 'dd/MM/yyyy', { locale: ptBR })}`, 14, 42);
    doc.text(`Início: ${currentShift.start_time}   |   Duração até o momento: ${String(elapsed.h).padStart(2,'0')}h${String(elapsed.m).padStart(2,'0')}m`, 14, 48);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 54);

    autoTable(doc, {
      startY: 62,
      head: [['Checklist de Início', 'Status']],
      body: DEFAULT_CHECKLIST.map((i) => [i.label, checklist[i.id] ? 'OK' : '—']),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    const y1 = (doc as any).lastAutoTable.finalY + 8;
    autoTable(doc, {
      startY: y1,
      head: [['Agentes em Serviço (Equipe)']],
      body: members.length ? members.map((m) => [`${m.name}${m.id === agentId ? '  (você)' : ''}`]) : [['—']],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    const y2 = (doc as any).lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Observações do Plantão', 14, y2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const obsLines = doc.splitTextToSize(observations || '—', pageW - 28);
    doc.text(obsLines, 14, y2 + 6);

    const y3 = y2 + 6 + obsLines.length * 5 + 20;
    doc.line(20, y3, 90, y3);
    doc.line(pageW - 90, y3, pageW - 20, y3);
    doc.setFontSize(9);
    doc.text(`Assinatura do Agente`, 55, y3 + 5, { align: 'center' });
    doc.text(`Chefia / Testemunha`, pageW - 55, y3 + 5, { align: 'center' });
    if (signature.trim()) {
      doc.setFont('helvetica', 'italic');
      doc.text(signature, 55, y3 - 2, { align: 'center' });
    }

    doc.setFontSize(8);
    doc.text('PlantaoPro — Documento operacional assinável', pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });

    doc.save(`plantao_${agentName.replace(/\s+/g, '_')}_${currentShift.shift_date}.pdf`);
    toast.success('Relatório gerado com sucesso.');
  };

  if (!isOnDuty || !currentShift) {
    return null;
  }

  return (
    <>



      <Card className="bg-slate-900/60 border-emerald-500/30 overflow-hidden">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm text-emerald-300">
              <Radar className="h-4 w-4" />
              Centro de Operações do Plantão
              <Badge className="ml-2 bg-emerald-500/20 border-emerald-500/40 text-emerald-300 text-[10px] animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 inline-block" />
                EM SERVIÇO
              </Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/50 px-2 py-1">
                {lowMotion ? <VolumeX className="h-3.5 w-3.5 text-slate-400" /> : <Volume2 className="h-3.5 w-3.5 text-emerald-400" />}
                <span className="text-[10px] uppercase text-slate-400 tracking-wider">Silencioso</span>
                <Switch checked={lowMotion} onCheckedChange={toggleLowMotion} className="scale-75" />
              </div>
              <Button size="sm" variant="outline" onClick={exportPDF} className="h-8 border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
                <FileDown className="h-3.5 w-3.5 mr-1.5" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Radar */}
            <div className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> Equipe {agentTeam || '—'}
                </span>
                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
                  {members.length} ativos
                </Badge>
              </div>
              <OperationsRadar members={members} myId={agentId} lowMotion={lowMotion} />
              <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Você</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Equipe</span>
              </div>
            </div>

            {/* Checklist */}
            <div className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-3 lg:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <ClipboardCheck className="h-3 w-3" /> Checklist de Início
                </span>
                <Badge className={cn(
                  'text-[10px]',
                  checklistProgress.pct === 100
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                )}>
                  {checklistProgress.done}/{checklistProgress.total} • {checklistProgress.pct}%
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEFAULT_CHECKLIST.map((item) => {
                  const done = !!checklist[item.id];
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-2.5 py-2 cursor-pointer transition-colors',
                        done
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                      )}
                    >
                      <Checkbox checked={done} onCheckedChange={() => toggleCheck(item.id)} />
                      <span className={cn('text-xs', done ? 'text-emerald-200 line-through decoration-emerald-500/50' : 'text-slate-200')}>
                        {item.label}
                      </span>
                      {done ? <ShieldCheck className="h-3.5 w-3.5 ml-auto text-emerald-400" /> : <ShieldAlert className="h-3.5 w-3.5 ml-auto text-slate-500" />}
                    </label>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-slate-800/60 border border-slate-700 p-2">
                  <div className="text-[9px] uppercase text-slate-500">Início</div>
                  <div className="font-mono text-sm text-white">{currentShift.start_time}</div>
                </div>
                <div className="rounded-md bg-slate-800/60 border border-emerald-500/30 p-2">
                  <div className="text-[9px] uppercase text-slate-500">Decorrido</div>
                  <div className="font-mono text-sm text-emerald-300">
                    {String(elapsed.h).padStart(2, '0')}:{String(elapsed.m).padStart(2, '0')}:{String(elapsed.s).padStart(2, '0')}
                  </div>
                </div>
                <div className="rounded-md bg-slate-800/60 border border-slate-700 p-2">
                  <div className="text-[9px] uppercase text-slate-500 flex items-center justify-center gap-1"><Clock className="h-2.5 w-2.5" />Ciclo</div>
                  <div className="font-mono text-sm text-white">24h</div>
                </div>
              </div>
            </div>
          </div>

          {/* Observations & signature */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3 w-3" /> Observações do Plantão
              </label>
              <Textarea
                value={observations}
                onChange={(e) => saveObs(e.target.value)}
                placeholder="Ocorrências, intercorrências, entregas, passagens..."
                rows={4}
                className="bg-slate-950/60 border-slate-700 text-slate-100 text-sm resize-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-1">
                <Zap className="h-3 w-3" /> Assinatura (nome do agente)
              </label>
              <Textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder={agentName}
                rows={2}
                className="bg-slate-950/60 border-slate-700 text-slate-100 text-sm resize-none font-serif italic"
              />
              <Button onClick={exportPDF} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">
                <FileDown className="h-4 w-4 mr-2" />
                Exportar PDF Assinável
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
