import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/layout/Sidebar';
import { BackButton } from '@/components/BackButton';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentTransferHistory } from '@/components/agents/AgentTransferHistory';
import { UnitInfoCard } from '@/components/dashboard/UnitInfoCard';
import { Loader2, User, MapPin, Phone, Mail, Calendar, Clock, Building2, Users as UsersIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Agent {
  id: string;
  name: string;
  cpf: string | null;
  matricula: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  age: number | null;
  team: string | null;
  is_active: boolean | null;
  unit_id: string | null;
  unit: {
    id: string;
    name: string;
    municipality: string;
  } | null;
}

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  notes: string | null;
}

const shiftTypes: Record<string, string> = {
  regular: 'Regular',
  noturno: 'Noturno',
  extra: 'Extra',
  plantao: 'Plantão',
};

export default function AgentProfile() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading, masterSession } = useAuth();
  const navigate = useNavigate();
  
  useBackNavigation();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect only after loading is complete
  useEffect(() => {
    if (authLoading) return;
    
    // Don't redirect if we have any valid session
    if (user || masterSession) return;
    
    // Small delay to ensure state is settled
    const timer = setTimeout(() => {
      navigate('/auth', { replace: true });
    }, 200);
    
    return () => clearTimeout(timer);
  }, [user, authLoading, masterSession, navigate]);

  useEffect(() => {
    if (id && (user || masterSession)) {
      fetchAgentData();
      fetchAgentShifts();
    }
  }, [id, user, masterSession]);

  const fetchAgentData = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          unit:units(id, name, municipality)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setAgent(data as unknown as Agent);
    } catch (error) {
      console.error('Error fetching agent:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_shifts')
        .select('*')
        .eq('agent_id', id)
        .order('shift_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setShifts(data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    }
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'extra':
        return 'destructive';
      case 'noturno':
        return 'secondary';
      case 'plantao':
        return 'default';
      default:
        return 'outline';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Agente não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            <BackButton />

            {/* Agent Header */}
            <Card className="glass glass-border">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center">
                      <User className="h-12 w-12 text-primary-foreground" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="font-tactical text-xl font-bold tracking-[0.14em]">{agent.name}</h1>
                        <Badge variant={agent.is_active ? 'default' : 'destructive'}>
                          {agent.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {agent.team && (
                          <Badge variant="outline" className="text-primary border-primary">
                            Equipe {agent.team}
                          </Badge>
                        )}
                      </div>
                      {agent.matricula && (
                        <p className="text-muted-foreground mt-1">
                          Matrícula: {agent.matricula}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      {agent.cpf && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>CPF: {formatCPF(agent.cpf)}</span>
                        </div>
                      )}
                      {agent.unit && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span>{agent.unit.name} - {agent.unit.municipality}</span>
                        </div>
                      )}
                      {agent.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{agent.email}</span>
                        </div>
                      )}
                      {agent.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{agent.phone}</span>
                        </div>
                      )}
                      {agent.birth_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(agent.birth_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                            {agent.age && ` (${agent.age} anos)`}
                          </span>
                        </div>
                      )}
                      {agent.address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{agent.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unit Info Card */}
            {agent.unit_id && (
              <UnitInfoCard unitId={agent.unit_id} />
            )}

            {/* Tabs */}
            <Tabs defaultValue="shifts" className="space-y-6">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="shifts">Escalas</TabsTrigger>
                <TabsTrigger value="transfers">Transferências</TabsTrigger>
              </TabsList>

              <TabsContent value="shifts" className="space-y-4">
                <Card className="glass glass-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="h-5 w-5 text-primary" />
                      Histórico de Escalas
                    </CardTitle>
                    <CardDescription>
                      Últimas 50 escalas do agente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {shifts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhuma escala registrada
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {shifts.map((shift) => (
                          <div
                            key={shift.id}
                            className="p-4 bg-muted/30 rounded-lg border border-border/50 flex flex-col sm:flex-row sm:items-center gap-3"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">
                                  {format(new Date(shift.shift_date + 'T00:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                </span>
                                <Badge variant={getTypeBadgeVariant(shift.shift_type)}>
                                  {shiftTypes[shift.shift_type] || shift.shift_type}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                {shift.notes && ` • ${shift.notes}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transfers">
                <AgentTransferHistory agentId={agent.id} agentName={agent.name} />
              </TabsContent>
            </Tabs>

            {/* Developer Credit */}
            <p className="text-center text-xs text-muted-foreground mt-8">
              Desenvolvido por <span className="text-primary font-medium">CS FEIJÓ</span>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
