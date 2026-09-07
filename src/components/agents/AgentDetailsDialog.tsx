import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useOnlineAgents } from '@/hooks/useOnlineAgents';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Shield, Snowflake, Sun, KeyRound, ArrowRightLeft, Loader2,
  Mail, Phone, Building2, IdCard, User as UserIcon, Radio, Circle
} from 'lucide-react';

interface AgentDetails {
  id: string;
  name: string;
  cpf: string | null;
  matricula: string | null;
  email: string | null;
  phone: string | null;
  team: string | null;
  position: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_frozen: boolean | null;
  license_status: string | null;
  license_expires_at: string | null;
  updated_at: string | null;
  unit: { id: string; name: string; municipality: string | null } | null;
}

interface Props {
  agentId: string | null;
  open: boolean;
  onClose: () => void;
  canManage?: boolean;
  onTransferClick?: (agentId: string) => void;
}

export function AgentDetailsDialog({ agentId, open, onClose, canManage = false, onTransferClick }: Props) {
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const online = useOnlineAgents();

  useEffect(() => {
    if (!open || !agentId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('agents')
      .select('id, name, cpf, matricula, email, phone, team, position, avatar_url, is_active, is_frozen, license_status, license_expires_at, updated_at, unit:units(id, name, municipality)')
      .eq('id', agentId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error('Erro ao carregar agente');
          console.error(error);
        } else {
          setAgent(data as any);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, agentId]);

  const isOnline = agent ? online.has(agent.id) : false;

  const handleFreeze = async (freeze: boolean) => {
    if (!agent) return;
    setActionLoading(freeze ? 'freeze' : 'unfreeze');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('toggle_agent_freeze', {
        p_agent_id: agent.id,
        p_freeze: freeze,
        p_admin_id: user?.id ?? agent.id,
      });
      if (error) throw error;
      toast.success(freeze ? 'Acesso congelado' : 'Acesso liberado');
      setAgent({ ...agent, is_frozen: freeze });
    } catch (err: any) {
      toast.error(err.message || 'Falha na operação');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtend = async (months: number) => {
    if (!agent) return;
    setActionLoading('extend');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.rpc('extend_license', {
        p_agent_id: agent.id,
        p_months: months,
        p_admin_id: user?.id ?? agent.id,
      });
      if (error) throw error;
      toast.success(`Licença estendida por ${months} ${months === 1 ? 'mês' : 'meses'}`);
      setAgent({ ...agent, license_expires_at: data as string, license_status: 'active', is_frozen: false });
    } catch (err: any) {
      toast.error(err.message || 'Falha ao estender licença');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    if (!agent?.email && !agent?.cpf) return;
    setActionLoading('reset');
    try {
      const email = agent.email || `${agent.cpf}@agent.plantaopro.com`;
      const { error } = await supabase.functions.invoke('admin-operations', {
        body: { action: 'reset_password', agent_id: agent.id, email },
      });
      if (error) throw error;
      toast.success('Solicitação de reset enviada');
    } catch (err: any) {
      toast.error(err.message || 'Falha ao resetar senha');
    } finally {
      setActionLoading(null);
    }
  };

  const initials = agent?.name?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() ?? '?';
  const lastSeen = agent?.updated_at
    ? formatDistanceToNow(parseISO(agent.updated_at), { locale: ptBR, addSuffix: true })
    : '—';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Shield className="h-5 w-5" /> Ficha do Agente
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Informações operacionais e ações administrativas.
          </DialogDescription>
        </DialogHeader>

        {loading || !agent ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-4 rounded-lg border border-zinc-700 bg-zinc-950/60 p-4">
              <Avatar className="h-16 w-16 border-2 border-amber-500/40">
                <AvatarImage src={agent.avatar_url ?? undefined} />
                <AvatarFallback className="bg-zinc-800 text-amber-400 font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-zinc-100 truncate">{agent.name}</h3>
                  <Badge className={isOnline ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-zinc-700/40 text-zinc-400 border-zinc-600'}>
                    <Circle className={`h-2 w-2 mr-1 ${isOnline ? 'fill-emerald-400 text-emerald-400' : 'fill-zinc-500 text-zinc-500'}`} />
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </Badge>
                  {agent.team && (
                    <Badge variant="outline" className="border-cyan-500/40 text-cyan-400">
                      {agent.team}
                    </Badge>
                  )}
                  {agent.is_frozen && (
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40">
                      <Snowflake className="h-3 w-3 mr-1" /> Congelado
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                  <Radio className="h-3 w-3" /> Último ping: <span className="text-zinc-300 font-mono">{lastSeen}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {agent.position ?? 'Agente'} • Matrícula {agent.matricula ?? '—'}
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <InfoRow icon={<IdCard className="h-4 w-4" />} label="CPF" value={agent.cpf ?? '—'} />
              <InfoRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={agent.email ?? '—'} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={agent.phone ?? '—'} />
              <InfoRow icon={<Building2 className="h-4 w-4" />} label="Unidade" value={agent.unit ? `${agent.unit.name}${agent.unit.municipality ? ` — ${agent.unit.municipality}` : ''}` : '—'} />
              <InfoRow icon={<UserIcon className="h-4 w-4" />} label="Status" value={agent.is_active ? 'Ativo' : 'Inativo'} />
              <InfoRow icon={<Shield className="h-4 w-4" />} label="Licença" value={
                agent.license_expires_at
                  ? `${agent.license_status ?? 'active'} • ${format(parseISO(agent.license_expires_at), 'dd/MM/yyyy', { locale: ptBR })}`
                  : (agent.license_status ?? '—')
              } />
            </div>

            {canManage && (
              <>
                <Separator className="bg-zinc-700" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Ações Administrativas
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {agent.is_frozen ? (
                      <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" disabled={actionLoading === 'unfreeze'} onClick={() => handleFreeze(false)}>
                        {actionLoading === 'unfreeze' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sun className="h-3 w-3 mr-1" />}
                        Descongelar
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10" disabled={actionLoading === 'freeze'} onClick={() => handleFreeze(true)}>
                        {actionLoading === 'freeze' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Snowflake className="h-3 w-3 mr-1" />}
                        Congelar
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10" disabled={actionLoading === 'extend'} onClick={() => handleExtend(1)}>
                      {actionLoading === 'extend' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Shield className="h-3 w-3 mr-1" />}
                      +1 Mês
                    </Button>
                    <Button size="sm" variant="outline" className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10" disabled={actionLoading === 'reset'} onClick={handleResetPassword}>
                      {actionLoading === 'reset' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <KeyRound className="h-3 w-3 mr-1" />}
                      Reset Senha
                    </Button>
                    <Button size="sm" variant="outline" className="border-violet-500/40 text-violet-400 hover:bg-violet-500/10" onClick={() => onTransferClick?.(agent.id)}>
                      <ArrowRightLeft className="h-3 w-3 mr-1" />
                      Transferir
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2">
      <div className="text-amber-500 mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
        <p className="text-sm text-zinc-100 truncate">{value}</p>
      </div>
    </div>
  );
}
