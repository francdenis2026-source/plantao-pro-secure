import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Camera, Mail, Save, Loader2, User, Phone, MapPin, Droplets, CalendarDays, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { differenceInYears } from 'date-fns';

interface AgentSettingsCardProps {
  agentId: string;
  agentName: string;
  currentEmail: string | null;
  currentAvatarUrl: string | null;
  onUpdate: () => void;
  onClose?: () => void;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function AgentSettingsCard({ 
  agentId, 
  agentName, 
  currentEmail, 
  currentAvatarUrl,
  onUpdate,
  onClose
}: AgentSettingsCardProps) {
  const [email, setEmail] = useState(currentEmail || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isSavingBloodType, setIsSavingBloodType] = useState(false);
  const [isSavingBirthDate, setIsSavingBirthDate] = useState(false);
  const [originalEmail, setOriginalEmail] = useState(currentEmail || '');
  const [originalPhone, setOriginalPhone] = useState('');
  const [originalAddress, setOriginalAddress] = useState('');
  const [originalBloodType, setOriginalBloodType] = useState('');
  const [originalBirthDate, setOriginalBirthDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Collapsible states
  const [contactOpen, setContactOpen] = useState(true);
  const [personalOpen, setPersonalOpen] = useState(false);

  // Fetch current data on mount
  useEffect(() => {
    const fetchAgentData = async () => {
      const { data } = await supabase
        .from('agents')
        .select('phone, address, blood_type, birth_date, email')
        .eq('id', agentId)
        .single();
      
      if (data) {
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setBloodType(data.blood_type || '');
        setBirthDate(data.birth_date || '');
        setOriginalPhone(data.phone || '');
        setOriginalAddress(data.address || '');
        setOriginalBloodType(data.blood_type || '');
        setOriginalBirthDate(data.birth_date || '');
        if (data.email) {
          setEmail(data.email);
          setOriginalEmail(data.email);
        }
      }
    };
    
    fetchAgentData();
  }, [agentId]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    try {
      setIsUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${agentId}-${Date.now()}.${fileExt}`;
      const filePath = `agents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('agents')
        .update({ avatar_url: publicUrl })
        .eq('id', agentId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Foto atualizada!');
      onUpdate();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!email.trim()) {
      toast.error('Digite um e-mail válido');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Digite um e-mail válido');
      return;
    }

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('agents')
        .update({ email: email.trim() })
        .eq('id', agentId);

      if (error) throw error;

      setOriginalEmail(email.trim());
      toast.success('E-mail atualizado!');
      onUpdate();
    } catch (error) {
      console.error('Error updating email:', error);
      toast.error('Erro ao atualizar e-mail');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePhone = async () => {
    try {
      setIsSavingPhone(true);

      const { error } = await supabase
        .from('agents')
        .update({ phone: phone.trim() || null })
        .eq('id', agentId);

      if (error) throw error;

      setOriginalPhone(phone.trim());
      toast.success('Telefone atualizado!');
      onUpdate();
    } catch (error) {
      console.error('Error updating phone:', error);
      toast.error('Erro ao atualizar telefone');
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleSaveAddress = async () => {
    try {
      setIsSavingAddress(true);

      const { error } = await supabase
        .from('agents')
        .update({ address: address.trim() || null })
        .eq('id', agentId);

      if (error) throw error;

      setOriginalAddress(address.trim());
      toast.success('Endereço atualizado!');
      onUpdate();
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Erro ao atualizar endereço');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSaveBloodType = async (value: string) => {
    try {
      setIsSavingBloodType(true);
      setBloodType(value);

      const { error } = await supabase
        .from('agents')
        .update({ blood_type: value || null })
        .eq('id', agentId);

      if (error) throw error;

      setOriginalBloodType(value);
      toast.success('Tipo sanguíneo atualizado!');
      onUpdate();
    } catch (error) {
      console.error('Error updating blood type:', error);
      toast.error('Erro ao atualizar tipo sanguíneo');
    } finally {
      setIsSavingBloodType(false);
    }
  };

  const handleSaveBirthDate = async () => {
    try {
      setIsSavingBirthDate(true);

      const age = birthDate ? differenceInYears(new Date(), new Date(birthDate)) : null;

      const { error } = await supabase
        .from('agents')
        .update({ 
          birth_date: birthDate || null,
          age: age
        })
        .eq('id', agentId);

      if (error) throw error;

      setOriginalBirthDate(birthDate);
      toast.success('Data de nascimento atualizada!');
      onUpdate();
    } catch (error) {
      console.error('Error updating birth date:', error);
      toast.error('Erro ao atualizar data de nascimento');
    } finally {
      setIsSavingBirthDate(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})/, '($1) ')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .trim();
    }
    return value;
  };

  const getAgeDisplay = () => {
    if (!birthDate) return null;
    const age = differenceInYears(new Date(), new Date(birthDate));
    return `${age} anos`;
  };

  return (
    <Card className="bg-zinc-900/90 border border-zinc-700/60 shadow-xl">
      <CardHeader className="pb-1.5 pt-2 px-2 md:pb-2 md:pt-3 md:px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
            <div className="p-1 md:p-1.5 rounded-md bg-amber-500/15 border border-amber-500/30">
              <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-400" />
            </div>
            <span className="font-semibold text-zinc-100">Configurações</span>
          </CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 md:h-7 md:w-7 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2 md:px-3 md:pb-3 space-y-2 md:space-y-3">
        {/* Avatar Upload - Always visible */}
        <div className="flex items-center gap-2 md:gap-3 p-1.5 md:p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/40">
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10 md:h-12 md:w-12 border-2 border-amber-500/40">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={agentName} />}
              <AvatarFallback className="bg-zinc-700 text-base md:text-lg font-bold text-amber-400">
                {agentName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute -bottom-0.5 -right-0.5 p-1 bg-amber-500 rounded-full hover:bg-amber-600 transition-colors disabled:opacity-50 shadow"
            >
              {isUploading ? (
                <Loader2 className="h-2.5 w-2.5 text-black animate-spin" />
              ) : (
                <Camera className="h-2.5 w-2.5 text-black" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm font-medium text-zinc-100 truncate">{agentName}</p>
            <p className="text-[9px] md:text-[10px] text-zinc-500">JPG, PNG (máx. 2MB)</p>
          </div>
        </div>


        {/* Contact Section - Collapsible */}
        <Collapsible open={contactOpen} onOpenChange={setContactOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between p-2 bg-zinc-800/30 rounded-lg border border-zinc-700/30 hover:bg-zinc-800/50 transition-colors">
            <span className="text-xs font-medium text-zinc-300 flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-cyan-400" />
              Contato
            </span>
            {contactOpen ? <ChevronUp className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {/* Email */}
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400 uppercase tracking-wide">E-mail</Label>
              <div className="flex gap-1.5">
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-900/50 border-zinc-700 text-zinc-100 h-8 text-xs"
                />
                <Button
                  onClick={handleSaveEmail}
                  disabled={isSaving || email === originalEmail}
                  size="icon"
                  className="bg-cyan-600 hover:bg-cyan-500 h-8 w-8 shrink-0"
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400 uppercase tracking-wide">Telefone</Label>
              <div className="flex gap-1.5">
                <Input
                  type="tel"
                  placeholder="(68) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  maxLength={15}
                  className="bg-zinc-900/50 border-zinc-700 text-zinc-100 h-8 text-xs"
                />
                <Button
                  onClick={handleSavePhone}
                  disabled={isSavingPhone || phone === originalPhone}
                  size="icon"
                  className="bg-cyan-600 hover:bg-cyan-500 h-8 w-8 shrink-0"
                >
                  {isSavingPhone ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400 uppercase tracking-wide">Endereço</Label>
              <div className="flex gap-1.5">
                <Textarea
                  placeholder="Rua, número, bairro..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="bg-zinc-900/50 border-zinc-700 text-zinc-100 resize-none text-xs min-h-[50px]"
                />
                <Button
                  onClick={handleSaveAddress}
                  disabled={isSavingAddress || address === originalAddress}
                  size="icon"
                  className="bg-cyan-600 hover:bg-cyan-500 h-8 w-8 shrink-0 self-start"
                >
                  {isSavingAddress ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Personal Info Section - Collapsible */}
        <Collapsible open={personalOpen} onOpenChange={setPersonalOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between p-2 bg-zinc-800/30 rounded-lg border border-zinc-700/30 hover:bg-zinc-800/50 transition-colors">
            <span className="text-xs font-medium text-zinc-300 flex items-center gap-2">
              <Droplets className="h-3.5 w-3.5 text-rose-400" />
              Dados Pessoais
            </span>
            {personalOpen ? <ChevronUp className="h-3.5 w-3.5 text-zinc-500" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Blood Type */}
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-400 uppercase tracking-wide">Tipo Sanguíneo</Label>
                <Select 
                  value={bloodType} 
                  onValueChange={handleSaveBloodType}
                  disabled={isSavingBloodType}
                >
                  <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-zinc-100 h-8 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {BLOOD_TYPES.map(type => (
                      <SelectItem key={type} value={type} className="text-zinc-100 hover:bg-zinc-700 text-xs">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Birth Date */}
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-400 uppercase tracking-wide">Nascimento</Label>
                <div className="flex gap-1">
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="bg-zinc-900/50 border-zinc-700 text-zinc-100 h-8 text-xs flex-1"
                  />
                  <Button
                    onClick={handleSaveBirthDate}
                    disabled={isSavingBirthDate || birthDate === originalBirthDate}
                    size="icon"
                    className="bg-cyan-600 hover:bg-cyan-500 h-8 w-8 shrink-0"
                  >
                    {isSavingBirthDate ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  </Button>
                </div>
                {birthDate && (
                  <p className="text-[9px] text-amber-400">{getAgeDisplay()}</p>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
