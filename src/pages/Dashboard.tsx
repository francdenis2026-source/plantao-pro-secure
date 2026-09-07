import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { PanelSkeleton } from '@/components/ui/panel-skeleton';
import { SystemOverviewCard } from '@/components/dashboard/SystemOverviewCard';
import { ActivityLogsCard } from '@/components/dashboard/ActivityLogsCard';
import { SecurityAuditCard } from '@/components/dashboard/SecurityAuditCard';
import { UnitsManagementCard } from '@/components/dashboard/UnitsManagementCard';
import { BHControlCard } from '@/components/dashboard/BHControlCard';
import { AnnouncementsCard } from '@/components/dashboard/AnnouncementsCard';
import { TeamShiftsPanel } from '@/components/dashboard/TeamShiftsPanel';
const OvertimeChart = lazy(() => import('@/components/dashboard/OvertimeChart').then(m => ({ default: m.OvertimeChart })));
import { ShiftConflictsBanner } from '@/components/dashboard/ShiftConflictsBanner';
import hudPageBg_ptr from '@/assets/hero-tactical-ops.jpg.asset.json';
const hudPageBg = (hudPageBg_ptr as {url:string}).url;
const hudBgStyle = { ['--hud-bg-url' as any]: `url(${hudPageBg})` };
import { Icon3D, type Icon3DName } from '@/components/ui/Icon3D';

import { useShiftConflictDetection } from '@/hooks/useShiftConflictDetection';
import { ThemedPanelBackground } from '@/components/ThemedPanelBackground';
import { CopyrightFooter } from '@/components/CopyrightFooter';
import { Users, Clock, Calendar, Building2, Loader2, ArrowLeft, LayoutDashboard, Settings, MessageSquare, FileText, Home, LogOut } from 'lucide-react';
import { PanelNav } from '@/components/ui/panel-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Dashboard() {
  const { user, isLoading, isAdmin, masterSession, signOut, setMasterSession } = useAuth();
  const navigate = useNavigate();

  const handleExit = async () => {
    if (masterSession) {
      setMasterSession(null);
      localStorage.removeItem('master_token');
      sessionStorage.removeItem('master_session');
    } else {
      await signOut();
    }
    navigate('/', { replace: true });
  };

  // Shift conflict detection for admins
  const {
    conflicts,
    isChecking: isCheckingConflicts,
    checkForConflicts,
    dismissConflict,
  } = useShiftConflictDetection({
    enabled: true,
    isAdmin: isAdmin || !!masterSession,
    unitId: null, // Global view
  });

  // ESC key navigation - goes back to previous page or home
  useBackNavigation({ enabled: true, fallbackPath: '/' });

  // Redirect only after loading is complete and we're sure there's no session
  useEffect(() => {
    if (isLoading) return;
    
    // Only allow admin or master
    if (!isAdmin && !masterSession) {
      navigate('/agent-panel', { replace: true });
      return;
    }
    
    if (!user && !masterSession) {
      navigate('/auth', { replace: true });
    }
  }, [user, isLoading, navigate, masterSession, isAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex hud-scope hud-page-bg" style={hudBgStyle}>
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <PanelSkeleton rows={5} />
          </div>
        </main>
      </div>
    );
  }

  // Only allow admin or master
  if (!isAdmin && !masterSession) {
    return null;
  }

  return (
    <ThemedPanelBackground team={null} showTeamImage={false}>
      <div className="min-h-dvh flex hud-scope hud-page-bg" style={hudBgStyle}>
        <Sidebar />
        <div className="flex-1 flex flex-col">
          {/* Header is rendered by AppShell layout */}
          <main className="flex-1 p-3 md:p-4 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-4 animate-fade-in tactical-strip hover-lift rounded-2xl p-1">
              {/* Page Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3">
                <PanelNav onLogout={handleExit} />
                <div>
                  <h1 className="font-tactical text-base md:text-lg font-bold tracking-[0.14em] flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                    Painel Administrativo
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Visão geral e gestão do sistema
                  </p>
                </div>
              </div>
                
                <Badge variant="outline" className="w-fit bg-primary/10 text-primary border-primary/30">
                  {masterSession ? 'Acesso Master' : 'Administrador'}
                </Badge>
              </div>

              {/* Shift Conflicts Banner */}
              {conflicts.length > 0 && (
                <ShiftConflictsBanner
                  conflicts={conflicts}
                  isChecking={isCheckingConflicts}
                  onRefresh={checkForConflicts}
                  onDismiss={dismissConflict}
                />
              )}

              {/* Quick Access Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-2">
                {([
                  { icon3d: 'building' as Icon3DName, text: 'Unidades',        color: 'text-blue-400',   bg: 'from-blue-500/20 to-blue-600/10',   route: '/units' },
                  { icon3d: 'team'     as Icon3DName, text: 'Agentes',         color: 'text-green-400',  bg: 'from-green-500/20 to-green-600/10', route: '/agents' },
                  { icon3d: 'clock'    as Icon3DName, text: 'Banco de Horas',  color: 'text-amber-400',  bg: 'from-amber-500/20 to-amber-600/10', route: '/overtime' },
                  { icon3d: 'shield'   as Icon3DName, text: 'Configurações',   color: 'text-purple-400', bg: 'from-purple-500/20 to-purple-600/10', route: '/settings' },
                ]).map((feature, i) => (
                  <div
                    key={i}
                    onClick={() => navigate(feature.route)}
                    className={`relative flex items-center gap-2.5 md:gap-2 px-3 py-3 md:p-2.5 min-h-[62px] sm:min-h-[66px] md:min-h-[58px] bg-gradient-to-br ${feature.bg} rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer group`}
                  >
                    <div className={`p-2 md:p-1.5 rounded bg-slate-800/50 ${feature.color} group-hover:scale-110 transition-transform shrink-0`}>
                      <Icon3D name={feature.icon3d} size={22} />
                    </div>
                    <span className="text-[13px] md:text-xs font-bold md:font-medium tracking-tight md:tracking-normal text-slate-200 md:text-slate-300 leading-tight truncate">
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>


              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* System Overview */}
                <SystemOverviewCard />

                {/* Units Management */}
                <UnitsManagementCard />
              </div>

              {/* BH Control and Announcements */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BHControlCard />
                <AnnouncementsCard />
              </div>

              {/* Security Audit - Full Width */}
              <SecurityAuditCard />

              {/* Activity Logs - Full Width */}
              <ActivityLogsCard />

              {/* Team Shifts Panel */}
              <TeamShiftsPanel />

              {/* Overtime Chart */}
              <Suspense fallback={<div className="h-64 rounded-lg bg-muted/20 animate-pulse" />}>
                <OvertimeChart />
              </Suspense>

              {/* Footer Copyright */}
              <CopyrightFooter className="border-t border-border/30 mt-4" />
            </div>
          </main>
        </div>
      </div>
    </ThemedPanelBackground>
  );
}
