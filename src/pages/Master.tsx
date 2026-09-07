import { useEffect, useState, lazy, Suspense } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import hudPageBg_ptr from '@/assets/hero-tactical-ops.jpg.asset.json';
const hudPageBg = (hudPageBg_ptr as {url:string}).url;
import { Icon3D, Icon3DAction, type Icon3DName } from '@/components/ui/Icon3D';
const hudBgStyle = { ['--hud-bg-url' as any]: `url(${hudPageBg})` };

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PanelSkeleton } from '@/components/ui/panel-skeleton';
import { SectionBoundary } from '@/components/ui/section-boundary';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Shield, Users, Loader2, Activity, LogOut, Calendar, MapPin, Search, 
  ArrowRightLeft, Pencil, KeyRound, Check, Clock, Ban, UserPlus, 
  FileText, Send, CreditCard, Eye, Lock, Unlock, RefreshCw, 
  Trash2, MessageSquare, DollarSign, History, UserX, Building2, Wallet
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
const TransferApprovalPanel = lazy(() => import('@/components/agents/TransferApprovalPanel').then(m => ({ default: m.TransferApprovalPanel })));

const EditAgentDialog = lazy(() => import('@/components/admin/EditAgentDialog').then(m => ({ default: m.EditAgentDialog })));
const EditUnitDialog = lazy(() => import('@/components/admin/EditUnitDialog').then(m => ({ default: m.EditUnitDialog })));
const DeleteAgentDialog = lazy(() => import('@/components/admin/DeleteAgentDialog').then(m => ({ default: m.DeleteAgentDialog })));

const DeleteUserDialog = lazy(() => import('@/components/admin/DeleteUserDialog').then(m => ({ default: m.DeleteUserDialog })));
const AgentPasswordManager = lazy(() => import('@/components/admin/AgentPasswordManager').then(m => ({ default: m.AgentPasswordManager })));
const CredentialsViewer = lazy(() => import('@/components/admin/CredentialsViewer').then(m => ({ default: m.CredentialsViewer })));
const PasswordRequestsManager = lazy(() => import('@/components/admin/PasswordRequestsManager').then(m => ({ default: m.PasswordRequestsManager })));
const AnnouncementsManager = lazy(() => import('@/components/admin/AnnouncementsManager').then(m => ({ default: m.AnnouncementsManager })));
const SwapManagementPanel = lazy(() => import('@/components/admin/SwapManagementPanel').then(m => ({ default: m.SwapManagementPanel })));
const LicenseFinanceControl = lazy(() => import('@/components/admin/LicenseFinanceControl').then(m => ({ default: m.LicenseFinanceControl })));
const UnitsManagementCard = lazy(() => import('@/components/admin/UnitsManagementCard').then(m => ({ default: m.UnitsManagementCard })));
const AgentAccessControl = lazy(() => import('@/components/admin/AgentAccessControl').then(m => ({ default: m.AgentAccessControl })));
const CadastrosAprovacoesPanel = lazy(() => import('@/components/admin/CadastrosAprovacoesPanel').then(m => ({ default: m.CadastrosAprovacoesPanel })));

const AccessAuditPanel = lazy(() => import('@/components/admin/AccessAuditPanel').then(m => ({ default: m.AccessAuditPanel })));
const AgentsConnectionMonitor = lazy(() => import('@/components/admin/AgentsConnectionMonitor').then(m => ({ default: m.AgentsConnectionMonitor })));
import { CopyrightFooter } from '@/components/CopyrightFooter';
import { formatCPF, validateCPF } from '@/lib/validators';
import { cn } from '@/lib/utils';
import { getMasterToken, setMasterToken } from '@/lib/masterSession';
import { adminClient } from '@/lib/adminClient';
import { Bell } from 'lucide-react';
import iseAcreBadgeAsset from '@/assets/ise-acre-badge.png.asset.json';
import iseAcreBadgeWebpAsset from '@/assets/ise-acre-badge.webp.asset.json';
const iseAcreBadge = iseAcreBadgeAsset.url;
const iseAcreBadgeWebp = iseAcreBadgeWebpAsset.url;
import { PanelNav } from '@/components/ui/panel-nav';
import { MasterDiagnostics } from '@/components/master/MasterDiagnostics';
import { formatUnitName } from '@/lib/unitNames';

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: string | null;
}

interface Unit {
  id: string;
  name: string;
  municipality: string;
  director_name?: string | null;
  coordinator_name?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface Agent {
  id: string;
  name: string;
  cpf: string | null;
  matricula: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  team: string | null;
  is_active: boolean;
  unit_id: string | null;
  license_status?: string | null;
  license_expires_at?: string | null;
  license_notes?: string | null;
  created_at?: string;
  unit: {
    name: string;
    municipality: string;
  } | null;
}

interface AccessLog {
  id: string;
  agent_id: string;
  action: string;
  created_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  agent?: { name: string } | null;
}

interface SystemStats {
  totalUsers: number;
  totalAgents: number;
  totalUnits: number;
  pendingTransfers: number;
  activeAgents: number;
  expiredLicenses: number;
  pendingApprovals: number;
}

export default function Master() {
  const { masterSession, setMasterSession, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalAgents: 0,
    totalUnits: 0,
    pendingTransfers: 0,
    activeAgents: 0,
    expiredLicenses: 0,
    pendingApprovals: 0,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [agentSearchTerm, setAgentSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'master' | 'admin' | 'user'>('all');
  const [syncingUsers, setSyncingUsers] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 20;

  type LastSyncInfo = {
    at: string;
    totalAuthUsers: number;
    profilesInserted: number;
    rolesInserted: number;
    ok: boolean;
    error?: string;
  };
  const [lastSync, setLastSync] = useState<LastSyncInfo | null>(() => {
    try {
      const raw = localStorage.getItem('master:lastUsersSync');
      return raw ? (JSON.parse(raw) as LastSyncInfo) : null;
    } catch {
      return null;
    }
  });

  const filteredUsers = users.filter((u) => {
    const matchSearch = !userSearch.trim() ||
      (u.email || '').toLowerCase().includes(userSearch.trim().toLowerCase());
    const role = u.role || 'user';
    const matchRole = userRoleFilter === 'all' || role === userRoleFilter;
    return matchSearch && matchRole;
  });

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const currentUserPage = Math.min(userPage, totalUserPages);
  const paginatedUsers = filteredUsers.slice(
    (currentUserPage - 1) * USERS_PER_PAGE,
    currentUserPage * USERS_PER_PAGE
  );

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userRoleFilter]);

  const handleSyncUsers = async () => {
    if (syncingUsers) return;
    setSyncingUsers(true);
    try {
      const result = await adminClient.syncUsers();
      const info: LastSyncInfo = {
        at: new Date().toISOString(),
        totalAuthUsers: result.totalAuthUsers,
        profilesInserted: result.profilesInserted,
        rolesInserted: result.rolesInserted,
        ok: true,
      };
      setLastSync(info);
      try { localStorage.setItem('master:lastUsersSync', JSON.stringify(info)); } catch {}
      toast({
        title: 'Sincronização concluída',
        description: `${result.totalAuthUsers} usuário(s) indexados • ${result.profilesInserted} profile(s) criado(s) • ${result.rolesInserted} role(s) criada(s).`,
      });
      // Reload dashboard and keep user on the current page.
      await fetchData({ silent: true });
    } catch (e: any) {
      const info: LastSyncInfo = {
        at: new Date().toISOString(),
        totalAuthUsers: 0,
        profilesInserted: 0,
        rolesInserted: 0,
        ok: false,
        error: e?.message || 'Falha ao sincronizar usuários.',
      };
      setLastSync(info);
      try { localStorage.setItem('master:lastUsersSync', JSON.stringify(info)); } catch {}
      toast({
        title: 'Erro na sincronização',
        description: info.error,
        variant: 'destructive',
      });
    } finally {
      setSyncingUsers(false);
    }
  };

  
  // Dialogs state
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editAgentOpen, setEditAgentOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editUnitOpen, setEditUnitOpen] = useState(false);
  
  // New Agent Dialog
  const [newAgentOpen, setNewAgentOpen] = useState(false);
  const [newAgentData, setNewAgentData] = useState({
    name: '',
    cpf: '',
    matricula: '',
    phone: '',
    team: '',
    unit_id: '',
    password: '',
  });
  const [creatingAgent, setCreatingAgent] = useState(false);
  
  // Message Dialog
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageTarget, setMessageTarget] = useState<Agent | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Agent Details Dialog
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Oculta a barra de rolagem no Painel Master mantendo scroll 100% funcional
  // (mouse wheel, trackpad, teclado, touch). CSS aplicado via `body.master-route`.
  useEffect(() => {
    document.body.classList.add('master-route');
    return () => { document.body.classList.remove('master-route'); };
  }, []);

  // Validar token master no mount — se inválido/expirado, limpar sessão e redirecionar
  useEffect(() => {
    if (!masterSession) return;
    let cancelled = false;
    (async () => {
      try {
        const token = getMasterToken();
        if (!token) {
          setMasterSession(null);
          try { sessionStorage.removeItem('masterSession'); localStorage.removeItem('master_user'); } catch {}
          navigate('/', { replace: true });
          return;
        }
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/master-admin`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-master-token': token,
            'authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: '__verify__' }),
        });
        if (cancelled) return;
        // 401 => token inválido/expirado. Qualquer outro status (incl. 400 "Ação obrigatória") => token OK.
        if (res.status === 401) {
          setMasterToken(null);
          setMasterSession(null);
          try { sessionStorage.removeItem('masterSession'); localStorage.removeItem('master_user'); } catch {}
          toast({
            title: 'Sessão master expirada',
            description: 'Faça login novamente para acessar o painel.',
            variant: 'destructive',
          });
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('[Master] Falha ao validar token master:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [masterSession, navigate, setMasterSession, toast]);


  useEffect(() => {
    if (masterSession) {
      fetchData();

      // Prefetch dos chunks das abas para tornar a troca instantânea
      requestIdleCallback?.(() => {
        import('@/components/agents/TransferApprovalPanel');
        import('@/components/admin/CadastrosAprovacoesPanel');
        import('@/components/admin/EditAgentDialog');
        import('@/components/admin/EditUnitDialog');
        import('@/components/admin/DeleteAgentDialog');
        
        import('@/components/admin/DeleteUserDialog');
        import('@/components/admin/AgentPasswordManager');
        import('@/components/admin/CredentialsViewer');
        import('@/components/admin/PasswordRequestsManager');
        import('@/components/admin/AnnouncementsManager');
        import('@/components/admin/SwapManagementPanel');
        import('@/components/admin/LicenseFinanceControl');
        import('@/components/admin/UnitsManagementCard');
        import('@/components/admin/AgentAccessControl');
        // PendingApprovalsManager e RecentRegistrationsAudit são carregados via CadastrosAprovacoesPanel

      });


      // Debounce para refresh silencioso a partir de eventos realtime — evita
      // toggles rápidos de loading/skeleton que causavam "redimensionamento"
      // aparente do painel ao receber múltiplos eventos em sequência.
      let refreshTimer: number | null = null;
      const scheduleSilentRefresh = () => {
        if (refreshTimer) window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => {
          fetchData({ silent: true });
        }, 600);
      };

      // Realtime subscription para mudanças em agentes
      const agentsChannel = supabase
        .channel('master-agents-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'agents',
        }, (payload) => {
          console.log('[Master] Realtime agents change:', payload.eventType);
          scheduleSilentRefresh();
        })
        .subscribe();

      // Realtime para transferências
      const transfersChannel = supabase
        .channel('master-transfers-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'transfer_requests',
        }, () => {
          console.log('[Master] Realtime transfer change');
          scheduleSilentRefresh();
        })
        .subscribe();

      return () => {
        if (refreshTimer) window.clearTimeout(refreshTimer);
        supabase.removeChannel(agentsChannel);
        supabase.removeChannel(transfersChannel);
      };
    }
  }, [masterSession]);


  const fetchData = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoadingData(true);

      setUnitsError(null);

      // Chamada consolidada via edge function (service_role) — funciona com sessão master (token)
      // e com sessão admin (JWT). Bypassa RLS que exigia auth.uid().
      const t0 = performance.now();
      const dash = await adminClient.listDashboardData();
      console.info('[Master] dashboard carregado em', Math.round(performance.now() - t0), 'ms', {
        units: dash.units.length,
        agents: dash.agents.length,
        users: dash.users.length,
      });

      setUnits((dash.units as Unit[]) || []);
      setAgents((dash.agents as unknown as Agent[]) || []);
      setUsers((dash.users as UserWithRole[]) || []);
      setAccessLogs((dash.accessLogs as unknown as AccessLog[]) || []);
      setStats(dash.stats);

      if (!dash.units?.length) {
        setUnitsError('Nenhuma unidade retornada. Verifique o cadastro no backend.');
        console.warn('[Master] Lista de unidades vazia.');
      }
      if (!dash.agents?.length) {
        console.warn('[Master] Lista de agentes vazia.');
      }
    } catch (error: any) {
      console.error('[Master] Falha ao carregar dashboard:', error);
      setUnitsError(error?.message || 'Falha ao carregar dados do painel.');
      toast({
        title: 'Falha ao carregar dados',
        description: error?.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setHasLoadedData(true);
      setLoadingData(false);
    }
  };


  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await adminClient.setRole({ userId, role: newRole as any });
      toast({ title: 'Sucesso', description: 'Função do usuário atualizada.' });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível atualizar a função.', variant: 'destructive' });
    }
  };

  const [loggingOut, setLoggingOut] = useState(false);
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const token = getMasterToken();
    // 1) Encerrar sessão no servidor (invalida o token no banco)
    try {
      if (token) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/master-admin`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-master-token': token,
            'authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: 'logout' }),
        }).catch(() => {});
      }
    } finally {
      // 2) Encerrar no cliente (sempre, mesmo se o servidor falhar)
      setMasterToken(null);
      setMasterSession(null);
      try {
        sessionStorage.removeItem('masterSession');
        localStorage.removeItem('master_user');
      } catch {}
      toast({ title: 'Sessão encerrada', description: 'Você saiu do painel Master com segurança.' });
      navigate('/', { replace: true });
    }
  };

  
  // Create new agent
  const handleCreateAgent = async () => {
    if (!newAgentData.name || !newAgentData.cpf || !newAgentData.unit_id || !newAgentData.team || !newAgentData.password) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    
    const cleanCpf = newAgentData.cpf.replace(/\D/g, '');
    if (!validateCPF(cleanCpf)) {
      toast({ title: 'Erro', description: 'CPF inválido.', variant: 'destructive' });
      return;
    }
    
    setCreatingAgent(true);
    try {
      await adminClient.createAgent({
        name: newAgentData.name,
        cpf: cleanCpf,
        password: newAgentData.password,
        unit_id: newAgentData.unit_id,
        team: newAgentData.team,
        matricula: newAgentData.matricula || null,
        phone: newAgentData.phone || null,
      });
      
      toast({ title: 'Sucesso', description: 'Agente criado com sucesso!' });
      setNewAgentOpen(false);
      setNewAgentData({ name: '', cpf: '', matricula: '', phone: '', team: '', unit_id: '', password: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível criar o agente.', variant: 'destructive' });
    } finally {
      setCreatingAgent(false);
    }
  };
  
  // Toggle de status agora vive exclusivamente em AgentAccessControl (aba "Acesso"),
  // que registra access_logs + envia notification. handleToggleAgentStatus foi removido
  // para eliminar a duplicação e evitar comportamentos inconsistentes.

  
  // Expire all sessions for an agent
  const handleExpireSession = async (agent: Agent) => {
    try {
      // Log the action
      await supabase.from('access_logs').insert({
        agent_id: agent.id,
        action: 'session_expired_by_admin',
      });
      
      toast({ title: 'Sucesso', description: `Sessão de ${agent.name} expirada.` });
      fetchData();
    } catch (error) {
      console.error('Error expiring session:', error);
      toast({ title: 'Erro', description: 'Não foi possível expirar sessão.', variant: 'destructive' });
    }
  };
  
  // Send message/notification to agent
  const handleSendMessage = async () => {
    if (!messageTarget || !messageContent.trim()) return;
    
    setSendingMessage(true);
    try {
      await supabase.from('notifications').insert({
        agent_id: messageTarget.id,
        title: 'Mensagem do Administrador',
        content: messageContent,
        type: 'admin_message',
      });
      
      toast({ title: 'Sucesso', description: `Mensagem enviada para ${messageTarget.name}.` });
      setMessageOpen(false);
      setMessageContent('');
      setMessageTarget(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Erro', description: 'Não foi possível enviar mensagem.', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Bulk renew licenses
  const handleBulkRenewLicenses = async () => {
    try {
      const expiredAgents = agents.filter(a => {
        if (!a.license_expires_at) return false;
        return new Date(a.license_expires_at) < new Date();
      });
      
      if (expiredAgents.length === 0) {
        toast({ title: 'Info', description: 'Nenhuma licença expirada.' });
        return;
      }
      
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      for (const agent of expiredAgents) {
        await supabase
          .from('agents')
          .update({ license_status: 'active', license_expires_at: newExpiry })
          .eq('id', agent.id);
      }
      
      toast({ title: 'Sucesso', description: `${expiredAgents.length} licenças renovadas.` });
      fetchData();
    } catch (error) {
      console.error('Error renewing licenses:', error);
      toast({ title: 'Erro', description: 'Não foi possível renovar licenças.', variant: 'destructive' });
    }
  };

  const debouncedAgentSearch = useDebouncedValue(agentSearchTerm, 200);
  const filteredAgents = agents.filter((agent) => {
    if (!debouncedAgentSearch) return true;
    const searchTerm = debouncedAgentSearch.toLowerCase().trim();
    const searchNumbers = searchTerm.replace(/\D/g, '');
    const name = agent.name.toLowerCase();
    if (name.includes(searchTerm)) return true;
    if (searchNumbers && agent.cpf && agent.cpf.includes(searchNumbers)) return true;
    if (searchNumbers && agent.matricula && agent.matricula.includes(searchNumbers)) return true;
    return false;
  });


  if (isLoading || (loadingData && !hasLoadedData)) {
    return (
      <div className="min-h-dvh p-4 md:p-6 hud-scope hud-page-bg" style={hudBgStyle}>
        <div className="max-w-7xl mx-auto">
          <PanelSkeleton rows={6} />
        </div>
      </div>
    );
  }

  if (!masterSession) return null;

  return (
    <Suspense fallback={<PanelSkeleton rows={5} />}>
    <div className="min-h-dvh p-3 md:p-5 hud-scope hud-page-bg" style={hudBgStyle}>
      <div className="max-w-7xl mx-auto space-y-3 animate-fade-in tactical-strip hover-lift rounded-2xl p-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0 aspect-square h-10 w-10 flex items-center justify-center">
              <picture>
                <source type="image/webp" srcSet={iseAcreBadgeWebp} />
                <img
                  src={iseAcreBadge}
                  alt="Instituto Socioeducativo do Acre"
                  width={80}
                  height={80}
                  loading="eager"
                  decoding="async"
                  className="max-h-full max-w-full h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                />
              </picture>
            </div>
            <div>
              <h1 className="font-tactical text-base sm:text-lg font-bold tracking-[0.18em] text-gradient leading-tight">PAINEL MASTER</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight mt-0.5">
                Controle Administrativo Total • <span className="text-primary font-mono font-medium">{masterSession}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => {
                setLoadingData(true);
                fetchData();
              }}
              disabled={loadingData}
              className="h-8 w-8 border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all"
              title="Atualizar dados"
            >
              <RefreshCw className={cn("h-4 w-4", loadingData && "animate-spin")} />
            </Button>
            <MasterDiagnostics />
            <PanelNav onLogout={handleLogout} />
          </div>
        </div>

        {/* System Stats — cada card abre a aba correspondente (HUD) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-2.5">
          {([
            { key: 'users',      label: 'Usuários',        value: stats.totalUsers,      icon3d: 'team'     as Icon3DName, tint: 'primary',   tab: 'users' },
            { key: 'agents',     label: 'Agentes',         value: stats.totalAgents,     icon3d: 'team'     as Icon3DName, tint: 'emerald',   tab: 'agents' },
            { key: 'active',     label: 'Ativos',          value: stats.activeAgents,    icon3d: 'shield'   as Icon3DName, tint: 'green',     tab: 'agents' },
            { key: 'expired',    label: 'Expirados',       value: stats.expiredLicenses, icon3d: 'clock'    as Icon3DName, tint: 'red',       tab: 'licenses' },
            { key: 'units',      label: 'Unidades',        value: stats.totalUnits,      icon3d: 'building' as Icon3DName, tint: 'blue',      tab: 'overview' },
            { key: 'transfers',  label: 'Transferências',  value: stats.pendingTransfers,icon3d: 'calendar' as Icon3DName, tint: 'yellow',    tab: 'transfers' },
          ] as const).map(({ key, label, value, icon3d, tint, tab }) => {

            const tintMap: Record<string, string> = {
              primary: 'bg-primary/10 text-primary',
              emerald: 'bg-emerald-500/10 text-emerald-500',
              green:   'bg-green-500/10 text-green-500',
              red:     'bg-red-500/10 text-red-500',
              blue:    'bg-blue-500/10 text-blue-500',
              yellow:  'bg-yellow-500/10 text-yellow-500',
            };
            return (
              <Card
                key={key}
                onClick={() => {
                  setActiveTab(tab);
                  requestAnimationFrame(() => {
                    document.querySelector('[role="tablist"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  });
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTab(tab);
                  }
                }}
                className={cn(
                  'glass glass-border cursor-pointer transition-all hover-lift',
                  'hover:border-primary/60 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  activeTab === tab && 'border-primary/70 shadow-[0_0_0_1px_hsl(var(--primary)/0.5)]'
                )}
                aria-label={`Abrir ${label}`}
              >
                <CardContent className="p-2 md:p-2.5 min-h-[52px] md:min-h-[56px] flex items-center">
                  <div className="flex items-center gap-2 w-full">
                    <div className={cn('p-1.5 rounded-md shrink-0', tintMap[tint])}>
                      <Icon3D name={icon3d} size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground truncate leading-tight">{label}</p>
                      <p className="text-base md:text-lg font-mono font-bold leading-tight tabular-nums">{value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>


        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 sm:[grid-template-columns:repeat(13,minmax(0,1fr))] h-auto p-1 gap-0.5 bg-slate-900/60 border border-slate-800/80 [&>button]:h-8 [&>button]:px-1.5 [&>button]:text-[11px] [&>button]:font-medium [&>button]:tracking-[0.06em] [&>button]:uppercase">
            <TabsTrigger value="approvals" className="relative">
              <Icon3D name="shield" size={14} className="sm:hidden" />
              <span className="hidden sm:inline">Cadastros</span>
              {stats.pendingApprovals > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 px-0.5 rounded-full bg-amber-500 text-[9px] font-mono text-white flex items-center justify-center animate-pulse">
                  {stats.pendingApprovals}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-1">
              <Icon3D name="building" size={12} className="hidden sm:inline-flex" />
              Unidades
            </TabsTrigger>
            <TabsTrigger value="access-control" className="relative">
              Acesso
              {agents.filter(a => !a.is_active || (a as any).is_frozen).length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-amber-500 text-[9px] text-white flex items-center justify-center">
                  !
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-1">
              <Icon3D name="team" size={12} className="hidden sm:inline-flex" />
              Agentes
            </TabsTrigger>
            <TabsTrigger value="credentials">Credenciais</TabsTrigger>
            <TabsTrigger value="password-requests">Senhas</TabsTrigger>
            <TabsTrigger value="licenses" className="relative gap-1">
              <Icon3D name="clock" size={12} className="hidden sm:inline-flex" />
              Licenças
              {stats.expiredLicenses > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 px-0.5 rounded-full bg-red-500 text-[9px] font-mono text-white flex items-center justify-center animate-pulse">
                  {stats.expiredLicenses}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-1">
              <MessageSquare className="h-3 w-3 hidden sm:inline-flex" />
              Comunic.
            </TabsTrigger>
            <TabsTrigger value="swaps">Permutas</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="transfers">Transfer.</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="audit" className="gap-1 relative">
              <Icon3D name="shield" size={12} className="hidden sm:inline-flex" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          {/* Cadastros & Aprovações — painel unificado (pendentes + recentes) */}
          <TabsContent value="approvals" className="space-y-3 mt-3">
            <Suspense fallback={<PanelSkeleton rows={4} />}>
              <CadastrosAprovacoesPanel onChange={fetchData} />
            </Suspense>
          </TabsContent>

          {/* Audit — Monitor de conexão + Auditoria de acessos (cadastros movidos para "Aprovações") */}
          <TabsContent value="audit" className="space-y-3 mt-3">
            <Suspense fallback={<PanelSkeleton rows={4} />}>
              <AgentsConnectionMonitor />
            </Suspense>
            <Suspense fallback={<PanelSkeleton rows={4} />}>
              <AccessAuditPanel />
            </Suspense>
          </TabsContent>



          {/* Overview Tab - Units */}
          <TabsContent value="overview" className="space-y-3 mt-3">
            {unitsError && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                <strong>Aviso — Unidades:</strong> {unitsError}
                <button
                  type="button"
                  onClick={() => fetchData()}
                  className="ml-3 underline underline-offset-2 hover:text-amber-100"
                >
                  Tentar novamente
                </button>
              </div>
            )}
            <UnitsManagementCard 
              units={units.map(u => ({ ...u, name: formatUnitName(u.name) }))}
              agents={agents.map(a => ({
                id: a.id,
                name: a.name,
                team: a.team,
                unit_id: a.unit_id,
                is_active: a.is_active
              }))}
              onEditUnit={(unit) => {
                setEditingUnit(unit);
                setEditUnitOpen(true);
              }}
              onRefresh={fetchData}
            />
          </TabsContent>

          {/* Access Control Tab */}
          <TabsContent value="access-control" className="space-y-3 mt-3">
            <AgentAccessControl 
              agents={agents.map(a => ({
                id: a.id,
                name: a.name,
                cpf: a.cpf,
                team: a.team,
                is_active: a.is_active,
                is_frozen: (a as any).is_frozen,
                license_status: a.license_status,
                license_expires_at: a.license_expires_at,
                unit: a.unit
              }))}
              onRefresh={fetchData}
            />
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-3 mt-3">
            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por CPF, Matrícula ou Nome..."
                  value={agentSearchTerm}
                  onChange={(e) => setAgentSearchTerm(e.target.value)}
                  className="pl-10 bg-input"
                />
              </div>
              
              <Dialog open={newAgentOpen} onOpenChange={setNewAgentOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 gap-2">
                    <Icon3D name="team" size={18} />
                    Novo Agente
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-green-500" />
                      Criar Novo Agente
                    </DialogTitle>
                    <DialogDescription>
                      Preencha os dados para criar uma nova conta de agente.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome Completo *</label>
                      <Input
                        placeholder="Nome do agente"
                        value={newAgentData.name}
                        onChange={(e) => setNewAgentData({ ...newAgentData, name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CPF *</label>
                        <Input
                          placeholder="00000000000"
                          value={newAgentData.cpf}
                          onChange={(e) => setNewAgentData({ ...newAgentData, cpf: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Matrícula</label>
                        <Input
                          placeholder="00000000"
                          value={newAgentData.matricula}
                          onChange={(e) => setNewAgentData({ ...newAgentData, matricula: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Telefone</label>
                      <Input
                        placeholder="(00) 00000-0000"
                        value={newAgentData.phone}
                        onChange={(e) => setNewAgentData({ ...newAgentData, phone: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Unidade *</label>
                        <Select
                          value={newAgentData.unit_id}
                          onValueChange={(v) => setNewAgentData({ ...newAgentData, unit_id: v })}
                        >
                          <SelectTrigger className="bg-input">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            {units.length === 0 && (
                              <div className="px-3 py-2 text-sm text-amber-500">
                                Nenhuma unidade disponível. {unitsError ? `(${unitsError})` : ''}
                              </div>
                            )}
                            {units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                {formatUnitName(unit.name)} — {unit.municipality}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Equipe *</label>
                        <Select
                          value={newAgentData.team}
                          onValueChange={(v) => setNewAgentData({ ...newAgentData, team: v })}
                        >
                          <SelectTrigger className="bg-input">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            <SelectItem value="ALFA">ALFA</SelectItem>
                            <SelectItem value="BRAVO">BRAVO</SelectItem>
                            <SelectItem value="CHARLIE">CHARLIE</SelectItem>
                            <SelectItem value="DELTA">DELTA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Senha Inicial *</label>
                      <Input
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={newAgentData.password}
                        onChange={(e) => setNewAgentData({ ...newAgentData, password: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewAgentOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateAgent} disabled={creatingAgent}>
                      {creatingAgent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                      Criar Agente
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="glass glass-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon3D name="team" size={22} />
                  Agentes Cadastrados ({filteredAgents.length})
                </CardTitle>
                <CardDescription>
                  Gerenciamento completo de agentes
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {filteredAgents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {agentSearchTerm ? 'Nenhum agente encontrado' : 'Nenhum agente cadastrado'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Equipe</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAgents.map((agent) => (
                        <TableRow key={agent.id} className="border-border">
                          <TableCell>
                            <button
                              onClick={() => {
                                setSelectedAgent(agent);
                                setDetailsOpen(true);
                              }}
                              className="font-medium text-primary hover:underline cursor-pointer flex items-center gap-1"
                            >
                              {agent.name}
                              <Eye className="h-3 w-3 opacity-50" />
                            </button>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {agent.cpf ? formatCPF(agent.cpf) : '-'}
                          </TableCell>
                          <TableCell>
                            {agent.unit ? (
                              <div>
                                <div className="font-medium text-sm">{formatUnitName(agent.unit.name)}</div>
                                <div className="text-xs text-muted-foreground">{agent.unit.municipality}</div>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {agent.team ? <Badge variant="outline">{agent.team}</Badge> : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                              {agent.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <AgentPasswordManager
                                agent={agent}
                                onSuccess={fetchData}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setMessageTarget(agent);
                                  setMessageOpen(true);
                                }}
                                className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                                title="Enviar Mensagem"
                              >
                                <Icon3DAction name="message" alt="Enviar mensagem" />
                              </Button>
                              {/* Ativar/Desativar centralizado na aba "Acesso" (AgentAccessControl),
                                  que grava access_logs e envia notificações. Este toggle foi removido
                                  para evitar duas trilhas de código com efeitos colaterais diferentes. */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingAgent(agent);
                                  setEditAgentOpen(true);
                                }}
                                className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                                title="Editar"
                              >
                                <Icon3DAction name="edit" alt="Editar" />
                              </Button>
                              {/* Reset de senha unificado no AgentPasswordManager (adminClient.resetPassword).
                                  O AdminResetPasswordDialog foi removido do projeto. */}

                              <DeleteAgentDialog
                                agentId={agent.id}
                                agentName={agent.name}
                                onSuccess={fetchData}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credentials Tab */}
          <TabsContent value="credentials" className="space-y-3 mt-3">
            <CredentialsViewer />
          </TabsContent>

          {/* Password Requests Tab */}
          <TabsContent value="password-requests" className="space-y-3 mt-3">
            <PasswordRequestsManager />
          </TabsContent>

          {/* Licenses & Finance Tab */}
          <TabsContent value="licenses" className="mt-3">
            <LicenseFinanceControl />
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-3">
            <Card className="glass glass-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon3D name="clock" size={22} />
                  Logs de Acesso
                </CardTitle>
                <CardDescription>
                  Histórico de atividades do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {accessLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum log encontrado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Agente</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessLogs.map((log) => (
                        <TableRow key={log.id} className="border-border">
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium">{log.agent?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {log.ip_address || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transfers Tab */}
          <TabsContent value="transfers" className="mt-3">
            <TransferApprovalPanel />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-3">
            <Card className="glass glass-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon3D name="shield" size={22} />
                  Gerenciar Usuários
                </CardTitle>
                <CardDescription>
                  Controle de funções e permissões
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {lastSync && (
                  <div className={`px-4 py-2 border-b border-border text-xs flex flex-wrap items-center gap-x-4 gap-y-1 ${lastSync.ok ? 'bg-emerald-500/5 text-emerald-300' : 'bg-destructive/10 text-destructive'}`}>
                    <span className="font-semibold uppercase tracking-wider">
                      {lastSync.ok ? '✓ Última sincronização' : '✗ Última tentativa falhou'}
                    </span>
                    <span>{format(new Date(lastSync.at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</span>
                    {lastSync.ok ? (
                      <>
                        <span>• {lastSync.totalAuthUsers} indexados</span>
                        <span>• {lastSync.profilesInserted} profile(s) criado(s)</span>
                        <span>• {lastSync.rolesInserted} role(s) criada(s)</span>
                      </>
                    ) : (
                      <span className="font-mono opacity-90">{lastSync.error}</span>
                    )}
                  </div>
                )}
                <div className="flex flex-col md:flex-row gap-2 p-4 border-b border-border">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por e-mail..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9 bg-input"
                    />
                  </div>
                  <Select value={userRoleFilter} onValueChange={(v) => setUserRoleFilter(v as any)}>
                    <SelectTrigger className="w-full md:w-48 bg-input">
                      <SelectValue placeholder="Filtrar por função" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="all">Todas as funções</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">Usuário</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={handleSyncUsers}
                    disabled={syncingUsers}
                    className="gap-2"
                    title="Reindexar auth.users com profiles e user_roles"
                  >
                    {syncingUsers ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Activity className="h-4 w-4" />
                    )}
                    {syncingUsers ? 'Sincronizando...' : 'Sincronizar'}
                  </Button>
                </div>
                <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border flex items-center justify-between">
                  <span>{filteredUsers.length} de {users.length} usuário(s)</span>
                  {filteredUsers.length > USERS_PER_PAGE && (
                    <span>Página {currentUserPage} de {totalUserPages}</span>
                  )}
                </div>
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {users.length === 0 ? 'Nenhum usuário encontrado' : 'Nenhum resultado para o filtro atual'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Nome</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Cadastrado em</TableHead>
                        <TableHead>Alterar Função</TableHead>
                        <TableHead className="w-20">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map((u) => (
                        <TableRow key={u.id} className="border-border">
                          <TableCell className="font-medium">{u.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                u.role === 'master'
                                  ? 'default'
                                  : u.role === 'admin'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {u.role === 'master' && 'Master'}
                              {u.role === 'admin' && 'Admin'}
                              {u.role === 'user' && 'Usuário'}
                              {!u.role && 'Usuário'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={u.role || 'user'}
                              onValueChange={(value) => handleRoleChange(u.id, value)}
                            >
                              <SelectTrigger className="w-32 bg-input">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                <SelectItem value="user">Usuário</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="master">Master</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                title="Forçar logout"
                                onClick={async () => {
                                  try {
                                    await adminClient.forceLogout(u.id);
                                    toast({ title: 'Sessões encerradas', description: `${u.email} foi deslogado.` });
                                  } catch (e: any) {
                                    toast({ title: 'Erro', description: e?.message || 'Falha ao deslogar', variant: 'destructive' });
                                  }
                                }}
                              >
                                <Icon3DAction name="logout" alt="Forçar logout" />
                              </Button>
                              <DeleteUserDialog 
                                userId={u.id} 
                                userName={u.email} 
                                onSuccess={fetchData} 
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {filteredUsers.length > USERS_PER_PAGE && (
                  <div className="flex items-center justify-between p-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentUserPage <= 1}
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {(currentUserPage - 1) * USERS_PER_PAGE + 1}
                      –
                      {Math.min(currentUserPage * USERS_PER_PAGE, filteredUsers.length)}
                      {' '}de {filteredUsers.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentUserPage >= totalUserPages}
                      onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comunicações Internas Tab */}
          <TabsContent value="announcements" className="space-y-3 mt-3">
            <div className="rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-600/5 p-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Central de Comunicações Internas</h3>
                  <p className="text-xs text-slate-400">Envie avisos, comunicados e alertas para todos os agentes, uma unidade ou uma equipe específica.</p>
                </div>
              </div>
            </div>
            <SectionBoundary label="Comunicações Internas" fallback={<PanelSkeleton rows={3} />}>
              <AnnouncementsManager />
            </SectionBoundary>
          </TabsContent>

          {/* Swaps Management Tab */}
          <TabsContent value="swaps" className="space-y-3 mt-3">
            <SwapManagementPanel />
          </TabsContent>
        </Tabs>

        {/* Developer Credit */}
        <div className="text-center pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground">
            Desenvolvido por <span className="text-primary font-semibold">FRANC D'NIS</span>
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Feijó, Acre • © {new Date().getFullYear()} PlantãoPro</p>
        </div>
      </div>

      {/* Edit Agent Dialog */}
      <EditAgentDialog
        agent={editingAgent}
        open={editAgentOpen}
        onOpenChange={setEditAgentOpen}
        onSuccess={fetchData}
      />

      {/* Edit Unit Dialog */}
      <EditUnitDialog
        unit={editingUnit}
        open={editUnitOpen}
        onOpenChange={setEditUnitOpen}
        onSuccess={fetchData}
      />
      
      {/* Agent Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Detalhes do Agente
            </DialogTitle>
          </DialogHeader>
          {selectedAgent && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedAgent.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CPF</p>
                  <p className="font-mono">{selectedAgent.cpf ? formatCPF(selectedAgent.cpf) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Matrícula</p>
                  <p className="font-mono">{selectedAgent.matricula || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p>{selectedAgent.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unidade</p>
                  <p>{formatUnitName(selectedAgent.unit?.name) || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Equipe</p>
                  <p>{selectedAgent.team || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={selectedAgent.is_active ? 'default' : 'secondary'}>
                    {selectedAgent.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Licença</p>
                  <Badge variant={selectedAgent.license_status === 'active' ? 'default' : 'secondary'}>
                    {selectedAgent.license_status || 'active'}
                  </Badge>
                </div>
              </div>
              {selectedAgent.address && (
                <div>
                  <p className="text-xs text-muted-foreground">Endereço</p>
                  <p>{selectedAgent.address}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Cadastrado em</p>
                <p>{selectedAgent.created_at ? format(new Date(selectedAgent.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Send Message Dialog */}
      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Enviar Mensagem
            </DialogTitle>
            <DialogDescription>
              Enviar notificação para {messageTarget?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Digite sua mensagem..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageOpen(false)}>Cancelar</Button>
            <Button onClick={handleSendMessage} disabled={sendingMessage || !messageContent.trim()}>
              {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer Copyright */}
      <CopyrightFooter className="border-t border-border/30 mt-6" />
    </div>
    </Suspense>
  );
}
