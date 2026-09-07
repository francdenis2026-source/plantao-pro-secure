import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SignatureCanvas } from '@/components/ui/signature-canvas';
import { notify } from '@/lib/notify';
import { ArrowRightLeft, Plus, Loader2, Check, X, Clock, User, FileText, Download, ArrowLeft, CalendarDays, Sparkles, Edit2, Eye, Trash2, PenTool } from 'lucide-react';
import { EmptyState } from '@/components/ui/data-states';
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface SwapRequestsCardProps {
  agentId: string;
  unitId: string | null;
  team: string | null;
}

interface SwapRequest {
  id: string;
  requester_id: string;
  target_id: string;
  requester_shift_id: string;
  target_shift_id: string | null;
  status: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
  requester?: { name: string; matricula?: string; phone?: string; cpf?: string };
  target?: { name: string; matricula?: string; phone?: string; cpf?: string };
  requester_shift?: { shift_date: string; start_time: string; end_time: string };
  target_shift?: { shift_date: string; start_time: string; end_time: string };
}

interface AgentShift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
}

interface TeamAgent {
  id: string;
  name: string;
  matricula: string | null;
  phone: string | null;
}

// Template reasons for swap requests
const REASON_TEMPLATES = [
  { id: 'personal', label: '📋 Compromisso pessoal', text: 'Solicito permuta devido a compromisso pessoal inadiável na data do meu plantão.' },
  { id: 'medical', label: '🏥 Consulta médica', text: 'Solicito permuta para realizar consulta médica/exame agendado previamente.' },
  { id: 'family', label: '👨‍👩‍👧 Motivo familiar', text: 'Solicito permuta por motivo familiar que requer minha presença.' },
  { id: 'academic', label: '📚 Compromisso acadêmico', text: 'Solicito permuta devido a compromisso acadêmico (prova, aula, apresentação).' },
  { id: 'travel', label: '✈️ Viagem', text: 'Solicito permuta pois estarei em viagem na data do plantão.' },
  { id: 'other', label: '📝 Outro motivo', text: '' },
];

export function SwapRequestsCard({ agentId, unitId, team }: SwapRequestsCardProps) {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [myShifts, setMyShifts] = useState<AgentShift[]>([]);
  const [teamAgents, setTeamAgents] = useState<TeamAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [previewRequest, setPreviewRequest] = useState<SwapRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<SwapRequest | null>(null);
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [reason, setReason] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [customDate, setCustomDate] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [requesterSignature, setRequesterSignature] = useState<string>('');
  const [targetSignature, setTargetSignature] = useState<string>('');
  const [signatureType, setSignatureType] = useState<'requester' | 'target'>('requester');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx'>('pdf');
  const [exportingRequestId, setExportingRequestId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelingRequestId, setCancelingRequestId] = useState<string | null>(null);
  const [editableDocumentText, setEditableDocumentText] = useState<string>('');
  const [isEditingDocument, setIsEditingDocument] = useState(false);
  const { showNotification, playTacticalSound } = usePushNotifications();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch swap requests with agent data including CPF
      const { data: requests, error: requestsError } = await (supabase as any)
        .from('shift_swaps')
        .select(`
          *,
          requester:agents!requester_id(name, matricula, phone, cpf),
          target:agents!target_id(name, matricula, phone, cpf),
          requester_shift:agent_shifts!requester_shift_id(shift_date, start_time, end_time),
          target_shift:agent_shifts!target_shift_id(shift_date, start_time, end_time)
        `)
        .or(`requester_id.eq.${agentId},target_id.eq.${agentId}`)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setSwapRequests((requests || []) as SwapRequest[]);

      // Fetch unit name
      if (unitId) {
        const { data: unitData } = await supabase
          .from('units')
          .select('name')
          .eq('id', unitId)
          .single();
        if (unitData) setUnitName(unitData.name);
      }

      // Fetch my future shifts
      const today = new Date().toISOString().split('T')[0];
      const { data: shifts, error: shiftsError } = await (supabase as any)
        .from('agent_shifts')
        .select('id, shift_date, start_time, end_time')
        .eq('agent_id', agentId)
        .gte('shift_date', today)
        .order('shift_date')
        .limit(30);

      if (shiftsError) throw shiftsError;
      setMyShifts((shifts || []) as AgentShift[]);

      // Fetch team agents
      if (unitId) {
        const { data: agents, error: agentsError } = await supabase
          .from('agents')
          .select('id, name, matricula, phone')
          .eq('unit_id', unitId)
          .eq('is_active', true)
          .neq('id', agentId)
          .order('name');

        if (agentsError) throw agentsError;
        setTeamAgents(agents || []);
      }
    } catch (error) {
      console.error('Error fetching swap data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, unitId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription for swap requests
  useEffect(() => {
    const channel = supabase
      .channel(`swap-requests-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_swaps',
          filter: `requester_id=eq.${agentId}`,
        },
        (payload) => {
          handleRealtimeUpdate(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_swaps',
          filter: `target_id=eq.${agentId}`,
        },
        (payload) => {
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const handleRealtimeUpdate = async (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT') {
      if (newRecord.target_id === agentId) {
        playTacticalSound?.('notification');
        showNotification?.({
          title: '📋 Nova Solicitação de Permuta',
          body: 'Você recebeu uma nova solicitação de permuta de plantão',
          tag: `swap-${newRecord.id}`,
        });
        notify.success('Nova solicitação de permuta recebida!');
      }
      fetchData();
    } else if (eventType === 'UPDATE') {
      if (newRecord.requester_id === agentId && oldRecord?.status !== newRecord.status) {
        if (newRecord.status === 'accepted') {
          playTacticalSound?.('success');
          showNotification?.({
            title: '✅ Permuta Aceita!',
            body: 'Sua solicitação de permuta foi aceita',
            tag: `swap-${newRecord.id}`,
          });
          notify.success('Sua permuta foi aceita!');
        } else if (newRecord.status === 'rejected') {
          playTacticalSound?.('alert');
          showNotification?.({
            title: '❌ Permuta Recusada',
            body: 'Sua solicitação de permuta foi recusada',
            tag: `swap-${newRecord.id}`,
          });
          notify.error('Sua permuta foi recusada');
        }
      }
      fetchData();
    } else if (eventType === 'DELETE') {
      fetchData();
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = REASON_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setReason(template.text);
    }
  };

  const createSwapRequest = async () => {
    if (!selectedShift || !selectedAgent) {
      notify.error('Selecione o plantão e o agente');
      return;
    }

    try {
      setIsSubmitting(true);

      const { error: swapError } = await (supabase as any)
        .from('shift_swaps')
        .insert({
          requester_id: agentId,
          target_id: selectedAgent,
          requester_shift_id: selectedShift,
          reason: reason || null,
          status: 'pending'
        });

      if (swapError) throw swapError;

      // Create notification for target agent
      await (supabase as any)
        .from('notifications')
        .insert({
          agent_id: selectedAgent,
          type: 'swap',
          title: 'Nova solicitação de permuta',
          content: reason || 'Você recebeu uma solicitação de permuta de plantão'
        });

      notify.success('Solicitação de permuta enviada!');
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating swap request:', error);
      notify.error('Erro ao enviar solicitação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateSwapRequest = async () => {
    if (!editingRequest) return;

    try {
      setIsSubmitting(true);

      const { error } = await (supabase as any)
        .from('shift_swaps')
        .update({
          reason: reason,
          requester_shift_id: selectedShift || editingRequest.requester_shift_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingRequest.id);

      if (error) throw error;

      notify.success('Permuta atualizada com sucesso!');
      setShowEditDialog(false);
      setEditingRequest(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error updating swap request:', error);
      notify.error('Erro ao atualizar permuta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowNewRequest(false);
    setSelectedShift('');
    setSelectedAgent('');
    setReason('');
    setSelectedTemplate('');
    setCustomDate(undefined);
  };

  const openEditDialog = (request: SwapRequest) => {
    setEditingRequest(request);
    setReason(request.reason || '');
    setSelectedShift(request.requester_shift_id);
    setShowEditDialog(true);
  };

  // Open cancel confirmation dialog
  const openCancelConfirm = (requestId: string) => {
    setCancelingRequestId(requestId);
    setShowCancelConfirm(true);
  };

  // Cancel a pending swap request
  const cancelSwapRequest = async () => {
    if (!cancelingRequestId) return;
    
    try {
      const { error } = await (supabase as any)
        .from('shift_swaps')
        .delete()
        .eq('id', cancelingRequestId);

      if (error) throw error;

      notify.success('Solicitação de permuta cancelada!');
      setShowCancelConfirm(false);
      setCancelingRequestId(null);
      fetchData();
    } catch (error) {
      console.error('Error canceling swap:', error);
      notify.error('Erro ao cancelar permuta');
    }
  };

  // Show document preview
  const showPreview = (request: SwapRequest) => {
    setPreviewRequest(request);
    const generatedText = generateFormalDocument(request);
    setEditableDocumentText(generatedText);
    setIsEditingDocument(false);
    setShowDocumentPreview(true);
  };

  // Generate formal document content
  const generateFormalDocument = (request: SwapRequest) => {
    const now = new Date();
    const requesterShiftDate = request.requester_shift?.shift_date 
      ? parseISO(request.requester_shift.shift_date)
      : null;
    const targetShiftDate = request.target_shift?.shift_date
      ? parseISO(request.target_shift.shift_date)
      : null;

    return `REQUERIMENTO DE PERMUTA DE PLANTÃO

AO DIRETOR DA UNIDADE SOCIOEDUCATIVA
Instituto Socioeducativo do Acre – ISE/AC

Assunto: Solicitação de Permuta de Plantão (Agentes da Mesma Unidade)

1. IDENTIFICAÇÃO DOS AGENTES

AGENTE SOLICITANTE (Requerente)

Nome Completo: ${request.requester?.name || '_______________________________________________'}

Matrícula: ${request.requester?.matricula || '_______________________'}

CPF: ${request.requester?.cpf || '____________________________'}

Cargo: Agente Socioeducativo

Unidade Socioeducativa de Lotação: ${unitName || '_____________________________'}

Plantão a ser permutado: ${requesterShiftDate ? format(requesterShiftDate, 'dd/MM/yyyy', { locale: ptBR }) : '__/__/____'} às 07h até ${requesterShiftDate ? format(addDays(requesterShiftDate, 1), 'dd/MM/yyyy', { locale: ptBR }) : '__/__/____'} às 07h

AGENTE SOLICITADO

Nome Completo: ${request.target?.name || '_______________________________________________'}

Matrícula: ${request.target?.matricula || '_______________________'}

CPF: ${request.target?.cpf || '____________________________'}

Cargo: Agente Socioeducativo

Unidade Socioeducativa de Lotação: ${unitName || '_____________________________'}

Plantão correspondente: ${targetShiftDate ? format(targetShiftDate, 'dd/MM/yyyy', { locale: ptBR }) : '__/__/____'} às 07h até ${targetShiftDate ? format(addDays(targetShiftDate, 1), 'dd/MM/yyyy', { locale: ptBR }) : '__/__/____'} às 07h

2. OBJETO DO REQUERIMENTO

Os agentes acima identificados, lotados na mesma Unidade Socioeducativa, solicitam, de comum acordo e de livre e espontânea vontade, a permuta de plantão, observando que:

A permuta refere-se a plantão de 24 horas, com início às 07h de um dia e término às 07h do dia seguinte;

Não há alteração de unidade de lotação, apenas troca de datas de plantão;

Ambos os agentes possuem cargo e atribuições compatíveis.

MOTIVO DA SOLICITAÇÃO:
${request.reason || 'Não informado'}

3. DATA DE COMPENSAÇÃO

Data prevista para compensação do plantão: __/__/____
(Em caso de mais de uma data, especificar abaixo)

4. DECLARAÇÃO DOS AGENTES

Declaramos estar cientes de que:

A permuta está condicionada à anuência da Direção da Unidade;

A permuta não gera ônus financeiro para a Administração Pública;

Permanecemos responsáveis pelo cumprimento integral do plantão assumido;

O descumprimento do plantão acordado implicará as responsabilidades administrativas cabíveis.

5. LOCAL E DATA

______________________________________, _____ de __________________ de ${now.getFullYear()}.

6. ASSINATURAS

Agente Solicitante:
Assinatura: ___________________________________________

Agente Solicitado:
Assinatura: ___________________________________________

7. CIÊNCIA E AUTORIZAÇÃO DA DIREÇÃO

Após análise, ( ) DEFIRO ( ) INDEFIRO o presente requerimento.

Diretor(a) da Unidade Socioeducativa:
Nome: _______________________________________________
Assinatura: __________________________________________
Data: __/__/____

================================
Documento gerado pelo PlantãoPro
ID da Solicitação: ${request.id.slice(0, 8)}
Status: ${request.status === 'accepted' ? 'ACEITA' : request.status === 'pending' ? 'PENDENTE' : 'RECUSADA'}
Data de geração: ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
`;
  };

  // Export formal document as PDF
  const exportFormalDocumentPDF = async (request: SwapRequest) => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const now = new Date();
      const requesterShiftDate = request.requester_shift?.shift_date 
        ? parseISO(request.requester_shift.shift_date)
        : null;
      const targetShiftDate = request.target_shift?.shift_date
        ? parseISO(request.target_shift.shift_date)
        : null;
      
      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('REQUERIMENTO DE PERMUTA DE PLANTÃO', 105, 20, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('AO DIRETOR DA UNIDADE SOCIOEDUCATIVA', 105, 30, { align: 'center' });
      doc.text('Instituto Socioeducativo do Acre – ISE/AC', 105, 36, { align: 'center' });
      
      // Section 1 - Identification
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('1. IDENTIFICAÇÃO DOS AGENTES', 14, 50);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('AGENTE SOLICITANTE (Requerente)', 14, 60);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Nome Completo: ${request.requester?.name || '___'}`, 14, 68);
      doc.text(`Matrícula: ${request.requester?.matricula || '___'}`, 14, 74);
      doc.text(`CPF: ${request.requester?.cpf || '___'}`, 14, 80);
      doc.text(`Unidade: ${unitName || '___'}`, 14, 86);
      doc.text(`Plantão: ${requesterShiftDate ? format(requesterShiftDate, 'dd/MM/yyyy', { locale: ptBR }) : '__/__/____'} às 07h`, 14, 92);
      
      doc.setFont('helvetica', 'bold');
      doc.text('AGENTE SOLICITADO', 14, 104);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Nome Completo: ${request.target?.name || '___'}`, 14, 112);
      doc.text(`Matrícula: ${request.target?.matricula || '___'}`, 14, 118);
      doc.text(`CPF: ${request.target?.cpf || '___'}`, 14, 124);
      doc.text(`Plantão: ${targetShiftDate ? format(targetShiftDate, 'dd/MM/yyyy', { locale: ptBR }) : '__/__/____'} às 07h`, 14, 130);
      
      // Section 2 - Object
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('2. OBJETO DO REQUERIMENTO', 14, 145);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const objectText = doc.splitTextToSize(
        'Os agentes acima identificados solicitam, de comum acordo, a permuta de plantão. A permuta refere-se a plantão de 24 horas.',
        180
      );
      doc.text(objectText, 14, 153);
      
      doc.setFont('helvetica', 'bold');
      doc.text('MOTIVO:', 14, 168);
      doc.setFont('helvetica', 'normal');
      const motivo = doc.splitTextToSize(request.reason || 'Não informado', 180);
      doc.text(motivo, 14, 176);
      
      // Section 3 - Signatures
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('6. ASSINATURAS', 14, 200);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Agente Solicitante: ___________________________________', 14, 212);
      doc.text('Agente Solicitado: ___________________________________', 14, 226);
      doc.text('Diretor(a): ___________________________________________', 14, 240);
      doc.text(`Data: __/__/${now.getFullYear()}`, 14, 254);
      
      // Footer
      doc.setFontSize(8);
      doc.text(`Documento gerado pelo PlantãoPro - ID: ${request.id.slice(0, 8)}`, 105, 280, { align: 'center' });
      doc.text(`Status: ${request.status === 'accepted' ? 'ACEITA' : 'PENDENTE'} | ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 105, 285, { align: 'center' });
      
      doc.save(`requerimento_permuta_${request.id.slice(0, 8)}_${format(now, 'yyyy-MM-dd')}.pdf`);
      notify.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      notify.error('Erro ao gerar PDF');
    }
  };

  // Export as DOCX (plain text format for Word compatibility)
  const exportFormalDocumentDOCX = (request: SwapRequest) => {
    // Use edited text if available, otherwise generate
    const content = editableDocumentText || generateFormalDocument(request);
    const blob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `requerimento_permuta_${request.id.slice(0, 8)}_${format(new Date(), 'yyyy-MM-dd')}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify.success('Documento exportado!');
  };

  // Export formal document with format selection
  const exportFormalDocument = async (request: SwapRequest) => {
    setExportingRequestId(request.id);
    if (exportFormat === 'pdf') {
      await exportFormalDocumentPDF(request);
    } else {
      exportFormalDocumentDOCX(request);
    }
    setExportingRequestId(null);
  };

  const respondToRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await (supabase as any)
        .from('shift_swaps')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      const request = swapRequests.find(r => r.id === requestId);
      if (request) {
        await (supabase as any)
          .from('notifications')
          .insert({
            agent_id: request.requester_id,
            type: 'swap',
            title: status === 'accepted' ? 'Permuta aceita!' : 'Permuta recusada',
            content: status === 'accepted'
              ? 'Sua solicitação de permuta foi aceita'
              : 'Sua solicitação de permuta foi recusada'
          });
      }

      notify.success(status === 'accepted' ? 'Permuta aceita!' : 'Permuta recusada');
      fetchData();
    } catch (error) {
      console.error('Error responding to swap:', error);
      notify.error('Erro ao responder solicitação');
    }
  };

  const exportSwapDocument = async () => {
    setIsExporting(true);
    try {
      const { data: currentAgent } = await supabase
        .from('agents')
        .select('name, matricula, phone, email, team')
        .eq('id', agentId)
        .single();

      const acceptedSwaps = swapRequests.filter(r => r.status === 'accepted');
      const now = new Date();

      const docContent = `
DOCUMENTO DE PERMUTA DE PLANTÃO
================================
PlantãoPro - Sistema de Escalas Operacionais
Gerado em: ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}

DADOS DO SOLICITANTE
--------------------
Nome: ${currentAgent?.name || 'N/A'}
Matrícula: ${currentAgent?.matricula || 'N/A'}
Telefone: ${currentAgent?.phone || 'N/A'}
Email: ${currentAgent?.email || 'N/A'}
Equipe: ${currentAgent?.team || 'N/A'}

PERMUTAS REALIZADAS (${acceptedSwaps.length})
------------------------------------------
${acceptedSwaps.length === 0 ? 'Nenhuma permuta aceita registrada.\n' : 
  acceptedSwaps.map((swap, idx) => `
${idx + 1}. PERMUTA #${swap.id.slice(0, 8)}
   Status: ACEITA
   Data da Solicitação: ${format(parseISO(swap.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
   
   Solicitante: ${swap.requester?.name || 'N/A'} (Mat: ${swap.requester?.matricula || 'N/A'})
   Plantão Original: ${swap.requester_shift?.shift_date ? format(parseISO(swap.requester_shift.shift_date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
   Horário: ${swap.requester_shift?.start_time || '07:00'} às ${swap.requester_shift?.end_time || '07:00'}
   
   Permutado com: ${swap.target?.name || 'N/A'} (Mat: ${swap.target?.matricula || 'N/A'})
   Telefone: ${swap.target?.phone || 'N/A'}
   
   Motivo: ${swap.reason || 'Não informado'}
`).join('\n')}

HISTÓRICO COMPLETO (${swapRequests.length})
------------------------------------------
${swapRequests.map((swap, idx) => `
${idx + 1}. PERMUTA #${swap.id.slice(0, 8)}
   Status: ${swap.status === 'pending' ? 'PENDENTE' : swap.status === 'accepted' ? 'ACEITA' : 'RECUSADA'}
   Data: ${format(parseISO(swap.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
   Solicitante: ${swap.requester?.name || 'N/A'}
   Destinatário: ${swap.target?.name || 'N/A'}
   Plantão: ${swap.requester_shift?.shift_date ? format(parseISO(swap.requester_shift.shift_date), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
`).join('\n')}

================================
Documento gerado automaticamente pelo PlantãoPro
© ${now.getFullYear()} - Desenvolvido por FRANC D'NIS
`.trim();

      const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `permutas_${currentAgent?.matricula || agentId.slice(0, 8)}_${format(now, 'yyyy-MM-dd')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notify.success('Documento de permutas exportado!');
      setShowExportDialog(false);
    } catch (error) {
      console.error('Error exporting swaps:', error);
      notify.error('Erro ao exportar documento');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pendente</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Aceita</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Recusada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="card-night-orange bg-gradient-to-br from-[hsl(222,60%,3%)] via-[hsl(222,55%,5%)] to-[hsl(25,40%,8%)] border-3 border-orange-500/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  const pendingForMe = swapRequests.filter(r => r.target_id === agentId && r.status === 'pending');
  const myRequests = swapRequests.filter(r => r.requester_id === agentId);

  return (
    <Card className="card-night-orange bg-gradient-to-br from-[hsl(222,60%,3%)] via-[hsl(222,55%,5%)] to-[hsl(25,40%,8%)] border-3 border-orange-500/50 overflow-hidden transition-all duration-300 hover:border-orange-400/70 group relative">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardHeader className="pb-4 relative">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-3 text-xl md:text-2xl">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-500/20 border border-orange-500/40">
              <ArrowRightLeft className="h-6 w-6 md:h-7 md:w-7 text-orange-400" />
            </div>
            <span className="font-bold bg-gradient-to-r from-orange-200 to-amber-300 bg-clip-text text-transparent">
              Permutas de Plantão
            </span>
            {pendingForMe.length > 0 && (
              <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 shadow-lg shadow-red-500/30 px-3 py-1">
                {pendingForMe.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {/* Export Button */}
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-2 border-slate-500/50 text-slate-300 bg-slate-500/10 hover:bg-slate-500/20 hover:border-slate-400/70 transition-all duration-200 font-semibold">
                  <FileText className="h-4 w-4 mr-1.5" />
                  Exportar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-white">
                    <Download className="h-5 w-5 text-orange-400" />
                    Exportar Documento de Permutas
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Gera um documento com seus dados e histórico de permutas.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg space-y-2">
                    <p className="text-sm text-slate-300 font-medium">O documento incluirá:</p>
                    <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
                      <li>Seus dados pessoais (nome, matrícula, contato)</li>
                      <li>Permutas aceitas com detalhes completos</li>
                      <li>Histórico de todas as solicitações</li>
                    </ul>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-2xl font-bold text-green-400">{swapRequests.filter(r => r.status === 'accepted').length}</p>
                      <p className="text-xs text-slate-400">Aceitas</p>
                    </div>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <p className="text-2xl font-bold text-amber-400">{swapRequests.length}</p>
                      <p className="text-xs text-slate-400">Total</p>
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowExportDialog(false)} className="border-slate-600 text-slate-300">
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Voltar
                  </Button>
                  <Button onClick={exportSwapDocument} disabled={isExporting} className="bg-orange-500 hover:bg-orange-600 text-white">
                    {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                    Baixar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* New Request Dialog */}
            <Dialog open={showNewRequest} onOpenChange={(open) => { if (!open) resetForm(); setShowNewRequest(open); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-2 border-orange-500/50 text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 hover:border-orange-400/70 transition-all duration-200 font-semibold">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Nova Permuta
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-white">
                    <ArrowRightLeft className="h-5 w-5 text-orange-400" />
                    Solicitar Permuta
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Selecione o plantão, colega e descreva o motivo.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {/* Shift Selection */}
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-amber-400" />
                      Meu Plantão
                    </Label>
                    <Select value={selectedShift} onValueChange={setSelectedShift}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Selecione o plantão" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600 max-h-[200px]">
                        {myShifts.length === 0 ? (
                          <SelectItem value="none" disabled>Nenhum plantão disponível</SelectItem>
                        ) : (
                          myShifts.map((shift) => (
                            <SelectItem key={shift.id} value={shift.id}>
                              {format(parseISO(shift.shift_date), "dd/MM/yyyy (EEE)", { locale: ptBR })} • {shift.start_time}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Agent Selection */}
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-400" />
                      Permutar com
                    </Label>
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Selecione o agente" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600 max-h-[200px]">
                        {teamAgents.length === 0 ? (
                          <SelectItem value="none" disabled>Nenhum agente disponível</SelectItem>
                        ) : (
                          teamAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name} {agent.matricula && `(${agent.matricula})`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reason Templates */}
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      Modelo de Motivo
                    </Label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Escolha um modelo (opcional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {REASON_TEMPLATES.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reason Text */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Motivo da Permuta</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Descreva o motivo da permuta..."
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 resize-none min-h-[100px]"
                      rows={4}
                    />
                    <p className="text-xs text-slate-500">
                      Você pode editar o texto gerado ou escrever seu próprio motivo.
                    </p>
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-4">
                  <Button variant="outline" onClick={resetForm} className="border-slate-600 text-slate-300">
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Voltar
                  </Button>
                  <Button
                    onClick={createSwapRequest}
                    disabled={!selectedShift || !selectedAgent || isSubmitting}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Solicitar Permuta
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Pending requests for me */}
        {pendingForMe.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Aguardando sua resposta
            </h4>
            <div className="space-y-2">
              {pendingForMe.map((request) => (
                <div key={request.id} className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-medium">{request.requester?.name}</span> quer permutar
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Plantão: {request.requester_shift?.shift_date && 
                          format(parseISO(request.requester_shift.shift_date), "dd/MM/yyyy (EEE)", { locale: ptBR })
                        }
                      </p>
                      {request.reason && (
                        <p className="text-xs text-slate-300 mt-1 italic line-clamp-2">"{request.reason}"</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => respondToRequest(request.id, 'accepted')} className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => respondToRequest(request.id, 'rejected')} className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My requests */}
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-2">Minhas Solicitações</h4>
          {myRequests.length === 0 ? (
            <EmptyState
              icon={ArrowRightLeft}
              title="Nenhuma solicitação ainda"
              description="Você ainda não pediu nenhuma permuta. Crie uma solicitação para trocar de plantão com outro agente da equipe."
              action={
                <button
                  type="button"
                  onClick={() => setShowNewRequest(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-orange-500/50 bg-orange-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-orange-300 transition-all hover:bg-orange-500/20 hover:border-orange-400/70 focus-ring-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Solicitar Permuta
                </button>
              }
            />
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
              {myRequests.map((request) => (
                <div key={request.id} className="p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-white truncate">{request.target?.name}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {request.requester_shift?.shift_date && 
                          format(parseISO(request.requester_shift.shift_date), "dd/MM/yyyy (EEE)", { locale: ptBR })
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 relative z-10">
                      {/* Preview document button */}
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); showPreview(request); }} 
                        className="h-8 w-8 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-600 transition-colors cursor-pointer" 
                        title="Visualizar documento"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {/* Edit button - only for pending and requester */}
                      {request.status === 'pending' && request.requester_id === agentId && (
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(request); }} 
                          className="h-8 w-8 flex items-center justify-center rounded-md text-blue-400 hover:text-white hover:bg-blue-600 transition-colors cursor-pointer" 
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      
                      {/* Cancel button - only for pending and requester */}
                      {request.status === 'pending' && request.requester_id === agentId && (
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openCancelConfirm(request.id); }} 
                          className="h-8 w-8 flex items-center justify-center rounded-md text-red-400 hover:text-white hover:bg-red-600 transition-colors cursor-pointer" 
                          title="Cancelar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      
                      {/* Export button - available for all statuses */}
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); showPreview(request); }} 
                        className="h-8 w-8 flex items-center justify-center rounded-md text-green-400 hover:text-white hover:bg-green-600 transition-colors cursor-pointer" 
                        title="Exportar PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setEditingRequest(null); resetForm(); } setShowEditDialog(open); }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Edit2 className="h-5 w-5 text-blue-400" />
              Editar Permuta
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Altere o plantão ou motivo da solicitação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Change Shift */}
            <div className="space-y-2">
              <Label className="text-slate-300">Alterar Plantão</Label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Selecione outro plantão (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 max-h-[200px]">
                  {myShifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {format(parseISO(shift.shift_date), "dd/MM/yyyy (EEE)", { locale: ptBR })} • {shift.start_time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason Templates */}
            <div className="space-y-2">
              <Label className="text-slate-300">Modelo de Motivo</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Escolha um modelo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {REASON_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label className="text-slate-300">Motivo</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo..."
                className="bg-slate-700 border-slate-600 text-white resize-none"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="border-slate-600 text-slate-300">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Voltar
            </Button>
            <Button onClick={updateSwapRequest} disabled={isSubmitting} className="bg-blue-500 hover:bg-blue-600 text-white">
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar Alterações
            </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog with Digital Signature */}
      <Dialog open={showDocumentPreview} onOpenChange={(open) => { 
        if (!open) { 
          setRequesterSignature(''); 
          setTargetSignature(''); 
        } 
        setShowDocumentPreview(open); 
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <FileText className="h-5 w-5 text-amber-400" />
              Documento de Permuta
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Visualização do requerimento formal com assinatura digital
            </DialogDescription>
          </DialogHeader>
          {previewRequest && (
            <div className="space-y-4">
              {/* Document Text - Editable or Read-only */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Texto do Documento</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingDocument) {
                        setIsEditingDocument(false);
                      } else {
                        setEditableDocumentText(generateFormalDocument(previewRequest));
                        setIsEditingDocument(true);
                      }
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    {isEditingDocument ? 'Visualizar' : 'Editar Texto'}
                  </button>
                </div>
                
                {isEditingDocument ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editableDocumentText}
                      onChange={(e) => setEditableDocumentText(e.target.value)}
                      className="bg-slate-900/50 border-slate-600/50 text-slate-300 text-[10px] font-mono min-h-[30vh] resize-y"
                      placeholder="Edite o texto do documento..."
                    />
                    <button
                      type="button"
                      onClick={() => setEditableDocumentText(generateFormalDocument(previewRequest))}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Restaurar texto original
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-900/50 border border-slate-600/50 rounded-lg p-3 max-h-[30vh] overflow-y-auto">
                    <pre className="text-[10px] text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {editableDocumentText || generateFormalDocument(previewRequest)}
                    </pre>
                  </div>
                )}
              </div>
              
              {/* Digital Signatures Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
                  <PenTool className="h-4 w-4" />
                  Assinaturas Digitais
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Requester Signature */}
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400 font-medium">
                      Agente Solicitante: {previewRequest.requester?.name}
                    </div>
                    {requesterSignature ? (
                      <div className="border-2 border-green-500/30 rounded-lg p-2 bg-white">
                        <img src={requesterSignature} alt="Assinatura Solicitante" className="max-h-20 mx-auto" />
                        <div className="text-[10px] text-center text-green-600 mt-1">✓ Assinado</div>
                      </div>
                    ) : previewRequest.requester_id === agentId ? (
                      <SignatureCanvas
                        label=""
                        width={250}
                        height={80}
                        onSave={(sig) => setRequesterSignature(sig)}
                      />
                    ) : (
                      <div className="border-2 border-dashed border-slate-500 rounded-lg p-4 text-center">
                        <span className="text-xs text-slate-500 italic">Aguardando assinatura</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Target Signature */}
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400 font-medium">
                      Agente Solicitado: {previewRequest.target?.name}
                    </div>
                    {targetSignature ? (
                      <div className="border-2 border-green-500/30 rounded-lg p-2 bg-white">
                        <img src={targetSignature} alt="Assinatura Solicitado" className="max-h-20 mx-auto" />
                        <div className="text-[10px] text-center text-green-600 mt-1">✓ Assinado</div>
                      </div>
                    ) : previewRequest.target_id === agentId ? (
                      <SignatureCanvas
                        label=""
                        width={250}
                        height={80}
                        onSave={(sig) => setTargetSignature(sig)}
                      />
                    ) : (
                      <div className="border-2 border-dashed border-slate-500 rounded-lg p-4 text-center">
                        <span className="text-xs text-slate-500 italic">Aguardando assinatura</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Formato:</span>
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'pdf' | 'docx')}>
                    <SelectTrigger className="w-24 h-8 text-xs bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="docx">DOCX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <Badge className={previewRequest.status === 'accepted' ? 'bg-green-500/20 text-green-400' : previewRequest.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}>
                    {previewRequest.status === 'accepted' ? 'Aceita' : previewRequest.status === 'pending' ? 'Pendente' : 'Recusada'}
                  </Badge>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowDocumentPreview(false)} className="border-slate-600 text-slate-300">
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                      Voltar
                    </Button>
                    {/* Edit button for pending requests */}
                    {previewRequest.status === 'pending' && previewRequest.requester_id === agentId && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => { setShowDocumentPreview(false); openEditDialog(previewRequest); }} 
                        className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                      >
                        <Edit2 className="h-4 w-4 mr-1.5" />
                        Editar
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      onClick={() => { exportFormalDocument(previewRequest); }} 
                      disabled={exportingRequestId === previewRequest.id}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      {exportingRequestId === previewRequest.id ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-1.5" />
                      )}
                      Exportar {exportFormat.toUpperCase()}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm z-[100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Trash2 className="h-5 w-5 text-red-400" />
              Cancelar Permuta
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Tem certeza que deseja cancelar esta solicitação?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => { setShowCancelConfirm(false); setCancelingRequestId(null); }} 
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Voltar
            </Button>
            <Button 
              type="button"
              onClick={() => { cancelSwapRequest(); }} 
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
