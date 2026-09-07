import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2, Trash2, Upload } from 'lucide-react';

interface AvatarUploadProps {
  agentId: string;
  agentName: string;
  currentAvatarUrl: string | null;
  onAvatarUpdated: (url: string | null) => void;
  compact?: boolean;
}

export function AvatarUpload({ agentId, agentName, currentAvatarUrl, onAvatarUpdated, compact = false }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sync internal preview when the parent prop changes (e.g., agent loads after mount)
  useEffect(() => {
    setPreviewUrl(currentAvatarUrl);
  }, [currentAvatarUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione uma imagem (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${agentId}-${Date.now()}.${fileExt}`;
      const filePath = `${agentId}/${fileName}`;

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update agent record
      const { error: updateError } = await supabase
        .from('agents')
        .update({ avatar_url: publicUrl })
        .eq('id', agentId);

      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
      onAvatarUpdated(publicUrl);

      toast({
        title: 'Foto atualizada!',
        description: 'Sua foto de perfil foi salva com sucesso.',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar a foto. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (!currentAvatarUrl) return;

    setIsDeleting(true);

    try {
      // Delete from storage
      const filePath = currentAvatarUrl.split('/avatars/')[1];
      if (filePath) {
        await supabase.storage.from('avatars').remove([filePath]);
      }

      // Update agent record
      const { error } = await supabase
        .from('agents')
        .update({ avatar_url: null })
        .eq('id', agentId);

      if (error) throw error;

      setPreviewUrl(null);
      onAvatarUpdated(null);

      toast({
        title: 'Foto removida',
        description: 'Sua foto de perfil foi removida.',
      });
    } catch (error) {
      console.error('Error deleting avatar:', error);
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover a foto.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const initials = agentName.charAt(0).toUpperCase();

  if (compact) {
    return (
      <div className="relative group">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="relative block rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label="Alterar foto de perfil"
        >
          <Avatar className="w-14 h-14 md:w-16 md:h-16 border-2 border-amber-500/60 shadow-md shadow-amber-500/20">
            {previewUrl && <AvatarImage src={previewUrl} alt={agentName} />}
            <AvatarFallback className="bg-gradient-to-br from-amber-500 to-amber-600 text-xl font-bold text-black">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center h-5 w-5 rounded-full bg-amber-500 text-black border-2 border-slate-900 shadow">
            {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-2.5 w-2.5" />}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="w-24 h-24 border-2 border-amber-500/50 shadow-lg shadow-amber-500/20">
          {previewUrl && <AvatarImage src={previewUrl} alt={agentName} />}
          <AvatarFallback className="bg-gradient-to-br from-amber-500 to-amber-600 text-3xl font-bold text-black">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {/* Overlay on hover */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="border-slate-600 hover:bg-slate-800"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {previewUrl ? 'Trocar Foto' : 'Adicionar Foto'}
            </>
          )}
        </Button>

        {previewUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeleteAvatar}
            disabled={isDeleting}
            className="border-red-600/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <p className="text-xs text-slate-500 text-center">
        JPG, PNG ou GIF • Máximo 2MB
      </p>
    </div>
  );
}
