import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, Pencil, Trash2, Loader2, Layout, Monitor, 
  Maximize, Square, AlertCircle 
} from 'lucide-react';

interface DynamicScreen {
  id: string;
  name: string;
  slug: string;
  screen_type: string;
  title: string | null;
  subtitle: string | null;
  is_active: boolean;
  priority: number;
  show_on_login: boolean | null;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const screenTypes = [
  { value: 'welcome', label: 'Boas-vindas', icon: Layout },
  { value: 'banner', label: 'Banner', icon: Square },
  { value: 'modal', label: 'Modal', icon: AlertCircle },
  { value: 'fullscreen', label: 'Tela Cheia', icon: Maximize },
];

export function DynamicScreensManager() {
  const [screens, setScreens] = useState<DynamicScreen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<DynamicScreen | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    screen_type: 'welcome',
    title: '',
    subtitle: '',
    is_active: false,
    priority: 0,
    show_on_login: false,
  });

  useEffect(() => {
    fetchScreens();
  }, []);

  const fetchScreens = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('dynamic_screens')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setScreens(data || []);
    } catch (error) {
      console.error('Error fetching screens:', error);
      toast({ title: 'Erro ao carregar telas', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (screen?: DynamicScreen) => {
    if (screen) {
      setEditingScreen(screen);
      setFormData({
        name: screen.name,
        slug: screen.slug,
        screen_type: screen.screen_type,
        title: screen.title || '',
        subtitle: screen.subtitle || '',
        is_active: screen.is_active,
        priority: screen.priority,
        show_on_login: screen.show_on_login || false,
      });
    } else {
      setEditingScreen(null);
      setFormData({
        name: '',
        slug: '',
        screen_type: 'welcome',
        title: '',
        subtitle: '',
        is_active: false,
        priority: 0,
        show_on_login: false,
      });
    }
    setIsDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    const slug = formData.slug || generateSlug(formData.name);

    setIsSaving(true);
    try {
      if (editingScreen) {
        const { error } = await supabase
          .from('dynamic_screens')
          .update({
            name: formData.name,
            slug,
            screen_type: formData.screen_type,
            title: formData.title || null,
            subtitle: formData.subtitle || null,
            is_active: formData.is_active,
            priority: formData.priority,
            show_on_login: formData.show_on_login,
          })
          .eq('id', editingScreen.id);

        if (error) throw error;
        toast({ title: 'Tela atualizada com sucesso' });
      } else {
        const { error } = await supabase
          .from('dynamic_screens')
          .insert({
            name: formData.name,
            slug,
            screen_type: formData.screen_type,
            title: formData.title || null,
            subtitle: formData.subtitle || null,
            is_active: formData.is_active,
            priority: formData.priority,
            show_on_login: formData.show_on_login,
          });

        if (error) throw error;
        toast({ title: 'Tela criada com sucesso' });
      }

      setIsDialogOpen(false);
      fetchScreens();
    } catch (error: any) {
      console.error('Error saving screen:', error);
      if (error.code === '23505') {
        toast({ title: 'Slug já existe', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao salvar tela', variant: 'destructive' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tela?')) return;

    try {
      const { error } = await supabase
        .from('dynamic_screens')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Tela excluída' });
      fetchScreens();
    } catch (error) {
      console.error('Error deleting screen:', error);
      toast({ title: 'Erro ao excluir tela', variant: 'destructive' });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('dynamic_screens')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchScreens();
    } catch (error) {
      console.error('Error toggling screen:', error);
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-cyan-400" />
              Telas Dinâmicas
            </CardTitle>
            <CardDescription>
              Crie telas de boas-vindas, modais e banners personalizados
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="h-4 w-4 mr-2" />
            Nova Tela
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        ) : screens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Monitor className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma tela dinâmica cadastrada</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {screens.map((screen) => (
                <TableRow key={screen.id} className="border-slate-700">
                  <TableCell>
                    <div>
                      <div className="font-medium">{screen.name}</div>
                      {screen.title && (
                        <div className="text-xs text-muted-foreground">{screen.title}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-slate-700 px-2 py-1 rounded">
                      {screen.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-cyan-500/50 text-cyan-300">
                      {screenTypes.find(t => t.value === screen.screen_type)?.label || screen.screen_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {screen.show_on_login && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
                        Sim
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={screen.is_active}
                      onCheckedChange={() => toggleActive(screen.id, screen.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(screen)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => handleDelete(screen.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle>
              {editingScreen ? 'Editar Tela' : 'Nova Tela'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome*</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      name: e.target.value,
                      slug: generateSlug(e.target.value)
                    });
                  }}
                  placeholder="Nome da tela"
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="slug-da-tela"
                  className="bg-slate-800 border-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.screen_type}
                  onValueChange={(v) => setFormData({ ...formData, screen_type: v })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {screenTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título exibido"
                className="bg-slate-800 border-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Textarea
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Descrição ou subtítulo"
                className="bg-slate-800 border-slate-600"
                rows={2}
              />
            </div>

            <div className="flex gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Ativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.show_on_login}
                  onCheckedChange={(v) => setFormData({ ...formData, show_on_login: v })}
                />
                <Label>Mostrar no Login</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-cyan-600 hover:bg-cyan-700">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingScreen ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
