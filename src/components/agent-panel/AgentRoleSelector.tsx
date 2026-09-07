import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { User, Crown, Shield, ChevronDown, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentRoleSelectorProps {
  agentId: string;
  currentRole: string;
}

const roles = [
  { value: 'agent', label: 'Agente', shortLabel: 'AGT', icon: User, color: 'slate', gradient: 'from-slate-500 to-slate-600' },
  { value: 'support', label: 'Apoio', shortLabel: 'APO', icon: Shield, color: 'blue', gradient: 'from-blue-500 to-indigo-600' },
  { value: 'team_leader', label: 'Chefe', shortLabel: 'CHF', icon: Crown, color: 'amber', gradient: 'from-amber-500 to-orange-600' },
];

export function AgentRoleSelector({ agentId, currentRole }: AgentRoleSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [role, setRole] = useState(currentRole);

  const updateRole = async (newRole: string) => {
    if (newRole === role) return;

    try {
      setIsUpdating(true);
      
      const { error } = await (supabase as any)
        .from('agents')
        .update({ role: newRole })
        .eq('id', agentId);

      if (error) throw error;

      setRole(newRole);
      toast.success('Função atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar função');
    } finally {
      setIsUpdating(false);
    }
  };

  const currentRoleData = roles.find(r => r.value === role) || roles[0];
  const CurrentIcon = currentRoleData.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          type="button"
          disabled={isUpdating}
          className={cn(
            "relative flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all duration-300",
            "border-2 shadow-lg hover:scale-105 active:scale-95 overflow-hidden group",
            currentRoleData.color === 'amber' && "bg-gradient-to-br from-amber-500/20 to-orange-500/15 border-amber-500/50 hover:border-amber-400/70 text-amber-300 shadow-amber-500/20",
            currentRoleData.color === 'blue' && "bg-gradient-to-br from-blue-500/20 to-indigo-500/15 border-blue-500/50 hover:border-blue-400/70 text-blue-300 shadow-blue-500/20",
            currentRoleData.color === 'slate' && "bg-gradient-to-br from-slate-700/80 to-slate-800/80 border-slate-600/50 hover:border-slate-500/70 text-slate-300 shadow-slate-500/10"
          )}
        >
          {/* Glow effect on hover */}
          <div className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
            currentRoleData.color === 'amber' && "bg-gradient-to-r from-amber-400/0 via-amber-400/10 to-amber-400/0",
            currentRoleData.color === 'blue' && "bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0",
            currentRoleData.color === 'slate' && "bg-gradient-to-r from-slate-400/0 via-slate-400/5 to-slate-400/0"
          )} />
          
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <div className={cn(
              "p-1 rounded-lg bg-gradient-to-br",
              currentRoleData.gradient
            )}>
              <CurrentIcon className="h-3 w-3 text-white" />
            </div>
          )}
          <span className="hidden sm:inline">{currentRoleData.shortLabel}</span>
          <ChevronDown className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-600/50 rounded-xl shadow-2xl p-1.5 min-w-[160px]" 
        align="end"
      >
        <div className="px-2 py-1.5 mb-1 border-b border-slate-700/50">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selecionar Função</p>
        </div>
        {roles.map((r) => {
          const Icon = r.icon;
          const isActive = r.value === role;
          return (
            <DropdownMenuItem
              key={r.value}
              onClick={() => updateRole(r.value)}
              className={cn(
                "flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-2 my-0.5 transition-all duration-200",
                isActive 
                  ? "bg-gradient-to-r from-amber-500/20 to-orange-500/15 border border-amber-500/40" 
                  : "hover:bg-slate-700/50 border border-transparent"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg bg-gradient-to-br shadow-md",
                r.gradient
              )}>
                <Icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className={cn(
                "flex-1 font-semibold text-sm",
                isActive ? "text-amber-300" : "text-slate-300"
              )}>
                {r.label}
              </span>
              {isActive && (
                <Check className="h-4 w-4 text-amber-400" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
