import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, User, X, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileCompletionAlertProps {
  agentId: string;
  agentName: string;
}

interface AgentProfile {
  matricula: string | null;
  blood_type: string | null;
  birth_date: string | null;
  phone: string | null;
  address: string | null;
}

export function ProfileCompletionAlert({ agentId, agentName }: ProfileCompletionAlertProps) {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!agentId) return;

      // Check if already dismissed today
      const dismissedDate = localStorage.getItem(`profile_alert_dismissed_${agentId}`);
      if (dismissedDate === new Date().toDateString()) {
        setDismissed(true);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('agents')
          .select('matricula, blood_type, birth_date, phone, address')
          .eq('id', agentId)
          .single();

        if (!error && data) {
          setProfile(data);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [agentId]);

  if (isLoading || dismissed || !profile) return null;

  // Calculate completion percentage
  const fields = [
    { key: 'matricula', label: 'Matrícula', filled: !!profile.matricula },
    { key: 'blood_type', label: 'Tipo Sanguíneo', filled: !!profile.blood_type },
    { key: 'birth_date', label: 'Data de Nascimento', filled: !!profile.birth_date },
    { key: 'phone', label: 'Telefone', filled: !!profile.phone },
  ];

  const filledCount = fields.filter(f => f.filled).length;
  const completionPercent = Math.round((filledCount / fields.length) * 100);
  const missingFields = fields.filter(f => !f.filled);

  // Profile is complete
  if (completionPercent === 100) return null;

  const handleDismiss = () => {
    localStorage.setItem(`profile_alert_dismissed_${agentId}`, new Date().toDateString());
    setDismissed(true);
  };

  return (
    <Alert className="bg-gradient-to-r from-amber-900/40 to-slate-800/60 border-amber-500/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(251,191,36,0.1),transparent_50%)]" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-full bg-amber-500/20 mt-0.5">
              <User className="h-4 w-4 text-amber-400" />
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <span className="font-semibold text-amber-300 text-sm">
                  Complete seu perfil
                </span>
              </div>
              
              <AlertDescription className="text-slate-300 text-xs">
                {missingFields.length === 1 
                  ? `Falta apenas: ${missingFields[0].label}`
                  : `Faltam: ${missingFields.map(f => f.label).join(', ')}`
                }
              </AlertDescription>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Progresso</span>
                  <span className="text-amber-400 font-medium">{completionPercent}%</span>
                </div>
                <Progress 
                  value={completionPercent} 
                  className="h-1.5 bg-slate-700"
                />
              </div>

              <Button
                size="sm"
                onClick={() => navigate('/agent-profile-edit')}
                className="bg-amber-500 hover:bg-amber-600 text-black font-medium text-xs h-7 mt-1"
              >
                Completar Agora
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700/50"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}
