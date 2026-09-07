import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileDown, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
// jsPDF + autoTable são carregados sob demanda (dynamic import) para não pesar no bundle inicial.

interface Props {
  agentId: string;
  agentName?: string;
  team?: string | null;
  unitName?: string | null;
}

export function ShiftSchedulePDFExport({ agentId, agentName, team, unitName }: Props) {
  const [month, setMonth] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const from = format(startOfMonth(month), 'yyyy-MM-dd');
      const to = format(endOfMonth(month), 'yyyy-MM-dd');

      const [{ data: shifts }, { data: leaves }] = await Promise.all([
        supabase
          .from('agent_shifts')
          .select('shift_date, start_time, end_time, status, is_vacation, notes, shift_type')
          .eq('agent_id', agentId)
          .gte('shift_date', from)
          .lte('shift_date', to)
          .order('shift_date', { ascending: true }),
        supabase
          .from('agent_leaves')
          .select('start_date, end_date, leave_type, status')
          .eq('agent_id', agentId)
          .eq('status', 'approved')
          .lte('start_date', to)
          .gte('end_date', from),
      ]);

      const rows: string[][] = [];
      const dates = new Set<string>();

      (shifts || []).forEach((s: any) => {
        dates.add(s.shift_date);
        const isVac = s.is_vacation || s.status === 'vacation';
        const kind = isVac
          ? 'Folga/Férias'
          : s.shift_type === 'night'
            ? 'Plantão Noturno'
            : 'Plantão';
        rows.push([
          format(new Date(s.shift_date + 'T12:00:00'), 'dd/MM/yyyy (EEE)', { locale: ptBR }),
          kind,
          isVac ? '—' : (s.start_time?.slice(0, 5) || '--:--'),
          isVac ? '—' : (s.end_time?.slice(0, 5) || '--:--'),
          s.status ?? '—',
          s.notes ?? '',
        ]);
      });

      (leaves || []).forEach((l: any) => {
        if (dates.has(l.start_date)) return;
        rows.push([
          `${format(new Date(l.start_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })} → ${format(new Date(l.end_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}`,
          `Folga: ${l.leave_type}`,
          '—',
          '—',
          l.status,
          '',
        ]);
      });

      rows.sort((a, b) => a[0].localeCompare(b[0]));

      // Build PDF — libs carregadas sob demanda
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(24, 24, 27);
      doc.rect(0, 0, pageWidth, 70, 'F');
      doc.setTextColor(245, 158, 11);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('ESCALA MENSAL — PLANTÃO PRO', 40, 32);
      doc.setTextColor(228, 228, 231);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(
        `Mês: ${format(month, "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}`,
        40,
        52,
      );

      // Agent info
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(10);
      let y = 92;
      if (agentName) {
        doc.setFont('helvetica', 'bold');
        doc.text('Agente:', 40, y);
        doc.setFont('helvetica', 'normal');
        doc.text(agentName, 90, y);
        y += 14;
      }
      if (team) {
        doc.setFont('helvetica', 'bold');
        doc.text('Equipe:', 40, y);
        doc.setFont('helvetica', 'normal');
        doc.text(team, 90, y);
        y += 14;
      }
      if (unitName) {
        doc.setFont('helvetica', 'bold');
        doc.text('Unidade:', 40, y);
        doc.setFont('helvetica', 'normal');
        doc.text(unitName, 90, y);
        y += 14;
      }
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        40,
        y,
      );

      // Table
      autoTable(doc, {
        startY: y + 14,
        head: [['Data', 'Tipo', 'Início', 'Fim', 'Status', 'Observações']],
        body: rows.length > 0 ? rows : [['—', 'Sem registros no mês', '—', '—', '—', '']],
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 6, textColor: [30, 30, 30] },
        headStyles: {
          fillColor: [24, 24, 27],
          textColor: [245, 158, 11],
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [246, 246, 246] },
        columnStyles: {
          0: { cellWidth: 130 },
          1: { cellWidth: 100 },
          2: { cellWidth: 55, halign: 'center' },
          3: { cellWidth: 55, halign: 'center' },
          4: { cellWidth: 70, halign: 'center' },
          5: { cellWidth: 'auto' },
        },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Plantão Pro • Página ${i} de ${pageCount}`,
          pageWidth - 40,
          doc.internal.pageSize.getHeight() - 20,
          { align: 'right' },
        );
      }

      const filename = `escala-${format(month, 'yyyy-MM')}-${(agentName || 'agente').replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error('[ShiftSchedulePDFExport]', err);
      toast.error('Falha ao gerar PDF da escala.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
          <FileDown className="h-4 w-4" />
          Exportar Escala PDF
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-zinc-900 border-zinc-700 text-zinc-100" align="end">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-amber-400">Escala Mensal</p>
            <p className="text-xs text-zinc-400">Selecione o mês e gere o PDF.</p>
          </div>
          <div className="flex items-center justify-between rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setMonth((m) => subMonths(m, 1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize">
              {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={generate}
            disabled={loading}
            className="w-full bg-amber-500 text-black hover:bg-amber-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" /> Baixar PDF
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
