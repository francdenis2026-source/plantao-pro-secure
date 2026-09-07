import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ClipboardCheck, ShieldAlert, Radio, Users, KeyRound, ArrowLeftRight, Swords,
  PenLine, CheckCircle2, History, Lock, Loader2, Circle, Timer,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isShiftActive } from '@/lib/shiftTime';

// -------- Types --------
interface Props {
  agentId: string;
  agentName: string;
  agentTeam?: string | null;
  unitId?: string | null;
  agentRole?: string | null;
}

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
}

interface Briefing {
  id: string;
  shift_id: string | null;
  shift_date: string;
  adolescents_counted: number | null;
  handcuffs_counted: number | null;
  handcuff_keys_counted: number | null;
  tonfas_counted: number | null;
  tonfas_expected: number | null;
  radios_charged_count: number | null;
  radios_total_expected: number | null;
  book_entry: string | null;
  handover_ok: boolean;
  handover_notes: string | null;
  observations: string | null;
  signature: string | null;
  completed_at: string | null;
}

const LEADER_ROLES = ['support', 'team_leader', 'chief', 'apoio', 'chefe_equipe'];

// Cada item do checklist e como decidir se está "cumprido"
type ChecklistKey =
  | 'adolescents'
  | 'handcuffs'
  | 'handcuff_keys'
  | 'tonfas'
  | 'radios'
  | 'handover';

const CHECKLIST_ORDER: ChecklistKey[] = [
  'adolescents', 'handcuffs', 'handcuff_keys', 'tonfas', 'radios', 'handover',
];

// -------- Offline persistence helpers --------
// Draft: fotografia do formulário para sobreviver a recarregamentos offline.
// Pending: payload aguardando sincronização com o servidor.
const DRAFT_KEY = (shiftId: string) => `plantao_briefing_draft_${shiftId}`;
const PENDING_KEY = (shiftId: string) => `plantao_briefing_pending_${shiftId}`;

interface DraftShape {
  adoCnt: string; algCnt: string; chvCnt: string;
  tonCnt: string; tonExpected: string;
  radiosCharged: string; radiosExpected: string;
  bookEntry: string; handoverOk: boolean; handoverNotes: string;
  observations: string; signature: string;
  updatedAt: number;
}

function readDraft(shiftId: string): DraftShape | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(shiftId));
    return raw ? JSON.parse(raw) as DraftShape : null;
  } catch { return null; }
}
function writeDraft(shiftId: string, draft: Omit<DraftShape, 'updatedAt'>) {
  try {
    localStorage.setItem(DRAFT_KEY(shiftId), JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch { /* quota — ignore */ }
}
function readPending(shiftId: string): { payload: any; existingId: string | null } | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY(shiftId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writePending(shiftId: string, payload: any, existingId: string | null) {
  try {
    localStorage.setItem(PENDING_KEY(shiftId), JSON.stringify({ payload, existingId, queuedAt: Date.now() }));
  } catch { /* ignore */ }
}
function clearPending(shiftId: string) {
  try { localStorage.removeItem(PENDING_KEY(shiftId)); } catch { /* ignore */ }
}
function clearDraft(shiftId: string) {
  try { localStorage.removeItem(DRAFT_KEY(shiftId)); } catch { /* ignore */ }
}

// -------- Component --------
export function ShiftBriefingCard({
  agentId, agentName, agentTeam, unitId, agentRole,
}: Props) {
  const isLeader = !!agentRole && LEADER_ROLES.includes(agentRole);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [history, setHistory] = useState<Briefing[]>([]);
  const [open, setOpen] = useState(false);
  const [lockedOpen, setLockedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error' | 'pending'>('idle');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [hasPending, setHasPending] = useState(false);

  // form state — cada plantão começa em branco (chave = shift_id)
  const [adoCnt, setAdoCnt] = useState('');
  const [algCnt, setAlgCnt] = useState('');
  const [chvCnt, setChvCnt] = useState('');
  const [tonCnt, setTonCnt] = useState('');
  const [tonExpected, setTonExpected] = useState('');
  const [radiosCharged, setRadiosCharged] = useState('');
  const [radiosExpected, setRadiosExpected] = useState('');
  const [bookEntry, setBookEntry] = useState('');
  const [handoverOk, setHandoverOk] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [observations, setObservations] = useState('');
  const [signature, setSignature] = useState('');

  // Guarda-chuva para debounce e evitar race em auto-save
  const autoSaveTimer = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const briefingRef = useRef<Briefing | null>(null);
  briefingRef.current = briefing;

  // fetch current shift + existing briefing + history
  useEffect(() => {
    if (!isLeader) return;
    (async () => {
      const { data: shifts } = await supabase
        .from('agent_shifts')
        .select('id, shift_date, start_time, end_time')
        .eq('agent_id', agentId)
        .gte('shift_date', new Date(Date.now() - 86400000).toISOString().slice(0, 10))
        .order('shift_date', { ascending: true })
        .limit(4);

      // Ativa somente durante a janela REAL do plantão (respeita end_time).
      const active = (shifts || []).find((s: any) => isShiftActive({
        shift_date: s.shift_date,
        start_time: s.start_time,
        end_time: s.end_time,
      })) as Shift | undefined;

      setCurrentShift(active || null);

      if (unitId) {
        const { data: hist } = await supabase
          .from('shift_briefings')
          .select('*')
          .eq('unit_id', unitId)
          .order('shift_date', { ascending: false })
          .limit(10);
        setHistory((hist || []) as unknown as Briefing[]);
      }

      // Briefing ativo do plantão atual. Se não existe, o formulário fica em
      // branco — renovação automática por shift_id garante que cada novo
      // plantão começa do zero.
      if (active) {
        const { data: b } = await supabase
          .from('shift_briefings')
          .select('*')
          .eq('shift_id', active.id)
          .maybeSingle();
        if (b) setBriefing(b as unknown as Briefing);
      }
    })();
  }, [agentId, unitId, isLeader]);

  // Hidrata formulário com o briefing carregado (ou o do plantão atual).
  // Rascunho local tem prioridade se for mais recente que o registro do servidor
  // ou se existir sincronização pendente — assim o usuário nunca perde edições offline.
  useEffect(() => {
    if (!currentShift) return;
    const draft = readDraft(currentShift.id);
    const pending = readPending(currentShift.id);
    setHasPending(!!pending);

    const serverTs = briefing?.completed_at ? Date.parse(briefing.completed_at) : 0;
    const draftIsFresher = draft && (!!pending || draft.updatedAt > serverTs);

    if (draft && (draftIsFresher || !briefing)) {
      setAdoCnt(draft.adoCnt);
      setAlgCnt(draft.algCnt);
      setChvCnt(draft.chvCnt);
      setTonCnt(draft.tonCnt ?? '');
      setTonExpected(draft.tonExpected ?? '');
      setRadiosCharged(draft.radiosCharged);
      setRadiosExpected(draft.radiosExpected);
      setBookEntry(draft.bookEntry);
      setHandoverOk(draft.handoverOk);
      setHandoverNotes(draft.handoverNotes);
      setObservations(draft.observations);
      setSignature(draft.signature);
    } else if (briefing) {
      setAdoCnt(briefing.adolescents_counted?.toString() ?? '');
      setAlgCnt(briefing.handcuffs_counted?.toString() ?? '');
      setChvCnt(briefing.handcuff_keys_counted?.toString() ?? '');
      setTonCnt(briefing.tonfas_counted?.toString() ?? '');
      setTonExpected(briefing.tonfas_expected?.toString() ?? '');
      setRadiosCharged(briefing.radios_charged_count?.toString() ?? '');
      setRadiosExpected(briefing.radios_total_expected?.toString() ?? '');
      setBookEntry(briefing.book_entry ?? '');
      setHandoverOk(!!briefing.handover_ok);
      setHandoverNotes(briefing.handover_notes ?? '');
      setObservations(briefing.observations ?? '');
      setSignature(briefing.signature ?? '');
    }
  }, [briefing, currentShift]);

  // Cálculo de conclusão de cada item do checklist
  const itemsStatus = useMemo(() => {
    return {
      adolescents: adoCnt !== '' && Number(adoCnt) >= 0,
      handcuffs: algCnt !== '' && Number(algCnt) >= 0,
      handcuff_keys: chvCnt !== '' && Number(chvCnt) >= 0,
      tonfas: tonCnt !== '' && Number(tonCnt) >= 0,
      radios: radiosCharged !== '' && Number(radiosCharged) >= 0,
      handover: handoverOk,
    } as Record<ChecklistKey, boolean>;
  }, [adoCnt, algCnt, chvCnt, tonCnt, radiosCharged, handoverOk]);

  const completedCount = Object.values(itemsStatus).filter(Boolean).length;
  const progress = Math.round((completedCount / CHECKLIST_ORDER.length) * 100);

  // -------- Auto-save (debounce 700ms) com persistência local + fila offline --------
  const MISSING_LABEL: Record<ChecklistKey, string> = {
    adolescents: 'Contagem de adolescentes',
    handcuffs: 'Contagem de algemas',
    handcuff_keys: 'Contagem de chaves de algemas',
    tonfas: 'Contagem de tonfas',
    radios: 'Rádios carregados',
    handover: 'Confirmação de passagem de plantão',
  };

  const persist = async (finalize = false) => {
    if (!currentShift) return null;

    // Validação obrigatória ao finalizar: todas as contagens + passagem precisam estar preenchidas.
    if (finalize) {
      const missing = CHECKLIST_ORDER.filter((k) => !itemsStatus[k]).map((k) => MISSING_LABEL[k]);
      if (missing.length > 0) {
        toast.error(`Preencha antes de registrar: ${missing.join(' · ')}`);
        return null;
      }
    }
    // Assinatura não é mais obrigatória — o próprio agente logado assina o registro.




    // 1) Sempre salvar rascunho local ANTES de tentar a rede — assim, mesmo se
    //    o navegador cair, recarregar ou perder a conexão, o preenchimento é
    //    preservado até a próxima sincronização.
    writeDraft(currentShift.id, {
      adoCnt, algCnt, chvCnt, tonCnt, tonExpected, radiosCharged, radiosExpected,
      bookEntry, handoverOk, handoverNotes, observations, signature,
    });

    const payload: any = {
      shift_id: currentShift.id,
      agent_id: agentId,
      unit_id: unitId,
      team: agentTeam,
      shift_date: currentShift.shift_date,
      adolescents_counted: adoCnt !== '' ? Number(adoCnt) : null,
      handcuffs_counted: algCnt !== '' ? Number(algCnt) : null,
      handcuff_keys_counted: chvCnt !== '' ? Number(chvCnt) : null,
      tonfas_counted: tonCnt !== '' ? Number(tonCnt) : null,
      tonfas_expected: tonExpected !== '' ? Number(tonExpected) : null,
      radios_charged_count: radiosCharged !== '' ? Number(radiosCharged) : null,
      radios_total_expected: radiosExpected !== '' ? Number(radiosExpected) : null,
      book_entry: null,
      handover_ok: handoverOk,
      handover_notes: handoverNotes || null,
      observations: null,
      signature: agentName || null,
      completed_at: finalize
        ? new Date().toISOString()
        : (briefingRef.current?.completed_at ?? null),
    };

    // 2) Se estamos offline, enfileira e retorna — a sincronização acontece
    //    automaticamente quando a conexão voltar.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      writePending(currentShift.id, payload, briefingRef.current?.id ?? null);
      setHasPending(true);
      setAutoSaveState('pending');
      if (finalize) {
        toast.info('Sem conexão. Briefing será enviado assim que a rede voltar.');
      }
      return null;
    }

    setSaving(true);
    setAutoSaveState('saving');
    try {
      const existing = briefingRef.current;
      const { data, error } = existing
        ? await supabase
            .from('shift_briefings')
            .update(payload)
            .eq('id', existing.id)
            .select()
            .single()
        : await supabase
            .from('shift_briefings')
            .insert(payload)
            .select()
            .single();

      if (error) throw error;
      setBriefing(data as unknown as Briefing);
      dirtyRef.current = false;
      setAutoSaveState('saved');
      clearPending(currentShift.id);
      setHasPending(false);
      if (finalize) {
        clearDraft(currentShift.id);
        toast.success('Briefing finalizado e registrado.');
      }
      return data as unknown as Briefing;
    } catch (e: any) {
      // Falha de rede/servidor: mantém rascunho e enfileira para nova tentativa.
      writePending(currentShift.id, payload, briefingRef.current?.id ?? null);
      setHasPending(true);
      setAutoSaveState('pending');
      if (finalize) toast.error(e.message || 'Falha ao salvar. Mantido localmente para reenvio.');
      return null;
    } finally {
      setSaving(false);
      window.setTimeout(() => {
        setAutoSaveState((s) => (s === 'saved' ? 'idle' : s));
      }, 2200);
    }
  };

  // Auto-save reativo: qualquer alteração no formulário dispara persist em 700ms.
  useEffect(() => {
    if (!open || !currentShift) return;
    // Ignora o primeiro ciclo (hidratação vinda do briefing)
    if (!dirtyRef.current) return;
    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => {
      void persist(false);
    }, 700);
    return () => {
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adoCnt, algCnt, chvCnt, tonCnt, tonExpected, radiosCharged, radiosExpected, bookEntry, handoverOk, handoverNotes, observations, signature]);

  // Wrapper que marca "sujo" antes de setar cada estado — só assim o auto-save dispara.
  const withDirty = <T,>(setter: (v: T) => void) => (v: T) => {
    dirtyRef.current = true;
    setter(v);
  };

  // -------- Sincronização automática ao voltar online --------
  useEffect(() => {
    const flush = async () => {
      if (!currentShift) return;
      const pending = readPending(currentShift.id);
      if (!pending) return;
      setAutoSaveState('saving');
      try {
        const { data, error } = pending.existingId
          ? await supabase
              .from('shift_briefings')
              .update(pending.payload)
              .eq('id', pending.existingId)
              .select()
              .single()
          : await supabase
              .from('shift_briefings')
              .insert(pending.payload)
              .select()
              .single();
        if (error) throw error;
        setBriefing(data as unknown as Briefing);
        clearPending(currentShift.id);
        setHasPending(false);
        setAutoSaveState('saved');
        toast.success('Briefing sincronizado com o servidor.');
        window.setTimeout(() => setAutoSaveState('idle'), 2200);
      } catch {
        setAutoSaveState('pending');
      }
    };

    const handleOnline = () => { setIsOnline(true); void flush(); };
    const handleOffline = () => { setIsOnline(false); setAutoSaveState('pending'); };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('app:back-online', handleOnline);

    // Tenta drenar imediatamente ao montar/abrir (caso a conexão já esteja OK).
    if (typeof navigator !== 'undefined' && navigator.onLine && currentShift) {
      void flush();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('app:back-online', handleOnline);
    };
  }, [currentShift]);


  // ---------- Render ----------
  if (!isLeader) return null;

  const finalized = !!briefing?.completed_at;
  const hasCurrentShift = !!currentShift;

  // Desativa completamente o card fora do plantão — só aparece no dia do plantão.
  if (!hasCurrentShift) return null;


  return (
    <>
      <Card className="bg-slate-900/60 border-amber-500/30 overflow-hidden">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm text-amber-300">
              <ClipboardCheck className="h-4 w-4" />
              Checklist de Entrada
              <Badge className={cn(
                'ml-2 text-[10px]',
                finalized
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : hasCurrentShift
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                    : 'bg-slate-700/40 border-slate-600 text-slate-400'
              )}>
                {finalized ? 'REGISTRADO' : hasCurrentShift ? 'PENDENTE' : 'AGUARDANDO PLANTÃO'}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300 uppercase">
                <Lock className="h-3 w-3 mr-1" />
                {agentRole === 'support' ? 'Apoio' : 'Chefia'}
              </Badge>
              <Button
                size="sm"
                onClick={() => {
                  if (!hasCurrentShift) {
                    setLockedOpen(true);
                    return;
                  }
                  setOpen(true);
                }}
                aria-disabled={!hasCurrentShift}
                className={cn(
                  'h-8 font-semibold transition-all',
                  !hasCurrentShift
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                    : finalized
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                )}
              >
                {!hasCurrentShift ? (
                  <><Lock className="h-3.5 w-3.5 mr-1.5" /> Bloqueado</>
                ) : (
                  <><PenLine className="h-3.5 w-3.5 mr-1.5" /> {finalized ? 'Revisar checklist' : 'Preencher checklist'}</>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 space-y-3">
          {!hasCurrentShift ? (
            <OffDutyNotice />
          ) : (
            <>
              {(() => {
                const missingSummary = ([
                  { key: 'adolescents' as ChecklistKey, label: 'Adolescentes' },
                  { key: 'handcuffs' as ChecklistKey, label: 'Algemas' },
                  { key: 'handcuff_keys' as ChecklistKey, label: 'Chaves' },
                  { key: 'tonfas' as ChecklistKey, label: 'Tonfas' },
                  { key: 'radios' as ChecklistKey, label: 'Rádios carregados' },
                  { key: 'handover' as ChecklistKey, label: 'Recebimento' },
                ]).filter((i) => !itemsStatus[i.key]);

                return (
                  <details open={!finalized} className="group">
                    <summary className="cursor-pointer list-none flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200 mb-2 select-none">
                      <span className="flex items-center gap-1.5">
                        <ClipboardCheck className="h-3 w-3" />
                        Itens do checklist
                      </span>
                      <span className="text-slate-500 group-open:hidden">▸ expandir</span>
                      <span className="text-slate-500 hidden group-open:inline">▾ recolher</span>
                    </summary>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <MiniStat icon={<Users className="h-3 w-3" />} label="Adolescentes" value={briefing?.adolescents_counted?.toString() ?? '—'} missing={!itemsStatus.adolescents} />
                      <MiniStat icon={<ShieldAlert className="h-3 w-3" />} label="Algemas" value={briefing?.handcuffs_counted?.toString() ?? '—'} missing={!itemsStatus.handcuffs} />
                      <MiniStat icon={<KeyRound className="h-3 w-3" />} label="Chaves" value={briefing?.handcuff_keys_counted?.toString() ?? '—'} missing={!itemsStatus.handcuff_keys} />
                      <MiniStat
                        icon={<Swords className="h-3 w-3" />}
                        label="Tonfas"
                        value={briefing?.tonfas_counted != null
                          ? (briefing?.tonfas_expected
                              ? `${briefing.tonfas_counted}/${briefing.tonfas_expected}`
                              : String(briefing.tonfas_counted))
                          : '—'}
                        missing={!itemsStatus.tonfas}
                      />
                      <MiniStat
                        icon={<Radio className="h-3 w-3" />}
                        label="Rádios carregados"
                        value={briefing?.radios_charged_count != null
                          ? (briefing?.radios_total_expected
                              ? `${briefing.radios_charged_count}/${briefing.radios_total_expected}`
                              : String(briefing.radios_charged_count))
                          : '—'}
                        missing={!itemsStatus.radios}
                      />
                      <MiniStat icon={<ArrowLeftRight className="h-3 w-3" />} label="Passagem" value={itemsStatus.handover ? 'OK' : '—'} missing={!itemsStatus.handover} />
                    </div>

                    {missingSummary.length > 0 && (
                      <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 flex items-start gap-2">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-300 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase tracking-widest text-amber-300 font-semibold">
                            Pendências para envio
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {missingSummary.map((m) => (
                              <span
                                key={m.key}
                                className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/15 text-amber-200"
                              >
                                {m.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </details>
                );

              })()}

              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-400">
                <span>Preenchimento · {completedCount}/{CHECKLIST_ORDER.length}</span>
                <span className={cn(progress === 100 ? 'text-emerald-400' : 'text-amber-400')}>{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-500',
                    progress === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Resumo do Recebimento de Plantão — sempre visível quando há plantão ativo */}
              <div
                className={cn(
                  'rounded-md border px-3 py-2.5 transition-colors',
                  briefing?.handover_ok
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-slate-700 bg-slate-950/60'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400">
                    <ArrowLeftRight className="h-3 w-3" />
                    Recebimento de plantão
                  </div>
                  <Badge
                    className={cn(
                      'text-[9px] font-semibold',
                      briefing?.handover_ok
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 border-slate-600 text-slate-400'
                    )}
                  >
                    {briefing?.handover_ok ? (
                      <><CheckCircle2 className="h-2.5 w-2.5 mr-1" /> CONFIRMADO</>
                    ) : (
                      <><Circle className="h-2.5 w-2.5 mr-1" /> NÃO CONFIRMADO</>
                    )}
                  </Badge>
                </div>
                {briefing?.handover_notes ? (
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
                    “{briefing.handover_notes}”
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] italic text-slate-500">
                    Sem observações registradas na passagem.
                  </p>
                )}
              </div>

              {finalized && briefing?.completed_at && (
                <div className="flex items-center gap-2 text-[11px] text-emerald-300/90 pt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Registrado por <strong>{briefing.signature || agentName}</strong> em{' '}
                  {format(parseISO(briefing.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              )}
            </>
          )}

          {history.length > 0 && (
            <>
              <Separator className="bg-slate-800" />
              <details className="group">
                <summary className="cursor-pointer text-[11px] uppercase tracking-widest text-slate-400 flex items-center gap-1.5 hover:text-slate-200">
                  <History className="h-3 w-3" />
                  Histórico da unidade ({history.length})
                </summary>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto pr-1">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/50 px-2.5 py-1.5 text-[11px]">
                      <span className="text-slate-300">
                        {format(parseISO(h.shift_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      <span className="text-slate-500 truncate max-w-[45%]">{h.signature || '—'}</span>
                      <Badge className={cn(
                        'text-[9px]',
                        h.completed_at
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                      )}>
                        {h.completed_at ? 'OK' : 'RASCUNHO'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </details>
            </>
          )}
        </CardContent>
      </Card>

      {/* ---------- Dialog ---------- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-amber-500/30 text-slate-100 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-800 bg-gradient-to-r from-amber-500/10 to-transparent">
            <DialogTitle className="flex items-center gap-2 text-amber-300">
              <ClipboardCheck className="h-5 w-5" />
              Checklist do Plantão {currentShift && format(parseISO(currentShift.shift_date), 'dd/MM/yyyy', { locale: ptBR })}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs flex items-center gap-2 flex-wrap">
              Cada item é salvo automaticamente {isOnline ? '' : '(offline — será sincronizado ao reconectar)'}. Ao finalizar, o registro fica travado neste plantão.
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-widest">
                {autoSaveState === 'saving' && (<><Loader2 className="h-3 w-3 animate-spin" /> salvando…</>)}
                {autoSaveState === 'saved' && (<><CheckCircle2 className="h-3 w-3 text-emerald-400" /> salvo</>)}
                {autoSaveState === 'error' && (<><ShieldAlert className="h-3 w-3 text-red-400" /> falha ao salvar</>)}
                {autoSaveState === 'pending' && (<><Loader2 className="h-3 w-3 text-amber-400" /> aguardando conexão</>)}
                {autoSaveState === 'idle' && hasPending && (<><ShieldAlert className="h-3 w-3 text-amber-400" /> pendente de envio</>)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh]">
            <div className="px-6 py-4 space-y-3">
              {/* 1. Adolescentes */}
              <ChecklistRow
                order={1} done={itemsStatus.adolescents}
                icon={<Users className="h-4 w-4 text-amber-400" />}
                title="Contagem de adolescentes"
                subtitle="Total de acautelados presentes no início do plantão."
              >
                <NumberField value={adoCnt} onChange={withDirty(setAdoCnt)} placeholder="Ex.: 24" />
              </ChecklistRow>

              {/* 2. Algemas */}
              <ChecklistRow
                order={2} done={itemsStatus.handcuffs}
                icon={<ShieldAlert className="h-4 w-4 text-amber-400" />}
                title="Contagem das algemas"
                subtitle="Total de algemas conferidas e disponíveis para uso."
              >
                <NumberField value={algCnt} onChange={withDirty(setAlgCnt)} placeholder="Ex.: 8" />
              </ChecklistRow>

              {/* 3. Chaves de algemas */}
              <ChecklistRow
                order={3} done={itemsStatus.handcuff_keys}
                icon={<KeyRound className="h-4 w-4 text-amber-400" />}
                title="Contagem das chaves de algemas"
                subtitle="Total de chaves conferidas e sob custódia."
              >
                <NumberField value={chvCnt} onChange={withDirty(setChvCnt)} placeholder="Ex.: 8" />
              </ChecklistRow>

              {/* 4. Tonfas */}
              <ChecklistRow
                order={4} done={itemsStatus.tonfas}
                icon={<Swords className="h-4 w-4 text-amber-400" />}
                title="Contagem das tonfas"
                subtitle="Total de tonfas conferidas e disponíveis para uso."
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] uppercase text-slate-500">Conferidas</Label>
                    <NumberField value={tonCnt} onChange={withDirty(setTonCnt)} placeholder="Ex.: 6" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-slate-500">Total esperado</Label>
                    <NumberField value={tonExpected} onChange={withDirty(setTonExpected)} placeholder="Ex.: 6" />
                  </div>
                </div>
              </ChecklistRow>

              {/* 5. Rádios carregados */}
              <ChecklistRow
                order={5} done={itemsStatus.radios}
                icon={<Radio className="h-4 w-4 text-amber-400" />}
                title="Rádios carregados"
                subtitle="Informe quantos rádios estão carregados e prontos para uso."
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] uppercase text-slate-500">Carregados</Label>
                    <NumberField value={radiosCharged} onChange={withDirty(setRadiosCharged)} placeholder="Ex.: 6" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-slate-500">Total esperado</Label>
                    <NumberField value={radiosExpected} onChange={withDirty(setRadiosExpected)} placeholder="Ex.: 6" />
                  </div>
                </div>
              </ChecklistRow>

              {/* 6. Passagem de plantão */}
              <ChecklistRow
                order={6} done={itemsStatus.handover}
                icon={<ArrowLeftRight className="h-4 w-4 text-amber-400" />}
                title="Passagem de plantão"
                subtitle="Confirme que a passagem foi feita com a equipe anterior."
              >
                <label className="flex items-center gap-2 cursor-pointer rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2.5">
                  <Checkbox
                    checked={handoverOk}
                    onCheckedChange={(v) => withDirty(setHandoverOk)(!!v)}
                  />
                  <span className="text-sm text-slate-200">Passagem realizada e conferida</span>
                </label>
                <Textarea
                  value={handoverNotes}
                  onChange={(e) => withDirty(setHandoverNotes)(e.target.value)}
                  placeholder="Ex.: alertas repassados, adolescentes em regime especial, pendências..."
                  rows={3}
                  className="bg-slate-950/60 border-slate-700 text-sm resize-none mt-2"
                  maxLength={2000}
                />
              </ChecklistRow>

            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex-row justify-between sm:justify-between">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className={cn('h-3.5 w-3.5', progress === 100 ? 'text-emerald-400' : 'text-slate-600')} />
              {completedCount}/{CHECKLIST_ORDER.length} itens concluídos
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                Fechar
              </Button>
              <Button
                onClick={() => persist(true).then((b) => { if (b?.completed_at) setOpen(false); })}
                disabled={saving || !currentShift || progress < 100 || !handoverOk}
                title={!handoverOk ? 'Confirme o recebimento de plantão para habilitar o envio' : undefined}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {!handoverOk ? 'Confirme o recebimento' : 'Finalizar e registrar'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Bloqueio profissional: fora do plantão ---------- */}
      <Dialog open={lockedOpen} onOpenChange={setLockedOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-amber-500/40 text-slate-100 p-0 overflow-hidden">
          <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-amber-500/10 via-slate-950 to-slate-950">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <span aria-hidden className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl animate-pulse" />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 64 64"
                  className="relative h-20 w-20 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M32 4l22 8v14c0 14-9.5 24.5-22 30-12.5-5.5-22-16-22-30V12l22-8z" opacity="0.9" />
                  <rect x="22" y="30" width="20" height="16" rx="2.5" />
                  <path d="M26 30v-5a6 6 0 0 1 12 0v5" />
                  <circle cx="32" cy="37" r="1.8" fill="currentColor" stroke="none" />
                  <path d="M32 39v3" />
                </svg>
              </div>
              <DialogHeader className="mt-4 space-y-1">
                <DialogTitle className="text-amber-300 text-base font-semibold tracking-wide uppercase">
                  Acesso restrito ao plantão em curso
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-[12.5px] leading-relaxed">
                  O checklist de entrada e o registro de briefing só podem ser preenchidos
                  <strong className="text-slate-200"> durante o seu plantão </strong>
                  ativo. Fora da janela operacional o módulo permanece bloqueado por segurança.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
          <div className="px-6 pb-5 pt-2 space-y-2">
            <div className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-[11.5px] text-slate-300 flex items-start gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
              <span>
                Liberação automática no <strong className="text-slate-100">dia e horário</strong> do
                plantão registrado para <strong className="text-slate-100">{agentName}</strong>.
              </span>
            </div>
            <Button
              onClick={() => setLockedOpen(false)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// -------- Helpers --------
function MiniStat({ icon, label, value, missing }: { icon: React.ReactNode; label: string; value: string; missing?: boolean }) {
  return (
    <div className={cn(
      'rounded-md border px-2 py-1.5 transition-colors',
      missing
        ? 'border-amber-500/50 bg-amber-500/10'
        : 'border-slate-800 bg-slate-950/60'
    )}>
      <div className={cn(
        'text-[9px] uppercase flex items-center justify-center gap-1',
        missing ? 'text-amber-300' : 'text-slate-500'
      )}>
        {icon}
        {label}
      </div>
      <div className={cn(
        'font-mono text-sm mt-0.5',
        missing ? 'text-amber-200' : 'text-slate-100'
      )}>{value}</div>
    </div>
  );
}

function ChecklistRow({
  order, done, icon, title, subtitle, children,
}: {
  order: number;
  done: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      'rounded-lg border p-3 transition-colors',
      done
        ? 'border-emerald-500/40 bg-emerald-500/5'
        : 'border-slate-800 bg-slate-950/60'
    )}>
      <div className="flex items-start gap-3 mb-2.5">
        <div className={cn(
          'flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold border',
          done
            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
            : 'bg-slate-900 text-slate-400 border-slate-700'
        )}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : order}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            {icon}
            {title}
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {done ? (
          <Badge className="text-[9px] bg-emerald-500/20 border-emerald-500/40 text-emerald-300">
            OK
          </Badge>
        ) : (
          <Badge className="text-[9px] bg-slate-800 border-slate-700 text-slate-400">
            <Circle className="h-2 w-2 mr-1" /> PENDENTE
          </Badge>
        )}
      </div>
      <div className="pl-10">{children}</div>
    </div>
  );
}

function NumberField({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      onKeyDown={(e) => e.key === 'e' && e.preventDefault()}
      placeholder={placeholder}
      className="h-9 bg-slate-900 border-slate-700 text-sm mt-1"
      autoComplete="new-password"
    />
  );
}

/**
 * Estado profissional exibido enquanto NÃO há plantão em curso.
 * Substitui o antigo texto seco por um aviso institucional em SVG.
 */
function OffDutyNotice() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-amber-500/25 bg-gradient-to-br from-slate-950 via-slate-900/60 to-slate-950 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-md bg-amber-500/10 border border-amber-500/30 p-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            className="h-8 w-8 text-amber-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M24 4l16 6v10c0 10-7 18-16 22-9-4-16-12-16-22V10l16-6z" opacity="0.85" />
            <circle cx="24" cy="24" r="6" />
            <path d="M24 18v6l4 3" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-amber-400/90">
              Briefing bloqueado
            </span>
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_hsl(45_100%_55%/0.8)]" />
          </div>
          <h4 className="mt-1 text-sm font-semibold text-slate-100 leading-tight">
            Aguardando início do plantão
          </h4>
          <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">
            O checklist de entrada (adolescentes, algemas, chaves, tonfas, rádios e passagem de plantão)
            será liberado automaticamente no momento em que o seu plantão iniciar. Uso restrito a{' '}
            <strong className="text-slate-200">Chefe de Equipe</strong> e{' '}
            <strong className="text-slate-200">Apoio</strong>.
          </p>
        </div>
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,hsl(45_100%_55%/0.35),transparent)]"
      />
    </div>
  );
}

