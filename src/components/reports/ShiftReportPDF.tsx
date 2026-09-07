import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2, Download } from 'lucide-react';
// jsPDF + autoTable são carregados sob demanda (dynamic import) para não pesar no bundle inicial.
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Unit {
  id: string;
  name: string;
  municipality: string;
}

interface ShiftReportPDFProps {
  units: Unit[];
}

const teams = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'];
const months = [
  { value: '0', label: 'Janeiro' },
  { value: '1', label: 'Fevereiro' },
  { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Maio' },
  { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' },
  { value: '10', label: 'Novembro' },
  { value: '11', label: 'Dezembro' },
];

export function ShiftReportPDF({ units }: ShiftReportPDFProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const generatePDF = async () => {
    if (!selectedUnit || !selectedTeam) {
      toast({
        title: 'Atenção',
        description: 'Selecione a unidade e a equipe.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get selected unit info
      const unit = units.find(u => u.id === selectedUnit);
      if (!unit) throw new Error('Unidade não encontrada');

      // Calculate date range
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      const startDate = format(startOfMonth(new Date(year, month)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month)), 'yyyy-MM-dd');

      // Fetch agents for this unit and team
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('id, name, matricula')
        .eq('unit_id', selectedUnit)
        .eq('team', selectedTeam)
        .eq('is_active', true)
        .order('name');

      if (agentsError) throw agentsError;

      if (!agents || agents.length === 0) {
        toast({
          title: 'Sem dados',
          description: 'Nenhum agente encontrado para esta unidade e equipe.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Fetch shifts for these agents in the date range
      const agentIds = agents.map(a => a.id);
      const { data: shifts, error: shiftsError } = await supabase
        .from('agent_shifts')
        .select('*')
        .in('agent_id', agentIds)
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)
        .order('shift_date');

      if (shiftsError) throw shiftsError;

      // Create PDF — libs carregadas sob demanda
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF();
      const monthName = months.find(m => m.value === selectedMonth)?.label || '';

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DE ESCALAS', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`${monthName} de ${selectedYear}`, 105, 28, { align: 'center' });

      // Unit and Team info
      doc.setFontSize(10);
      doc.text(`Unidade: ${unit.name}`, 14, 40);
      doc.text(`Município: ${unit.municipality}`, 14, 46);
      doc.text(`Equipe: ${selectedTeam}`, 14, 52);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 58);

      // Prepare table data
      const tableData = agents.map(agent => {
        const agentShifts = shifts?.filter(s => s.agent_id === agent.id) || [];
        const totalHours = agentShifts.reduce((acc, shift) => {
          const start = new Date(`2000-01-01T${shift.start_time}`);
          const end = new Date(`2000-01-01T${shift.end_time}`);
          let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          // 24x72 plantão: quando o horário de fim é igual ao início, significa 24h.
          // Também cobre virada de dia (horas negativas).
          if (hours === 0) hours = 24;
          if (hours < 0) hours += 24;
          return acc + hours;
        }, 0);

        return [
          agent.name,
          agent.matricula || '-',
          agentShifts.length.toString(),
          `${totalHours.toFixed(1)}h`,
        ];
      });

      // Generate table
      autoTable(doc, {
        startY: 65,
        head: [['Nome', 'Matrícula', 'Plantões', 'Total Horas']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 35, halign: 'center' },
        },
      });

      // Shift details
      if (shifts && shifts.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 65;
        
        doc.addPage();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('DETALHAMENTO DE ESCALAS', 105, 20, { align: 'center' });

        const detailData = shifts.map(shift => {
          const agent = agents.find(a => a.id === shift.agent_id);
          return [
            format(parseISO(shift.shift_date), 'dd/MM/yyyy', { locale: ptBR }),
            agent?.name || '-',
            shift.start_time.slice(0, 5),
            shift.end_time.slice(0, 5),
            shift.shift_type || '-',
            shift.notes || '-',
          ];
        });

        autoTable(doc, {
          startY: 30,
          head: [['Data', 'Agente', 'Início', 'Fim', 'Tipo', 'Observações']],
          body: detailData,
          theme: 'grid',
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold',
          },
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
        });
      }

      // Footer on each page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `PlantaoPro - Desenvolvido por CS FEIJÓ | Página ${i} de ${pageCount}`,
          105,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      // Download PDF
      const fileName = `escalas_${unit.name.replace(/\s+/g, '_')}_${selectedTeam}_${monthName}_${selectedYear}.pdf`;
      doc.save(fileName);

      toast({
        title: 'PDF Gerado!',
        description: 'O relatório foi baixado com sucesso.',
      });

      setOpen(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o relatório.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Gerar Relatório PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Gerar Relatório de Escalas
          </DialogTitle>
          <DialogDescription>
            Selecione o período, unidade e equipe para gerar o relatório em PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Month and Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Unit */}
          <div className="space-y-2">
            <Label>Unidade</Label>
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="bg-input">
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name} - {unit.municipality}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Team */}
          <div className="space-y-2">
            <Label>Equipe</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="bg-input">
                <SelectValue placeholder="Selecione a equipe" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {teams.map((team) => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-gradient-primary hover:opacity-90"
              onClick={generatePDF}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
