import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Eye, EyeOff, UserCheck, Lock, Fingerprint, Shield, ShieldCheck, Users, KeyRound, Info, Mail, Calendar, Clock, BarChart3, RefreshCw, Target, Building2, Award, CheckCircle2, Zap, Radio, Settings, ChevronDown, User } from 'lucide-react';


import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  validateCPF, 
  formatCPF, 
  formatMatricula,
  getMatriculaNumbers,
  formatBirthDate, 
  parseBirthDate, 
  calculateAge,
  formatPhone 
} from '@/lib/validators';
import { fetchUnits as fetchUnitsShared } from '@/lib/units';
const UnsavedChangesDialog = lazy(() => import('@/components/UnsavedChangesDialog').then(m => ({ default: m.UnsavedChangesDialog })));
const ForgotPasswordDialog = lazy(() => import('@/components/ForgotPasswordDialog').then(m => ({ default: m.ForgotPasswordDialog })));
import { SavedCredentials, getAutoLoginCredential, getSavedCredentials, getQuickLoginCredential, canQuickLogin, removeCredential, CREDENTIALS_CHANGED_EVENT } from '@/components/auth/SavedCredentials';
const ManageCredentialsDialog = lazy(() => import('@/components/auth/ManageCredentialsDialog').then(m => ({ default: m.ManageCredentialsDialog })));
const MasterPasswordRecoveryDialog = lazy(() => import('@/components/MasterPasswordRecoveryDialog').then(m => ({ default: m.MasterPasswordRecoveryDialog })));
import { MasterLoginDialog } from '@/components/auth/MasterLoginDialog';
import { QuickAccessPanel } from '@/components/QuickAccessPanel';
import { HomeAgentInfoBanner } from '@/components/HomeAgentInfoBanner';
import { BetaNoticeFooter } from '@/components/BetaNoticeFooter';
import { CopyrightFooter } from '@/components/CopyrightFooter';
import { MadeInFeijoBadge } from '@/components/MadeInFeijoBadge';

const RoundReminderDialog = lazy(() => import('@/components/home/RoundReminderDialog').then(m => ({ default: m.RoundReminderDialog })));
import { useRoundReminder } from '@/hooks/useRoundReminder';

import { DeveloperSignature } from '@/components/DeveloperSignature';
import { MaskedCpfInput } from '@/components/auth/MaskedCpfInput';

import { SplitOperationalHero } from '@/components/home/SplitOperationalHero';
const CinematicBrandHero = lazy(() => import('@/components/home/CinematicBrandHero').then(m => ({ default: m.CinematicBrandHero })));

import { SectionDivider } from '@/components/home/SectionDivider';
const RoundsCommandBar = lazy(() => import('@/components/home/RoundsCommandBar').then(m => ({ default: m.RoundsCommandBar })));
import { DraggableHomeCard } from '@/components/home/DraggableHomeCard';
import { useHomeCardOrder, type HomeCardId } from '@/hooks/useHomeCardOrder';

import { CommandRoomBackground } from '@/components/home/CommandRoomBackground';

import { useTheme } from '@/contexts/ThemeContext';
import { setMasterToken } from '@/lib/masterSession';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { useSavedCredentialsSync } from '@/hooks/useSavedCredentialsSync';
import { getThemeAssets } from '@/lib/themeAssets';
const ErrorDialog = lazy(() => import('@/components/ErrorDialog').then(m => ({ default: m.ErrorDialog })));

const LockoutTimerDialog = lazy(() => import('@/components/LockoutTimerDialog').then(m => ({ default: m.LockoutTimerDialog })));
const PendingApprovalDialog = lazy(() => import('@/components/PendingApprovalDialog').then(m => ({ default: m.PendingApprovalDialog })));
const AuthDialog = lazy(() => import('@/components/auth/AuthDialog').then(m => ({ default: m.AuthDialog })));
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthButton } from '@/components/auth/AuthButton';
import { TeamBadge } from '@/components/auth/TeamBadge';



interface Unit {
  id: string;
  name: string;
  municipality: string;
}

const teams = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'] as const;

export default function Index() {
  const { user, isLoading, signIn, signUp, setMasterSession, isAdmin, isMaster, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  /* Lembrete profissional (intervalo configurável em Configurações) — só quando logado. */
  const roundReminder = useRoundReminder({ paused: !user });
  const openRoundsManagerEvent = useCallback(() => {
    try { window.dispatchEvent(new CustomEvent('rounds:open')); } catch { /* ignore */ }
  }, []);

  const { playSound } = useSoundEffects();
  const { themeConfig, theme, resolvedTheme } = useTheme();
  const themeAssets = getThemeAssets(theme, resolvedTheme);
  const { isAvailable: isBiometricAvailable, isEnrolled: isBiometricEnrolled, enrolledCpf, enrollBiometric, authenticateBiometric } = useBiometricAuth();
  const { saveCredential, updateLastLogin } = useSavedCredentialsSync();
  const { order: homeCardOrder, move: moveHomeCard } = useHomeCardOrder();


  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [showCpfCheck, setShowCpfCheck] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showMasterLogin, setShowMasterLogin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  
  const [showCredentialsManager, setShowCredentialsManager] = useState(false);
  
  const [units, setUnits] = useState<Unit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingCpf, setIsCheckingCpf] = useState(false);
  const [showClearCredsConfirm, setShowClearCredsConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  
  // Master/Admin login
  const [masterUsername, setMasterUsername] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // CPF check
  const [checkCpf, setCheckCpf] = useState('');
  const [foundAgent, setFoundAgent] = useState<{ name: string; team: string | null; unit?: string | null } | null>(null);
  const [isSearchingAgent, setIsSearchingAgent] = useState(false);
  
  // Login form
  const [loginCpf, setLoginCpf] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [saveCpfEnabled, setSaveCpfEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('plantao_pro_save_cpf_pref');
      return v === null ? true : v === '1';
    } catch { return true; }
  });
  const [savePasswordEnabled, setSavePasswordEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('plantao_pro_save_password_pref');
      return v === null ? true : v === '1';
    } catch { return true; }
  });
  // Homepage: esconde a scrollbar visualmente mantendo scroll funcional
  // em toda a página (wheel/trackpad/teclado/touch). Regras em index.css
  // sob `body.home-route`. Remove a classe ao sair da rota.
  useEffect(() => {
    document.body.classList.add('home-route');
    return () => { document.body.classList.remove('home-route'); };
  }, []);
  useEffect(() => {
    try { localStorage.setItem('plantao_pro_save_cpf_pref', saveCpfEnabled ? '1' : '0'); } catch { /* ignore */ }
  }, [saveCpfEnabled]);
  useEffect(() => {
    try { localStorage.setItem('plantao_pro_save_password_pref', savePasswordEnabled ? '1' : '0'); } catch { /* ignore */ }
  }, [savePasswordEnabled]);
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [quickLoginLoadingCpf, setQuickLoginLoadingCpf] = useState<string | null>(null);

  // Registration form
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    matricula: '',
    unit_id: '',
    birth_date: '',
    phone: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<(() => void) | null>(null);
  
  // Error dialog state
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'error' | 'warning' | 'auth' | 'password' | 'team';
    unit?: string;
  }>({ open: false, title: '', message: '', type: 'auth' });
  
  // Lockout timer state
  const [lockoutDialog, setLockoutDialog] = useState<{
    open: boolean;
    endTime: Date;
    identifier: string;
  }>({ open: false, endTime: new Date(), identifier: '' });
  
  // Pending approval dialog state
  const [pendingApprovalDialog, setPendingApprovalDialog] = useState<{
    open: boolean;
    agentName?: string;
  }>({ open: false });
  
  // Real-time CPF validation state
  const [cpfValidation, setCpfValidation] = useState<{
    isValid: boolean;
    isChecking: boolean;
    exists: boolean;
    existingAgent: { name: string; team: string | null } | null;
  }>({ isValid: false, isChecking: false, exists: false, existingAgent: null });

  // Check if registration form has data
  const hasRegistrationData = Boolean(
    formData.name || 
    formData.matricula || 
    formData.birth_date || 
    formData.phone || 
    formData.address || 
    formData.email || 
    formData.password
  );

  // Triple-click no logo do banner abre o login Master unificado
  useEffect(() => {
    const handler = () => {
      setShowMasterLogin(true);
      toast({
        title: "Se você for Franc D'nis, seja bem-vindo, Master!",
        description: 'Acesso restrito ao Administrador Master do sistema.',
        duration: 5000,
      });
    };
    window.addEventListener('open-master-login', handler);
    return () => window.removeEventListener('open-master-login', handler);
  }, []);

  useEffect(() => {
    if (isLoading || !user) return;
    // Aguarda hidratação do papel para evitar redirect prematuro
    if (userRole === null) return;
    // Permite navegação livre para a home sem deslogar (vindo do painel interno)
    const params = new URLSearchParams(window.location.search);
    if (params.get('home') === '1') return;

    // Retomada de rota após expiração de sessão / login: aceita ?next= (mesmo origem)
    const rawNext = params.get('next');
    if (rawNext) {
      try {
        const decoded = decodeURIComponent(rawNext);
        // Aceita apenas paths internos absolutos, sem esquemas ou host
        if (decoded.startsWith('/') && !decoded.startsWith('//') && decoded !== '/') {
          navigate(decoded, { replace: true });
          return;
        }
      } catch { /* ignore */ }
    }

    if (isMaster) navigate('/master', { replace: true });
    else if (isAdmin) navigate('/admin', { replace: true });
    else navigate('/agent-panel', { replace: true });
  }, [user, isLoading, isMaster, isAdmin, userRole, navigate]);

  const LAST_CPF_KEY = 'plantaopro_last_cpf';

  // SECURITY: CPFs must NEVER be persisted in the browser (localStorage/sessionStorage/cookies).
  // Any legacy value is purged on mount, and persist/read are no-ops.
  useEffect(() => {
    try {
      localStorage.removeItem(LAST_CPF_KEY);
      sessionStorage.removeItem(LAST_CPF_KEY);
    } catch {
      // ignore
    }
  }, []);

  const persistLastCpf = (_cpf: string) => {
    // Intentionally a no-op — CPFs are stored only in the backend.
  };

  const readLastCpf = (): string | null => null;

  // Purge stale saved credentials: drop any local CPF whose agent no longer exists in the backend.
  useEffect(() => {
    (async () => {
      try {
        const local = getSavedCredentials();
        if (!local.length) return;
        const cpfs = Array.from(new Set(local.map((c) => c.cpf).filter(Boolean)));
        if (!cpfs.length) return;
        const { data, error } = await (supabase as any)
          .rpc('check_existing_cpfs', { _cpfs: cpfs });

        if (error) return;
        const valid = new Set((data || []).map((r: { cpf: string }) => r.cpf));
        const stale = cpfs.filter((c) => !valid.has(c));
        if (stale.length) {
          stale.forEach((c) => removeCredential(c));
          window.dispatchEvent(new CustomEvent(CREDENTIALS_CHANGED_EVENT));
        }
      } catch {
        // ignore
      }
    })();
  }, []);



  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    if (formData.birth_date.length === 10) {
      const date = parseBirthDate(formData.birth_date);
      if (date) {
        setCalculatedAge(calculateAge(date));
      } else {
        setCalculatedAge(null);
      }
    } else {
      setCalculatedAge(null);
    }
  }, [formData.birth_date]);

  // Real-time CPF validation for registration form
  useEffect(() => {
    const cleanCpf = formData.cpf.replace(/\D/g, '');
    
    if (cleanCpf.length === 11) {
      const isValidFormat = validateCPF(formData.cpf);
      
      if (isValidFormat) {
        setCpfValidation(prev => ({ ...prev, isChecking: true }));
        
        const checkCpfExists = async () => {
          try {
            const { data: chkRows } = await (supabase as any)
              .rpc('lookup_agent_for_login', { _cpf: cleanCpf });
            const data = Array.isArray(chkRows) && chkRows.length
              ? { name: chkRows[0].name, team: chkRows[0].team }
              : null;

            setCpfValidation({
              isValid: true,
              isChecking: false,
              exists: !!data,
              existingAgent: data
            });

          } catch (error) {
            setCpfValidation({
              isValid: true,
              isChecking: false,
              exists: false,
              existingAgent: null
            });
          }
        };
        
        checkCpfExists();
      } else {
        setCpfValidation({ isValid: false, isChecking: false, exists: false, existingAgent: null });
      }
    } else {
      setCpfValidation({ isValid: false, isChecking: false, exists: false, existingAgent: null });
    }
  }, [formData.cpf]);

  // Smart prefill when dialogs open (no auto-submit, to avoid race conditions)
  const [prefillAttempted, setPrefillAttempted] = useState(false);

  useEffect(() => {
    if (!showCpfCheck) {
      setPrefillAttempted(false);
      return;
    }

    if (prefillAttempted) return;
    const lastCpf = readLastCpf();
    if (!lastCpf) {
      setPrefillAttempted(true);
      return;
    }

    // Only prefill if user hasn't typed anything yet
    if (!checkCpf) {
      setPrefillAttempted(true);
      // Reuse the existing real-time lookup flow (modo silencioso)
      handleCpfInputChange(lastCpf, true);
    }
  }, [showCpfCheck, prefillAttempted, checkCpf]);

  useEffect(() => {
    if (!showLogin) return;

    // If login is opened directly (quick login select / biometric), prefill CPF from last usage
    if (!loginCpf) {
      const lastCpf = readLastCpf();
      if (lastCpf) setLoginCpf(formatCPF(lastCpf));
    }

    // Prefill password (only) when we have a single auto-login credential
    const autoLoginCred = getAutoLoginCredential();
    const currentCpf = loginCpf.replace(/\D/g, '');
    if (autoLoginCred && (!currentCpf || currentCpf === autoLoginCred.cpf) && !loginPassword) {
      setLoginCpf(formatCPF(autoLoginCred.cpf));
      setLoginPassword(autoLoginCred.password);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLogin]);

  const fetchUnits = async () => {
    const rows = await fetchUnitsShared({ scope: 'Index' });
    setUnits(rows as any);
  };


  const handleTeamClick = (team: string) => {
    setSelectedTeam(team);
    setShowCpfCheck(true);
    setCheckCpf('');
    setFoundAgent(null);
  };

  // Real-time CPF search with auto-login for registered agents
  // `silent` = chamada automática (prefill). Nunca fecha o diálogo nem dispara
  // o alerta de "equipe incorreta" — evita travar a UI logo após clicar no card
  // quando o último CPF salvo pertence a outra equipe.
  const handleCpfInputChange = async (value: string, silent: boolean = false) => {
    const formatted = formatCPF(value);
    setCheckCpf(formatted);
    
    const cleanCpf = formatted.replace(/\D/g, '');
    
    if (cleanCpf.length === 11) {
      setIsSearchingAgent(true);
      try {
        const { data: searchRows } = await (supabase as any)
          .rpc('lookup_agent_for_login', { _cpf: cleanCpf });
        const raw = Array.isArray(searchRows) && searchRows.length ? searchRows[0] : null;

        const unitLabel = raw?.unit_name
          ? (raw.unit_municipality ? `${raw.unit_name} — ${raw.unit_municipality}` : raw.unit_name)
          : null;
        const data = raw ? { name: raw.name, team: raw.team, unit: unitLabel } : null;


        // Prefill silencioso com CPF de outra equipe → descarta e libera input
        if (silent && data && data.team && data.team !== selectedTeam) {
          setCheckCpf('');
          setFoundAgent(null);
          setIsSearchingAgent(false);
          return;
        }

        setFoundAgent(data);
        
        // Auto-login: If agent exists and belongs to selected team, auto-proceed to login
        if (data && data.team === selectedTeam) {
          // Small delay to show found status, then auto-proceed
          setTimeout(() => {
            setShowCpfCheck(false);
            setLoginCpf(formatted);
            setShowLogin(true);
            toast({
              title: `Bem-vindo, ${data.name}!`,
              description: 'Digite sua senha para entrar.',
              duration: 3000,
            });
          }, 800);
        } else if (!silent && data && data.team && data.team !== selectedTeam) {
          // Wrong team - show professional security-style warning via ErrorDialog
          playSound('access-denied');
          setShowCpfCheck(false);
          setErrorDialog({
            open: true,
            title: 'ACESSO RESTRITO',
            message: `⚠️ ATENÇÃO, AGENTE ${data.name.split(' ')[0].toUpperCase()}!\n\nVocê está cadastrado na EQUIPE ${data.team}.\n\nPor protocolo de segurança, o acesso é permitido apenas pela equipe designada.\n\nSelecione o card da EQUIPE ${data.team} para continuar.`,
            type: 'warning',
            unit: unitLabel || undefined,
          });
        }
      } catch (error) {
        console.error('Error searching agent:', error);
        setFoundAgent(null);
      }
      setIsSearchingAgent(false);
    } else {
      setFoundAgent(null);
    }
  };

  const handleCheckCpf = async () => {
    const cleanCpf = checkCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      toast({
        title: 'CPF incompleto',
        description: 'Digite os 11 dígitos do CPF.',
        variant: 'destructive',
      });
      return;
    }
    if (!validateCPF(cleanCpf)) {
      toast({
        title: 'CPF inválido',
        description: 'O dígito verificador do CPF não confere. Revise os números.',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingCpf(true);

    try {
      // cleanCpf validated above
      const { data: preRows } = await (supabase as any)
        .rpc('lookup_agent_for_login', { _cpf: cleanCpf });
      const existingAgent = Array.isArray(preRows) && preRows.length
        ? {
            ...preRows[0],
            cpf: cleanCpf,
            unit: preRows[0].unit_name
              ? { name: preRows[0].unit_name, municipality: preRows[0].unit_municipality }
              : null,
          }
        : null;


      if (existingAgent) {
        // 1. Bloqueio por desativação manual
        if (existingAgent.is_active === false) {
          playSound('access-denied');
          setShowCpfCheck(false);
          setErrorDialog({
            open: true,
            title: 'ACESSO BLOQUEADO',
            message: 'Seu acesso foi desativado pelo administrador.\n\nEntre em contato com a coordenação para regularizar.',
            type: 'error',
          });
          return;
        }
        
        // 2. Bloqueio por congelamento
        if (existingAgent.is_frozen === true) {
          playSound('access-denied');
          setShowCpfCheck(false);
          setErrorDialog({
            open: true,
            title: 'CONTA CONGELADA',
            message: 'Sua conta foi congelada pelo sistema.\n\nEntre em contato com o administrador para reativar seu acesso.',
            type: 'error',
          });
          return;
        }
        
        // 3. Bloqueio por licença expirada
        const licenseStatus = existingAgent.license_status;
        const licenseExpires = existingAgent.license_expires_at ? new Date(existingAgent.license_expires_at) : null;
        const now = new Date();
        const gracePeriodDays = 3;
        const isLicenseExpired = licenseExpires && 
          new Date(licenseExpires.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000) < now;
        
        if (licenseStatus === 'expired' || licenseStatus === 'frozen' || isLicenseExpired) {
          playSound('access-denied');
          setShowCpfCheck(false);
          setErrorDialog({
            open: true,
            title: 'LICENÇA EXPIRADA',
            message: 'Sua licença de acesso expirou.\n\nEntre em contato com o administrador para renovar seu acesso ao sistema.',
            type: 'error',
          });
          return;
        }
        
        // 4. Bloqueio por falta de equipe
        if (!existingAgent.team) {
          playSound('access-denied');
          setShowCpfCheck(false);
          setErrorDialog({
            open: true,
            title: 'CADASTRO INCOMPLETO',
            message: 'Seu cadastro está sem equipe vinculada.\n\nEntre em contato com o administrador para regularizar sua situação.',
            type: 'error',
          });
          return;
        }
        
        // 5. Verificar se pertence à equipe selecionada
        if (existingAgent.team !== selectedTeam) {
          const unitInfo = (existingAgent as any).unit as { name?: string; municipality?: string } | null;
          const unitLabel = unitInfo?.name
            ? (unitInfo.municipality ? `${unitInfo.name} — ${unitInfo.municipality}` : unitInfo.name)
            : undefined;
          playSound('access-denied');
          setShowCpfCheck(false);
          setErrorDialog({
            open: true,
            title: 'ACESSO RESTRITO',
            message: `Você está registrado na EQUIPE ${existingAgent.team}.\n\nRetorne à tela inicial e selecione o card correto da sua equipe para acessar o sistema.\n\nPara mudar de equipe, solicite desligamento no seu painel.`,
            type: 'team',
            unit: unitLabel,
          });
        } else {
          // Tudo OK - abrir o diálogo de senha ANTES de fechar o de CPF para
          // evitar o "flash" preto do overlay do Radix entre um dialog e outro.
          setLoginCpf(checkCpf);
          setFoundAgent({ name: existingAgent.name || '', team: existingAgent.team });
          setShowLogin(true);
          requestAnimationFrame(() => setShowCpfCheck(false));
        }

      } else {
        // CPF não cadastrado - redirecionar para registro
        setShowCpfCheck(false);
        setFormData(prev => ({ 
          ...prev, 
          cpf: checkCpf,
          unit_id: '',
        }));
        setShowRegistration(true);
        toast({
          title: 'CPF Não Cadastrado',
          description: 'Preencha seus dados para se cadastrar no sistema.',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error checking CPF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível verificar o CPF.',
        variant: 'destructive',
      });
    }

    setIsCheckingCpf(false);
  };

  const validateRegistration = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Nome deve ter pelo menos 3 caracteres';
    } else if (/\d/.test(formData.name)) {
      errors.name = 'Nome não pode conter números';
    }
    
    if (!formData.cpf) {
      errors.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(formData.cpf)) {
      errors.cpf = 'CPF inválido';
    }
    
    // Matrícula is optional at registration - validated only if provided (8 digits)
    const matriculaNumbers = formData.matricula.replace(/\D/g, '');
    if (matriculaNumbers && matriculaNumbers.length !== 8) {
      errors.matricula = 'Matrícula deve ter 8 dígitos';
    }
    
    if (!formData.unit_id) {
      errors.unit_id = 'Selecione uma unidade';
    }
    
    if (formData.birth_date && formData.birth_date.length > 0) {
      if (formData.birth_date.length !== 10) {
        errors.birth_date = 'Data incompleta (DD-MM-AAAA)';
      } else {
        const d = parseBirthDate(formData.birth_date);
        if (!d) {
          errors.birth_date = 'Data inválida';
        } else {
          const age = calculateAge(d);
          if (age < 18) errors.birth_date = 'Idade mínima: 18 anos';
          else if (age > 100) errors.birth_date = 'Data de nascimento improvável';
          else if (d > new Date()) errors.birth_date = 'Data não pode ser futura';
        }
      }
    }
    
    if (!formData.password) {
      errors.password = 'Senha é obrigatória';
    } else if (!/^\d{6}$/.test(formData.password)) {
      errors.password = 'Senha deve ter exatamente 6 dígitos numéricos';
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'As senhas não conferem';
    }
    
    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRegistration() || !selectedTeam) return;
    
    setIsSubmitting(true);
    
    try {
      const matriculaClean = formData.matricula ? getMatriculaNumbers(formData.matricula) : null;
      
      // Build query based on whether matricula is provided
      const { data: existingRows } = await (supabase as any)
        .rpc('lookup_agent_for_login', { _cpf: formData.cpf.replace(/\D/g, '') });
      const existingByCpf = Array.isArray(existingRows) && existingRows.length ? existingRows[0] : null;



      if (existingByCpf) {
        // CPF já cadastrado - não permitir novo cadastro
        setRegErrors({ cpf: 'CPF já cadastrado. Faça login ou solicite ao Master para excluir o cadastro anterior.' });
        setIsSubmitting(false);
        return;
      }
      
      // Check matricula only if provided
      if (matriculaClean) {
        const { data: matRows } = await (supabase as any)
          .rpc('check_matricula_exists', { _matricula: matriculaClean });
        const existingByMatricula = Array.isArray(matRows) && matRows.length ? matRows[0] : null;

          
        if (existingByMatricula) {
          setRegErrors({ matricula: 'Matrícula já cadastrada' });
          setIsSubmitting(false);
          return;
        }
      }

      let birthDate: string | null = null;
      let age: number | null = null;
      if (formData.birth_date.length === 10) {
        const date = parseBirthDate(formData.birth_date);
        if (date) {
          birthDate = date.toISOString().split('T')[0];
          age = calculateAge(date);
        }
      }

      const cleanCpf = formData.cpf.replace(/\D/g, '');
      const authEmail = formData.email || `${cleanCpf}@agent.plantaopro.com`;
      
      // CRÍTICO: Limpar possível usuário órfão em auth.users antes de registrar
      // Isso acontece quando um registro anterior falhou no meio do processo
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/admin-operations`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'cleanup_orphan_auth', cpf: cleanCpf }),
        });
        // Pequeno delay para garantir que a limpeza foi processada
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (cleanupErr) {
        console.warn('Cleanup warning (non-fatal):', cleanupErr);
      }
      
      const { error: signUpError } = await signUp(
        authEmail, 
        formData.password, 
        formData.name.toUpperCase()
      );
      
      if (signUpError) throw signUpError;

      // Wait for session to be established after signup (auto-confirm enabled)
      let retries = 0;
      let sessionUserId: string | null = null;
      while (retries < 10 && !sessionUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          sessionUserId = session.user.id;
        } else {
          await new Promise(resolve => setTimeout(resolve, 300));
          retries++;
        }
      }

      if (!sessionUserId) {
        throw new Error('Não foi possível estabelecer a sessão. Tente novamente.');
      }

      // Calcular data de expiração: 30 dias de teste gratuito
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + 30);

      const { error: agentError } = await supabase.from('agents').insert({
        id: sessionUserId,
        name: formData.name.toUpperCase().trim(),
        cpf: cleanCpf,
        matricula: matriculaClean || null,
        unit_id: formData.unit_id,
        team: selectedTeam,
        birth_date: birthDate,
        age: age,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        approval_status: 'approved',
        is_active: true,
        license_status: 'trial',
        license_expires_at: trialExpiresAt.toISOString(),
        license_notes: 'Período de teste gratuito - 30 dias',
      });

      if (agentError) {
        console.error('Agent creation error:', agentError);
        throw agentError;
      }

      // Garante papel padrão para novos agentes (o trigger handle_new_user não está ativo)
      await supabase.from('user_roles').insert({ user_id: sessionUserId, role: 'user' as any });

      // Salvar CPF para prefill futuro
      persistLastCpf(cleanCpf);


      setFormData({
        name: '',
        cpf: '',
        matricula: '',
        unit_id: '',
        birth_date: '',
        phone: '',
        address: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
      setCalculatedAge(null);
      setSelectedTeam(null);
      setShowRegistration(false);

      toast({
        title: 'Cadastro concluído!',
        description: 'Você tem 30 dias de acesso gratuito para teste.',
        duration: 5000,
      });

      // Redirecionar para painel do agente (sessão já está ativa)
      navigate('/agent-panel', { replace: true });
      
    } catch (error: any) {
      console.error('Registration error:', error);
      let message = 'Não foi possível criar a conta.';
      if (error.message?.includes('User already registered')) {
        message = 'Este CPF já está cadastrado.';
      }
      
      toast({
        title: 'Erro ao cadastrar',
        description: message,
        variant: 'destructive',
      });
    }
    
    setIsSubmitting(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: Record<string, string> = {};
    const cleanCpf = loginCpf.replace(/\D/g, '');
    
    if (!cleanCpf || cleanCpf.length !== 11) {
      errors.cpf = 'CPF inválido';
    }
    if (!loginPassword || loginPassword.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) return;
    
    setIsSubmitting(true);
    
    // Verificar status completo do agente: ativo, equipe, licença, congelamento
    const { data: agentRows } = await (supabase as any)
      .rpc('lookup_agent_for_login', { _cpf: cleanCpf });
    const agentCheck = Array.isArray(agentRows) && agentRows.length ? agentRows[0] : null;

    
    // 1. Bloqueio por desativação manual (is_active = false)
    if (agentCheck?.is_active === false) {
      setIsSubmitting(false);
      setShowLogin(false);
      setErrorDialog({
        open: true,
        title: 'ACESSO BLOQUEADO',
        message: 'Seu acesso foi desativado pelo administrador.\n\nEntre em contato com a coordenação para regularizar.',
        type: 'error',
      });
      return;
    }
    
    // 2. Bloqueio por congelamento (is_frozen = true)
    if (agentCheck?.is_frozen === true) {
      setIsSubmitting(false);
      setShowLogin(false);
      setErrorDialog({
        open: true,
        title: 'CONTA CONGELADA',
        message: 'Sua conta foi congelada pelo sistema.\n\nEntre em contato com o administrador para reativar seu acesso.',
        type: 'error',
      });
      return;
    }
    
    // 3. Bloqueio por licença expirada ou inativa
    const licenseStatus = agentCheck?.license_status;
    const licenseExpires = agentCheck?.license_expires_at ? new Date(agentCheck.license_expires_at) : null;
    const now = new Date();
    const gracePeriodDays = 3; // 3 dias de carência após expiração
    
    // Verificar se licença expirou (com período de carência)
    const isLicenseExpired = licenseExpires && 
      new Date(licenseExpires.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000) < now;
    
    if (licenseStatus === 'expired' || licenseStatus === 'frozen' || isLicenseExpired) {
      setIsSubmitting(false);
      setShowLogin(false);
      setErrorDialog({
        open: true,
        title: 'LICENÇA EXPIRADA',
        message: 'Sua licença de acesso expirou.\n\nEntre em contato com o administrador para renovar seu acesso ao sistema.',
        type: 'error',
      });
      return;
    }
    
    // 4. Bloqueio por falta de equipe (team = null)
    if (!agentCheck?.team) {
      setIsSubmitting(false);
      setShowLogin(false);
      setErrorDialog({
        open: true,
        title: 'CADASTRO INCOMPLETO',
        message: 'Seu cadastro está sem equipe vinculada.\n\nEntre em contato com o administrador para regularizar sua situação.',
        type: 'error',
      });
      return;
    }
    
    const authEmail = `${cleanCpf}@agent.plantaopro.com`;
    const { error } = await signIn(authEmail, loginPassword);
    
    if (error) {
      // Check if it's a rate limit error
      if (error.message.includes('Muitas tentativas') || error.message.includes('rate limit') || error.message.includes('15 minutos')) {
        // Show lockout timer dialog
        const lockoutEnd = new Date();
        lockoutEnd.setMinutes(lockoutEnd.getMinutes() + 15);
        setLockoutDialog({
          open: true,
          endTime: lockoutEnd,
          identifier: formatCPF(cleanCpf)
        });
        setShowLogin(false);
      } else {
        // Show password error dialog
        setErrorDialog({
          open: true,
          title: 'Senha Incorreta',
          message: error.message === 'Invalid login credentials' 
            ? 'A senha digitada está incorreta.\n\nVerifique suas credenciais e tente novamente.' 
            : error.message || 'Não foi possível autenticar. Tente novamente.',
          type: 'password',
        });
      }
    } else {
      persistLastCpf(cleanCpf);
      // Save credentials if enabled and update last login time
      if (saveCpfEnabled) {
        const { data: rowsA } = await (supabase as any)
          .rpc('lookup_agent_for_login', { _cpf: cleanCpf });
        const agentData = Array.isArray(rowsA) && rowsA.length ? rowsA[0] : null;

        saveCredential(cleanCpf, agentData?.name, savePasswordEnabled ? loginPassword : undefined);
      } else {
        // Usuário desmarcou "Lembrar CPF" — respeitar e remover qualquer credencial salva
        try { removeCredential(cleanCpf); } catch { /* ignore */ }
      }
      // Always update last login time for quick login feature
      updateLastLogin(cleanCpf);
      
      // Enroll biometric if enabled and available
      if (enableBiometric && isBiometricAvailable) {
        const { data: rowsB } = await (supabase as any)
          .rpc('lookup_agent_for_login', { _cpf: cleanCpf });
        const agentData = Array.isArray(rowsB) && rowsB.length ? rowsB[0] : null;

        await enrollBiometric(cleanCpf, agentData?.name);
        toast({
          title: 'Biometria Configurada',
          description: 'No próximo acesso, use sua biometria para entrar.',
        });
      }
      
      toast({
        title: `Acesso liberado, ${(foundAgent?.name || '').split(' ')[0] || 'Agente'}`,
        description: 'Autenticação confirmada. Boa jornada e proteja-se sempre.',
      });
      navigate('/agent-panel', { replace: true });
    }
    
    setIsSubmitting(false);
  };

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation — evita ida ao servidor com dados vazios
    const u = masterUsername.trim();
    const p = masterPassword;
    if (!u || !p) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe usuário e senha para continuar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Guarantee separation: master login cannot share a normal user session
      await supabase.auth.signOut();

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      let res: Response;
      try {
        res = await fetch(`${supabaseUrl}/functions/v1/master-login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: u, password: p }),
        });
      } catch {
        toast({
          title: 'Sem conexão',
          description: 'Verifique sua internet e tente novamente.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success || !payload?.data?.token) {
        // Mensagem genérica baseada no status — nunca expõe detalhes do servidor
        let title = 'Acesso negado';
        let description = 'Usuário ou senha incorretos.';
        if (res.status === 429) {
          title = 'Muitas tentativas';
          description = 'Aguarde alguns minutos antes de tentar novamente.';
        } else if (res.status >= 500) {
          title = 'Serviço indisponível';
          description = 'Não foi possível validar suas credenciais agora. Tente novamente em instantes.';
        }
        // Log técnico só no console (não vaza ao usuário)
        console.warn('[MasterLogin] status', res.status);
        setMasterToken(null);
        toast({ title, description, variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      setMasterToken(payload.data.token);
      setMasterSession(u);

      toast({
        title: 'Acesso Master',
        description: 'Bem-vindo ao painel de controle.',
      });

      setShowMasterLogin(false);
      setMasterPassword('');
      navigate('/master', { replace: true });
    } catch (error) {
      console.error('[MasterLogin] unexpected', error);
      setMasterToken(null);
      toast({
        title: 'Erro inesperado',
        description: 'Não foi possível autenticar. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  // Handle admin login - use master-login edge function like master panel
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Use the same master-login edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/master-login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: adminEmail, password: adminPassword }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success || !json?.data?.token) {
        throw new Error(json?.error || 'Credenciais inválidas.');
      }

      // Store session and navigate to admin panel
      setMasterToken(json.data.token);
      setMasterSession(adminEmail);
      
      toast({
        title: 'Acesso Admin',
        description: 'Bem-vindo ao painel administrativo.',
      });

      setShowAdminLogin(false);
      navigate('/admin', { replace: true });
    } catch (error: any) {
      console.error('Admin login error:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Credenciais inválidas.',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  // Handle quick login from cards (1-click)
  const handleQuickLogin = async (cpf: string, password: string) => {
    setQuickLoginLoadingCpf(cpf);
    
    try {
      const cleanCpf = cpf.replace(/\D/g, '');
      
      // Verificar status completo do agente
      const { data: rows } = await (supabase as any)
        .rpc('lookup_agent_for_login', { _cpf: cleanCpf });
      const agentCheck = Array.isArray(rows) && rows.length ? rows[0] : null;

      
      // Bloqueio por desativação
      if (agentCheck?.is_active === false) {
        toast({
          title: 'Acesso Bloqueado',
          description: 'Seu acesso foi desativado. Contate o administrador.',
          variant: 'destructive',
        });
        setQuickLoginLoadingCpf(null);
        return;
      }
      
      // Bloqueio por congelamento
      if (agentCheck?.is_frozen === true) {
        toast({
          title: 'Conta Congelada',
          description: 'Sua conta foi congelada. Contate o administrador.',
          variant: 'destructive',
        });
        setQuickLoginLoadingCpf(null);
        return;
      }
      
      // Bloqueio por licença expirada
      const licenseStatus = agentCheck?.license_status;
      const licenseExpires = agentCheck?.license_expires_at ? new Date(agentCheck.license_expires_at) : null;
      const now = new Date();
      const gracePeriodDays = 3;
      const isLicenseExpired = licenseExpires && 
        new Date(licenseExpires.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000) < now;
      
      if (licenseStatus === 'expired' || licenseStatus === 'frozen' || isLicenseExpired) {
        toast({
          title: 'Licença Expirada',
          description: 'Sua licença expirou. Contate o administrador.',
          variant: 'destructive',
        });
        setQuickLoginLoadingCpf(null);
        return;
      }
      
      // Bloqueio por falta de equipe
      if (!agentCheck?.team) {
        toast({
          title: 'Cadastro Incompleto',
          description: 'Sem equipe vinculada. Contate o administrador.',
          variant: 'destructive',
        });
        setQuickLoginLoadingCpf(null);
        return;
      }
      
      const authEmail = `${cleanCpf}@agent.plantaopro.com`;
      
      const { error } = await signIn(authEmail, password);
      
      if (error) {
        toast({
          title: 'Falha no Login Rápido',
          description: 'Credenciais inválidas. Faça login manualmente.',
          variant: 'destructive',
        });
      } else {
        persistLastCpf(cleanCpf);
        updateLastLogin(cleanCpf);
        toast({
          title: 'Acesso rápido confirmado',
          description: 'Sessão iniciada com credenciais do dispositivo.',
        });
        navigate('/agent-panel', { replace: true });
      }
    } catch (error) {
      console.error('Quick login error:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível realizar o login rápido.',
        variant: 'destructive',
      });
    }
    
    setQuickLoginLoadingCpf(null);
  };

  // Handle credential selection (without password)
  const handleQuickLoginSelect = (cpf: string) => {
    persistLastCpf(cpf);
    setLoginCpf(formatCPF(cpf));
    setSelectedTeam(null); // Clear team selection for direct login
    setShowLogin(true);
    toast({
      title: 'CPF Carregado',
      description: 'Digite sua senha para entrar.',
    });
  };

  const handleBiometricLogin = async () => {
    setIsBiometricLoading(true);
    try {
      const cpf = await authenticateBiometric();
      if (cpf) {
        // Get agent info
        const { data: rows, error: agentError } = await (supabase as any)
          .rpc('lookup_agent_for_login', { _cpf: cpf });
        const agentData = Array.isArray(rows) && rows.length ? rows[0] : null;

        
        if (agentError || !agentData) {
          toast({
            title: 'Erro',
            description: 'CPF não encontrado no sistema.',
            variant: 'destructive',
          });
          setIsBiometricLoading(false);
          return;
        }
        
        // We need the password for login - prompt user
        const authEmail = agentData.email || `${cpf}@agent.plantaopro.com`;
        persistLastCpf(cpf);
        setLoginCpf(formatCPF(cpf));
        setShowLogin(true);
        toast({
          title: 'Biometria Confirmada',
          description: 'Digite sua senha para continuar.',
        });
      } else {
        toast({
          title: 'Biometria Cancelada',
          description: 'Autenticação biométrica foi cancelada.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      toast({
        title: 'Erro na Biometria',
        description: 'Não foi possível autenticar com biometria.',
        variant: 'destructive',
      });
    }
    setIsBiometricLoading(false);
  };

  const closeAllDialogs = () => {
    setShowCpfCheck(false);
    setShowLogin(false);
    setShowRegistration(false);
    setShowMasterLogin(false);
    setShowAdminLogin(false);
    setSelectedTeam(null);
    setCheckCpf('');
    setLoginCpf('');
    setLoginPassword('');
    setMasterUsername('');
    setMasterPassword('');
    setAdminEmail('');
    setAdminPassword('');
    // Reset registration form
    setFormData({
      name: '',
      cpf: '',
      matricula: '',
      unit_id: '',
      birth_date: '',
      phone: '',
      address: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    setRegErrors({});
    setCalculatedAge(null);
  };

  // Safe close that checks for unsaved changes
  const safeCloseRegistration = () => {
    if (hasRegistrationData) {
      setPendingCloseAction(() => closeAllDialogs);
      setShowUnsavedDialog(true);
    } else {
      closeAllDialogs();
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false);
    if (pendingCloseAction) {
      pendingCloseAction();
      setPendingCloseAction(null);
    }
  };

  const handleCancelClose = () => {
    setShowUnsavedDialog(false);
    setPendingCloseAction(null);
  };

  const selectedUnit = units.find(u => u.id === formData.unit_id);
  const currentTeamConfig = selectedTeam ? {
    icon: themeAssets.teamIcons[selectedTeam as keyof typeof themeAssets.teamIcons],
    ...themeAssets.teamColors[selectedTeam as keyof typeof themeAssets.teamColors],
    ...themeAssets.teamDescriptions[selectedTeam as keyof typeof themeAssets.teamDescriptions],
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
    <>
      <div
        className="home-typo min-h-full flex flex-col bg-background relative overflow-x-clip max-sm:overflow-x-hidden home-compact max-sm:overflow-y-auto"
        style={{
          fontSize: 'clamp(11px, 0.72vw + 0.55rem, 14px)',
          // Grid de espaçamento 8px: valores discretos 8 / 16 / 24 px
          ['--home-gap' as any]: 'clamp(8px, 1.2vh, 16px)',
          ['--home-pad-x' as any]: 'clamp(8px, 1.5vw, 24px)',
          ['--home-pad-y' as any]: 'clamp(8px, 0.8vh, 16px)',
        }}
      >
        {/* Sober command-room background — SVG only, no posters */}
        <CommandRoomBackground />

        {/* (Selo movido para próximo do rodapé, em posição visível) */}


        {/* Return-to-panel shortcut for logged-in agents browsing the homepage */}
        {user && (
          <button
            type="button"
            onClick={() => {
              if (isMaster) navigate('/master');
              else if (isAdmin) navigate('/admin');
              else navigate('/agent-panel');
            }}
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 font-bold uppercase tracking-widest text-primary-foreground shadow-lg ring-1 ring-primary/50 hover:brightness-110 active:scale-95 transition"
            style={{ fontSize: 'clamp(9px, 0.6vw + 0.4rem, 12px)' }}
          >
            <User className="h-3 w-3" />
            Meu Painel
          </button>
        )}


      {/* Header is rendered by AppShell layout */}
      <header className="relative z-20 flex min-h-0 flex-1 lg:flex-none flex-col overflow-visible">
        {user && (
          <div
            className="w-full max-w-6xl mx-auto pt-4"
            style={{ paddingLeft: 'var(--home-pad-x)', paddingRight: 'var(--home-pad-x)' }}
          >
            <button
              type="button"
              onClick={() => {
                if (isMaster) navigate('/master');
                else if (isAdmin) navigate('/admin');
                else navigate('/agent-panel');
              }}
              className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/20 hover:border-primary/60 transition"
            >
              <User className="h-3.5 w-3.5" />
              Voltar para o Meu Painel
            </button>
          </div>
        )}
        {(() => {
          const savedCount = getSavedCredentials().length;
          const wrap = (child: JSX.Element, extra = '') => (
            <div
              className={cn('w-full max-w-6xl mx-auto', extra)}
              style={{ paddingLeft: 'var(--home-pad-x)', paddingRight: 'var(--home-pad-x)' }}
            >
              {child}
            </div>
          );
          const blocks: Record<HomeCardId, { node: JSX.Element; grow?: boolean } | null> = {
            rounds: {
              node: wrap(
                <div className="animate-fade-in hidden sm:block">
                  <DraggableHomeCard id="rounds" onDropCard={moveHomeCard}>
                    <RoundsCommandBar />
                  </DraggableHomeCard>
                </div>,
              ),
            },
            hero: {
              grow: true,
              node: (
                <div
                  id="teams-section"
                  className="w-full max-w-[1600px] mx-auto sm:h-full lg:h-auto scroll-mt-6"
                  style={{ paddingLeft: 'var(--home-pad-x)', paddingRight: 'var(--home-pad-x)' }}
                >
                  <DraggableHomeCard id="hero" onDropCard={moveHomeCard} className="block sm:h-full lg:h-auto">
                    <SplitOperationalHero onTeamClick={(team) => handleTeamClick(team)} />
                  </DraggableHomeCard>
                </div>
              ),
            },
            banner: {
              node: wrap(
                <DraggableHomeCard id="banner" onDropCard={moveHomeCard}>
                  <HomeAgentInfoBanner />
                </DraggableHomeCard>,
              ),
            },
            quick: savedCount > 0
              ? {
                  node: wrap(
                    <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
                      <DraggableHomeCard id="quick" onDropCard={moveHomeCard}>
                        <QuickAccessPanel
                          onQuickLogin={handleQuickLogin}
                          onSelectCredential={handleQuickLoginSelect}
                          isLoading={!!quickLoginLoadingCpf}
                          loadingCpf={quickLoginLoadingCpf || undefined}
                        />
                      </DraggableHomeCard>
                    </div>,
                  ),
                }
              : null,
          };
          return (
            <div
              className="flex min-h-0 flex-1 flex-col"
              style={{ gap: 'var(--home-gap)', paddingTop: 'var(--home-pad-y)', paddingBottom: 'var(--home-pad-y)' }}
            >
              {homeCardOrder.map((id) => {
                const b = blocks[id];
                if (!b) return null;
                return (
                  <div
                    key={id}
                    className={b.grow ? 'min-h-0 shrink-0 overflow-visible sm:flex-1 lg:flex-none' : 'shrink-0 overflow-hidden'}
                  >
                    {b.node}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </header>

      {/* Divisor entre painel operacional e seção institucional */}
      <SectionDivider />

      {/* Seção institucional cinematográfica — abaixo dos cards operacionais.
          Usa a arte oficial (agente + viatura) como background fullscreen. */}
      <CinematicBrandHero
        onScrollToLogin={() => {
          const target = document.getElementById('teams-section');
          if (!target) return;

          // Descobre o container real que rola (o wrapper .home-typo é o
          // scroller principal; se não estiver rolando, cai para window).
          const findScroller = (el: HTMLElement | null): HTMLElement | Window => {
            let node: HTMLElement | null = el?.parentElement ?? null;
            while (node && node !== document.body) {
              const style = getComputedStyle(node);
              const oy = style.overflowY;
              if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) {
                return node;
              }
              node = node.parentElement;
            }
            return window;
          };

          const scroller = findScroller(target);
          const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const behavior: ScrollBehavior = prefersReduced ? 'auto' : 'smooth';

          if (scroller === window) {
            const top = target.getBoundingClientRect().top + window.scrollY - 24;
            window.scrollTo({ top: Math.max(0, top), behavior });
          } else {
            const el = scroller as HTMLElement;
            const top = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 24;
            el.scrollTo({ top: Math.max(0, top), behavior });
          }

          // Foco acessível no destino sem "pular" o scroll suave.
          target.setAttribute('tabindex', '-1');
          setTimeout(() => target.focus({ preventScroll: true }), 350);
        }}
      />

      {/* Selo do desenvolvedor foi movido para a barra do rodapé */}


      {/* Divisor entre seção institucional e rodapé */}
      <SectionDivider />

      {/* Mobile-only beta notice */}
      <div className="hidden sm:block">

        <BetaNoticeFooter />
      </div>

      {/* Rodapé institucional profissional — oculto no mobile */}
      <footer className="relative z-30 mt-4 w-full hidden sm:block">
        <CopyrightFooter
          compact
          leftSlot={
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono tracking-[0.24em] uppercase text-muted-foreground/70">
              <ShieldCheck className="h-3 w-3 text-amber-500/80" strokeWidth={2.2} />
              <span>ISE · Acre</span>
              <span className="text-muted-foreground/30">/</span>
              <span>Sistema Operacional</span>
            </span>
          }
          rightSlot={
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1 text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground/70">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span>Online</span>
              </span>
              
              <span className="text-muted-foreground/40">·</span>
              <button
                type="button"
                onClick={() => setShowMasterLogin(true)}
                aria-label="Acesso Administrador Master"
                className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-[9px] font-mono tracking-[0.2em] uppercase text-muted-foreground/70 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
              >
                <Lock className="h-3 w-3" strokeWidth={2.2} />
                <span>Master</span>
              </button>
            </>
          }
        />
      </footer>

      {/* Mobile-only ultra-thin footer strip (fixo, não empurra viatura/boneco) */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-20 h-8 flex items-center justify-center gap-2.5 bg-gradient-to-r from-background/85 via-background/95 to-background/85 backdrop-blur-md border-t border-amber-500/20 pointer-events-auto shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.4)]">
        <ShieldCheck className="h-3 w-3 text-amber-500/90" strokeWidth={2.4} />
        <span className="text-[10.5px] font-mono tracking-[0.22em] uppercase text-amber-400/95 font-bold">PlantãoPro</span>
        <span className="text-muted-foreground/40 text-[10.5px]">·</span>
        <span className="inline-flex items-center gap-1 text-[9.5px] font-mono tracking-[0.18em] uppercase text-muted-foreground/80">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span>Online</span>
        </span>
        <span className="text-muted-foreground/40 text-[10.5px]">·</span>
        <button
          type="button"
          onClick={() => setShowMasterLogin(true)}
          aria-label="Acesso Administrador Master"
          className="inline-flex items-center gap-1 text-[10px] font-mono tracking-[0.18em] uppercase text-muted-foreground/80 hover:text-amber-400 transition-colors"
        >
          <Lock className="h-3 w-3" strokeWidth={2.2} />
          <span>Master</span>
        </button>
      </div>






      {/* CPF Check Dialog - Ultra Professional */}
      <AuthDialog
        open={showCpfCheck}
        onOpenChange={(open) => !open && closeAllDialogs()}
        variant="check"
        title="Identificação de Agente"
        subtitle="Digite seu CPF para identificação"
        team={selectedTeam}
      >
        <div className="space-y-5">
          {!foundAgent && (
            <AuthInput
              value={checkCpf}
              onChange={(e) => handleCpfInputChange(e.target.value)}
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
              variant="centered"
              icon={<Fingerprint className="h-5 w-5" />}
              rightIcon={isSearchingAgent ? (
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
              ) : undefined}
            />
          )}
          
          {/* Found agent feedback */}
          <div className="min-h-[84px]">
          {foundAgent && (
            <div className={cn(
              "p-4 rounded-xl border-2",
              foundAgent.team && foundAgent.team !== selectedTeam 
                ? 'bg-gradient-to-r from-red-500/15 to-red-600/10 border-red-500/40' 
                : 'bg-gradient-to-r from-emerald-500/15 to-green-500/10 border-emerald-500/40'
            )}>
              <div className="flex items-center gap-3">
                {foundAgent.team && foundAgent.team !== selectedTeam ? (
                  <>
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-red-400 text-base block">EQUIPE INCORRETA</span>
                      <span className="text-red-300/80 text-sm block">Você pertence à {foundAgent.team}</span>
                      {foundAgent.unit && (
                        <span className="text-red-200/70 text-xs block mt-0.5 font-mono uppercase tracking-wider">
                          Unidade · {foundAgent.unit}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                      <UserCheck className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-emerald-400 text-base block truncate">{foundAgent.name}</span>
                      {foundAgent.team && (
                        <span className="text-emerald-300/80 text-sm">Equipe {foundAgent.team}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {checkCpf.replace(/\D/g, '').length === 11 && !foundAgent && !isSearchingAgent && (
            <div className="p-4 bg-gradient-to-r from-amber-500/15 to-orange-500/10 rounded-xl border-2 border-amber-500/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <span className="text-amber-400 font-bold text-base">CPF não cadastrado</span>
              </div>
            </div>
          )}
          </div>
          

          
          <AuthButton
            onClick={handleCheckCpf}
            disabled={isCheckingCpf || checkCpf.replace(/\D/g, '').length !== 11}
            variant="master"
            loading={isCheckingCpf}
            loadingText="Verificando..."
            icon={foundAgent ? <Lock className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
          >
            {foundAgent ? 'Fazer Login' : 'Continuar'}
          </AuthButton>
        </div>
      </AuthDialog>

      {/* Login Dialog - Ultra Professional */}
      <AuthDialog
        open={showLogin}
        onOpenChange={(open) => !open && closeAllDialogs()}
        variant="agent"
        title="Autenticação de Agente"
        subtitle="Autenticação de Agente"
        team={selectedTeam}
      >
        <form onSubmit={handleLogin} className="space-y-4" data-login-form="true" autoComplete="off" spellCheck={false}>
          {/* Honeypot para desativar o prompt "salvar senha" do navegador */}
          <input type="text" name="fakeuser" autoComplete="username" tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} readOnly />
          <input type="password" name="fakepass" autoComplete="current-password" tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} readOnly />
          {foundAgent?.name ? (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Identidade Confirmada
              </label>
              <div className="relative rounded-xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-slate-800/80 to-emerald-500/5 h-14 px-4 flex items-center gap-3 overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500/70" />
                <div className="shrink-0 h-9 w-9 rounded-lg bg-emerald-500/15 border border-emerald-500/40 grid place-items-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">Agente</div>
                  <div className="text-white font-semibold truncate leading-tight">{foundAgent.name}</div>
                </div>
                {foundAgent.team && (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    {foundAgent.team}
                  </span>
                )}
              </div>
              <input type="hidden" value={loginCpf} readOnly />
            </div>
          ) : (
            <AuthInput
              label="CPF"
              value={loginCpf}
              onChange={(e) => setLoginCpf(formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
              disabled={!!selectedTeam}
              error={loginErrors.cpf}
              icon={<Fingerprint className="h-5 w-5" />}
            />
          )}
          
          <AuthInput
            label="Senha (6 dígitos)"
            value={loginPassword}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
              setLoginPassword(digits);
            }}
            onKeyDown={(e) => {
              if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault();
            }}
            onPaste={(e) => {
              e.preventDefault();
              const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
              setLoginPassword(digits);
            }}
            placeholder="••••••"
            isPassword
            maxLength={6}
            inputMode="numeric"
            error={loginErrors.password}
          />

          
          <SavedCredentials
            onSelectCredential={(cpf, savedPassword) => {
              setLoginCpf(formatCPF(cpf));
              if (savedPassword) {
                setLoginPassword(savedPassword);
              }
            }}
            onSaveChange={(cpf, pwd) => {
              setSaveCpfEnabled(cpf);
              setSavePasswordEnabled(pwd);
            }}
            saveCpf={saveCpfEnabled}
            savePassword={savePasswordEnabled}
          />
          
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/70 mt-1">
            <div className="pt-3">
              <ForgotPasswordDialog />
            </div>
            <button
              type="button"
              onClick={() => setShowClearCredsConfirm(true)}
              className="pt-3 text-[10px] uppercase tracking-[0.16em] text-slate-500 hover:text-red-400 transition-colors font-mono"
            >
              Limpar credenciais
            </button>
          </div>


          
          <AuthButton
            type="submit"
            disabled={isSubmitting}
            variant="primary"
            loading={isSubmitting}
            loadingText="Entrando..."
            icon={<Lock className="h-5 w-5" />}
          >
            Entrar
          </AuthButton>

          {/* Divisor + Atalho para Acesso Master (Administrador) */}
          <div className="pt-3 mt-1 border-t border-amber-500/20">
            <button
              type="button"
              onClick={() => {
                setShowLogin(false);
                setShowMasterLogin(true);
              }}
              className="group w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 hover:from-amber-500/20 hover:to-amber-500/20 hover:border-amber-400/70 transition-all"
            >
              <ShieldCheck className="h-4 w-4 text-amber-400 group-hover:text-amber-300" />
              <span className="text-[11px] font-mono font-bold tracking-[0.24em] uppercase text-amber-300 group-hover:text-amber-200">
                Acesso Master
              </span>
            </button>
            <p className="mt-1.5 text-center text-[9px] font-mono tracking-[0.2em] uppercase text-slate-500">
              Área do Administrador
            </p>
          </div>
        </form>
      </AuthDialog>

      {/* Confirmação profissional antes de limpar credenciais */}
      <AlertDialog open={showClearCredsConfirm} onOpenChange={setShowClearCredsConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar credenciais salvas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove <strong>todos os CPFs e senhas</strong> armazenados neste dispositivo.
              Você precisará digitar novamente no próximo acesso. A ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                try {
                  // Remove all credential-related keys definitively
                  localStorage.removeItem('plantao_pro_saved_credentials');
                  localStorage.removeItem('plantao_pro_device_key');
                  localStorage.removeItem(LAST_CPF_KEY);
                  // Sweep any legacy/related keys
                  Object.keys(localStorage).forEach((k) => {
                    if (/credent|last_cpf|saved.?cred|remember|autofill/i.test(k)) {
                      localStorage.removeItem(k);
                    }
                  });
                  sessionStorage.clear();
                } catch {
                  // ignore
                }
                setLoginCpf('');
                setLoginPassword('');
                setSavePasswordEnabled(false);
                setShowClearCredsConfirm(false);
                toast({
                  title: 'Credenciais limpas',
                  description: 'Nenhum acesso rápido armazenado neste dispositivo.',
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Limpar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        hasUnsavedChanges={hasRegistrationData}
        onDiscard={handleDiscardChanges}
        onCancel={handleCancelClose}
        open={showUnsavedDialog}
        showSaveOption={false}
      />

      {/* Registration Dialog - Ultra Professional */}
      <AuthDialog
        open={showRegistration}
        onOpenChange={(open) => !open && safeCloseRegistration()}
        variant="register"
        title="Cadastro de Novo Agente"
        subtitle="Novo Agente"
        team={selectedTeam}
      >
        {/* Info alerts — compact on mobile, expanded on desktop */}
        <div className="space-y-2 mb-4 sm:mb-6">
          <div className="p-2.5 sm:p-4 bg-gradient-to-r from-amber-500/15 to-orange-500/10 rounded-lg sm:rounded-xl border border-amber-500/40 sm:border-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-amber-500/20 shrink-0">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
              </div>
              <p className="text-amber-300/90 text-xs sm:text-sm font-semibold leading-snug">
                <strong className="text-amber-400">CPF</strong> será seu usuário de acesso
              </p>
            </div>
          </div>

          <div className="p-2.5 sm:p-4 bg-gradient-to-r from-cyan-500/15 to-teal-500/10 rounded-lg sm:rounded-xl border border-cyan-500/40 sm:border-2">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-cyan-500/20 shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-cyan-300 text-xs sm:text-sm font-bold">Aprovação Necessária</p>
                <p className="text-cyan-200/70 text-[11px] sm:text-sm leading-snug sm:leading-relaxed">
                  Cadastro será analisado antes da liberação.
                </p>
              </div>
            </div>
          </div>
        </div>


        <form onSubmit={handleSignUp} className="space-y-3 sm:space-y-5">
          {/* Nome */}
          <AuthInput
            label="Nome Completo *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/\d/g, '').toUpperCase() })}
            placeholder="NOME COMPLETO"
            className="uppercase"
            error={regErrors.name}
          />
          
          {/* CPF e Matrícula */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">


            <AuthInput
              label="CPF *"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
              error={regErrors.cpf}
              icon={<Fingerprint className="h-5 w-5" />}
              rightIcon={cpfValidation.isChecking ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              ) : undefined}
            />
            <AuthInput
              label="Matrícula"
              value={formData.matricula}
              placeholder="Preenchida no painel"
              maxLength={10}
              disabled
              readOnly
              rightIcon={<Lock className="h-4 w-4 text-slate-500" />}
            />
          </div>
          {cpfValidation.exists && cpfValidation.existingAgent && (
            <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-500/15 to-green-500/10 border border-emerald-500/40 flex items-center gap-3 -mt-2">
              <div className="p-1.5 rounded-md bg-emerald-500/20">
                <UserCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] uppercase tracking-wider text-emerald-300/80 font-semibold">Agente já cadastrado</span>
                <span className="block text-sm font-bold text-emerald-200 truncate">{cpfValidation.existingAgent.name}</span>
                {cpfValidation.existingAgent.team && (
                  <span className="text-[11px] text-emerald-300/70">Equipe {cpfValidation.existingAgent.team}</span>
                )}
              </div>
            </div>
          )}
          <p className="text-[11px] text-slate-400 -mt-1">
            A matrícula poderá ser cadastrada depois, no seu painel do agente.
          </p>

          
          {/* Unidade — trava após selecionada */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Unidade *
            </label>
            <Select
              value={formData.unit_id}
              onValueChange={(value) => {
                if (formData.unit_id) return; // não permite trocar
                setFormData({ ...formData, unit_id: value });
              }}
              disabled={Boolean(formData.unit_id)}
            >
              <SelectTrigger className="h-11 sm:h-14 text-base sm:text-lg bg-slate-800/80 border-2 border-slate-700/80 hover:border-slate-600 disabled:opacity-100 disabled:cursor-not-allowed">
                <SelectValue placeholder={units.length === 0 ? "Carregando..." : "Selecione a unidade"} />
              </SelectTrigger>
              <SelectContent
                className="max-h-[280px] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
                position="popper"
                sideOffset={4}
                style={{ zIndex: 9999 }}
              >
                {units.length === 0 ? (
                  <div className="px-3 py-2 text-slate-400 text-base">Carregando...</div>
                ) : (
                  units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="py-2.5 pl-3 pr-8 focus:bg-cyan-500/10">
                      <div className="flex flex-col items-start gap-0.5 min-w-0">
                        <span className="font-semibold text-white text-[13px] sm:text-sm leading-tight truncate max-w-full uppercase tracking-wide">
                          {unit.name}
                        </span>
                        <span className="text-[11px] sm:text-xs text-cyan-300/70 leading-tight truncate max-w-full font-medium">
                          {unit.municipality}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {formData.unit_id && (
              <p className="text-[11px] text-amber-400/80 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Unidade bloqueada. Solicite ao Master para alterar.
              </p>
            )}
            {regErrors.unit_id && <p className="text-sm text-red-400">{regErrors.unit_id}</p>}
          </div>

          {/* Nascimento e Telefone */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">

            <div>
              <AuthInput
                label="Nascimento"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: formatBirthDate(e.target.value) })}
                placeholder="DD-MM-AAAA"
                maxLength={10}
                inputMode="numeric"
                error={regErrors.birth_date}
              />
              {calculatedAge !== null && !regErrors.birth_date && (
                <p className="text-sm text-amber-400 font-bold mt-2">{calculatedAge} anos</p>
              )}
            </div>
            <AuthInput
              label="Telefone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>

          {/* Senhas — 6 dígitos numéricos */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <AuthInput
                label="Senha (6 dígitos) *"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="••••••"
                isPassword
                inputMode="numeric"
                maxLength={6}
                error={regErrors.password}
              />
              <AuthInput
                label="Confirmar *"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="••••••"
                isPassword
                inputMode="numeric"
                maxLength={6}
                error={regErrors.confirmPassword}
              />
            </div>
            <p className="text-[11px] text-cyan-300/80 flex items-center gap-1.5">
              <Info className="h-3 w-3" /> Dica: crie uma senha de <strong>6 números</strong> fácil de lembrar (evite datas óbvias e sequências).
            </p>
          </div>
          
          <AuthButton
            type="submit"
            disabled={isSubmitting}
            variant="register"
            loading={isSubmitting}
            loadingText="Cadastrando..."
            icon={<UserCheck className="h-5 w-5" />}
          >
            Cadastrar Agente
          </AuthButton>
        </form>
      </AuthDialog>

      {/* Master Admin Login Dialog - Noir & Gold Editorial */}
      <MasterLoginDialog
        open={showMasterLogin}
        onOpenChange={(open) => !open && closeAllDialogs()}
      >
        <form onSubmit={handleMasterLogin} className="space-y-4">
          <AuthInput
            label="Usuário"
            value={masterUsername}
            onChange={(e) => setMasterUsername(e.target.value)}
            placeholder="plantaopro@proton.me"
          />
          <AuthInput
            label="Senha"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            placeholder="••••••••"
            isPassword
          />
          <div className="flex justify-end">
            <MasterPasswordRecoveryDialog />
          </div>
          <AuthButton
            type="submit"
            disabled={isSubmitting || !masterUsername || !masterPassword}
            variant="master"
            loading={isSubmitting}
            loadingText="Autenticando..."
            icon={<Lock className="h-5 w-5" />}
          >
            Acessar Painel
          </AuthButton>
        </form>
      </MasterLoginDialog>


      {/* Admin Login Dialog - Ultra Professional */}
      <AuthDialog
        open={showAdminLogin}
        onOpenChange={(open) => !open && closeAllDialogs()}
        variant="admin"
        title="Login Administrativo"
        subtitle="Credenciais de administrador"
        icon={<Shield className="h-6 w-6 text-indigo-400" />}
      >
        <form onSubmit={handleAdminLogin} className="space-y-5">
          <AuthInput
            label="E-mail"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="plantaopro@proton.me"
          />
          <AuthInput
            label="Senha"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="••••••••"
            isPassword
          />
          <AuthButton
            type="submit"
            disabled={isSubmitting || !adminEmail || !adminPassword}
            variant="admin"
            loading={isSubmitting}
            loadingText="Autenticando..."
            icon={<Lock className="h-5 w-5" />}
          >
            Entrar
          </AuthButton>
        </form>
      </AuthDialog>

      {/* Manage Credentials Dialog */}
      <ManageCredentialsDialog 
        open={showCredentialsManager} 
        onOpenChange={setShowCredentialsManager} 
      />


      {/* Error Dialog - Professional */}
      <ErrorDialog
        open={errorDialog.open}
        onClose={() => setErrorDialog(prev => ({ ...prev, open: false }))}
        title={errorDialog.title}
        message={errorDialog.message}
        type={errorDialog.type}
        unit={errorDialog.unit}
      />
      
      {/* Lockout Timer Dialog */}
      <LockoutTimerDialog
        open={lockoutDialog.open}
        onClose={() => setLockoutDialog(prev => ({ ...prev, open: false }))}
        lockoutEndTime={lockoutDialog.endTime}
        identifier={lockoutDialog.identifier}
      />
      
      {/* Pending Approval Dialog */}
      <PendingApprovalDialog
        open={pendingApprovalDialog.open}
        onClose={() => setPendingApprovalDialog({ open: false })}
        agentName={pendingApprovalDialog.agentName}
      />
      </div>
      <RoundReminderDialog
        open={roundReminder.open}
        onDismiss={roundReminder.dismiss}
        onOpenRounds={() => { roundReminder.acknowledge(); openRoundsManagerEvent(); }}
        intervalMin={30}
      />
    </>
    </Suspense>
  );
}
