import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  KeyRound, 
  Plus, 
  Loader2, 
  Copy, 
  Check, 
  Trash2,
  RefreshCw,
  Zap,
  Clock,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivationCode {
  id: string;
  code: string;
  description: string | null;
  duration_days: number;
  is_active: boolean;
  created_by: string | null;
  used_count: number;
  max_uses: number | null;
  expires_at: string | null;
  created_at: string;
}

export function LicenseActivationCodeManager() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  // New code form state
  const [newCode, setNewCode] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [maxUses, setMaxUses] = useState<number | undefined>(undefined);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDays, setExpiryDays] = useState(30);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('license_activation_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes((data as ActivationCode[]) || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os códigos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(result);
  };

  const createCode = async () => {
    if (!newCode.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite ou gere um código.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);

      const expiresAt = hasExpiry 
        ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('license_activation_codes')
        .insert({
          code: newCode.toUpperCase().trim(),
          description: description.trim() || null,
          duration_days: durationDays,
          max_uses: maxUses || null,
          expires_at: expiresAt,
        });

      if (error) throw error;

      toast({
        title: 'Código criado',
        description: `Código ${newCode.toUpperCase()} criado com sucesso!`,
      });

      // Reset form
      setNewCode('');
      setDescription('');
      setDurationDays(30);
      setMaxUses(undefined);
      setHasExpiry(false);
      setExpiryDays(30);
      setDialogOpen(false);
      
      fetchCodes();
    } catch (error: any) {
      console.error('Error creating code:', error);
      toast({
        title: 'Erro',
        description: error.message?.includes('duplicate') 
          ? 'Este código já existe.' 
          : 'Não foi possível criar o código.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleCodeStatus = async (code: ActivationCode) => {
    try {
      const { error } = await supabase
        .from('license_activation_codes')
        .update({ is_active: !code.is_active })
        .eq('id', code.id);

      if (error) throw error;

      setCodes(codes.map(c => 
        c.id === code.id ? { ...c, is_active: !c.is_active } : c
      ));

      toast({
        title: code.is_active ? 'Código desativado' : 'Código ativado',
        description: `O código ${code.code} foi ${code.is_active ? 'desativado' : 'ativado'}.`,
      });
    } catch (error) {
      console.error('Error toggling code:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status.',
        variant: 'destructive',
      });
    }
  };

  const deleteCode = async (code: ActivationCode) => {
    if (!confirm(`Deseja excluir o código ${code.code}?`)) return;

    try {
      const { error } = await supabase
        .from('license_activation_codes')
        .delete()
        .eq('id', code.id);

      if (error) throw error;

      setCodes(codes.filter(c => c.id !== code.id));
      toast({
        title: 'Código excluído',
        description: `O código ${code.code} foi removido.`,
      });
    } catch (error) {
      console.error('Error deleting code:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o código.',
        variant: 'destructive',
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-white">Códigos de Ativação</CardTitle>
              <CardDescription>
                Gerencie códigos para reativar licenças em massa
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchCodes}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Código
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-white">
                    <Zap className="h-5 w-5 text-primary" />
                    Criar Código de Ativação
                  </DialogTitle>
                  <DialogDescription>
                    Crie um código que pode ser usado para reativar licenças
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Código</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                        placeholder="Ex: RENOV2024"
                        className="bg-slate-800 border-slate-700 uppercase"
                        maxLength={20}
                      />
                      <Button variant="outline" onClick={generateRandomCode}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição (opcional)</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Renovação mensal Janeiro 2024"
                      className="bg-slate-800 border-slate-700 resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Duração (dias)
                      </Label>
                      <Input
                        type="number"
                        value={durationDays}
                        onChange={(e) => setDurationDays(parseInt(e.target.value) || 30)}
                        min={1}
                        max={365}
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Máx. Usos (opcional)
                      </Label>
                      <Input
                        type="number"
                        value={maxUses || ''}
                        onChange={(e) => setMaxUses(parseInt(e.target.value) || undefined)}
                        min={1}
                        placeholder="Ilimitado"
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Código expira?</Label>
                      <Switch
                        checked={hasExpiry}
                        onCheckedChange={setHasExpiry}
                      />
                    </div>
                    {hasExpiry && (
                      <div className="space-y-2">
                        <Label>Expira em (dias)</Label>
                        <Input
                          type="number"
                          value={expiryDays}
                          onChange={(e) => setExpiryDays(parseInt(e.target.value) || 30)}
                          min={1}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createCode} disabled={creating}>
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Criar Código
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {codes.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <KeyRound className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum código criado ainda.</p>
            <p className="text-sm">Clique em "Novo Código" para começar.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-400">Código</TableHead>
                <TableHead className="text-slate-400">Descrição</TableHead>
                <TableHead className="text-slate-400">Duração</TableHead>
                <TableHead className="text-slate-400">Usos</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => (
                <TableRow key={code.id} className="border-slate-700/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-slate-800 rounded text-primary font-mono">
                        {code.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyCode(code.code)}
                      >
                        {copiedCode === code.code ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-300 text-sm">
                    {code.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-cyan-400 border-cyan-500/30">
                      {code.duration_days} dias
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {code.used_count}
                    {code.max_uses && ` / ${code.max_uses}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={code.is_active}
                        onCheckedChange={() => toggleCodeStatus(code)}
                      />
                      <Badge 
                        variant={code.is_active ? 'default' : 'secondary'}
                        className={code.is_active ? 'bg-emerald-500/20 text-emerald-400' : ''}
                      >
                        {code.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => deleteCode(code)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
