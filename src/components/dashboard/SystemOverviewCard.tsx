import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Users, Building2, Calendar, Clock, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SystemStats {
  totalAgents: number;
  activeAgents: number;
  totalUnits: number;
  todayShifts: number;
  pendingLeaves: number;
  pendingTransfers: number;
  totalOvertimeHours: number;
  expiredLicenses: number;
}

export function SystemOverviewCard() {
  const [stats, setStats] = useState<SystemStats>({
    totalAgents: 0,
    activeAgents: 0,
    totalUnits: 0,
    todayShifts: 0,
    pendingLeaves: 0,
    pendingTransfers: 0,
    totalOvertimeHours: 0,
    expiredLicenses: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Total agents
        const { count: totalAgents } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true });

        // Active agents - APENAS conta agentes ativos E aprovados
        const { count: activeAgents } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('approval_status', 'approved');

        // Total units
        const { count: totalUnits } = await supabase
          .from('units')
          .select('*', { count: 'exact', head: true });

        // Today's shifts
        const today = new Date().toISOString().split('T')[0];
        const { count: todayShifts } = await supabase
          .from('agent_shifts')
          .select('*', { count: 'exact', head: true })
          .eq('shift_date', today);

        // Pending leaves
        const { count: pendingLeaves } = await supabase
          .from('agent_leaves')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Pending transfers
        const { count: pendingTransfers } = await supabase
          .from('transfer_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Total overtime hours
        const { data: overtimeData } = await supabase
          .from('overtime_bank')
          .select('hours, operation_type');

        let totalOvertimeHours = 0;
        if (overtimeData) {
          totalOvertimeHours = overtimeData.reduce((acc, item) => {
            return item.operation_type === 'credit' 
              ? acc + Number(item.hours) 
              : acc - Number(item.hours);
          }, 0);
        }

        // Expired licenses
        const { count: expiredLicenses } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .or('license_status.eq.expired,license_status.eq.frozen');

        setStats({
          totalAgents: totalAgents || 0,
          activeAgents: activeAgents || 0,
          totalUnits: totalUnits || 0,
          todayShifts: todayShifts || 0,
          pendingLeaves: pendingLeaves || 0,
          pendingTransfers: pendingTransfers || 0,
          totalOvertimeHours,
          expiredLicenses: expiredLicenses || 0,
        });
      } catch (err) {
        console.error('Error fetching system stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const agentActivePercentage = stats.totalAgents > 0 
    ? Math.round((stats.activeAgents / stats.totalAgents) * 100) 
    : 0;

  return (
    <Card className="glass glass-border shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-primary" />
          Visão Geral do Sistema
        </CardTitle>
        <CardDescription className="text-xs">
          Estatísticas e métricas gerais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agents Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              Agentes Ativos
            </span>
            <span className="font-medium">{stats.activeAgents}/{stats.totalAgents}</span>
          </div>
          <Progress value={agentActivePercentage} className="h-2" />
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30">
            <div className="flex items-center gap-2 text-blue-400">
              <Building2 className="h-4 w-4" />
              <span className="text-xs">Unidades</span>
            </div>
            <p className="text-xl font-bold mt-1">{stats.totalUnits}</p>
          </div>

          <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30">
            <div className="flex items-center gap-2 text-green-400">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Plantões Hoje</span>
            </div>
            <p className="text-xl font-bold mt-1">{stats.todayShifts}</p>
          </div>

          <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-400">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Banco de Horas</span>
            </div>
            <p className="text-xl font-bold mt-1">
              {stats.totalOvertimeHours > 0 ? '+' : ''}{stats.totalOvertimeHours.toFixed(0)}h
            </p>
          </div>

          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30">
            <div className="flex items-center gap-2 text-purple-400">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Taxa Ativa</span>
            </div>
            <p className="text-xl font-bold mt-1">{agentActivePercentage}%</p>
          </div>
        </div>

        {/* Pending Items */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground font-medium">Pendências</p>
          
          <div className="flex items-center justify-between py-2">
            <span className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Folgas Pendentes
            </span>
            <Badge variant={stats.pendingLeaves > 0 ? "destructive" : "secondary"}>
              {stats.pendingLeaves}
            </Badge>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              Transferências Pendentes
            </span>
            <Badge variant={stats.pendingTransfers > 0 ? "destructive" : "secondary"}>
              {stats.pendingTransfers}
            </Badge>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-sm flex items-center gap-2">
              {stats.expiredLicenses > 0 ? (
                <AlertTriangle className="h-4 w-4 text-red-400" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              )}
              Licenças Expiradas
            </span>
            <Badge variant={stats.expiredLicenses > 0 ? "destructive" : "secondary"}>
              {stats.expiredLicenses}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
