import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ActivityAction = 
  | 'login' 
  | 'logout' 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'view' 
  | 'approve' 
  | 'reject'
  | 'transfer'
  | 'activate'
  | 'deactivate';

export type ResourceType = 
  | 'agent' 
  | 'unit' 
  | 'shift' 
  | 'leave' 
  | 'overtime' 
  | 'license' 
  | 'transfer' 
  | 'settings'
  | 'credentials'
  | 'chat';

interface LogActivityParams {
  action: ActivityAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
  agentName?: string;
}

export function useActivityLog() {
  const { user } = useAuth();

  const logActivity = useCallback(async ({
    action,
    resourceType,
    resourceId,
    details,
    agentName
  }: LogActivityParams) => {
    try {
      // Get agent ID from CPF if user is logged in
      let agentId = null;
      let name = agentName;
      
      if (user?.email) {
        const cpf = user.email.split('@')[0];
        const { data: agent } = await supabase
          .from('agents')
          .select('id, name')
          .eq('cpf', cpf)
          .single();
        
        if (agent) {
          agentId = agent.id;
          name = name || agent.name;
        }
      }

      await supabase
        .from('activity_logs')
        .insert({
          agent_id: agentId,
          agent_name: name,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details,
          user_agent: navigator.userAgent.slice(0, 200)
        });
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  }, [user]);

  return { logActivity };
}
