import { useState, useEffect, useMemo } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertTriangle, Clock, DollarSign, CreditCard, Search, RefreshCw, 
  CheckCircle2, XCircle, Calendar, TrendingUp, Wallet, Bell, 
  User, Filter, Download, Send, Shield, AlertCircle, Mail, MessageSquare
} from 'lucide-react';
import { format, differenceInDays, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { isLicenseExpired } from '@/lib/license';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  cpf: string | null;
  team: string | null;
  license_status: string | null;
  license_expires_at: string | null;
  is_active: boolean;
  unit?: { name: string; municipality: string } | null;
}

interface Payment {
  id: string;
  agent_id: string;
  amount: number;
  months_paid: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  agent?: { name: string; cpf: string | null; team: string | null } | null;
}

interface FinanceSummary {
  totalReceived: number;
  totalAgents: number;
  paidAgents: number;
  pendingAgents: number;
  expiringThisMonth: number;
  expiredCount: number;
}

export function LicenseFinanceControl() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 200);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState('expired');
  
  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('50');
  const [paymentMonths, setPaymentMonths] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Notification state
  const [sendingNotifications, setSendingNotifications] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch agents with unit info
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, name, cpf, team, license_status, license_expires_at, is_active, unit:units(name, municipality)')
        .order('license_expires_at', { ascending: true });

      if (agentsError) throw agentsError;
      setAgents(agentsData || []);

      // Fetch payments with agent info
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*, agent:agents(name, cpf, team)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as informações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate summary
  const summary: FinanceSummary = useMemo(() => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
    const expiredAgents = agents.filter(a => isLicenseExpired(a.license_expires_at));
    const expiringThisMonth = agents.filter(a => {
      if (!a.license_expires_at) return false;
      const expiryDate = parseISO(a.license_expires_at);
      return expiryDate <= endOfMonth && !isLicenseExpired(a.license_expires_at);
    });
    
    const agentsWithPayments = new Set(payments.map(p => p.agent_id));
    
    return {
      totalReceived,
      totalAgents: agents.length,
      paidAgents: agentsWithPayments.size,
      pendingAgents: agents.length - agentsWithPayments.size,
      expiringThisMonth: expiringThisMonth.length,
      expiredCount: expiredAgents.length,
    };
  }, [agents, payments]);

  // Filter expired licenses
  const expiredAgents = useMemo(() => {
    return agents.filter(a => isLicenseExpired(a.license_expires_at));
  }, [agents]);

  // Filter expiring soon (next 30 days)
  const expiringAgents = useMemo(() => {
    const now = new Date();
    return agents.filter(a => {
      if (!a.license_expires_at || isLicenseExpired(a.license_expires_at)) return false;
      const expiryDate = parseISO(a.license_expires_at);
      const daysUntil = differenceInDays(expiryDate, now);
      return daysUntil <= 30 && daysUntil > 0;
    }).sort((a, b) => {
      const dateA = parseISO(a.license_expires_at!);
      const dateB = parseISO(b.license_expires_at!);
      return dateA.getTime() - dateB.getTime();
    });
  }, [agents]);

  // Filtered agents for display
  const filteredAgents = useMemo(() => {
    let list = agents;
    
    if (filterStatus === 'expired') {
      list = expiredAgents;
    } else if (filterStatus === 'expiring') {
      list = expiringAgents;
    } else if (filterStatus === 'active') {
      list = agents.filter(a => a.license_status === 'active' && !isLicenseExpired(a.license_expires_at));
    }
    
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      list = list.filter(a => 
        a.name.toLowerCase().includes(term) ||
        a.cpf?.includes(term) ||
        a.team?.toLowerCase().includes(term)
      );
    }
    
    return list;
  }, [agents, filterStatus, debouncedSearchTerm, expiredAgents, expiringAgents]);


  const handleRegisterPayment = async () => {
    if (!selectedAgent) return;
    
    setSubmitting(true);
    try {
      const amount = parseFloat(paymentAmount);
      const months = parseInt(paymentMonths);
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Valor inválido');
      }
      
      // Register payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          agent_id: selectedAgent.id,
          amount,
          months_paid: months,
          payment_method: paymentMethod,
          notes: paymentNotes || null,
        });

      if (paymentError) throw paymentError;

      // Update license expiry
      const currentExpiry = selectedAgent.license_expires_at 
        ? parseISO(selectedAgent.license_expires_at)
        : new Date();
      
      const baseDate = isLicenseExpired(selectedAgent.license_expires_at) ? new Date() : currentExpiry;
      const newExpiry = addMonths(baseDate, months);

      const { error: updateError } = await supabase
        .from('agents')
        .update({
          license_expires_at: newExpiry.toISOString(),
          license_status: 'active',
        })
        .eq('id', selectedAgent.id);

      if (updateError) throw updateError;

      toast({
        title: '✅ Pagamento Registrado',
        description: `Licença de ${selectedAgent.name} renovada até ${format(newExpiry, 'dd/MM/yyyy')}.`,
      });

      setPaymentDialogOpen(false);
      setSelectedAgent(null);
      setPaymentAmount('50');
      setPaymentMonths('1');
      setPaymentNotes('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar pagamento',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendNotifications = async (daysBeforeExpiry: number = 7) => {
    setSendingNotifications(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-license-expiry-notification', {
        body: { daysBeforeExpiry, notificationType: 'email' }
      });

      if (error) throw error;

      toast({
        title: '📧 Notificações Enviadas',
        description: `${data.notificationsSent} notificação(ões) enviada(s) com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar notificações',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSendingNotifications(false);
    }
  };

  const getDaysUntilExpiry = (expiresAt: string | null): number | null => {
    if (!expiresAt) return null;
    const expiryDate = parseISO(expiresAt);
    return differenceInDays(expiryDate, new Date());
  };

  const getExpiryBadge = (expiresAt: string | null) => {
    if (!expiresAt) return <Badge variant="outline" className="text-muted-foreground">Sem data</Badge>;
    
    const days = getDaysUntilExpiry(expiresAt);
    if (days === null) return null;
    
    if (days < 0) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Expirado há {Math.abs(days)}d
        </Badge>
      );
    }
    
    if (days === 0) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Expira hoje!
        </Badge>
      );
    }
    
    if (days <= 7) {
      return (
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
          <AlertCircle className="h-3 w-3 mr-1" />
          {days}d restantes
        </Badge>
      );
    }
    
    if (days <= 30) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <Clock className="h-3 w-3 mr-1" />
          {days}d restantes
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {days}d restantes
      </Badge>
    );
  };

  const getTeamColor = (team: string | null) => {
    switch (team) {
      case 'ALFA': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'BRAVO': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'CHARLIE': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'DELTA': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Banner for Expired Licenses */}
      {summary.expiredCount > 0 && (
        <Card className="border-red-500/50 bg-red-500/10 animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-500/20">
                <Bell className="h-6 w-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Atenção: {summary.expiredCount} licença(s) expirada(s)!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Existem agentes com licenças vencidas que precisam de renovação imediata.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                  onClick={() => handleSendNotifications(7)}
                  disabled={sendingNotifications}
                >
                  {sendingNotifications ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Mail className="h-4 w-4 mr-1" />
                  )}
                  Notificar
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    setFilterStatus('expired');
                    setActiveSubTab('agents');
                  }}
                >
                  Ver Expirados
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="glass glass-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Total Recebido</p>
                <p className="text-lg font-bold text-green-400">
                  R$ {summary.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass glass-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Total Agentes</p>
                <p className="text-lg font-bold">{summary.totalAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass glass-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Já Pagaram</p>
                <p className="text-lg font-bold text-green-400">{summary.paidAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass glass-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Nunca Pagaram</p>
                <p className="text-lg font-bold text-yellow-400">{summary.pendingAgents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass glass-border border-orange-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Expirando</p>
                <p className="text-lg font-bold text-orange-400">{summary.expiringThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn("glass glass-border", summary.expiredCount > 0 && "border-red-500/50 bg-red-500/5")}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Expirados</p>
                <p className="text-lg font-bold text-red-400">{summary.expiredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="expired" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Expirados
            {summary.expiredCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                {summary.expiredCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1">
            <User className="h-3 w-3" />
            Todos
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1">
            <DollarSign className="h-3 w-3" />
            Pagamentos
          </TabsTrigger>
        </TabsList>

        {/* Expired Tab */}
        <TabsContent value="expired" className="mt-4 space-y-4">
          {expiredAgents.length === 0 ? (
            <Card className="glass glass-border">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Nenhuma licença expirada!</h3>
                <p className="text-muted-foreground text-sm">
                  Todas as licenças estão em dia. Continue monitorando.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass glass-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  Licenças Expiradas ({expiredAgents.length})
                </CardTitle>
                <CardDescription>
                  Agentes que precisam renovar imediatamente
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agente</TableHead>
                        <TableHead>Equipe</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Expirou em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiredAgents.map((agent) => (
                        <TableRow key={agent.id} className="border-red-500/20">
                          <TableCell className="font-medium">{agent.name}</TableCell>
                          <TableCell>
                            <Badge className={getTeamColor(agent.team)}>{agent.team || '-'}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{agent.cpf || '-'}</TableCell>
                          <TableCell className="text-sm">
                            {agent.license_expires_at 
                              ? format(parseISO(agent.license_expires_at), 'dd/MM/yyyy', { locale: ptBR })
                              : '-'}
                          </TableCell>
                          <TableCell>{getExpiryBadge(agent.license_expires_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-500"
                              onClick={() => {
                                setSelectedAgent(agent);
                                setPaymentDialogOpen(true);
                              }}
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Renovar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Expiring Soon Section */}
          {expiringAgents.length > 0 && (
            <Card className="glass glass-border border-orange-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-orange-400">
                  <Clock className="h-4 w-4" />
                  Expirando em Breve ({expiringAgents.length})
                </CardTitle>
                <CardDescription>
                  Agentes com licença expirando nos próximos 30 dias
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[250px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agente</TableHead>
                        <TableHead>Equipe</TableHead>
                        <TableHead>Expira em</TableHead>
                        <TableHead>Dias</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiringAgents.map((agent) => (
                        <TableRow key={agent.id}>
                          <TableCell className="font-medium">{agent.name}</TableCell>
                          <TableCell>
                            <Badge className={getTeamColor(agent.team)}>{agent.team || '-'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {agent.license_expires_at 
                              ? format(parseISO(agent.license_expires_at), 'dd/MM/yyyy', { locale: ptBR })
                              : '-'}
                          </TableCell>
                          <TableCell>{getExpiryBadge(agent.license_expires_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAgent(agent);
                                setPaymentDialogOpen(true);
                              }}
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Renovar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* All Agents Tab */}
        <TabsContent value="agents" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar agente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="expiring">Expirando</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>

          <Card className="glass glass-border">
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agente</TableHead>
                      <TableHead>Equipe</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{agent.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{agent.cpf || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTeamColor(agent.team)}>{agent.team || '-'}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{agent.unit?.name || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {agent.license_expires_at 
                            ? format(parseISO(agent.license_expires_at), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell>{getExpiryBadge(agent.license_expires_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={isLicenseExpired(agent.license_expires_at) ? 'default' : 'outline'}
                            className={isLicenseExpired(agent.license_expires_at) ? 'bg-green-600 hover:bg-green-500' : ''}
                            onClick={() => {
                              setSelectedAgent(agent);
                              setPaymentDialogOpen(true);
                            }}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            {isLicenseExpired(agent.license_expires_at) ? 'Renovar' : 'Pagamento'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4 space-y-4">
          <Card className="glass glass-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Histórico de Pagamentos
              </CardTitle>
              <CardDescription>
                Últimos 100 pagamentos registrados
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="p-8 text-center">
                  <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Nenhum pagamento registrado ainda.</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Agente</TableHead>
                        <TableHead>Equipe</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Meses</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Obs.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="text-sm">
                            {format(parseISO(payment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium">{payment.agent?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge className={getTeamColor(payment.agent?.team || null)}>
                              {payment.agent?.team || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-green-400 font-medium">
                            R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.months_paid} mês(es)</Badge>
                          </TableCell>
                          <TableCell className="text-sm capitalize">{payment.payment_method || '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                            {payment.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-500" />
              Registrar Pagamento
            </DialogTitle>
            <DialogDescription>
              {selectedAgent && (
                <span>
                  Registrar pagamento para <strong>{selectedAgent.name}</strong>
                  {selectedAgent.team && (
                    <Badge className={cn("ml-2", getTeamColor(selectedAgent.team))}>
                      {selectedAgent.team}
                    </Badge>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedAgent && isLicenseExpired(selectedAgent.license_expires_at) && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Licença expirada - renovação necessária!
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor (R$)</label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="50.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Meses</label>
                <Select value={paymentMonths} onValueChange={setPaymentMonths}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mês</SelectItem>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">12 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Método de Pagamento</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Input
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Notas adicionais..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRegisterPayment} 
              disabled={submitting}
              className="bg-green-600 hover:bg-green-500"
            >
              {submitting ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
