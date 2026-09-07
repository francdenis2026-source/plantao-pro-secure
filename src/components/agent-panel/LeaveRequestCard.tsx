import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { notify } from '@/lib/notify';
import { CalendarOff, Loader2, Trash2, Palmtree, Stethoscope, Star, GraduationCap, CalendarPlus, Users, User, MessageCircle, FileDown } from 'lucide-react';
import { EmptyState } from '@/components/ui/data-states';
import { format, parseISO, differenceInDays, isAfter, startOfDay, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TeamMemberDialog } from './TeamMemberDialog';
import leaveDialogBg_ptr from '@/assets/leave-dialog-bg.jpg.asset.json';
const leaveDialogBg = (leaveDialogBg_ptr as {url:string}).url;

interface LeaveRequestCardProps {
  agentId: string;
  agentTeam?: string | null;
  agentUnitId?: string | null;
}

interface AgentLeave {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  created_at: string;
  agent_id?: string;
}

interface TeamMemberLeave extends AgentLeave {
  agent_name: string;
  agent_avatar_url?: string | null;
  agent_phone?: string | null;
  agent_role?: string | null;
  agent_blood_type?: string | null;
  agent_birth_date?: string | null;
  agent_address?: string | null;
  agent_email?: string | null;
}

const leaveTypes = [
  { value: 'special', label: 'Folga Especial', icon: Star, color: 'text-amber-400', bgColor: 'bg-amber-500/20 border-amber-500/30' },
  { value: 'vacation', label: 'Férias', icon: Palmtree, color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30' },
  { value: 'medical', label: 'Licença Médica', icon: Stethoscope, color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30' },
  { value: 'training', label: 'Treinamento', icon: GraduationCap, color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30' },
];

const PERIODS = [
  { v: '24h' as const, l: '24 horas', emoji: '🕛', hours: 24, start: '07:00', end: '07:00', hint: '24h corridas' },
  { v: '12h' as const, l: '12 horas', emoji: '⏱️', hours: 12, start: '07:00', end: '19:00', hint: 'sob demanda' },
  { v: 'dia' as const, l: 'Diurno', emoji: '🌅', hours: 12, start: '07:00', end: '19:00', hint: '07h → 19h' },
  { v: 'noite' as const, l: 'Noturno', emoji: '🌙', hours: 12, start: '19:00', end: '07:00', hint: '19h → 07h' },
];
const PERIOD_MAP = Object.fromEntries(PERIODS.map(p => [p.v, p])) as Record<string, typeof PERIODS[number]>;

// Handles midnight-crossing (ex: 19:00→07:00 = 12h) and multi-day ranges
function computeHours(start: string, end: string, days = 1): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60; // crosses midnight or full 24h cycle
  return +((diff / 60) * Math.max(days, 1)).toFixed(2);
}

const leaveTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  vacation: { label: 'Férias', icon: <Palmtree className="h-4 w-4" />, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  medical: { label: 'Licença Médica', icon: <Stethoscope className="h-4 w-4" />, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  special: { label: 'Folga Especial', icon: <Star className="h-4 w-4" />, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  training: { label: 'Treinamento', icon: <GraduationCap className="h-4 w-4" />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  approved: { label: 'Aprovado', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  rejected: { label: 'Rejeitado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export function LeaveRequestCard({ agentId, agentTeam, agentUnitId }: LeaveRequestCardProps) {
  const [leaves, setLeaves] = useState<AgentLeave[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<TeamMemberLeave[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedType, setSelectedType] = useState('special');
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '12h' | 'dia' | 'noite'>('24h');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [leaveDates, setLeaveDates] = useState<Date[]>([]);
  const [teamLeaveDates, setTeamLeaveDates] = useState<Date[]>([]);
  const [leaveDescription, setLeaveDescription] = useState('');
  const [activeTab, setActiveTab] = useState('minhas');

  const [selectedTeamDate, setSelectedTeamDate] = useState<Date | undefined>();
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [detailsDate, setDetailsDate] = useState<Date | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  useEffect(() => {
    fetchLeaves();
    if (agentTeam && agentUnitId) {
      fetchTeamLeaves();
    }
  }, [agentId, agentTeam, agentUnitId]);

  // Auto-refetch when device reconnects — ensures the UI reflects any
  // change that could not be pushed while offline and clears stale state
  // without requiring a manual reload.
  useEffect(() => {
    const handleOnline = () => {
      fetchLeaves();
      if (agentTeam && agentUnitId) fetchTeamLeaves();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, agentTeam, agentUnitId]);


  const fetchLeaves = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from('agent_leaves')
        .select('*')
        .eq('agent_id', agentId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      
      const leavesData = (data || []) as AgentLeave[];
      setLeaves(leavesData);

      const dates: Date[] = [];
      leavesData.forEach(leave => {
        const startDate = parseISO(leave.start_date);
        const endDate = parseISO(leave.end_date);
        let currentDate = startDate;
        while (currentDate <= endDate) {
          dates.push(new Date(currentDate));
          currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
        }
      });
      setLeaveDates(dates);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamLeaves = async () => {
    if (!agentTeam || !agentUnitId) return;
    
    try {
      const { data: teamMembers, error: teamError } = await supabase
        .from('agents')
        .select('id, name, avatar_url, phone, role, blood_type, birth_date, address, email, is_active, team')
        .eq('team', agentTeam)
        .eq('unit_id', agentUnitId)
        .neq('id', agentId);

      if (teamError) throw teamError;

      if (teamMembers && teamMembers.length > 0) {
        const memberIds = teamMembers.map(m => m.id);
        const today = new Date();
        const thirtyDaysLater = addDays(today, 30);
        
        const { data: leavesData, error: leavesError } = await (supabase as any)
          .from('agent_leaves')
          .select('*')
          .in('agent_id', memberIds)
          .gte('end_date', format(today, 'yyyy-MM-dd'))
          .lte('start_date', format(thirtyDaysLater, 'yyyy-MM-dd'))
          .order('start_date', { ascending: true });

        if (leavesError) throw leavesError;

        const leavesWithNames = (leavesData || []).map((leave: any) => {
          const member = teamMembers.find(m => m.id === leave.agent_id);
          return { 
            ...leave, 
            agent_name: member?.name || 'Agente',
            agent_avatar_url: member?.avatar_url || null,
            agent_phone: member?.phone || null,
            agent_role: member?.role || null,
            agent_blood_type: member?.blood_type || null,
            agent_birth_date: member?.birth_date || null,
            agent_address: member?.address || null,
            agent_email: member?.email || null,
            agent_is_active: member?.is_active ?? true,
            agent_team: member?.team || null
          };
        });

        setTeamLeaves(leavesWithNames);

        const teamDates: Date[] = [];
        leavesWithNames.forEach((leave: TeamMemberLeave) => {
          const startDate = parseISO(leave.start_date);
          const endDate = parseISO(leave.end_date);
          let currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            teamDates.push(new Date(currentDate));
            currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
          }
        });
        setTeamLeaveDates(teamDates);
      }
    } catch (error) {
      console.error('Error fetching team leaves:', error);
    }
  };

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return;

    const alreadyRegistered = leaveDates.some(d => isSameDay(d, date));

    if (alreadyRegistered) {
      // Show details dialog for existing leaves on that date
      setDetailsDate(date);
      setShowDetailsDialog(true);
      return;
    }

    setSelectedDate(date);
    setSelectedType('special');
    setSelectedPeriod('24h');
    setLeaveDescription('');
    setShowConfirmDialog(true);
  };

  const handleConfirmLeave = async () => {
    if (!selectedDate) return;

    try {
      setIsSubmitting(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const p = PERIOD_MAP[selectedPeriod];

      const { error } = await (supabase as any)
        .from('agent_leaves')
        .insert({
          agent_id: agentId,
          leave_type: selectedType,
          period: selectedPeriod,
          start_date: dateStr,
          end_date: dateStr,
          start_time: p?.start ?? null,
          end_time: p?.end ?? null,
          hours_count: p ? computeHours(p.start, p.end, 1) : null,
          reason: leaveDescription.trim() || null,
        });

      if (error) throw error;

      const typeLabel = leaveTypes.find(t => t.value === selectedType)?.label || selectedType;
      notify.success(`${typeLabel} registrada para ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}`);
      setShowConfirmDialog(false);
      setSelectedDate(undefined);
      setLeaveDescription('');
      fetchLeaves();
    } catch (error) {
      console.error('Error submitting leave:', error);
      notify.error('Erro ao registrar folga');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (leaveId: string) => {
    setCancelingId(leaveId);
    const toastId = notify.loading('Cancelando folga...');
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('OFFLINE');
      }
      const { error } = await (supabase as any)
        .from('agent_leaves')
        .delete()
        .eq('id', leaveId);

      if (error) throw error;
      notify.success('Folga cancelada com sucesso', { id: toastId, duration: 3500 });
      setConfirmCancelId(null);
      await fetchLeaves();
      // Se a data em detalhes deixou de ter folgas, fecha o diálogo
      if (detailsDate) {
        const stillHas = leaves.some((l) => l.id !== leaveId &&
          startOfDay(detailsDate) >= startOfDay(parseISO(l.start_date)) &&
          startOfDay(detailsDate) <= startOfDay(parseISO(l.end_date)));
        if (!stillHas) setShowDetailsDialog(false);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      const code = err?.code || '';
      let userMsg = 'Não foi possível cancelar a folga. Tente novamente.';
      if (msg === 'OFFLINE' || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('failed to fetch')) {
        userMsg = 'Sem conexão. Verifique sua internet e tente novamente.';
      } else if (code === '42501' || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('rls')) {
        userMsg = 'Você não tem permissão para cancelar esta folga.';
      } else if (code === '23503' || msg.toLowerCase().includes('foreign key')) {
        userMsg = 'Esta folga tem registros vinculados e não pode ser removida.';
      } else if (msg) {
        userMsg = `Falha ao cancelar: ${msg}`;
      }
      console.error('Error deleting leave:', err);
      notify.error(userMsg, { id: toastId, duration: 5000 });
    } finally {
      setCancelingId(null);
    }
  };

  const pendingLeaves = leaves.filter(l => l.status === 'pending');
  const approvedLeaves = leaves.filter(l => l.status === 'approved');

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTableMod: any = await import('jspdf-autotable');
      const autoTable = autoTableMod.default || autoTableMod.autoTable || autoTableMod;

      const [{ data: agent }, { data: shifts }, { data: swaps }] = await Promise.all([
        supabase.from('agents').select('name, cpf, matricula, team').eq('id', agentId).single(),
        (supabase as any).from('agent_shifts').select('shift_date, start_time, end_time, shift_type, status').eq('agent_id', agentId).order('shift_date', { ascending: false }).limit(60),
        (supabase as any).from('shift_swaps').select('*').or(`requester_id.eq.${agentId},receiver_id.eq.${agentId}`).order('created_at', { ascending: false }).limit(30),
      ]);

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const now = new Date();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Header band
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 26, 'F');
      doc.setFillColor(217, 168, 62);
      doc.rect(0, 26, pageW, 1.2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('RELATÓRIO OPERACIONAL — PLANTÕES, FOLGAS E PERMUTAS', pageW / 2, 12, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Emitido em ${format(now, 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, pageW / 2, 19, { align: 'center' });

      doc.setTextColor(20, 20, 20);
      // Identification block
      autoTable(doc, {
        startY: 32,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2, textColor: [20, 20, 20] },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        head: [['Agente', 'CPF', 'Matrícula', 'Equipe']],
        body: [[agent?.name || '-', agent?.cpf || '-', agent?.matricula || '-', agent?.team || '-']],
        margin: { left: 14, right: 14 },
      });

      const section = (title: string) => {
        const y = (doc as any).lastAutoTable.finalY + 6;
        doc.setFillColor(217, 168, 62);
        doc.rect(14, y - 4, pageW - 28, 6, 'F');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(title, 16, y);
        doc.setTextColor(20, 20, 20);
        return y + 2;
      };

      // PLANTÕES
      autoTable(doc, {
        startY: section('PLANTÕES (últimos 60)'),
        theme: 'striped',
        styles: { fontSize: 8.5, cellPadding: 1.8 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        head: [['Data', 'Entrada', 'Saída', 'Tipo', 'Status']],
        body: (shifts || []).map((s: any) => [
          format(parseISO(s.shift_date), 'dd/MM/yyyy'),
          (s.start_time || '').slice(0, 5) || '-',
          (s.end_time || '').slice(0, 5) || '-',
          s.shift_type || '-',
          s.status || '-',
        ]),
        margin: { left: 14, right: 14 },
      });

      // FOLGAS
      autoTable(doc, {
        startY: section('FOLGAS'),
        theme: 'striped',
        styles: { fontSize: 8.5, cellPadding: 1.8 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        head: [['Data', 'Período', 'Entrada', 'Saída', 'Horas', 'Tipo', 'Status']],
        body: leaves.map((l: any) => {
          const p = PERIOD_MAP[l.period];
          const start = l.start_time?.slice(0, 5) || p?.start || '-';
          const end = l.end_time?.slice(0, 5) || p?.end || '-';
          const days = Math.max(1, differenceInDays(parseISO(l.end_date), parseISO(l.start_date)) + 1);
          const hours = l.hours_count ?? (p ? computeHours(p.start, p.end, days) : '-');
          const dateLabel = l.start_date === l.end_date
            ? format(parseISO(l.start_date), 'dd/MM/yyyy')
            : `${format(parseISO(l.start_date), 'dd/MM')}→${format(parseISO(l.end_date), 'dd/MM/yy')}`;
          return [
            dateLabel,
            p?.l || l.period || '-',
            start,
            end,
            `${hours}h`,
            leaveTypeLabels[l.leave_type]?.label || l.leave_type,
            statusLabels[l.status]?.label || l.status,
          ];
        }),
        margin: { left: 14, right: 14 },
      });

      // PERMUTAS
      autoTable(doc, {
        startY: section('PERMUTAS'),
        theme: 'striped',
        styles: { fontSize: 8.5, cellPadding: 1.8 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        head: [['Data Original', 'Data Troca', 'Tipo', 'Status']],
        body: (swaps || []).map((sw: any) => [
          sw.original_date ? format(parseISO(sw.original_date), 'dd/MM/yyyy') : '-',
          sw.swap_date ? format(parseISO(sw.swap_date), 'dd/MM/yyyy') : '-',
          sw.requester_id === agentId ? 'Solicitante' : 'Receptor',
          sw.status || '-',
        ]),
        margin: { left: 14, right: 14 },
      });

      // Signature block — always at bottom of last page
      let sigY = (doc as any).lastAutoTable.finalY + 20;
      if (sigY > pageH - 55) {
        doc.addPage();
        sigY = 40;
      }
      doc.setDrawColor(120, 120, 120);
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(`Feijó/AC, ${format(now, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, pageW / 2, sigY, { align: 'center' });
      sigY += 22;

      const sigW = 70;
      const leftX = pageW / 2 - sigW - 10;
      const rightX = pageW / 2 + 10;
      // Agente
      doc.line(leftX, sigY, leftX + sigW, sigY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(agent?.name || 'Agente', leftX + sigW / 2, sigY + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Mat.: ${agent?.matricula || '-'}`, leftX + sigW / 2, sigY + 10, { align: 'center' });
      doc.text('Assinatura do Agente', leftX + sigW / 2, sigY + 15, { align: 'center' });
      // Chefia
      doc.line(rightX, sigY, rightX + sigW, sigY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Chefia Imediata', rightX + sigW / 2, sigY + 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Equipe ${agent?.team || '-'}`, rightX + sigW / 2, sigY + 10, { align: 'center' });
      doc.text('Assinatura e Carimbo', rightX + sigW / 2, sigY + 15, { align: 'center' });

      // Footer with page numbers
      const total = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(120, 120, 120);
        doc.text('Plantão Pro — Documento oficial para conferência e assinatura', 14, pageH - 6);
        doc.text(`Página ${i} de ${total}`, pageW - 14, pageH - 6, { align: 'right' });
      }

      doc.save(`plantoes_${agent?.cpf || agentId}_${format(now, 'yyyyMMdd_HHmm')}.pdf`);
      notify.success('PDF exportado com sucesso');
    } catch (err) {
      console.error('Export PDF error:', err);
      notify.error('Erro ao exportar PDF');
    }
  };


  return (
    <Card className="card-night-purple bg-gradient-to-br from-[hsl(222,60%,3%)] via-[hsl(222,55%,5%)] to-[hsl(270,40%,8%)] border-3 border-purple-500/50 transition-all duration-300 hover:border-purple-400/70 group relative">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardHeader className="pb-4 relative">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/30 to-violet-500/20 border border-purple-500/40">
              <CalendarOff className="h-6 w-6 md:h-7 md:w-7 text-purple-400" />
            </div>
            <span className="font-bold bg-gradient-to-r from-purple-200 to-violet-300 bg-clip-text text-transparent">
              Folgas Programadas
            </span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 gap-1.5"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/80 border-2 border-purple-500/30 rounded-xl p-1.5 h-auto">
            <TabsTrigger value="minhas" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 rounded-lg py-2.5 px-4 font-semibold transition-all duration-200">
              <User className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              <span className="text-sm md:text-base">Minhas Folgas</span>
            </TabsTrigger>
            <TabsTrigger value="equipe" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 rounded-lg py-2.5 px-4 font-semibold transition-all duration-200">
              <Users className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              <span className="text-sm md:text-base">Equipe</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="minhas" className="space-y-4 mt-4">
            {/* Calendar for clicking dates */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarPlus className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-slate-300">Clique na data para registrar folga ou ver detalhes</span>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-2">
                <Calendar
                  mode="single"
                  selected={undefined}
                  month={selectedMonth}
                  onMonthChange={setSelectedMonth}
                  onSelect={handleDateClick}
                  locale={ptBR}
                  modifiers={{ leave: leaveDates }}
                  modifiersStyles={{
                    leave: {
                      backgroundColor: 'rgba(251, 191, 36, 0.3)',
                      color: '#fbbf24',
                      fontWeight: 'bold',
                      borderRadius: '50%'
                    }
                  }}
                  className="rounded-md pointer-events-auto"
                />
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                  <span className="text-slate-400">Dias com folga registrada</span>
                </div>
              </div>
            </div>

            {/* Leaves List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : leaves.length === 0 ? (
              <EmptyState
                icon={CalendarPlus}
                title="Nenhuma folga programada"
                description="Selecione uma data no calendário acima para registrar sua próxima folga, licença ou afastamento."
              />
            ) : (
              <div className="space-y-3">
                {pendingLeaves.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-yellow-400 mb-2">Pendentes de Aprovação</h4>
                    <div className="space-y-2">
                      {pendingLeaves.map((leave) => (
                        <LeaveItem key={leave.id} leave={leave} onDelete={handleDelete} />
                      ))}
                    </div>
                  </div>
                )}
                
                {approvedLeaves.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-400 mb-2">Aprovadas</h4>
                    <div className="space-y-2">
                      {approvedLeaves.map((leave) => (
                        <LeaveItem key={leave.id} leave={leave} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="equipe" className="space-y-4 mt-4">
            {(() => {
              const today = startOfDay(new Date());
              const isInRange = (leave: AgentLeave, d: Date) => {
                const start = startOfDay(parseISO(leave.start_date));
                const end = startOfDay(parseISO(leave.end_date));
                return d >= start && d <= end;
              };

              const teamToday = teamLeaves.filter((l) => isInRange(l, today));
              const selectedDay = selectedTeamDate ? startOfDay(selectedTeamDate) : null;
              const teamSelectedDay = selectedDay ? teamLeaves.filter((l) => isInRange(l, selectedDay)) : [];

              return (
                <>
                  {/* Destaque: hoje */}
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-slate-200">
                          Quem está de folga hoje
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-300">
                        {format(today, 'dd/MM', { locale: ptBR })}
                      </Badge>
                    </div>

                    {teamToday.length === 0 ? (
                      <p className="text-xs text-slate-400 mt-2">Nenhum colega de folga hoje.</p>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        <TooltipProvider delayDuration={200}>
                          {teamToday.map((leave) => {
                            const agentName = (leave as any).agent_name || '';
                            const avatarUrl = (leave as any).agent_avatar_url;
                            const agentPhone = (leave as any).agent_phone;
                            const nameParts = agentName.split(' ');
                            const displayName = nameParts.length > 1 
                              ? `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0)}.`
                              : nameParts[0];
                            const initials = nameParts.length > 1
                              ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`
                              : nameParts[0]?.charAt(0) || '?';
                            const leaveInfo = leaveTypeLabels[leave.leave_type] || { label: leave.leave_type, color: '' };
                            const startDate = format(parseISO(leave.start_date), 'dd/MM', { locale: ptBR });
                            const endDate = format(parseISO(leave.end_date), 'dd/MM', { locale: ptBR });
                            const isSingleDay = leave.start_date === leave.end_date;
                            
                            const handleCardClick = () => {
                              setSelectedMember({
                                id: leave.agent_id,
                                name: agentName,
                                role: (leave as any).agent_role,
                                team: (leave as any).agent_team,
                                blood_type: (leave as any).agent_blood_type,
                                avatar_url: avatarUrl,
                                is_active: (leave as any).agent_is_active ?? true,
                                phone: agentPhone,
                                address: (leave as any).agent_address,
                                birth_date: (leave as any).agent_birth_date,
                                email: (leave as any).agent_email
                              });
                              setShowMemberDialog(true);
                            };
                            
                            return (
                              <Tooltip key={leave.id}>
                                <TooltipTrigger asChild>
                                  <div 
                                    onClick={handleCardClick}
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-br from-slate-700/60 to-slate-800/60 border border-slate-500/30 hover:border-blue-500/50 hover:from-slate-700/80 hover:to-slate-800/80 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md hover:shadow-blue-500/10 active:scale-95"
                                  >
                                    <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center flex-shrink-0 ring-2 ring-slate-400/30 shadow-inner">
                                      {avatarUrl ? (
                                        <img 
                                          src={avatarUrl} 
                                          alt={agentName}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <span className="text-xs font-bold text-white uppercase tracking-tight">{initials}</span>
                                      )}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-semibold text-white leading-tight">{displayName}</span>
                                      <span className={`text-[10px] font-medium ${leaveInfo.color.includes('green') ? 'text-green-400' : leaveInfo.color.includes('red') ? 'text-red-400' : leaveInfo.color.includes('amber') ? 'text-amber-400' : 'text-blue-400'}`}>
                                        {leaveInfo.label}
                                      </span>
                                    </div>
                                    {agentPhone && (
                                      <MessageCircle className="h-3.5 w-3.5 text-green-400 ml-auto" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent 
                                  side="top" 
                                  className="bg-slate-900 border border-slate-700 p-3 max-w-xs shadow-xl"
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <div className="h-6 w-6 rounded-full overflow-hidden bg-slate-600 flex items-center justify-center flex-shrink-0">
                                        {avatarUrl ? (
                                          <img src={avatarUrl} alt={agentName} className="h-full w-full object-cover" />
                                        ) : (
                                          <span className="text-[9px] font-bold text-slate-300 uppercase">{initials}</span>
                                        )}
                                      </div>
                                      <span className="font-bold text-white text-sm">{agentName}</span>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={`${leaveInfo.color} text-[10px] px-1.5 py-0.5`}>
                                          {leaveInfo.label}
                                        </Badge>
                                      </div>
                                      <p className="text-slate-400">
                                        {isSingleDay 
                                          ? `Dia: ${startDate}`
                                          : `Período: ${startDate} até ${endDate}`
                                        }
                                      </p>
                                      {leave.reason && (
                                        <p className="text-slate-500 italic text-[11px]">"{leave.reason}"</p>
                                      )}
                                      <p className="text-blue-400 text-[10px] mt-1">Clique para ver perfil e WhatsApp</p>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </TooltipProvider>
                      </div>
                    )}
                  </div>

                  {/* Team Calendar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-slate-300">Folgas da Equipe (próximos 30 dias)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedTeamDate && (
                          <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                            {format(selectedTeamDate, 'dd/MM', { locale: ptBR })}
                          </Badge>
                        )}
                        {selectedTeamDate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-slate-400 hover:text-slate-200"
                            onClick={() => setSelectedTeamDate(undefined)}
                          >
                            Limpar
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-2">
                      <Calendar
                        mode="single"
                        selected={selectedTeamDate}
                        month={selectedMonth}
                        onMonthChange={setSelectedMonth}
                        onSelect={setSelectedTeamDate}
                        locale={ptBR}
                        modifiers={{ teamLeave: teamLeaveDates }}
                        modifiersStyles={{
                          teamLeave: {
                            backgroundColor: 'rgba(59, 130, 246, 0.3)',
                            color: '#60a5fa',
                            fontWeight: 'bold',
                            borderRadius: '50%'
                          }
                        }}
                        className="rounded-md pointer-events-auto"
                      />
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500/50" />
                        <span className="text-slate-400">Colegas de folga</span>
                      </div>
                      <span className="text-slate-500">Toque em um dia para ver quem sai</span>
                    </div>
                  </div>

                  {/* Team Leaves List */}
                  {selectedDay ? (
                    teamSelectedDay.length === 0 ? (
                      <div className="text-center py-3">
                        <p className="text-slate-400 text-sm">Ninguém de folga nesta data.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {teamSelectedDay.map((leave) => (
                          <div
                            key={leave.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600/50"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-9 w-9 border border-slate-600/60 shrink-0">
                                {leave.agent_avatar_url && <AvatarImage src={leave.agent_avatar_url} alt={leave.agent_name} />}
                                <AvatarFallback className="bg-slate-800 text-amber-300 text-[11px] font-semibold">
                                  {leave.agent_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className={`p-1.5 rounded-md ${leaveTypeLabels[leave.leave_type]?.color || 'bg-slate-600'} shrink-0`}>
                                {leaveTypeLabels[leave.leave_type]?.icon || <Star className="h-3.5 w-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-white truncate">{leave.agent_name}</p>
                                <p className="text-xs text-slate-400 truncate">
                                  {leaveTypeLabels[leave.leave_type]?.label || leave.leave_type}
                                  {leave.agent_role ? ` • ${leave.agent_role}` : ''}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className={statusLabels[leave.status]?.color || ''}>
                              {statusLabels[leave.status]?.label || leave.status}
                            </Badge>
                          </div>

                        ))}
                      </div>
                    )
                  ) : teamLeaves.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="Equipe sem folgas próximas"
                      description="Nenhum membro da equipe possui folga programada nos próximos 30 dias."
                    />
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {teamLeaves.map((leave) => (
                        <div
                          key={leave.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-9 w-9 border border-slate-600/60 shrink-0">
                              {leave.agent_avatar_url && <AvatarImage src={leave.agent_avatar_url} alt={leave.agent_name} />}
                              <AvatarFallback className="bg-slate-800 text-amber-300 text-[11px] font-semibold">
                                {leave.agent_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`p-1.5 rounded-md ${leaveTypeLabels[leave.leave_type]?.color || 'bg-slate-600'} shrink-0`}>
                              {leaveTypeLabels[leave.leave_type]?.icon || <Star className="h-3.5 w-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">{leave.agent_name}</p>
                              <p className="text-xs text-slate-400 truncate">
                                {leaveTypeLabels[leave.leave_type]?.label || leave.leave_type} • {format(parseISO(leave.start_date), "dd/MM", { locale: ptBR })}
                                {leave.start_date !== leave.end_date && ` - ${format(parseISO(leave.end_date), "dd/MM", { locale: ptBR })}`}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className={statusLabels[leave.status]?.color || ''}>
                            {statusLabels[leave.status]?.label || leave.status}
                          </Badge>
                        </div>

                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Confirmation Dialog — Compact / Pro */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-slate-700 bg-slate-950 p-0 gap-0 max-w-md w-[calc(100vw-1rem)] max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden font-['IBM_Plex_Sans',_system-ui,_sans-serif]">


          {/* Header */}
          <DialogHeader className="relative px-4 py-3 border-b border-slate-800/80 bg-slate-950/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2.5">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" />
                <circle cx="12" cy="15" r="1.5" fill="currentColor" />
              </svg>
              <div className="min-w-0">
                <DialogTitle className="text-white text-sm font-semibold tracking-tight leading-tight">
                  Registrar Folga
                </DialogTitle>
                {selectedDate && (
                  <DialogDescription className="text-[11px] text-amber-300/80 font-mono mt-0.5 truncate">
                    {format(selectedDate, "EEE, dd/MM/yyyy", { locale: ptBR })}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="relative flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {selectedDate && (
              <>
                {/* Leave Type */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Tipo</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {leaveTypes.map((type) => {
                      const Icon = type.icon;
                      const active = selectedType === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setSelectedType(type.value)}
                          className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-all ${
                            active
                              ? `border-amber-500/70 ${type.bgColor}`
                              : 'border-slate-700 hover:border-slate-600 bg-slate-800/40'
                          }`}
                        >
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? type.color : 'text-slate-400'}`} />
                          <span className={`text-[11px] font-medium truncate ${active ? type.color : 'text-slate-300'}`}>
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Period */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Período</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PERIODS.map((p) => {
                      const active = selectedPeriod === p.v;
                      const icons: Record<string, JSX.Element> = {
                        '24h': <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
                        '12h': <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 12l3 3"/></svg>,
                        'dia': <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>,
                        'noite': <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/></svg>,
                      };
                      return (
                        <button
                          key={p.v}
                          type="button"
                          onClick={() => setSelectedPeriod(p.v)}
                          className={`flex flex-col items-center gap-0.5 rounded-md border px-1.5 py-2 transition-all ${
                            active
                              ? 'border-amber-500/70 bg-amber-500/15 text-amber-300'
                              : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {icons[p.v]}
                          <span className="text-[10px] font-semibold leading-tight">{p.l}</span>
                          <span className="text-[9px] font-mono opacity-70 leading-tight">{p.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 text-center">
                    {PERIOD_MAP[selectedPeriod]?.start} → {PERIOD_MAP[selectedPeriod]?.end}
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Descrição</Label>
                  <Textarea
                    value={leaveDescription}
                    onChange={(e) => setLeaveDescription(e.target.value)}
                    placeholder="Motivo ou observações (opcional)"
                    className="bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 resize-none text-xs min-h-[56px]"
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>

          {/* Sticky Footer */}
          <DialogFooter className="relative px-4 py-3 border-t border-slate-800/80 bg-slate-950/70 backdrop-blur shrink-0 gap-2 flex-row justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmDialog(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmLeave}
              disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold h-9 text-xs min-w-[130px]"
            >
              {isSubmitting ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Registrando...</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 mr-1.5" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12l5 5L20 7"/></svg>
                  Confirmar Folga
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Leave Details Dialog — Professional */}
      <Dialog open={showDetailsDialog} onOpenChange={(o) => { setShowDetailsDialog(o); if (!o) setConfirmCancelId(null); }}>
        <DialogContent className="max-w-md w-[calc(100vw-1rem)] bg-slate-950 border border-purple-500/30 p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-slate-800 bg-gradient-to-r from-purple-950/60 to-slate-950">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40">
                <CalendarOff className="h-4 w-4 text-purple-300" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-semibold text-white leading-tight">
                  Detalhes da Folga
                </DialogTitle>
                {detailsDate && (
                  <DialogDescription className="text-[11px] text-purple-300/80 font-mono mt-0.5">
                    {format(detailsDate, "EEEE, dd/MM/yyyy", { locale: ptBR })}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto px-4 py-3 space-y-2.5" role="region" aria-live="polite" aria-atomic="false">
            {detailsDate && (() => {
              const dayLeaves = leaves.filter(l => {
                const s = startOfDay(parseISO(l.start_date));
                const e = startOfDay(parseISO(l.end_date));
                const d = startOfDay(detailsDate);
                return d >= s && d <= e;
              });
              if (dayLeaves.length === 0) {
                return <p className="text-sm text-slate-400 text-center py-4">Nenhuma folga encontrada nesta data.</p>;
              }
              return dayLeaves.map((leave: any) => {
                const typeInfo = leaveTypeLabels[leave.leave_type] || { label: leave.leave_type, icon: null, color: '' };
                const statusInfo = statusLabels[leave.status] || { label: leave.status, color: '' };
                const startDate = parseISO(leave.start_date);
                const endDate = parseISO(leave.end_date);
                const days = differenceInDays(endDate, startDate) + 1;
                const p = leave.period ? PERIOD_MAP[leave.period] : null;
                const startTime = leave.start_time?.slice(0, 5) || p?.start || '-';
                const endTime = leave.end_time?.slice(0, 5) || p?.end || '-';
                const hours = leave.hours_count ?? (p ? computeHours(p.start, p.end, days) : null);
                return (
                  <div key={leave.id} className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1.5 rounded-md ${typeInfo.color} shrink-0`}>{typeInfo.icon}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white leading-tight">{typeInfo.label}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {format(startDate, 'dd/MM/yyyy', { locale: ptBR })}
                            {days > 1 && ` → ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`}
                            {` · ${days} dia${days > 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 shrink-0 ${statusInfo.color}`}>
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-800">
                      <div className="text-center">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Entrada</p>
                        <p className="text-xs font-mono text-slate-200 mt-0.5">{startTime}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Saída</p>
                        <p className="text-xs font-mono text-slate-200 mt-0.5">{endTime}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Horas</p>
                        <p className="text-xs font-mono text-amber-300 mt-0.5">{hours != null ? `${hours}h` : '-'}</p>
                      </div>
                    </div>

                    {leave.reason && (
                      <div className="pt-1.5 border-t border-slate-800">
                        <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Motivo</p>
                        <p className="text-xs text-slate-300 italic leading-snug">"{leave.reason}"</p>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-2">
                      <p className="text-[10px] text-slate-500 font-mono">
                        Registrada em {format(parseISO(leave.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                      {leave.status === 'pending' && (
                        confirmCancelId === leave.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-amber-300 font-medium">Confirmar?</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmCancelId(null)}
                              disabled={cancelingId === leave.id}
                              className="h-7 px-2 text-slate-300 hover:bg-slate-800 text-[11px]"
                            >
                              Não
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDelete(leave.id)}
                              disabled={cancelingId === leave.id}
                              className="h-7 px-2 bg-red-500 hover:bg-red-600 text-white text-[11px] min-w-[70px]"
                            >
                              {cancelingId === leave.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>Sim, cancelar</>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmCancelId(leave.id)}
                            disabled={cancelingId !== null}
                            className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[11px] min-h-[36px] active:scale-95 transition-transform"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Cancelar folga
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <DialogFooter className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/70">
            <Button
              autoFocus
              variant="outline"
              size="sm"
              onClick={() => setShowDetailsDialog(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 h-9 text-xs min-w-[80px]"
              aria-label="Fechar detalhes da folga (ou pressione Esc)"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Member Dialog */}
      <TeamMemberDialog 
        member={selectedMember}
        open={showMemberDialog}
        onOpenChange={setShowMemberDialog}
        isCurrentUser={false}
      />
    </Card>
  );
}

function LeaveItem({ leave, onDelete }: { leave: AgentLeave; onDelete?: (id: string) => void }) {
  const typeInfo = leaveTypeLabels[leave.leave_type] || { label: leave.leave_type, icon: null, color: '' };
  const statusInfo = statusLabels[leave.status] || { label: leave.status, color: '' };
  const startDate = parseISO(leave.start_date);
  const endDate = parseISO(leave.end_date);
  const days = differenceInDays(endDate, startDate) + 1;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600/50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${typeInfo.color}`}>
          {typeInfo.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{typeInfo.label}</span>
            <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
              {statusInfo.label}
            </Badge>
          </div>
          <p className="text-sm text-slate-400">
            {format(startDate, "dd/MM", { locale: ptBR })}{days > 1 ? ` - ${format(endDate, "dd/MM/yyyy", { locale: ptBR })}` : `/${format(startDate, "yyyy", { locale: ptBR })}`} ({days} dia{days > 1 ? 's' : ''})
          </p>
          {leave.reason && (
            <p className="text-xs text-slate-500 mt-1 italic">"{leave.reason}"</p>
          )}
        </div>
      </div>
      {leave.status === 'pending' && onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(leave.id)}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
