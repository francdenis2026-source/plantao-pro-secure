import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, Pencil, Trash2, Eye, Loader2, Image, Video, 
  Layout, ExternalLink, Clock, Target, Megaphone, BarChart3,
  Play, X, Volume2, VolumeX, Upload, Building2, Users, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdAnalyticsDashboard } from './AdAnalyticsDashboard';

interface Advertisement {
  id: string;
  name: string;
  ad_type: string;
  content_type: string;
  title: string | null;
  description: string | null;
  media_url: string | null;
  click_url: string | null;
  cta_text: string | null;
  is_active: boolean;
  is_mandatory: boolean;
  min_view_seconds: number | null;
  frequency_type: string | null;
  frequency_limit: number | null;
  priority: number;
  target_user_types: string[] | null;
  target_unit_ids: string[] | null;
  target_teams: string[] | null;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface Unit {
  id: string;
  name: string;
  municipality: string;
}

const adTypes = [
  { value: 'banner', label: 'Banner', icon: Layout },
  { value: 'popup', label: 'Popup', icon: Megaphone },
  { value: 'fullscreen', label: 'Tela Cheia', icon: Image },
  { value: 'video', label: 'Vídeo', icon: Video },
  { value: 'card', label: 'Card', icon: Layout },
];

const contentTypes = [
  { value: 'image', label: 'Imagem' },
  { value: 'video', label: 'Vídeo' },
  { value: 'html', label: 'HTML' },
  { value: 'interactive', label: 'Interativo' },
];

const frequencyTypes = [
  { value: 'per_login', label: 'Por Login' },
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'once', label: 'Uma Vez' },
];

const teams = [
  { value: 'alfa', label: 'Alfa' },
  { value: 'bravo', label: 'Bravo' },
  { value: 'charlie', label: 'Charlie' },
  { value: 'delta', label: 'Delta' },
];

const userTypes = [
  { value: 'all', label: 'Todos' },
  { value: 'agent', label: 'Agentes' },
  { value: 'admin', label: 'Admins' },
  { value: 'master', label: 'Master' },
];

// Video Preview Dialog Component
function VideoPreviewDialog({ 
  isOpen, 
  onClose, 
  videoUrl, 
  title 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  videoUrl: string; 
  title: string;
}) {
  const [isMuted, setIsMuted] = useState(false);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 p-0 overflow-hidden">
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-purple-400" />
                <span className="text-white font-medium">{title}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
          <div className="aspect-video bg-black">
            <video
              src={videoUrl}
              controls
              autoPlay
              muted={isMuted}
              className="w-full h-full"
            >
              Seu navegador não suporta vídeo.
            </video>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdvertisementsManager() {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [videoPreview, setVideoPreview] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });
  
  const [formData, setFormData] = useState({
    name: '',
    ad_type: 'banner',
    content_type: 'image',
    title: '',
    description: '',
    media_url: '',
    click_url: '',
    cta_text: '',
    is_active: false,
    is_mandatory: false,
    min_view_seconds: 5,
    frequency_type: 'per_login',
    frequency_limit: 1,
    priority: 0,
    target_user_types: ['all'] as string[],
    target_unit_ids: [] as string[],
    target_teams: [] as string[],
  });

  useEffect(() => {
    fetchAds();
    fetchUnits();
  }, []);

  const fetchAds = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
      toast({ title: 'Erro ao carregar propagandas', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('id, name, municipality')
        .order('name');

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 50MB for videos, 10MB for images)
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ 
        title: 'Arquivo muito grande', 
        description: `Máximo: ${file.type.startsWith('video/') ? '50MB' : '10MB'}`,
        variant: 'destructive' 
      });
      return;
    }

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast({ title: 'Tipo de arquivo não suportado', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('ads')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        media_url: publicUrl,
        content_type: isVideo ? 'video' : 'image'
      }));

      toast({ title: 'Arquivo enviado com sucesso' });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({ title: 'Erro ao enviar arquivo', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenDialog = (ad?: Advertisement) => {
    if (ad) {
      setEditingAd(ad);
      setFormData({
        name: ad.name,
        ad_type: ad.ad_type,
        content_type: ad.content_type,
        title: ad.title || '',
        description: ad.description || '',
        media_url: ad.media_url || '',
        click_url: ad.click_url || '',
        cta_text: ad.cta_text || '',
        is_active: ad.is_active,
        is_mandatory: ad.is_mandatory,
        min_view_seconds: ad.min_view_seconds || 5,
        frequency_type: ad.frequency_type || 'per_login',
        frequency_limit: ad.frequency_limit || 1,
        priority: ad.priority,
        target_user_types: ad.target_user_types || ['all'],
        target_unit_ids: ad.target_unit_ids || [],
        target_teams: ad.target_teams || [],
      });
    } else {
      setEditingAd(null);
      setFormData({
        name: '',
        ad_type: 'banner',
        content_type: 'image',
        title: '',
        description: '',
        media_url: '',
        click_url: '',
        cta_text: '',
        is_active: false,
        is_mandatory: false,
        min_view_seconds: 5,
        frequency_type: 'per_login',
        frequency_limit: 1,
        priority: 0,
        target_user_types: ['all'],
        target_unit_ids: [],
        target_teams: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        ad_type: formData.ad_type,
        content_type: formData.content_type,
        title: formData.title || null,
        description: formData.description || null,
        media_url: formData.media_url || null,
        click_url: formData.click_url || null,
        cta_text: formData.cta_text || null,
        is_active: formData.is_active,
        is_mandatory: formData.is_mandatory,
        min_view_seconds: formData.min_view_seconds,
        frequency_type: formData.frequency_type,
        frequency_limit: formData.frequency_limit,
        priority: formData.priority,
        target_user_types: formData.target_user_types,
        target_unit_ids: formData.target_unit_ids,
        target_teams: formData.target_teams,
      };

      if (editingAd) {
        const { error } = await supabase
          .from('advertisements')
          .update(payload)
          .eq('id', editingAd.id);

        if (error) throw error;
        toast({ title: 'Propaganda atualizada com sucesso' });
      } else {
        const { error } = await supabase
          .from('advertisements')
          .insert(payload);

        if (error) throw error;
        toast({ title: 'Propaganda criada com sucesso' });
      }

      setIsDialogOpen(false);
      fetchAds();
    } catch (error) {
      console.error('Error saving ad:', error);
      toast({ title: 'Erro ao salvar propaganda', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta propaganda?')) return;

    try {
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Propaganda excluída' });
      fetchAds();
    } catch (error) {
      console.error('Error deleting ad:', error);
      toast({ title: 'Erro ao excluir propaganda', variant: 'destructive' });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchAds();
    } catch (error) {
      console.error('Error toggling ad:', error);
    }
  };

  const handlePreviewMedia = (ad: Advertisement) => {
    if (!ad.media_url) return;
    
    const isVideo = ad.content_type === 'video' || 
                    ad.ad_type === 'video' || 
                    ad.media_url.match(/\.(mp4|webm|ogg|mov)$/i);
    
    if (isVideo) {
      setVideoPreview({
        isOpen: true,
        url: ad.media_url,
        title: ad.title || ad.name
      });
    } else {
      window.open(ad.media_url, '_blank');
    }
  };

  const isVideoAd = (ad: Advertisement) => {
    return ad.content_type === 'video' || 
           ad.ad_type === 'video' || 
           (ad.media_url && ad.media_url.match(/\.(mp4|webm|ogg|mov)$/i));
  };

  const toggleTeam = (team: string) => {
    setFormData(prev => ({
      ...prev,
      target_teams: prev.target_teams.includes(team)
        ? prev.target_teams.filter(t => t !== team)
        : [...prev.target_teams, team]
    }));
  };

  const toggleUnit = (unitId: string) => {
    setFormData(prev => ({
      ...prev,
      target_unit_ids: prev.target_unit_ids.includes(unitId)
        ? prev.target_unit_ids.filter(u => u !== unitId)
        : [...prev.target_unit_ids, unitId]
    }));
  };

  const toggleUserType = (type: string) => {
    if (type === 'all') {
      setFormData(prev => ({
        ...prev,
        target_user_types: ['all']
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        target_user_types: prev.target_user_types.includes('all')
          ? [type]
          : prev.target_user_types.includes(type)
            ? prev.target_user_types.filter(t => t !== type)
            : [...prev.target_user_types.filter(t => t !== 'all'), type]
      }));
    }
  };

  const getSegmentationSummary = (ad: Advertisement) => {
    const parts: string[] = [];
    
    if (ad.target_teams && ad.target_teams.length > 0) {
      parts.push(`${ad.target_teams.length} equipe(s)`);
    }
    if (ad.target_unit_ids && ad.target_unit_ids.length > 0) {
      parts.push(`${ad.target_unit_ids.length} unidade(s)`);
    }
    if (ad.target_user_types && !ad.target_user_types.includes('all') && ad.target_user_types.length > 0) {
      parts.push(`${ad.target_user_types.length} tipo(s)`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Todos';
  };

  return (
    <>
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Megaphone className="h-5 w-5 text-purple-400" />
                Gestão de Propagandas
              </CardTitle>
              <CardDescription className="mt-1">
                Crie e gerencie banners, popups e vídeos com segmentação
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'analytics')}>
                <TabsList className="bg-slate-700/50 h-9">
                  <TabsTrigger value="list" className="text-xs px-3 data-[state=active]:bg-purple-600">
                    <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                    Lista
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="text-xs px-3 data-[state=active]:bg-purple-600">
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                    Analytics
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {activeTab === 'list' && (
                <Button 
                  onClick={() => handleOpenDialog()} 
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nova
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'analytics' ? (
            <AdAnalyticsDashboard />
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          ) : ads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Nenhuma propaganda cadastrada</p>
              <Button 
                onClick={() => handleOpenDialog()} 
                variant="outline" 
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Propaganda
              </Button>
            </div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="whitespace-nowrap">Nome</TableHead>
                    <TableHead className="whitespace-nowrap">Tipo</TableHead>
                    <TableHead className="whitespace-nowrap">Segmentação</TableHead>
                    <TableHead className="whitespace-nowrap text-center">Prio</TableHead>
                    <TableHead className="whitespace-nowrap text-center">Status</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.map((ad) => (
                    <TableRow key={ad.id} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell className="max-w-[180px]">
                        <div className="truncate">
                          <div className="font-medium text-white truncate">{ad.name}</div>
                          {ad.title && (
                            <div className="text-xs text-muted-foreground truncate">{ad.title}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`whitespace-nowrap ${
                            ad.ad_type === 'video' 
                              ? 'border-rose-500/50 text-rose-300 bg-rose-500/10' 
                              : 'border-purple-500/50 text-purple-300'
                          }`}
                        >
                          {ad.ad_type === 'video' && <Video className="h-3 w-3 mr-1" />}
                          {adTypes.find(t => t.value === ad.ad_type)?.label || ad.ad_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {getSegmentationSummary(ad)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">{ad.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={ad.is_active}
                          onCheckedChange={() => toggleActive(ad.id, ad.is_active)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {ad.media_url && (
                            <>
                              {isVideoAd(ad) ? (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handlePreviewMedia(ad)}
                                  className="h-8 w-8 border-rose-500/50 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
                                  title="Assistir Vídeo"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePreviewMedia(ad)}
                                  className="h-8 w-8"
                                  title="Visualizar"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(ad)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            onClick={() => handleDelete(ad.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl bg-slate-900 border-slate-700 max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingAd ? (
                <>
                  <Pencil className="h-5 w-5 text-purple-400" />
                  Editar Propaganda
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-purple-400" />
                  Nova Propaganda
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="grid gap-4 py-4">
              {/* Row 1: Name and Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome*</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome interno da propaganda"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Anúncio</Label>
                  <Select
                    value={formData.ad_type}
                    onValueChange={(v) => setFormData({ ...formData, ad_type: v })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {adTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Title and Content Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título (exibido)</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Título exibido ao usuário"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Conteúdo</Label>
                  <Select
                    value={formData.content_type}
                    onValueChange={(v) => setFormData({ ...formData, content_type: v })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Description */}
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do anúncio"
                  className="bg-slate-800 border-slate-600"
                  rows={2}
                />
              </div>

              {/* Row 4: Media Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload de Mídia
                </Label>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Selecionar Imagem ou Vídeo
                      </>
                    )}
                  </Button>
                  {formData.media_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(formData.media_url, '_blank')}
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {formData.media_url && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-slate-800/50 p-2 rounded">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span className="truncate flex-1">{formData.media_url}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, media_url: '' })}
                      className="h-6 px-2 text-xs"
                    >
                      Remover
                    </Button>
                  </div>
                )}
              </div>

              {/* Row 5: URLs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    {formData.content_type === 'video' ? (
                      <>
                        <Video className="h-4 w-4 text-rose-400" />
                        URL do Vídeo (ou use upload)
                      </>
                    ) : (
                      <>
                        <Image className="h-4 w-4" />
                        URL da Mídia (ou use upload)
                      </>
                    )}
                  </Label>
                  <Input
                    value={formData.media_url}
                    onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                    placeholder="https://..."
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    URL de Clique
                  </Label>
                  <Input
                    value={formData.click_url}
                    onChange={(e) => setFormData({ ...formData, click_url: e.target.value })}
                    placeholder="https://..."
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
              </div>

              {/* Segmentation Section */}
              <div className="space-y-4 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-400" />
                  <Label className="text-base font-medium">Segmentação</Label>
                </div>

                {/* Target User Types */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    Tipos de Usuário
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {userTypes.map((type) => (
                      <Badge
                        key={type.value}
                        variant="outline"
                        className={`cursor-pointer transition-colors ${
                          formData.target_user_types.includes(type.value)
                            ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                            : 'hover:bg-slate-700'
                        }`}
                        onClick={() => toggleUserType(type.value)}
                      >
                        {formData.target_user_types.includes(type.value) && (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        {type.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Target Teams */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    Equipes (vazio = todas)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {teams.map((team) => (
                      <Badge
                        key={team.value}
                        variant="outline"
                        className={`cursor-pointer transition-colors ${
                          formData.target_teams.includes(team.value)
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'hover:bg-slate-700'
                        }`}
                        onClick={() => toggleTeam(team.value)}
                      >
                        {formData.target_teams.includes(team.value) && (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        {team.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Target Units */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" />
                    Unidades (vazio = todas)
                  </Label>
                  {units.length > 0 ? (
                    <ScrollArea className="max-h-32 border border-slate-700 rounded-md p-2">
                      <div className="space-y-1">
                        {units.map((unit) => (
                          <div 
                            key={unit.id}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                              formData.target_unit_ids.includes(unit.id)
                                ? 'bg-blue-500/20 border border-blue-500/50'
                                : 'hover:bg-slate-700/50'
                            }`}
                            onClick={() => toggleUnit(unit.id)}
                          >
                            <Checkbox 
                              checked={formData.target_unit_ids.includes(unit.id)}
                              onCheckedChange={() => toggleUnit(unit.id)}
                            />
                            <span className="text-sm">{unit.name}</span>
                            <span className="text-xs text-muted-foreground">({unit.municipality})</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma unidade cadastrada</p>
                  )}
                </div>
              </div>

              {/* Row 6: CTA, Frequency, Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-700">
                <div className="space-y-2">
                  <Label>Texto do Botão (CTA)</Label>
                  <Input
                    value={formData.cta_text}
                    onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                    placeholder="Saiba mais"
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={formData.frequency_type}
                    onValueChange={(v) => setFormData({ ...formData, frequency_type: v })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyTypes.map((type) => (
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

              {/* Row 7: Time limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Tempo mínimo (segundos)
                  </Label>
                  <Input
                    type="number"
                    value={formData.min_view_seconds}
                    onChange={(e) => setFormData({ ...formData, min_view_seconds: parseInt(e.target.value) || 5 })}
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Limite de exibições</Label>
                  <Input
                    type="number"
                    value={formData.frequency_limit}
                    onChange={(e) => setFormData({ ...formData, frequency_limit: parseInt(e.target.value) || 1 })}
                    className="bg-slate-800 border-slate-600"
                  />
                </div>
              </div>

              {/* Row 8: Toggles */}
              <div className="flex flex-wrap gap-6 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                  />
                  <Label>Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_mandatory}
                    onCheckedChange={(v) => setFormData({ ...formData, is_mandatory: v })}
                  />
                  <Label>Obrigatório</Label>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="border-t border-slate-700 pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingAd ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <VideoPreviewDialog
        isOpen={videoPreview.isOpen}
        onClose={() => setVideoPreview({ isOpen: false, url: '', title: '' })}
        videoUrl={videoPreview.url}
        title={videoPreview.title}
      />
    </>
  );
}
