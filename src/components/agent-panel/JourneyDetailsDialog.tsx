import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Sun, Moon, Palmtree, Clock, AlertCircle, Timer,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Share2, FileDown, Loader2,
} from 'lucide-react';
import { format, differenceInMinutes, differenceInHours, addDays, subDays, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import logoAsset from '@/assets/logo-plantao-pro-official.png.asset.json';

export interface JourneyDetailsData {
  targetDate: Date;
  restStart: Date | null;
  restEnd: Date | null;
  shiftStart: Date | null;
  shiftEnd: Date | null;
  scaleLabel?: string;
  emptyMessage?: string;
}

interface JourneyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: JourneyDetailsData | null;
  /** Callback opcional para carregar dados de outra data (habilita navegação prev/next/mês). */
  onRequestDate?: (date: Date) => JourneyDetailsData | Promise<JourneyDetailsData>;
  /** Chave para persistir a última data consultada em localStorage. */
  storageKey?: string;
}

const useTicker = (enabled: boolean) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const i = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(i);
  }, [enabled]);
};

const fmtCountdown = (target: Date, now: Date) => {
  const totalMin = Math.max(0, differenceInMinutes(target, now));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  if (h < 24) return `${h}h ${m.toString().padStart(2, '0')}min`;
  const d = Math.floor(h / 24);
  return `${d}d ${(h % 24)}h`;
};

export function JourneyDetailsDialog({
  open, onOpenChange, data, onRequestDate, storageKey,
}: JourneyDetailsDialogProps) {
  useTicker(open);
  const now = new Date();
  const printRef = useRef<HTMLDivElement | null>(null);
  const [current, setCurrent] = useState<JourneyDetailsData | null>(data);
  const [busy, setBusy] = useState<'png' | 'pdf' | 'nav' | null>(null);

  // Sincroniza dados externos, restaurando última data salva se aplicável
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      // Restaurar do storage na abertura, se houver
      if (storageKey && onRequestDate) {
        try {
          const iso = localStorage.getItem(storageKey);
          if (iso) {
            const saved = new Date(iso);
            if (!isNaN(saved.getTime())) {
              const restored = await onRequestDate(saved);
              if (!cancelled) { setCurrent(restored); return; }
            }
          }
        } catch { /* ignore */ }
      }
      if (!cancelled) setCurrent(data);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Se o data prop mudar enquanto aberto (novo clique), reflete
  useEffect(() => {
    if (open && data) setCurrent(data);
  }, [data, open]);

  // Persiste data consultada
  useEffect(() => {
    if (!storageKey || !current?.targetDate) return;
    try { localStorage.setItem(storageKey, current.targetDate.toISOString()); } catch { /* ignore */ }
  }, [current?.targetDate, storageKey]);

  const navigate = useCallback(async (nextDate: Date) => {
    if (!onRequestDate) return;
    setBusy('nav');
    try {
      const nd = await onRequestDate(nextDate);
      setCurrent(nd);
    } finally {
      setBusy(null);
    }
  }, [onRequestDate]);

  const isNight = current?.shiftStart
    ? current.shiftStart.getHours() >= 19 || current.shiftStart.getHours() < 7
    : false;
  const PeriodIcon = isNight ? Moon : Sun;
  const periodLabel = isNight ? 'Noturno' : 'Diurno';

  const durationH = current?.shiftStart && current?.shiftEnd
    ? Math.max(0, Math.round((current.shiftEnd.getTime() - current.shiftStart.getTime()) / 3_600_000))
    : null;
  const restH = current?.restStart && current?.restEnd
    ? Math.max(0, differenceInHours(current.restEnd, current.restStart))
    : null;

  const inRest = current?.restStart && current?.restEnd && now >= current.restStart && now < current.restEnd;
  const onShift = current?.shiftStart && current?.shiftEnd && now >= current.shiftStart && now < current.shiftEnd;
  const beforeShift = current?.shiftStart && now < current.shiftStart;

  const filenameBase = current
    ? `jornada-${format(current.targetDate, 'yyyy-MM-dd')}`
    : 'jornada';

  const captureCanvas = async () => {
    const el = printRef.current;
    if (!el) throw new Error('conteúdo indisponível');
    const html2canvas = (await import('html2canvas')).default;
    // Força uma largura mínima de captura para garantir legibilidade no PDF
    // mesmo quando o diálogo é aberto em telas estreitas (mobile).
    const targetWidth = Math.max(el.offsetWidth, 720);
    return html2canvas(el, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true,
      logging: false,
      width: targetWidth,
      windowWidth: targetWidth,
    });
  };

  const loadLogoDataUrl = async (): Promise<string | null> => {
    try {
      const res = await fetch(logoAsset.url);
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const handleSharePng = async () => {
    if (!current) return;
    setBusy('png');
    try {
      const canvas = await captureCanvas();
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('falha ao gerar PNG');
      const file = new File([blob], `${filenameBase}.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: 'Jornada', text: 'Detalhes da jornada' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filenameBase}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast({ title: 'Imagem baixada', description: 'Envie a imagem para seus colegas.' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao gerar imagem', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!current) return;
    setBusy('pdf');
    try {
      const [canvas, logoDataUrl] = await Promise.all([
        captureCanvas(),
        loadLogoDataUrl(),
      ]);
      const { jsPDF } = await import('jspdf');
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 32;
      const maxW = pageW - margin * 2;

      // ---------- Cabeçalho institucional ----------
      const headerH = 56;
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, pageW, headerH, 'F');
      pdf.setDrawColor(245, 158, 11); // amber-500
      pdf.setLineWidth(1.5);
      pdf.line(0, headerH, pageW, headerH);

      if (logoDataUrl) {
        try {
          pdf.addImage(logoDataUrl, 'PNG', margin, 12, 32, 32);
        } catch { /* logo opcional */ }
      }
      pdf.setTextColor(245, 158, 11);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('PLANTÃO PRO', margin + (logoDataUrl ? 42 : 0), 28);
      pdf.setTextColor(226, 232, 240); // slate-200
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text('Relatório oficial de jornada', margin + (logoDataUrl ? 42 : 0), 42);

      // Data à direita
      pdf.setTextColor(148, 163, 184); // slate-400
      pdf.setFontSize(9);
      const dateText = format(current.targetDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      pdf.text(dateText, pageW - margin, 34, { align: 'right' });

      // ---------- Imagem da jornada (com paginação se necessário) ----------
      pdf.setTextColor(0, 0, 0);
      const contentTop = headerH + 20;
      const contentBottom = pageH - margin - 18;
      const availableH = contentBottom - contentTop;
      const ratio = canvas.height / canvas.width;
      const imgW = maxW;
      const fullImgH = imgW * ratio;

      if (fullImgH <= availableH) {
        pdf.addImage(imgData, 'PNG', margin, contentTop, imgW, fullImgH);
      } else {
        // Fatia a captura em páginas A4 sem cortar visualmente o conteúdo
        const pageSliceH = (availableH * canvas.width) / imgW;
        let renderedY = 0;
        let firstPage = true;
        while (renderedY < canvas.height) {
          const sliceH = Math.min(pageSliceH, canvas.height - renderedY);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext('2d');
          if (!ctx) break;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(canvas, 0, renderedY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const sliceData = sliceCanvas.toDataURL('image/png');
          const sliceRenderH = (sliceH * imgW) / canvas.width;
          if (!firstPage) pdf.addPage();
          pdf.addImage(sliceData, 'PNG', margin, contentTop, imgW, sliceRenderH);
          renderedY += sliceH;
          firstPage = false;
        }
      }

      // ---------- Rodapé em cada página ----------
      const pageCount = pdf.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        pdf.setPage(p);
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(
          `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • Plantão Pro`,
          margin, pageH - margin / 2,
        );
        pdf.text(`Pág. ${p}/${pageCount}`, pageW - margin, pageH - margin / 2, { align: 'right' });
      }

      pdf.save(`${filenameBase}.pdf`);
      toast({ title: 'PDF gerado', description: 'Download iniciado.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao gerar PDF', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const canNavigate = !!onRequestDate && !!current;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-300">
            <Clock className="h-4 w-4" />
            Jornada • {current ? format(current.targetDate, "EEEE, dd 'de' MMMM", { locale: ptBR }) : '—'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Detalhamento do ciclo folga → plantão com horários completos.
          </DialogDescription>
        </DialogHeader>

        {/* Navegação de datas */}
        {canNavigate && (
          <div className="flex items-center justify-between rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1.5">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                title="Mês anterior"
                disabled={busy === 'nav'}
                onClick={() => current && navigate(subMonths(current.targetDate, 1))}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                title="Dia anterior"
                disabled={busy === 'nav'}
                onClick={() => current && navigate(subDays(current.targetDate, 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="text-[11px] tabular-nums text-slate-300 font-medium flex items-center gap-1.5">
              {busy === 'nav' && <Loader2 className="h-3 w-3 animate-spin" />}
              {current && format(current.targetDate, "dd/MM/yyyy", { locale: ptBR })}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                title="Próximo dia"
                disabled={busy === 'nav'}
                onClick={() => current && navigate(addDays(current.targetDate, 1))}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                title="Próximo mês"
                disabled={busy === 'nav'}
                onClick={() => current && navigate(addMonths(current.targetDate, 1))}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Conteúdo capturável */}
        <div ref={printRef} className="bg-slate-900 p-1 rounded">
          {!current || (!current.shiftStart && !current.restStart) ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 text-amber-400 flex-shrink-0" />
              <div className="text-xs text-slate-300 leading-relaxed">
                {current?.emptyMessage ??
                  'Sem plantão cadastrado para este dia. Revise o cadastro do agente (data do primeiro plantão e escala).'}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {beforeShift && current.shiftStart && (
                <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2.5">
                  <Timer className="h-4 w-4 text-emerald-300" />
                  <div className="text-xs">
                    <div className="font-bold text-emerald-300">
                      Plantão em {fmtCountdown(current.shiftStart, now)}
                    </div>
                    <div className="text-[10px] text-emerald-200/70">
                      Início às {format(current.shiftStart, 'HH:mm')}
                    </div>
                  </div>
                </div>
              )}
              {onShift && current.shiftEnd && (
                <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-2.5 animate-pulse">
                  <Timer className="h-4 w-4 text-red-300" />
                  <div className="text-xs">
                    <div className="font-bold text-red-300">Em plantão agora</div>
                    <div className="text-[10px] text-red-200/70">
                      Termina em {fmtCountdown(current.shiftEnd, now)}
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-md border border-slate-700 bg-slate-800/60 p-3 space-y-3">
                {current.restStart && current.restEnd && restH !== null && (
                  <div className={cn('flex items-start gap-2', inRest && 'ring-1 ring-emerald-400/40 rounded p-1.5 -m-1.5')}>
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 flex-shrink-0">
                      <Palmtree className="h-3 w-3 text-emerald-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">
                        Descanso operacional {inRest && '• em curso'}
                      </div>
                      <div className="text-sm font-bold text-slate-100 tabular-nums">
                        {format(current.restStart, 'HH:mm')} → {format(current.restEnd, 'HH:mm')}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {restH}h de descanso • {format(current.restStart, 'dd/MM', { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="ml-3 border-l border-dashed border-slate-600 h-2" />

                {current.shiftStart && current.shiftEnd && durationH !== null && (
                  <div className={cn('flex items-start gap-2', onShift && 'ring-1 ring-red-400/40 rounded p-1.5 -m-1.5')}>
                    <div
                      className={cn(
                        'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border flex-shrink-0',
                        isNight
                          ? 'bg-indigo-500/20 border-indigo-500/40'
                          : 'bg-amber-500/20 border-amber-500/40'
                      )}
                    >
                      <PeriodIcon className={cn('h-3 w-3', isNight ? 'text-indigo-300' : 'text-amber-300')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          'text-[10px] uppercase font-bold tracking-wider',
                          isNight ? 'text-indigo-300' : 'text-amber-300'
                        )}
                      >
                        Plantão {periodLabel} {onShift && '• em curso'}
                      </div>
                      <div className="text-sm font-bold text-slate-100 tabular-nums">
                        {format(current.shiftStart, 'HH:mm')} → {format(current.shiftEnd, 'HH:mm')}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {durationH}h de plantão {isNight ? '(atravessa a madrugada)' : ''}
                        {current.scaleLabel && ` • Escala ${current.scaleLabel}`}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-md border border-slate-700 bg-slate-800/40 p-2.5 text-[11px] leading-relaxed text-slate-300 space-y-1.5">
                <div>
                  <span className="font-semibold text-amber-300">Como interpretar:</span>{' '}
                  o <span className="font-semibold text-emerald-300">descanso operacional</span> é
                  o período em que o agente está fora de escala, entre o fim de um plantão e o
                  início do próximo.
                </div>
                <div>
                  O plantão de <span className="font-semibold">24 horas</span> corresponde ao ciclo
                  contínuo de <span className="tabular-nums">07:00</span> de um dia até{' '}
                  <span className="tabular-nums">07:00</span> do dia seguinte. É classificado como{' '}
                  <span className="font-semibold text-amber-300">Diurno</span> quando ocorre entre{' '}
                  <span className="tabular-nums">07:00 e 19:00</span>, e como{' '}
                  <span className="font-semibold text-indigo-300">Noturno</span> quando inicia às{' '}
                  <span className="tabular-nums">19:00</span> e se encerra às{' '}
                  <span className="tabular-nums">07:00</span> do dia seguinte. Este plantão é{' '}
                  <span className="font-semibold">{periodLabel}</span>.
                </div>
                {current.scaleLabel && (
                  <div>
                    A escala <span className="font-semibold">{current.scaleLabel}</span> indica a
                    proporção entre horas de plantão e horas de descanso.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ações de exportação */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <Button
            variant="outline" size="sm"
            className="h-8 text-xs border-slate-700 bg-slate-800/60 hover:bg-slate-800"
            onClick={handleSharePng}
            disabled={!current || busy !== null}
          >
            {busy === 'png' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5 mr-1.5" />}
            Compartilhar PNG
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-amber-500/90 hover:bg-amber-500 text-slate-900"
            onClick={handleDownloadPdf}
            disabled={!current || busy !== null}
          >
            {busy === 'pdf' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-1.5" />}
            Baixar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
