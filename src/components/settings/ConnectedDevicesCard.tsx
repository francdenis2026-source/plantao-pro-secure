import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, Monitor, Laptop, Tablet, Trash2, Loader2, Shield, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConnectedDevice {
  id: string;
  device_id: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  last_login_at: string | null;
  is_active: boolean;
  created_at: string;
}

// Get current device ID
const getCurrentDeviceId = (): string => {
  return localStorage.getItem('plantao_device_id') || '';
};

// Parse user agent for device info
const parseUserAgent = () => {
  const ua = navigator.userAgent;
  
  let browser = 'Navegador';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  let os = 'Sistema';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  let deviceType = 'desktop';
  if (/Android|iPhone|iPod/.test(ua)) deviceType = 'mobile';
  else if (/iPad|Tablet/.test(ua)) deviceType = 'tablet';
  
  return { browser, os, deviceType };
};

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'mobile':
      return <Smartphone className="h-5 w-5" />;
    case 'tablet':
      return <Tablet className="h-5 w-5" />;
    default:
      return <Monitor className="h-5 w-5" />;
  }
};

export function ConnectedDevicesCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  
  const currentDeviceId = getCurrentDeviceId();

  const fetchDevices = async () => {
    if (!user) return;
    
    // Don't fetch if offline
    if (!navigator.onLine) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Get current agent
      const cpf = user.email?.split('@')[0];
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('cpf', cpf)
        .single();

      if (agentError || !agent) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('saved_credentials')
        .select('*')
        .eq('agent_id', agent.id)
        .eq('is_active', true)
        .order('last_login_at', { ascending: false });

      if (error) {
        // Don't throw on network errors
        console.error('Error fetching devices:', error);
        setIsLoading(false);
        return;
      }
      setDevices(data || []);
    } catch (err) {
      // Silently handle errors to prevent 404/blank page
      console.error('Error fetching devices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [user]);

  const handleRemoveDevice = async (deviceId: string) => {
    if (!user) return;
    
    setRemovingId(deviceId);
    try {
      const cpf = user.email?.split('@')[0];
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('cpf', cpf)
        .single();

      if (!agent) return;

      // Deactivate the device session
      const { error } = await supabase
        .from('saved_credentials')
        .update({ is_active: false })
        .eq('agent_id', agent.id)
        .eq('device_id', deviceId);

      if (error) throw error;

      // Remove from local state
      setDevices(prev => prev.filter(d => d.device_id !== deviceId));

      // If removing current device, clear local storage
      if (deviceId === currentDeviceId) {
        localStorage.removeItem('plantao_saved_credentials');
      }

      toast({
        title: 'Dispositivo desconectado',
        description: 'O acesso foi revogado com sucesso.',
      });
    } catch (err) {
      console.error('Error removing device:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível desconectar o dispositivo.',
        variant: 'destructive',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemoveAllOthers = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const cpf = user.email?.split('@')[0];
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('cpf', cpf)
        .single();

      if (!agent) return;

      // Deactivate all except current device
      const { error } = await supabase
        .from('saved_credentials')
        .update({ is_active: false })
        .eq('agent_id', agent.id)
        .neq('device_id', currentDeviceId);

      if (error) throw error;

      // Update local state
      setDevices(prev => prev.filter(d => d.device_id === currentDeviceId));

      toast({
        title: 'Todos os dispositivos desconectados',
        description: 'Apenas este dispositivo permanece ativo.',
      });
    } catch (err) {
      console.error('Error removing devices:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível desconectar os dispositivos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceType = (device: ConnectedDevice) => {
    if (device.os?.includes('Android') || device.os?.includes('iOS')) return 'mobile';
    if (device.os?.includes('iPad')) return 'tablet';
    return 'desktop';
  };

  if (isLoading) {
    return (
      <Card className="glass glass-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Dispositivos Conectados
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass glass-border shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Dispositivos Conectados
            </CardTitle>
            <CardDescription>
              Gerencie os dispositivos com acesso à sua conta
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchDevices}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum dispositivo com credenciais salvas
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {devices.map((device) => {
                const isCurrentDevice = device.device_id === currentDeviceId;
                const deviceType = getDeviceType(device);
                
                return (
                  <div
                    key={device.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isCurrentDevice 
                        ? 'border-primary/50 bg-primary/5' 
                        : 'border-border/50 bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isCurrentDevice ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <DeviceIcon type={deviceType} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {device.browser || 'Navegador'} • {device.os || 'Sistema'}
                          </span>
                          {isCurrentDevice && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                              Este dispositivo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {device.last_login_at 
                            ? `Último acesso: ${formatDistanceToNow(new Date(device.last_login_at), { addSuffix: true, locale: ptBR })}`
                            : 'Acesso recente'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {!isCurrentDevice && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDevice(device.device_id)}
                        disabled={removingId === device.device_id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {removingId === device.device_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {devices.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveAllOthers}
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Desconectar todos os outros dispositivos
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}