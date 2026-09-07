import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { ThemedPanelBackground } from '@/components/ThemedPanelBackground';
import { PanelSkeleton } from '@/components/ui/panel-skeleton';
import { ShiftConflictsBanner } from '@/components/dashboard/ShiftConflictsBanner';
import { useShiftConflictDetection } from '@/hooks/useShiftConflictDetection';

const UnitsManagementCard = lazy(() => import('@/components/dashboard/UnitsManagementCard').then(m => ({ default: m.UnitsManagementCard })));
const TeamShiftsPanel = lazy(() => import('@/components/dashboard/TeamShiftsPanel').then(m => ({ default: m.TeamShiftsPanel })));
const BHControlCard = lazy(() => import('@/components/dashboard/BHControlCard').then(m => ({ default: m.BHControlCard })));
const AnnouncementsCard = lazy(() => import('@/components/dashboard/AnnouncementsCard').then(m => ({ default: m.AnnouncementsCard })));
const ActivityLogsCard = lazy(() => import('@/components/dashboard/ActivityLogsCard').then(m => ({ default: m.ActivityLogsCard })));
const SystemOverviewCard = lazy(() => import('@/components/dashboard/SystemOverviewCard').then(m => ({ default: m.SystemOverviewCard })));
const AdvertisementsManager = lazy(() => import('@/components/admin/AdvertisementsManager').then(m => ({ default: m.AdvertisementsManager })));
const DynamicScreensManager = lazy(() => import('@/components/admin/DynamicScreensManager').then(m => ({ default: m.DynamicScreensManager })));
const ScheduledRoundsManager = lazy(() => import('@/components/admin/ScheduledRoundsManager').then(m => ({ default: m.ScheduledRoundsManager })));
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from '@/hooks/use-toast';
import { setMasterToken } from '@/lib/masterSession';
import { 
  Loader2, 
  LogOut, 
  Shield, 
  Users, 
  Building2, 
  Clock, 
  Bell,
  BarChart3,
  Home,
  CheckCircle2,
  XCircle,
  Megaphone,
  Monitor,
  LayoutDashboard,
  Settings2,
  Palette,
  Sparkles,
  CalendarClock
} from 'lucide-react';

interface AdminPermissions {
  can_manage_agents: boolean;
  can_manage_units: boolean;
  can_manage_licenses: boolean;
  can_manage_screens: boolean;
  can_manage_ads: boolean;
  can_view_analytics: boolean;
  can_manage_roles: boolean;
  can_delete_agents: boolean;
  can_manage_announcements: boolean;
  can_approve_transfers: boolean;
}

export default function Admin() {
  const { user, isLoading, signOut, userRole, masterSession, setMasterSession } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  
  // Accept either Supabase auth user OR master session
  const hasMasterAccess = !!masterSession;
  const isRoleResolved = !!userRole || hasMasterAccess;
  
  const { conflicts, hasConflicts, isChecking, checkForConflicts, dismissConflict } = useShiftConflictDetection({
    enabled: true,
    isAdmin: true,
  });
  
  useBackNavigation({ enabled: true, fallbackPath: '/' });

  // Fetch admin permissions - skip if master session (master has all permissions)
  useEffect(() => {
    if (hasMasterAccess) {
      // Master has full permissions
      setPermissions({
        can_manage_agents: true,
        can_manage_units: true,
        can_manage_licenses: true,
        can_manage_screens: true,
        can_manage_ads: true,
        can_view_analytics: true,
        can_manage_roles: true,
        can_delete_agents: true,
        can_manage_announcements: true,
        can_approve_transfers: true,
      });
      setLoadingPermissions(false);
      return;
    }
    
    if (!user?.id) {
      setLoadingPermissions(false);
      return;
    }
    
    const fetchPermissions = async () => {
      setLoadingPermissions(true);
      try {
        const { data, error } = await supabase
          .from('admin_permissions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) throw error;
        
        if (data) {
          setPermissions(data as AdminPermissions);
        } else {
          // Default permissions for admin role without explicit permissions
          setPermissions({
            can_manage_agents: true,
            can_manage_units: true,
            can_manage_licenses: false,
            can_manage_screens: true,
            can_manage_ads: true,
            can_view_analytics: true,
            can_manage_roles: false,
            can_delete_agents: false,
            can_manage_announcements: true,
            can_approve_transfers: true,
          });
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setLoadingPermissions(false);
      }
    };
    
    fetchPermissions();
  }, [user?.id, hasMasterAccess]);

  // Auth and role check - Accept master session OR admin role
  useEffect(() => {
    // Master session is valid - don't redirect
    if (hasMasterAccess) return;
    
    // Still loading - don't do anything
    if (isLoading) return;
    
    // Give time for userRole to load
    const timer = setTimeout(() => {
      // No user and no master session after timeout
      if (!user && !hasMasterAccess) {
        navigate('/', { replace: true });
        return;
      }
      
      // Role still loading - wait more
      if (!userRole && !hasMasterAccess) {
        return;
      }
      
      // Not admin and no master access - redirect to agent panel
      if (!hasMasterAccess && userRole !== 'admin' && userRole !== 'master') {
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão para acessar o painel administrativo.',
          variant: 'destructive',
        });
        navigate('/agent-panel', { replace: true });
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [user, userRole, isLoading, navigate, hasMasterAccess]);

  const handleExit = async () => {
    // Clear master session if exists
    if (hasMasterAccess) {
      setMasterToken(null);
      setMasterSession(null);
    }
    await signOut();
    navigate('/');
  };

  // Show loading only when truly loading (not when we have master access)
  if (!hasMasterAccess && (isLoading || loadingPermissions || (!!user && !isRoleResolved))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Allow access if master session OR valid admin role
  const hasAccess = hasMasterAccess || (user && (userRole === 'admin' || userRole === 'master'));
  
  if (!hasAccess) {
    return null;
  }

  const permissionLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    can_manage_agents: { label: 'Agentes', icon: <Users className="h-3 w-3" /> },
    can_manage_units: { label: 'Unidades', icon: <Building2 className="h-3 w-3" /> },
    can_manage_licenses: { label: 'Licenças', icon: <Shield className="h-3 w-3" /> },
    can_manage_screens: { label: 'Telas', icon: <Monitor className="h-3 w-3" /> },
    can_manage_ads: { label: 'Anúncios', icon: <Megaphone className="h-3 w-3" /> },
    can_view_analytics: { label: 'Analytics', icon: <BarChart3 className="h-3 w-3" /> },
    can_manage_roles: { label: 'Roles', icon: <Settings2 className="h-3 w-3" /> },
    can_delete_agents: { label: 'Excluir', icon: <XCircle className="h-3 w-3" /> },
    can_manage_announcements: { label: 'Avisos', icon: <Bell className="h-3 w-3" /> },
    can_approve_transfers: { label: 'Transf.', icon: <CheckCircle2 className="h-3 w-3" /> },
  };

  return (
    <ThemedPanelBackground team={null}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto tactical-strip hover-lift rounded-2xl">
              {/* Header Section */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="font-tactical text-lg md:text-xl font-bold tracking-[0.14em] text-white">Painel Administrativo</h1>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {hasMasterAccess ? `Sessão Master: ${masterSession}` : 'Gestão operacional do sistema'}
                      </p>
                    </div>
                    <Badge className="hidden sm:flex bg-blue-500/20 text-blue-400 border-blue-500/40">
                      {hasMasterAccess ? 'MASTER' : 'ADMIN'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/')}
                      className="border-slate-600 hover:bg-slate-700"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Início
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleExit}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </Button>
                  </div>
                </div>

                {/* Permissions - Compact Horizontal */}
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings2 className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-slate-300">Permissões</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {permissions && Object.entries(permissions).map(([key, value]) => {
                      const perm = permissionLabels[key];
                      if (!perm) return null;
                      return (
                        <Badge
                          key={key}
                          variant="outline"
                          className={`text-xs py-0.5 px-2 ${
                            value 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                              : 'bg-slate-700/30 border-slate-600/50 text-slate-500'
                          }`}
                        >
                          <span className="mr-1">{perm.icon}</span>
                          {perm.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Conflicts Banner */}
              {hasConflicts && conflicts.length > 0 && (
                <ShiftConflictsBanner 
                  conflicts={conflicts}
                  isChecking={isChecking}
                  onRefresh={checkForConflicts}
                  onDismiss={dismissConflict}
                />
              )}

              {/* Main Tabs - Clean Design */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <ScrollArea className="w-full">
                  <TabsList className="inline-flex h-auto w-auto p-1 bg-slate-800/80 border border-slate-700/50 rounded-lg">
                    <TabsTrigger 
                      value="overview" 
                      className="px-4 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md whitespace-nowrap"
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Visão Geral
                    </TabsTrigger>
                    
                    {permissions?.can_manage_units && (
                      <TabsTrigger 
                        value="units" 
                        className="px-4 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md whitespace-nowrap"
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Unidades
                      </TabsTrigger>
                    )}
                    
                    {permissions?.can_manage_agents && (
                      <TabsTrigger 
                        value="agents" 
                        className="px-4 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md whitespace-nowrap"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Agentes
                      </TabsTrigger>
                    )}
                    
                    <TabsTrigger 
                      value="bh" 
                      className="px-4 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md whitespace-nowrap"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Banco de Horas
                    </TabsTrigger>
                    
                    {permissions?.can_manage_announcements && (
                      <TabsTrigger 
                        value="announcements" 
                        className="px-4 py-2 data-[state=active]:bg-amber-600 data-[state=active]:text-white rounded-md whitespace-nowrap"
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        Avisos
                      </TabsTrigger>
                    )}
                    
                    {permissions?.can_manage_ads && (
                      <TabsTrigger 
                        value="ads" 
                        className="px-4 py-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-md whitespace-nowrap"
                      >
                        <Megaphone className="h-4 w-4 mr-2" />
                        Propagandas
                      </TabsTrigger>
                    )}
                    
                    {permissions?.can_manage_screens && (
                      <TabsTrigger 
                        value="screens" 
                        className="px-4 py-2 data-[state=active]:bg-cyan-600 data-[state=active]:text-white rounded-md whitespace-nowrap"
                      >
                        <Monitor className="h-4 w-4 mr-2" />
                        Telas Dinâmicas
                      </TabsTrigger>
                    )}

                    <TabsTrigger
                      value="rondas"
                      className="px-4 py-2 data-[state=active]:bg-amber-600 data-[state=active]:text-slate-950 rounded-md whitespace-nowrap"
                    >
                      <CalendarClock className="h-4 w-4 mr-2" />
                      Rondas
                    </TabsTrigger>

                    <TabsTrigger
                      value="appearance"
                      className="px-4 py-2 data-[state=active]:bg-pink-600 data-[state=active]:text-white rounded-md whitespace-nowrap"
                    >
                      <Palette className="h-4 w-4 mr-2" />
                      Aparência
                    </TabsTrigger>
                  </TabsList>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {/* Tab Contents */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <Suspense fallback={<PanelSkeleton />}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <SystemOverviewCard />
                      <ActivityLogsCard />
                    </div>
                    <TeamShiftsPanel />
                  </Suspense>
                </TabsContent>

                {permissions?.can_manage_units && (
                  <TabsContent value="units" className="mt-4">
                    <Suspense fallback={<PanelSkeleton />}>
                      <UnitsManagementCard />
                    </Suspense>
                  </TabsContent>
                )}

                {permissions?.can_manage_agents && (
                  <TabsContent value="agents" className="mt-4">
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-400" />
                          Gestão de Agentes
                        </CardTitle>
                        <CardDescription>
                          Visualize e gerencie os agentes do sistema
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          onClick={() => navigate('/agents')}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Acessar Lista de Agentes
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                <TabsContent value="bh" className="mt-4">
                  <Suspense fallback={<PanelSkeleton />}>
                    <BHControlCard />
                  </Suspense>
                </TabsContent>

                {permissions?.can_manage_announcements && (
                  <TabsContent value="announcements" className="mt-4">
                    <Suspense fallback={<PanelSkeleton />}>
                      <AnnouncementsCard />
                    </Suspense>
                  </TabsContent>
                )}

                {permissions?.can_manage_ads && (
                  <TabsContent value="ads" className="mt-4">
                    <Suspense fallback={<PanelSkeleton />}>
                      <AdvertisementsManager />
                    </Suspense>
                  </TabsContent>
                )}

                {permissions?.can_manage_screens && (
                  <TabsContent value="screens" className="mt-4">
                    <Suspense fallback={<PanelSkeleton />}>
                      <DynamicScreensManager />
                    </Suspense>
                  </TabsContent>
                )}

                <TabsContent value="rondas" className="mt-4">
                  <Suspense fallback={<PanelSkeleton />}>
                    <ScheduledRoundsManager />
                  </Suspense>
                </TabsContent>

                <TabsContent value="appearance" className="mt-4">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-pink-400" />
                        Tema Visual do Sistema
                      </CardTitle>
                      <CardDescription>
                        Defina o tema visual aplicado a todos os usuários. Esta configuração é exclusiva do administrador.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ThemeSelector />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </ThemedPanelBackground>
  );
}
